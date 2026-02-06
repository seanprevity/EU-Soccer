import { Request, Response } from "express";
import {
  getLast5TeamStatsService,
  getSeasonTeamStatsService,
} from "../services/teamStatsService";

export const getSeasonTeamStats = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const team1 = req.query.team1 as string;
    const team2 = req.query.team2 as string;
    const normalizedTeam1 = team1.split("_").join(" ");
    const normalizedTeam2 = team2.split("_").join(" ");

    const data = await getSeasonTeamStatsService(
      normalizedTeam1,
      normalizedTeam2
    );
    res.json(data);
  } catch (err: any) {
    console.error("Error fetching last 5 standings: ", err);
    res.status(500).json({
      message: `Error fetching a team's last 5 standings: ${err.message}`,
    });
  }
};

export const getLast5TeamStats = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const team1 = req.query.team1 as string;
    const team2 = req.query.team2 as string;
    const normalizedTeam1 = team1.split("_").join(" ");
    const normalizedTeam2 = team2.split("_").join(" ");

    const data = await getLast5TeamStatsService(
      normalizedTeam1,
      normalizedTeam2
    );
    res.json(data);
  } catch (err: any) {
    console.error("Error fetching last 5 standings: ", err);
    res.status(500).json({
      message: `Error fetching a team's last 5 standings: ${err.message}`,
    });
  }
};
