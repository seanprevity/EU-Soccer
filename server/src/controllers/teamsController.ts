import { Request, Response } from "express";
import {
  getLeagueByTeamService,
  getTeamByIdService,
} from "../services/teamsService";

export const getTeamByName = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const name = req.query.team as string;
    const normalizedTeam = name.split("_").join(" ");
    const data = await getTeamByIdService(normalizedTeam);
    res.json(data[0]);
  } catch (err: any) {
    console.error("Error getting team by id: ", err);
    res.status(500).json({
      message: `Error getting team by id: ${err.message}`,
    });
  }
};

export const getLeagueByTeam = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const team = req.query.team as string;
    const normalizedTeam = team.split("_").join(" ");
    const data = await getLeagueByTeamService(normalizedTeam);
    if (!data) {
      res
        .status(404)
        .json({ error: "Team not found when searching for their league" });
      return;
    }
    res.json(data[0]);
  } catch (err: any) {
    console.error("Error getting league by team: ", err);
    res.status(500).json({
      message: `Error fetching league by team: ${err.message}`,
    });
  }
};
