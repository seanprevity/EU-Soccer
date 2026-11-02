import axios from "axios";
import { and, eq, isNull, like, lt, or, sql } from "drizzle-orm";
import { players, squad } from "../../../drizzle/schema";
import { db } from "../../lib/db";

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
      console.warn(
        `TheSportsDB: rate limited, waiting ${waitMs / 1000}s (attempt ${attempt} of ${SPORTSDB_MAX_ATTEMPTS})`,
      );
      await sleep(waitMs);
    }
  }
  throw new RateLimitedError("TheSportsDB: still rate limited after retries");
}

const searchSportsDbImage = async (name: string, team?: string | null) => {
  const response = await searchSportsDb(name);

  const results: any[] = (response.data?.player ?? []).filter(
    (player: any) => player.strSport === "Soccer" && player.strCutout,
  );
  const teamName = team?.toLowerCase();
  let atTeam: any = undefined;
  if (teamName) {
    atTeam = results.find((player) => {
      const theirs = String(player.strTeam ?? "").toLowerCase();
      return theirs && (theirs.includes(teamName) || teamName.includes(theirs));
    });
  }

  const url = (atTeam ?? results[0])?.strCutout as string | undefined;
  if (!url) return null;
  return url.replace(
    "://www.thesportsdb.com/images/",
    "://r2.thesportsdb.com/images/",
  );
};

export const updatePlayerImagesService = async (
  league: string,
  limit = 100,
) => {
  const recheckBefore = new Date(
    Date.now() - RECHECK_DAYS * 86_400_000,
  ).toISOString();

  const pending = await db
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
        or(isNull(players.imageUrl), like(players.imageUrl, "%espncdn.com%")),
        or(
          isNull(players.imageCheckedAt),
          lt(players.imageCheckedAt, recheckBefore),
        ),
      ),
    )
    .limit(limit);

  let found = 0;
  let checked = 0;
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
      continue;
    }

    await db
      .update(players)
      .set({
        // TheSportsDB beats ESPN; with no result, whatever was there (ESPN or null) stays
        imageUrl: image ?? player.imageUrl,
        imageCheckedAt: new Date().toISOString(),
      })
      .where(eq(players.name, player.name));

    checked++;
    if (image) found++;
  }

  console.log(
    `Player images ${league}: ${found}/${checked} found on TheSportsDB (${pending.length} pending)`,
  );
  return { league, pending: pending.length, checked, found, rateLimited };
};

// Single player, for anywhere else that adds players by name
export const updatePlayerInfo = async (name: string, team?: string) => {
  const existing = await db.query.players.findFirst({
    where: eq(players.name, name),
  });
  if (existing?.imageUrl && !isEspnImage(existing.imageUrl))
    return { success: true };

  let image: string | null = null;
  try {
    image = await searchSportsDbImage(name, team);
  } catch (error) {
    // Not marked as checked, so the images step tries this player again later
    console.warn(
      `TheSportsDB: search failed for ${name}: ${(error as Error).message}`,
    );
    return { success: false };
  }
  if (!image) console.log(`${name} not found on TheSportsDB`);

  await db
    .insert(players)
    .values({ name, imageUrl: image, imageCheckedAt: new Date().toISOString() })
    .onConflictDoUpdate({
      target: players.name,
      set: {
        imageUrl: sql`coalesce(excluded.image_url, ${players.imageUrl})`,
        imageCheckedAt: sql`excluded.image_checked_at`,
      },
    });
  return { success: true };
};
