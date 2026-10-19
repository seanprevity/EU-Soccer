import { Request, Response } from "express";
import {
  getH2HService,
  get5H2HMatchesService,
  getUpcomingH2HService,
} from "./h2h.service";
import { ApiError, H2H, H2HMatchesResponse } from "@epl/shared";
import { Validated } from "../../middleware/validation";
import {
  getH2HMatchesSchemas,
  getH2HSchemas,
  getUpcomingH2HSchemas,
} from "./h2h.schemas";

export const getH2H = async (
  _req: Request,
  res: Response<H2H | ApiError, Validated<typeof getH2HSchemas>>,
): Promise<void> => {
  const { team1, team2 } = res.locals.validated.query;
  const h2h = await getH2HService(team1, team2);

  if (!h2h) {
    res.status(404).json({ error: "No head-to-head record for these teams" });
    return;
  }

  res.json(h2h);
};

export const getH2HMatches = async (
  _req: Request,
  res: Response<H2HMatchesResponse, Validated<typeof getH2HMatchesSchemas>>,
): Promise<void> => {
  const { team1, team2, page } = res.locals.validated.query;
  res.json({ matches: await get5H2HMatchesService(team1, team2, page) });
};

export const getUpcomingH2H = async (
  _req: Request,
  res: Response<H2H[], Validated<typeof getUpcomingH2HSchemas>>,
): Promise<void> => {
  const { ids } = res.locals.validated.query;
  res.json(await getUpcomingH2HService(ids));
};
