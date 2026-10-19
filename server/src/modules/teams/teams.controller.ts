import { Request, Response } from "express";
import { getLeagueByTeamService, getTeamByNameService } from "./teams.service";
import { ApiError, League, Team } from "@epl/shared";
import { Validated } from "../../middleware/validation";
import { getLeagueByTeamSchemas, getTeamByNameSchemas } from "./teams.schemas";

export const getTeamByName = async (
  _req: Request,
  res: Response<Team | ApiError, Validated<typeof getTeamByNameSchemas>>,
): Promise<void> => {
  const { name } = res.locals.validated.query;
  const data = await getTeamByNameService(name);
  if (!data) {
    res.status(404).json({ error: "No team found." });
    return;
  }
  res.json(data);
};

export const getLeagueByTeam = async (
  _req: Request,
  res: Response<League | ApiError, Validated<typeof getLeagueByTeamSchemas>>,
): Promise<void> => {
  const { name } = res.locals.validated.query;
  const data = await getLeagueByTeamService(name);
  if (!data) {
    res.status(404).json({ error: "Team or League not found" });
    return;
  }
  res.json(data);
};
