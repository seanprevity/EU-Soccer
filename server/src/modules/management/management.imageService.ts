import axios from "axios";
import { and, eq, isNull, like, lt, or, sql } from "drizzle-orm";
import { trace } from "@opentelemetry/api";
import { players, squad } from "../../../drizzle/schema";
import { db } from "../../lib/db";
import { withDbSpan, withSpan } from "../../lib/span";

const SPORTSDB_SEARCH_URL =
  "https://www.thesportsdb.com/api/v1/json/123/searchplayers.php";
const SPORTSDB_DELAY_MS = 3000; // free key allows about 30 requests a minute
const SPORTSDB_MAX_ATTEMPTS = 3; // per request, when rate limited
const SPORTSDB_TIMEOUT_MS = 10_000;
const DEFAULT_RATE_LIMIT_WAIT_MS = 60_000; // when TheSportsDB doesn't say how long
const RECHECK_DAYS = 30; // players not found are searched again after this

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const isEspnImage = (url: string | null | undefined) =>
  Boolean(url?.includes("espncdn.com"));

class RateLimitedError extends Error {}
let nextRequestAt = 0;

async function waitForTurn(): Promise<void> {
  // Reserve a slot before waiting, so two callers at the same moment get different slots
  const slot = Math.max(Date.now(), nextRequestAt);
  nextRequestAt = slot + SPORTSDB_DELAY_MS;

  const waitMs = slot - Date.now();
  if (waitMs > 0) await sleep(waitMs);
}

function isRateLimited(error: unknown): boolean {
  return axios.isAxiosError(error) && error.response?.status === 429;
}

// How long TheSportsDB asked us to wait, or a minute if it didn't say
function rateLimitWaitMs(error: unknown): number {
  if (axios.isAxiosError(error)) {
    const retryAfterSeconds = Number(error.response?.headers["retry-after"]);
    if (retryAfterSeconds > 0) return retryAfterSeconds * 1000;
  }
  return DEFAULT_RATE_LIMIT_WAIT_MS;
}

async function searchSportsDb(name: string) {
  for (let attempt = 1; attempt <= SPORTSDB_MAX_ATTEMPTS; attempt++) {
    await waitForTurn();
    try {
      return await axios.get(SPORTSDB_SEARCH_URL, {
        params: { p: name },
        timeout: SPORTSDB_TIMEOUT_MS,
      });
    } catch (error) {
      if (!isRateLimited(error)) throw error;
      if (attempt === SPORTSDB_MAX_ATTEMPTS) break;

      const waitMs = rateLimitWaitMs(error);
      // A point-in-time note on the current span (the search), shown as a marker in Tempo
      trace.getActiveSpan()?.addEvent("sportsdb.rate_limited", {
        "sportsdb.attempt": attempt,
        "sportsdb.wait_ms": waitMs,
      });
      console.warn(
        `TheSportsDB: rate limited, waiting ${waitMs / 1000}s (attempt ${attempt} of ${SPORTSDB_MAX_ATTEMPTS})`,
      );
      await sleep(waitMs);
    }
  }
  throw new RateLimitedError("TheSportsDB: still rate limited after retries");
}

const searchSportsDbImage = async (name: string, team?: string | null) => {
  return await withSpan(
    "images.searchSportsDb",
    { "images.player": name, "images.team": team ?? undefined },
    async (span) => {
      const response = await searchSportsDb(name);

      const results: any[] = (response.data?.player ?? []).filter(
        (player: any) => player.strSport === "Soccer" && player.strCutout,
      );
      const teamName = team?.toLowerCase();
      let atTeam: any = undefined;
      if (teamName) {
        atTeam = results.find((player) => {
          const theirs = String(player.strTeam ?? "").toLowerCase();
          return (
            theirs && (theirs.includes(teamName) || teamName.includes(theirs))
          );
        });
      }

      const url = (atTeam ?? results[0])?.strCutout as string | undefined;
      span.setAttribute("images.results", results.length);
      span.setAttribute("images.matched_team", atTeam !== undefined);
      span.setAttribute("images.found", url !== undefined);

      if (!url) return null;
      return url.replace(
        "://www.thesportsdb.com/images/",
        "://r2.thesportsdb.com/images/",
      );
    },
  );
};

