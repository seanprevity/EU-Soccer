import axios from "axios";
import { and, eq, isNull, like, lt, or, sql } from "drizzle-orm";
import { players, squad } from "../../drizzle/schema";
import { db } from "../lib/db";

const SPORTSDB_DELAY_MS = 2100; // free key allows about 30 requests a minute
const RECHECK_DAYS = 30; // players not found are searched again after this
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const isEspnImage = (url: string | null | undefined) =>
  Boolean(url?.includes("espncdn.com"));

const searchSportsDbImage = async (name: string, team?: string | null) => {
  const res = await axios.get(
    "https://www.thesportsdb.com/api/v1/json/123/searchplayers.php",
    { params: { p: name } },
  );
  const results: any[] = (res.data?.player ?? []).filter(
    (p: any) => p.strSport === "Soccer" && p.strCutout,
  );
  const t = team?.toLowerCase();
  const atTeam = t
    ? results.find((p) => {
        const theirs = String(p.strTeam ?? "").toLowerCase();
        return theirs && (theirs.includes(t) || t.includes(theirs));
      })
    : undefined;
  return ((atTeam ?? results[0])?.strCutout as string | undefined) ?? null;
};

export const updatePlayerImagesService = async (league: string, limit = 100) => {
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
  for (const p of pending) {
    let image: string | null = null;
    try {
      image = await searchSportsDbImage(p.name, p.team);
    } catch (err: any) {
      // Don't mark as checked: a failed request should be retried next run
      console.warn(`TheSportsDB: search failed for ${p.name}: ${err.message}`);
      await sleep(SPORTSDB_DELAY_MS);
      continue;
    }

    await db
      .update(players)
      .set({
        // TheSportsDB beats ESPN; with no result, whatever was there (ESPN or null) stays
        imageUrl: image ?? p.imageUrl,
        imageCheckedAt: new Date().toISOString(),
      })
      .where(eq(players.name, p.name));
    if (image) found++;
    await sleep(SPORTSDB_DELAY_MS);
  }

  console.log(
    `Player images ${league}: ${found}/${pending.length} found on TheSportsDB`,
  );
  return { league, checked: pending.length, found };
};

// Single player, for anywhere else that adds players by name
export const updatePlayerInfo = async (name: string, team?: string) => {
  const existing = await db.query.players.findFirst({
    where: eq(players.name, name),
  });
  if (existing?.imageUrl && !isEspnImage(existing.imageUrl))
    return { success: true };

  const image = await searchSportsDbImage(name, team);
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
