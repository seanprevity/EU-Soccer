import type { Request, Response } from "express";
import type {
  ApiError,
  HomeAwayMatches,
  LiveMatch,
  LiveMatchResponse,
  MatchPreview,
  MatchStats,
  Odds,
  PaginatedMatches,
  SimulationResult,
  UpcomingMatch,
} from "@epl/shared";
import type { Validated } from "../../middleware/validation";
import type {
  getLiveMatchSchemas,
  getMatchStatsSchemas,
  getMatchupSchemas,
  getOddsSchemas,
  getTeamMatchesSchemas,
  getUpcomingMatchByIdSchemas,
} from "./matches.schemas";
import {
  getHomeAwayMatchesService,
  getLiveMatchesService,
  getLiveMatchService,
  getMatchIdByEspnIdService,
  getMatchStatsService,
  getOddsService,
  getPastMatchesService,
  getSimulationService,
  getTeamMatchesService,
  getUpcomingMatchByIdService,
  getUpcomingMatchesService,
} from "./matches.service";

export const getMatchStats = async (
  _req: Request,
  res: Response<MatchStats[], Validated<typeof getMatchStatsSchemas>>,
): Promise<void> => {
  const { ids } = res.locals.validated.query;
  res.json(await getMatchStatsService(ids));
};

export const getUpcomingMatches = async (
  _req: Request,
  res: Response<UpcomingMatch[]>,
): Promise<void> => {
  res.json(await getUpcomingMatchesService());
};

export const getPastMatches = async (
  _req: Request,
  res: Response<MatchPreview[]>,
): Promise<void> => {
  res.json(await getPastMatchesService());
};

export const getOdds = async (
  _req: Request,
  res: Response<Odds[], Validated<typeof getOddsSchemas>>,
): Promise<void> => {
  const { id } = res.locals.validated.params;
  res.json(await getOddsService(id));
};

export const getUpcomingMatchById = async (
  _req: Request,
  res: Response<
    UpcomingMatch | ApiError,
    Validated<typeof getUpcomingMatchByIdSchemas>
  >,
): Promise<void> => {
  const { id } = res.locals.validated.params;
  const match = await getUpcomingMatchByIdService(id);
  if (!match) {
    res.status(404).json({ error: "Match not found" });
    return;
  }
  res.json(match);
};

export const getLast5Matches = async (
  _req: Request,
  res: Response<PaginatedMatches, Validated<typeof getTeamMatchesSchemas>>,
): Promise<void> => {
  const { team, page } = res.locals.validated.query;
  res.json(await getTeamMatchesService(team, page));
};

export const getRecentMatches = async (
  _req: Request,
  res: Response<PaginatedMatches, Validated<typeof getTeamMatchesSchemas>>,
): Promise<void> => {
  const { team, page } = res.locals.validated.query;
  res.json(await getTeamMatchesService(team, page));
};

export const getSimulation = async (
  _req: Request,
  res: Response<
    SimulationResult | ApiError,
    Validated<typeof getMatchupSchemas>
  >,
): Promise<void> => {
  const { homeTeam, awayTeam } = res.locals.validated.query;
  const result = await getSimulationService(homeTeam, awayTeam);
  if (!result) {
    res
      .status(404)
      .json({ error: "Not enough data this season to simulate this match" });
    return;
  }
  res.json(result);
};

export const getHomeAwayMatches = async (
  _req: Request,
  res: Response<HomeAwayMatches, Validated<typeof getMatchupSchemas>>,
): Promise<void> => {
  const { homeTeam, awayTeam } = res.locals.validated.query;
  res.json(await getHomeAwayMatchesService(homeTeam, awayTeam));
};

export const getLiveMatches = async (
  _req: Request,
  res: Response<LiveMatch[]>,
): Promise<void> => {
  res.json(await getLiveMatchesService());
};

export const getLiveMatch = async (
  _req: Request,
  res: Response<
    LiveMatchResponse | ApiError,
    Validated<typeof getLiveMatchSchemas>
  >,
): Promise<void> => {
  const { espnId } = res.locals.validated.params;
  const liveMatch = await getLiveMatchService(espnId);
  if (liveMatch) {
    res.json({ status: "live", match: liveMatch });
    return;
  }

  const matchId = await getMatchIdByEspnIdService(espnId);
  if (matchId !== null) {
    res.json({ status: "finished", matchId });
    return;
  }
  res
    .status(404)
    .json({ error: "No live or finished match with that ESPN id." });
};
