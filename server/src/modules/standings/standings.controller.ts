import { Request, Response } from "express";
import {
  getStandingsService,
  getTeamStandingsService,
  getRecentTeamStandingsService,
  getRecentTableStandingsService,
  getTeamsExpectedStandingsService,
} from "./standings.service";
import { ApiError, ExpectedStanding, Standing } from "@epl/shared";
import { Validated } from "../../middleware/validation";
import {
  getRecentStandingsSchemas,
  getStandingsSchemas,
  getTeamsExpectedStandingsSchemas,
  getTeamStandingsSchemas,
} from "./standings.schemas";

// gets standings for a specific league + season
export const getStandings = async (
  _req: Request,
  res: Response<Standing[], Validated<typeof getStandingsSchemas>>,
): Promise<void> => {
  const { league, season } = res.locals.validated.query;
  const standings = await getStandingsService(league, season);
  res.json(standings);
};

export const getRecentTeamStandings = async (
  _req: Request,
  res: Response<
    Standing | ApiError,
    Validated<typeof getRecentStandingsSchemas>
  >,
): Promise<void> => {
  const { team } = res.locals.validated.query;
  const data = await getRecentTeamStandingsService(team);
  if (!data) {
    res.status(404).json({ error: "No standings for this team" });
    return;
  }
  res.json(data);
};

export const getRecentTableStandings = async (
  _req: Request,
  res: Response<Standing[], Validated<typeof getRecentStandingsSchemas>>,
): Promise<void> => {
  const { team } = res.locals.validated.query;
  const data = await getRecentTableStandingsService(team);
  res.json(data);
};

// grabs team standings for two teams in the current season
export const getTeamStandings = async (
  _req: Request,
  res: Response<Standing[], Validated<typeof getTeamStandingsSchemas>>,
): Promise<void> => {
  const { team1, team2 } = res.locals.validated.query;
  const data = await getTeamStandingsService(team1, team2);
  res.json(data);
};

export const getTeamsExpectedStandings = async (
  _req: Request,
  res: Response<
    ExpectedStanding[],
    Validated<typeof getTeamsExpectedStandingsSchemas>
  >,
): Promise<void> => {
  const { teams } = res.locals.validated.query;
  res.json(await getTeamsExpectedStandingsService(teams));
};
