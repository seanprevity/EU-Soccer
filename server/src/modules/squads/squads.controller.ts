import { Request, Response } from "express";
import { getSquadService, getTopPlayersService } from "./squads.service";
import { Validated } from "../../middleware/validation";
import { getSquadSchemas, getTopPlayersSchemas } from "./squads.schemas";
import { SquadPlayerWithImage, TopPlayerEntry } from "@epl/shared";

export const getSquad = async (
  _req: Request,
  res: Response<SquadPlayerWithImage[], Validated<typeof getSquadSchemas>>,
): Promise<void> => {
  const { team } = res.locals.validated.query;
  res.json(await getSquadService(team));
};

export const getTopPlayers = async (
  _req: Request,
  res: Response<TopPlayerEntry[], Validated<typeof getTopPlayersSchemas>>,
): Promise<void> => {
  const { league, season, category } = res.locals.validated.query;
  res.json(await getTopPlayersService(league, season, category));
};
