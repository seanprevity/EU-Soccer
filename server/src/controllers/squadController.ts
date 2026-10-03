import { Request, Response } from "express";
import {
  getSquadService,
  getTopPlayersService,
} from "../services/squadService";
import {
  isTopPlayerCategory,
  TOP_PLAYER_CATEGORIES,
} from "../../drizzle/schema";

export const getSquad = async (req: Request, res: Response): Promise<void> => {
  try {
    const team = req.query.team as string;
    const data = await getSquadService(team);
    res.json(data);
  } catch (err: any) {
    console.error("Error fetching squad: ", err);
    res.status(500).json({
      message: `Error fetching squad, ${err.message}`,
    });
  }
};

export const getTopPlayers = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const league = String(req.query.league ?? "").trim();
  const season = String(req.query.season ?? "").trim();
  const category = String(req.query.category ?? "goals").trim();

  if (!league || !season) {
    res.status(400).json({ message: "league and season are required" });
    return;
  }
  if (!isTopPlayerCategory(category)) {
    res.status(400).json({
      message: `Unknown category "${category}". Use one of: ${Object.keys(TOP_PLAYER_CATEGORIES).join(", ")}`,
    });
    return;
  }

  try {
    res.json(await getTopPlayersService(league, season, category));
  } catch (err: any) {
    console.error("Error fetching top players: ", err);
    res
      .status(500)
      .json({ message: `Error fetching top players, ${err.message}` });
  }
};
