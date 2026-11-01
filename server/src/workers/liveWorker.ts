import "dotenv/config";
import {
  CoreStats,
  ESPN_DELAY_MS,
  EspnMatch,
  copyFirstHalfToMatchStats,
  fetchConfirmedLineups,
  fetchCoreStats,
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
  getUpcomingAwaitingLineups,
  saveUpcomingLineups,
} from "../modules/matches/matches.service";
import client from "../lib/db";
import { isRunning, sleepUntilStopped, stopOnSignals } from "./lifecycle";
import { updateStandingsService } from "../modules/management/management.service";
import { curSeason } from "../config/map";

type TickResult = {
  liveGames: boolean;
  nextKickoff: number | null;
  nextLineupCheck: number | null;
};

type Seen = {
  score: string;
  eventCount: number;
  shots: string;
  status: string;
  lastSummaryAt: number; // Date.now()
};
const seen = new Map<string, Seen>();
const LINEUP_WINDOW_MS = 75 * 60 * 1000; // 75 min before kickoff lineups posted
const LINEUP_CHECK_EVERY_MS = 5 * 60 * 1000; // recheck every 5 min until they appear
const lineupCheckedAt = new Map<string, number>(); // ESPN id -> last time we checked

function scoreOf(match: EspnMatch): string {
  return `${match.homeScore}-${match.awayScore}`;
}

function shotsOf(match: EspnMatch): string {
  return `${match.homeStats.totalShots ?? 0}-${match.awayStats.totalShots ?? 0}`;
}

function chooseSleep(result: TickResult | null): number {
  if (result === null || result.liveGames) return 30_000;

  // Wake for either a lineup check, or 2 minutes before the next kickoff
  const wakeTimes: number[] = [];
  if (result.nextKickoff !== null) wakeTimes.push(result.nextKickoff - 120_000);
  if (result.nextLineupCheck !== null) wakeTimes.push(result.nextLineupCheck);
  if (wakeTimes.length === 0) return 3_600_000;

  const untilWake = Math.min(...wakeTimes) - Date.now();
  return Math.min(Math.max(untilWake, 30_000), 3_600_000);
}

async function checkLineups(
  espnLeague: string,
  match: EspnMatch,
  upcomingId: number,
  kickoff: number,
): Promise<number | null> {
  const now = Date.now();

  // Too early: come back when the window opens
  const windowOpens = kickoff - LINEUP_WINDOW_MS;
  if (now < windowOpens) return windowOpens;

  // Checked recently: come back in a few minutes
  const lastCheck = lineupCheckedAt.get(match.id);
  if (lastCheck !== undefined && now - lastCheck < LINEUP_CHECK_EVERY_MS) {
    return lastCheck + LINEUP_CHECK_EVERY_MS;
  }

  lineupCheckedAt.set(match.id, now);
  const lineups = await fetchConfirmedLineups(espnLeague, match.id);
  await sleep(ESPN_DELAY_MS);

  if (!lineups) {
    console.log(
      `[live] lineups not out yet for ${match.rawHome} vs ${match.rawAway}`,
    );
    return now + LINEUP_CHECK_EVERY_MS;
  }

  await saveUpcomingLineups(upcomingId, lineups);
  lineupCheckedAt.delete(match.id);
  const minutesBefore = Math.round((kickoff - now) / 60000);
  console.log(
    `[live] saved lineups for ${match.rawHome} vs ${match.rawAway}, ${minutesBefore} min before kickoff`,
  );
  return null;
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
  // copy each match's half-time snapshot into them
  await copyFirstHalfToMatchStats(finished.map((match) => match.id));

  // update standings after matches added to match stats
  try {
    await updateStandingsService(league, curSeason);
    console.log(`[live] updated standings for ${league}`);
  } catch (error) {
    console.error(`[live] failed updating standings for ${league}:`, error);
  }

  // delete finished matches from live table
  for (const match of finished) {
    await deleteLiveMatch(match.id);
    seen.delete(match.id);
    console.log(
      `[live] finished ${match.id} ${match.rawHome} ${match.homeScore}-${match.awayScore} ${match.rawAway}`,
    );
  }
}

function shouldFetchSummary(match: EspnMatch): boolean {
  const storedMatch = seen.get(match.id);
  if (storedMatch === undefined) return true;

  // status changed: at half time this is the tick that takes the first-half snapshot
  if (storedMatch.status !== match.statusName) return true;
  // a shot changes xG
  if (storedMatch.shots !== shotsOf(match)) return true;
  // nothing happened for 3 minutes: refresh anyway to catch substitutions
  if (Date.now() - storedMatch.lastSummaryAt > 3 * 60 * 1000) return true;
  if (storedMatch.eventCount !== match.events.length) return true;
  if (storedMatch.score !== scoreOf(match)) return true;

  return false;
}

async function tick(): Promise<TickResult> {
  console.log("[live] tick " + new Date().toISOString());
  const liveMatchIds = await getLiveMatchIds();
  const day = new Date().toISOString().slice(0, 10).replace(/-/g, ""); // 20261021
  let nextKickoff: number | null = null;
  let liveGames = false;
  const awaitingLineups = await getUpcomingAwaitingLineups();
  let nextLineupCheck: number | null = null;

  for (let i = 0; i < 5; i++) {
    const matches = await fetchScoreboard(espn_leagues[i], day);
    if (matches == null) continue;

    const liveMatches = matches.filter((m) => m.state === "in"); // only keep live matches
    for (const m of liveMatches) {
      let summary: Awaited<ReturnType<typeof fetchSummary>> = null;
      let core: CoreStats | undefined;
      const fetchIt = shouldFetchSummary(m);

      if (fetchIt) {
        summary = await fetchSummary(espn_leagues[i], m.id);
        await sleep(ESPN_DELAY_MS);

        // core stats are the only source of xG
        core = await fetchCoreStats(espn_leagues[i], m);

        if (summary != null) {
          seen.set(m.id, {
            score: scoreOf(m),
            eventCount: m.events.length,
            shots: shotsOf(m),
            status: m.statusName,
            lastSummaryAt: Date.now(),
          });
        }

        await sleep(ESPN_DELAY_MS);
      }

      console.log(
        `[live] ${m.id} ${m.rawHome} ${m.homeScore}-${m.awayScore} ${m.rawAway} ${m.clock} ${m.statusName} summary: ${fetchIt ? "yes" : "no"}`,
      );

      const row = toLiveRow(Leagues[i], m, summary, core);
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

      // check if it's waiting for lineup
      const upcomingId = awaitingLineups.get(`${match.home}|${match.away}`);
      if (upcomingId === undefined) continue;

      const checkAt = await checkLineups(
        espn_leagues[i],
        match,
        upcomingId,
        kickoff,
      );
      if (
        checkAt !== null &&
        (nextLineupCheck === null || checkAt < nextLineupCheck)
      ) {
        nextLineupCheck = checkAt;
      }
    }
  }

  return { liveGames, nextKickoff, nextLineupCheck };
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
