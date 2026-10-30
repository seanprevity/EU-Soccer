import {
  competition_codes,
  espn_leagues,
  Leagues,
  odds_sports,
} from "../../config/arrays";
import { curSeason } from "../../config/map";
import {
  updateFutureMatchesService,
  updateLeagueSquadsService,
  updateOddsService,
  updateStandingsService,
} from "./management.service";
import { importEspnMatchesService } from "./management.espnService";

// The parallel arrays in config/arrays
export const LEAGUE_CONFIG = Leagues.map((name, i) => ({
  name,
  espnLeague: espn_leagues[i]!,
  competitionCode: competition_codes[i]!,
  oddsSport: odds_sports[i]!,
}));
export type LeagueConfig = (typeof LEAGUE_CONFIG)[number];

// One league's settings, or every league when none is given.
export const leaguesFor = (league?: string): LeagueConfig[] =>
  league ? LEAGUE_CONFIG.filter((l) => l.name === league) : LEAGUE_CONFIG;

export const STEP = {
  import: "Match import (ESPN)",
  backfill: "Season backfill (ESPN)",
  standings: "Standings",
  upcoming: "Upcoming matches + H2H",
  odds: "Odds",
  squads: "Squads + top players + images",
  topPlayers: "Top players",
  images: "Player images",
} as const;
export type StepName = (typeof STEP)[keyof typeof STEP];

export type StepResult = {
  step: StepName;
  league: string;
  status: "ok" | "failed" | "skipped";
  seconds: number;
  error?: string;
};

export const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000);

// Runs one step for one league and records how it went.
export const runStep = async (
  results: StepResult[],
  step: StepName,
  league: string,
  fn: () => Promise<unknown>,
  dependsOn: StepName[] = [],
): Promise<void> => {
  // find any failed steps and stop if current step depends on that failed step
  const blocker = results.find(
    (r) =>
      r.league === league && dependsOn.includes(r.step) && r.status !== "ok",
  );
  if (blocker) {
    console.warn(
      `[${step}] ${league} skipped (${blocker.step} ${blocker.status})`,
    );
    results.push({
      step,
      league,
      status: "skipped",
      seconds: 0,
      error: `${blocker.step} ${blocker.status}`,
    });
    return;
  }

  const start = Date.now();
  console.log(`[${step}] ${league}…`);

  // run step
  try {
    await fn();
    results.push({
      step,
      league,
      status: "ok",
      seconds: (Date.now() - start) / 1000,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[${step}] ${league} failed:`, err);
    results.push({
      step,
      league,
      status: "failed",
      seconds: (Date.now() - start) / 1000,
      error: message,
    });
  }
};

// Prints the end-of-run summary and a table of anything that didn't succeed.
export const logSummary = (
  name: string,
  results: StepResult[],
  startedAt: number,
) => {
  const count = (s: StepResult["status"]) =>
    results.filter((r) => r.status === s).length;
  console.log(
    `${name} finished in ${((Date.now() - startedAt) / 60000).toFixed(1)} min: ` +
      `${count("ok")} ok, ${count("failed")} failed, ${count("skipped")} skipped`,
  );
  const problems = results.filter((r) => r.status !== "ok");
  if (problems.length) console.table(problems);
};

// runs every few hours by update worker, handles standings, upcoming matches, post matches
export const runQuickUpdate = async (
  leagues: LeagueConfig[] = LEAGUE_CONFIG,
  results: StepResult[] = [],
): Promise<StepResult[]> => {
  const started = Date.now();

  // import match stats
  for (const l of leagues)
    await runStep(results, STEP.import, l.name, () =>
      importEspnMatchesService(l.name, l.espnLeague, daysAgo(1)),
    );

  // update standings
  for (const l of leagues)
    await runStep(
      results,
      STEP.standings,
      l.name,
      () => updateStandingsService(l.name, curSeason),
      [STEP.import],
    );

  // update upcoming matches (removes stale and grabs new)
  for (const l of leagues)
    await runStep(results, STEP.upcoming, l.name, () =>
      updateFutureMatchesService(l.competitionCode, l.name),
    );

  logSummary("Quick update", results, started);
  return results;
};

// The daily pipeline, used by the daily GHA job (src/config/updateAll.ts) and update worker.
export const runFullUpdate = async (
  leagues: LeagueConfig[] = LEAGUE_CONFIG,
  results: StepResult[] = [],
): Promise<StepResult[]> => {
  const started = Date.now();

  // Finished matches from the last 3 days (ESPN)
  for (const l of leagues)
    await runStep(results, STEP.import, l.name, () =>
      importEspnMatchesService(l.name, l.espnLeague, daysAgo(3)),
    );

  // Standings are built from the matches table, so they wait for the import
  for (const l of leagues)
    await runStep(
      results,
      STEP.standings,
      l.name,
      () => updateStandingsService(l.name, curSeason),
      [STEP.import],
    );

  // Upcoming fixtures (football-data.org) and their head-to-head records
  for (const l of leagues)
    await runStep(results, STEP.upcoming, l.name, () =>
      updateFutureMatchesService(l.competitionCode, l.name),
    );

  // Odds attach to upcoming fixtures, so they wait for those
  for (const l of leagues)
    await runStep(
      results,
      STEP.odds,
      l.name,
      () => updateOddsService(l.oddsSport),
      [STEP.upcoming],
    );

  // Squads, then top players and player images (inside updateLeagueSquadsService)
  for (const l of leagues)
    await runStep(results, STEP.squads, l.name, () =>
      updateLeagueSquadsService(l.name, l.espnLeague),
    );

  logSummary("Full update", results, started);
  return results;
};