export const updatePlayerImagesService = async (
  league: string,
  limit = 100,
) => {
  const recheckBefore = new Date(
    Date.now() - RECHECK_DAYS * 86_400_000,
  ).toISOString();

  return await withSpan(
    "images.updatePlayerImages",
    {
      "images.league": league,
      "images.limit": limit,
      "images.recheck_before": recheckBefore,
    },
    async (span) => {
      const pending = await withDbSpan("players", async (dbSpan) => {
        const result = await db
          .selectDistinctOn([players.name], {
            name: players.name,
            imageUrl: players.imageUrl,
            team: squad.team,
          })
          .from(players)
          .innerJoin(squad, eq(squad.player, players.name))
          .where(
            and(
              eq(squad.league, league),
              or(
                isNull(players.imageUrl),
                like(players.imageUrl, "%espncdn.com%"),
              ),
              or(
                isNull(players.imageCheckedAt),
                lt(players.imageCheckedAt, recheckBefore),
              ),
            ),
          )
          .limit(limit);
        dbSpan.setAttribute("db.response.returned_rows", result.length);
        return result;
      });

      let found = 0;
      let checked = 0;
      let failed = 0;
      let rateLimited = false;

      for (const player of pending) {
        let image: string | null = null;
        try {
          image = await searchSportsDbImage(player.name, player.team);
        } catch (error) {
          if (error instanceof RateLimitedError) {
            // Everyone left gets tried again next run, since they aren't marked as checked
            console.warn(
              `TheSportsDB: still rate limited, skipping the remaining ${pending.length - checked} players in ${league}`,
            );
            rateLimited = true;
            break;
          }
          // Don't mark as checked: a failed request should be retried next run
          console.warn(
            `TheSportsDB: search failed for ${player.name}: ${(error as Error).message}`,
          );
          failed++;
          continue;
        }

        await withDbSpan(
          "players",
          async () => {
            await db
              .update(players)
              .set({
                // TheSportsDB beats ESPN; with no result, whatever was there (ESPN or null) stays
                imageUrl: image ?? player.imageUrl,
                imageCheckedAt: new Date().toISOString(),
              })
              .where(eq(players.name, player.name));
          },
          "UPDATE",
        );

        checked++;
        if (image) found++;
      }

      span.setAttribute("images.pending", pending.length);
      span.setAttribute("images.checked", checked);
      span.setAttribute("images.found", found);
      span.setAttribute("images.failed", failed);
      span.setAttribute("images.rate_limited", rateLimited);

      console.log(
        `Player images ${league}: ${found}/${checked} found on TheSportsDB (${pending.length} pending)`,
      );
      return { league, pending: pending.length, checked, found, rateLimited };
    },
  );
};

// Single player, for anywhere else that adds players by name
export const updatePlayerInfo = async (name: string, team?: string) => {
  return await withSpan(
    "images.updatePlayerInfo",
    { "images.player": name, "images.team": team },
    async (span) => {
      const existing = await withDbSpan("players", async (dbSpan) => {
        const result = await db.query.players.findFirst({
          where: eq(players.name, name),
        });
        dbSpan.setAttribute("db.response.returned_rows", result ? 1 : 0);
        return result;
      });

      if (existing?.imageUrl && !isEspnImage(existing.imageUrl)) {
        span.setAttribute("images.outcome", "already_has_image");
        return { success: true };
      }

      let image: string | null = null;
      try {
        image = await searchSportsDbImage(name, team);
      } catch (error) {
        // Not marked as checked, so the images step tries this player again later
        console.warn(
          `TheSportsDB: search failed for ${name}: ${(error as Error).message}`,
        );
        span.setAttribute("images.outcome", "search_failed");
        return { success: false };
      }
      if (!image) console.log(`${name} not found on TheSportsDB`);

      await withDbSpan(
        "players",
        async () => {
          await db
            .insert(players)
            .values({
              name,
              imageUrl: image,
              imageCheckedAt: new Date().toISOString(),
            })
            .onConflictDoUpdate({
              target: players.name,
              set: {
                imageUrl: sql`coalesce(excluded.image_url, ${players.imageUrl})`,
                imageCheckedAt: sql`excluded.image_checked_at`,
              },
            });
        },
        "INSERT",
      );

      span.setAttribute("images.outcome", image ? "found" : "not_found");
      return { success: true };
    },
  );
};
