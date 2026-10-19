import { Request, Response } from "express";
import {
  getLast5TeamStatsService,
  getSeasonTeamStatsService,
} from "./teamstats.service";
import { Validated } from "../../middleware/validation";
import { getTeamStatsSchemas } from "./teamstats.schemas";
import { TeamStatsPair } from "@epl/shared";

export const getSeasonTeamStats = async (
  _req: Request,
  res: Response<TeamStatsPair, Validated<typeof getTeamStatsSchemas>>,
): Promise<void> => {
  const { team1, team2 } = res.locals.validated.query;
  res.json(await getSeasonTeamStatsService(team1, team2));
};

export const getLast5TeamStats = async (
  _req: Request,
  res: Response<TeamStatsPair, Validated<typeof getTeamStatsSchemas>>,
): Promise<void> => {
  const { team1, team2 } = res.locals.validated.query;
  res.json(await getLast5TeamStatsService(team1, team2));
};
