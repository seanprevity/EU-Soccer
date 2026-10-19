import type { Request, Response } from "express";
import type { ApiError } from "@epl/shared";
import { curSeason } from "../../config/map";
import type { RequestSchemas, Validated } from "../../middleware/validation";
import {
  updateFutureMatchesService,
  updateLeagueSquadsService,
  updateOddsService,
  updateStandingsService,
  updateTopPlayersService,
} from "./management.service";
import {
  backfillEspnMatchDataService,
  importEspnMatchesService,
} from "./management.espnService";
import { updatePlayerImagesService } from "./management.imageService";
import {
  daysAgo,
  leaguesFor,
  runFullUpdate,
  runStep,
  STEP,
  type LeagueConfig,
  type StepName,
} from "./management.pipeline";
import {
  jobStatus,
  startJob,
  type JobStarted,
  type JobStatus,
} from "./management.jobs";
import type {
  backfillSchemas,
  imagesSchemas,
  importMatchesSchemas,
  leagueJobSchemas,
} from "./management.schemas";
export { runFullUpdate } from "./management.pipeline";

type JobResponse<S extends RequestSchemas> = Response<
  JobStarted | ApiError,
  Validated<S>
>;

const startLeagueJob = (
  res: Response<JobStarted | ApiError>,
  step: StepName,
  leagues: LeagueConfig[],
  fn: (l: LeagueConfig) => Promise<unknown>,
) =>
  startJob(
    res,
    step,
    leagues.map((l) => l.name),
    async (results) => {
      for (const l of leagues)
        await runStep(results, step, l.name, () => fn(l));
    },
  );

/** GET /management/status: the job running now (if any) and the last one that finished. */
export const getStatus = (_req: Request, res: Response<JobStatus>): void => {
  res.json(jobStatus());
};

// The full pipeline

export const updateAll = (
  _req: Request,
  res: JobResponse<typeof leagueJobSchemas>,
): void => {
  const leagues = leaguesFor(res.locals.validated.query.league);
  startJob(
    res,
    "Full update",
    leagues.map((l) => l.name),
    (results) => runFullUpdate(leagues, results),
  );
};

// Single steps, for re-running one after a failure

export const importMatches = (
  _req: Request,
  res: JobResponse<typeof importMatchesSchemas>,
): void => {
  const { league, days } = res.locals.validated.query;
  startLeagueJob(res, STEP.import, leaguesFor(league), (l) =>
    importEspnMatchesService(l.name, l.espnLeague, daysAgo(days)),
  );
};

export const backfillMatches = (
  _req: Request,
  res: JobResponse<typeof backfillSchemas>,
): void => {
  const { league, seasonsAgo, refresh } = res.locals.validated.query;
  startLeagueJob(res, STEP.backfill, leaguesFor(league), (l) =>
    backfillEspnMatchDataService(l.name, l.espnLeague, seasonsAgo, refresh),
  );
};

export const updateStandings = (
  _req: Request,
  res: JobResponse<typeof leagueJobSchemas>,
): void => {
  startLeagueJob(
    res,
    STEP.standings,
    leaguesFor(res.locals.validated.query.league),
    (l) => updateStandingsService(l.name, curSeason),
  );
};

export const updateFutureMatches = (
  _req: Request,
  res: JobResponse<typeof leagueJobSchemas>,
): void => {
  startLeagueJob(
    res,
    STEP.upcoming,
    leaguesFor(res.locals.validated.query.league),
    (l) => updateFutureMatchesService(l.competitionCode, l.name),
  );
};

export const updateOdds = (
  _req: Request,
  res: JobResponse<typeof leagueJobSchemas>,
): void => {
  startLeagueJob(
    res,
    STEP.odds,
    leaguesFor(res.locals.validated.query.league),
    (l) => updateOddsService(l.oddsSport),
  );
};

export const updateSquads = (
  _req: Request,
  res: JobResponse<typeof leagueJobSchemas>,
): void => {
  startLeagueJob(
    res,
    STEP.squads,
    leaguesFor(res.locals.validated.query.league),
    (l) => updateLeagueSquadsService(l.name, l.espnLeague),
  );
};

export const updateTopPlayers = (
  _req: Request,
  res: JobResponse<typeof leagueJobSchemas>,
): void => {
  startLeagueJob(
    res,
    STEP.topPlayers,
    leaguesFor(res.locals.validated.query.league),
    (l) => updateTopPlayersService(l.name),
  );
};

export const updateImages = (
  _req: Request,
  res: JobResponse<typeof imagesSchemas>,
): void => {
  const { league, limit } = res.locals.validated.query;
  startLeagueJob(res, STEP.images, leaguesFor(league), (l) =>
    updatePlayerImagesService(l.name, limit),
  );
};
