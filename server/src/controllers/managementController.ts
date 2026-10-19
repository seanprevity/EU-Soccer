import { Request, Response } from "express";
import {
  updateStandingsService,
  updateFutureMatchesService,
  updateOddsService,
  updateLeagueSquadsService,
  updateTopPlayersService,
} from "../services/managementService";
import {
  competition_codes,
  espn_leagues,
  Leagues,
  odds_sports,
} from "../config/arrays";
import { curSeason } from "../config/map";
import { updatePlayerImagesService } from "../services/imageService";
import { importEspnMatchesService } from "../services/espnService";

const DAILY_WINDOW_DAYS = 10;
const daysAgo = (n: number) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);

// Your parallel arrays, zipped once so each league's settings stay together
const LEAGUE_CONFIG = Leagues.map((name, i) => ({
  name,
  espnLeague: espn_leagues[i],
  competitionCode: competition_codes[i],
  oddsSport: odds_sports[i],
}));

let updateRunning = false;

const STEP = {
  import: "Match import (ESPN)",
  standings: "Standings",
  upcoming: "Upcoming matches + H2H",
  odds: "Odds",
  squads: "Squads + top players + images",
} as const;
type StepName = (typeof STEP)[keyof typeof STEP];

type StepResult = {
  step: StepName;
  league: string;
  status: "ok" | "failed" | "skipped";
  seconds: number;
  error?: string;
};

const runStep = async (
  results: StepResult[],
  step: StepName,
  league: string,
  fn: () => Promise<unknown>,
  dependsOn: StepName[] = [],
) => {
  // Skip if anything this step builds on failed (or was skipped) for the same league
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
  try {
    await fn();
    results.push({
      step,
      league,
      status: "ok",
      seconds: (Date.now() - start) / 1000,
    });
  } catch (err: any) {
    console.error(`[${step}] ${league} failed:`, err.message);
    results.push({
      step,
      league,
      status: "failed",
      seconds: (Date.now() - start) / 1000,
      error: err.message,
    });
  }
};

export const runFullUpdate = async () => {
  const results: StepResult[] = [];
  const started = Date.now();

  // Update match stats/data using ESPN
  for (const l of LEAGUE_CONFIG)
    await runStep(results, STEP.import, l.name, () =>
      importEspnMatchesService(l.name, l.espnLeague, daysAgo(3)),
    );

  // Update Standings using match stats obtained from CSV
  for (const l of LEAGUE_CONFIG)
    await runStep(
      results,
      STEP.standings,
      l.name,
      () => updateStandingsService(l.name, curSeason),
      [STEP.import],
    );

  // Update Upcoming Matches
  for (const l of LEAGUE_CONFIG)
    await runStep(results, STEP.upcoming, l.name, () =>
      updateFutureMatchesService(l.competitionCode, l.name),
    );

  // Update Odds
  for (const l of LEAGUE_CONFIG)
    await runStep(
      results,
      STEP.odds,
      l.name,
      () => updateOddsService(l.oddsSport),
      [STEP.upcoming],
    );

  // Update League Squads through ESPN
  for (const l of LEAGUE_CONFIG)
    await runStep(results, STEP.squads, l.name, () =>
      updateLeagueSquadsService(l.name, l.espnLeague),
    );

  const count = (s: StepResult["status"]) =>
    results.filter((r) => r.status === s).length;
  console.log(
    `Full update finished in ${((Date.now() - started) / 60000).toFixed(1)} min: ` +
      `${count("ok")} ok, ${count("failed")} failed, ${count("skipped")} skipped`,
  );
  const problems = results.filter((r) => r.status !== "ok");
  if (problems.length) console.table(problems);
  return results;
};

export const updateAll = async (
  _req: Request,
  res: Response,
): Promise<void> => {
  // prevent 2 calls
  if (updateRunning) {
    res.status(409).json({ message: "A full update is already running" });
    return;
  }

  updateRunning = true;
  res.status(202).json({
    message:
      "Full update started. Progress and a summary are logged on the server.",
  });

  try {
    await runFullUpdate();
  } catch (err: any) {
    console.error("Full update crashed:", err);
  } finally {
    updateRunning = false;
  }
};

// Singular updates for when fails occur or new season testing needed to update maps
// updates standings and recent form for teams - total , home , and away
export const updateStandings = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    for (let i = 0; i < 5; i++)
      await updateStandingsService(Leagues[i], curSeason);
    res.status(200).send("Standings updated successfully");
  } catch (err: any) {
    res.status(500).send(err.message);
  }
};

// updates future matches and h2h records
export const updateFutureMatches = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    for (let i = 0; i < 5; i++)
      await updateFutureMatchesService(competition_codes[i], Leagues[i]);
    res.status(200).send("Matches updates successfully");
  } catch (err: any) {
    res.status(500).send(err.message);
  }
};

export const updateTopPlayers = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    for (let i = 0; i < 5; i++) await updateTopPlayersService(Leagues[i]);
    res.status(200).send("Top Players updated successfully");
  } catch (err: any) {
    res.status(500).send(err.message);
  }
};

export const updateOdds = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    for (let i = 0; i < 5; i++) await updateOddsService(odds_sports[i]);
    res.status(200).send("Odds updated successfuly");
  } catch (err: any) {
    res.status(500).send(err.message);
  }
};

export const updateImageUrls = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const images = await updatePlayerImagesService("Bundesliga");
    res.status(200).json({
      message: `Updated images`,
      images,
    });
  } catch (err: any) {
    res.status(500).send(err.message);
  }
};

export const updateSquad = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const league = String(req.query.league ?? req.body?.league ?? "").trim();
  const espnLeague = espn_leagues[4];
  try {
    const { teams, images } = await updateLeagueSquadsService(
      league,
      espnLeague,
    );
    res.status(200).json({
      message: `Updated ${teams.length} ${league} squads`,
      teams,
      images,
    });
  } catch (err: any) {
    console.error("updateSquad:", err);
    res.status(500).json({ message: err.message });
  }
};
