import "dotenv/config";
import {
  ESPN_DELAY_MS,
  EspnMatch,
  fetchScoreboard,
  fetchSummary,
  importEspnMatchesService,
  sleep,
  toLiveRow,
  upsertLiveMatch,
} from "../modules/management/management.espnService";
import { espn_leagues, Leagues } from "../config/arrays";
import {
  deleteLiveMatch,
  deleteStaleLiveMatches,
  getLiveMatchIds,
} from "../modules/matches/matches.service";
import client from "../lib/db";
import { isRunning, sleepUntilStopped, stopOnSignals } from "./lifecycle";
import { updateStandingsService } from "../modules/management/management.service";
import { curSeason } from "../config/map";

type TickResult = {
  liveGames: boolean;
  nextKickoff: number | null;
};

type Seen = {
  score: string;
  eventCount: number;
  lastSummaryAt: number; // Date.now()
};
const seen = new Map<string, Seen>();

function chooseSleep(result: TickResult | null): number {
  if (result === null || result.liveGames) return 30_000;

  if (result.nextKickoff === null) return 3_600_000;

  const untilKickoff = result.nextKickoff - 120_000 - Date.now();
  return Math.min(Math.max(untilKickoff, 30_000), 3_600_000);
}

// Handles live matches ending
async function finishMatches(
  league: string,
  espnLeague: string,
  finished: EspnMatch[],
) {
  // get start and end dates to import matches from
  const kickoffTimes = finished.map((match) =>
    new Date(match.date ?? Date.now()).getTime(),
  );
  const earliest = new Date(Math.min(...kickoffTimes));

  const dayStart = new Date(
    Date.UTC(
      earliest.getUTCFullYear(),
      earliest.getUTCMonth(),
      earliest.getUTCDate(),
    ),
  );
  const dayEnd = new Date(Math.max(...kickoffTimes) + 24 * 60 * 60 * 1000);

  // import match stats from ESPN
  await importEspnMatchesService(league, espnLeague, dayStart, { to: dayEnd });

  // delete finished matches from live table
  for (const match of finished) {
    await deleteLiveMatch(match.id);
    seen.delete(match.id);
    console.log(
      `[live] finished ${match.id} ${match.rawHome} ${match.homeScore}-${match.awayScore} ${match.rawAway}`,
    );
  }

  // update standings after matches added to match stats
  try {
    await updateStandingsService(league, curSeason);
    console.log(`[live] updated standings for ${league}`);
  } catch (error) {
    console.error(`[live] failed updating standings for ${league}:`, error);
  }
}

function shouldFetchSummary(match: EspnMatch): boolean {
  const storedMatch = seen.get(match.id);
  if (storedMatch === undefined) return true;

  // if it's been over 3 minutes, or events/scores changed, fetch
  if (Date.now() - storedMatch.lastSummaryAt > 3 * 60 * 1000) return true;
  if (storedMatch.eventCount !== match.events.length) return true;
  if (storedMatch.score !== `${match.homeScore}-${match.awayScore}`)
    return true;

  return false;
}

async function tick(): Promise<TickResult> {
  console.log("[live] tick " + new Date().toISOString());
  const liveMatchIds = await getLiveMatchIds();
  const day = new Date().toISOString().slice(0, 10).replace(/-/g, ""); // 20261021
  let nextKickoff: number | null = null;
  let liveGames = false;

  for (let i = 0; i < 5; i++) {
    const matches = await fetchScoreboard(espn_leagues[i], day);
    if (matches == null) continue;

    const liveMatches = matches.filter((m) => m.state === "in"); // only keep live matches
    for (const m of liveMatches) {
      let summary: Awaited<ReturnType<typeof fetchSummary>> = null;
      const fetchIt = shouldFetchSummary(m);

      if (fetchIt) {
        summary = await fetchSummary(espn_leagues[i], m.id);
        if (summary != null) {
          seen.set(m.id, {
            score: `${m.homeScore}-${m.awayScore}`,
            eventCount: m.events.length,
            lastSummaryAt: Date.now(),
          });
        }

        await sleep(ESPN_DELAY_MS);
      }

      console.log(
        `[live] ${m.id} ${m.rawHome} ${m.homeScore}-${m.awayScore} ${m.rawAway} ${m.clock} summary: ${fetchIt ? "yes" : "no"}`,
      );

      const row = toLiveRow(Leagues[i], m, summary);
      if (row) await upsertLiveMatch(row);
    }

    const finishedMatches = matches.filter(
      (m) => m.state === "post" && liveMatchIds.has(m.id),
    );
    if (finishedMatches.length > 0)
      await finishMatches(Leagues[i], espn_leagues[i], finishedMatches);

    if (liveMatches.length > 0) liveGames = true;
    for (const match of matches) {
      if (match.state !== "pre" || match.date == null) continue;

      const kickoff = new Date(match.date).getTime();
      if (nextKickoff === null || kickoff < nextKickoff) nextKickoff = kickoff;
    }
  }

  return { liveGames, nextKickoff };
}

async function main() {
  stopOnSignals();

  const stale = await deleteStaleLiveMatches();
  console.log(`[live] Removed ${stale} stale live matches`);

  while (isRunning()) {
    let result: TickResult | null = null;
    try {
      result = await tick();
    } catch (error) {
      console.error("[live] tick failed:", error);
    }
    if (!isRunning()) break;

    const sleepFor = chooseSleep(result);
    console.log(`[live] next check in ${Math.round(sleepFor / 60000)}m`);
    await sleepUntilStopped(sleepFor);
  }

  console.log("[live] stopped");
  await client.end({ timeout: 5 });
}

main().catch((error) => {
  console.error("[live] crashed:", error);
  process.exit(1);
});
