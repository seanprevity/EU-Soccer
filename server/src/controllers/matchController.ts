import { Request, Response } from "express";
import {
  getLast5MatchesService,
  getMatchStatsService,
  getOddsService,
  getTeamMatchStatsService,
  getUpcomingMatchByIdService,
  getUpcomingMatchesService,
  getRecentMatchesService,
  getSimulationService,
  getPastMatchesService,
} from "../services/matchService";

export const getMatchStats = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const ids = req.query.ids as string;
    if (!ids) {
      res.status(400).json({ message: "Missing 'ids' query parameter" });
      return;
    }
    const idList = ids
      .split(",")
      .map((id) => Number(id.trim()))
      .filter(Boolean);
    if (idList.length === 0) {
      res.status(400).json({ message: "No valid IDs provided" });
      return;
    }
    const stats = await Promise.all(
      idList.map((id) => getMatchStatsService(id)),
    );
    res.json(stats.flat());
  } catch (err: any) {
    console.error("Erorr fetching match stats ", err);
    res.status(500).json({
      message: `Error fetching match stats: ${err.message}`,
    });
  }
};

export const getUpcomingMatches = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const data = await getUpcomingMatchesService();
    res.json(data);
  } catch (err: any) {
    console.error("Erorr fetching upcoming matches ", err);
    res.status(500).json({
      message: `Error fetching upcoming matches: ${err.message}`,
    });
  }
};

export const getPastMatches = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const data = await getPastMatchesService();
    res.json(data);
  } catch (err: any) {
    console.error("Erorr fetching past matches ", err);
    res.status(500).json({
      message: `Error fetching past matches: ${err.message}`,
    });
  }
};

export const getOdds = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    if (!id) {
      res.status(400).json({ message: "Missing 'id' parameter" });
      return;
    }
    const data = await getOddsService(Number(id));
    res.json(data);
  } catch (err: any) {
    console.error("Failed to fetch odds. ", err);
    res.status(500).json({
      message: `Error fetching odds: ${err.message}`,
    });
  }
};

export const getTeamMatchStats = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const team = req.query.team as string;
    if (!team) {
      res.status(400).json({ message: "Missing 'team' parameter" });
      return;
    }
    const normalizedTeam = team.split("_").join(" ");
    const data = await getTeamMatchStatsService(normalizedTeam);
    res.json(data);
  } catch (err: any) {
    console.error("Failed to fetch a team's match stats. ", err);
    res.status(500).json({
      message: `Error fetching a team's match stats: ${err.message}`,
    });
  }
};

export const getUpcomingMatchById = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { id } = req.params;
    if (!id) {
      res.status(400).json({ message: "Missing 'id' parameter" });
      return;
    }
    const data = await getUpcomingMatchByIdService(Number(id));
    if (!data.length) {
      res.status(404).json({ error: "Match not found" });
      return;
    }
    res.json(data[0]);
  } catch (err: any) {
    console.error("Failed to fetch upcoming match by id: ", err);
    res.status(500).json({
      message: `Error fetching upcoming match by id: ${err.message}`,
    });
  }
};

export const getLast5Matches = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const team = req.query.team as string;
    const normalizedTeam = team.split("_").join(" ");
    console.log(normalizedTeam);
    const data = await getLast5MatchesService(normalizedTeam);
    res.json(data);
  } catch (err: any) {
    console.error("Failed to get last 5 matches: ", err);
    res.status(500).json({
      message: `Error fetching last 5 matches: ${err.message}`,
    });
  }
};

export const getRecentMatches = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const team = req.query.team as string;
    const endDate = req.query.endDate as string;
    const normalizedTeam = team.split("_").join(" ");
    const data = await getRecentMatchesService(normalizedTeam, endDate);
    res.json(data);
  } catch (err: any) {
    console.error("Error fetching recent matches: ", err);
    res.status(500).json({
      message: `Error Fetching recent matches: ${err.message}`,
    });
  }
};

export const getSimulation = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const homeTeam = req.query.homeTeam as string;
    const awayTeam = req.query.awayTeam as string;
    if (!homeTeam || !awayTeam) {
      res.status(500).json({
        message: `Missing Home or Away Team`,
      });
    }
    const normalizedHomeTeam = homeTeam.split("_").join(" ");
    const normalizedAwayTeam = awayTeam.split("_").join(" ");
    console.log(homeTeam);
    console.log(awayTeam);
    const data = await getSimulationService(
      normalizedHomeTeam,
      normalizedAwayTeam,
    );
    res.json(data);
  } catch (err: any) {
    console.error("Error fetching simulation: ", err);
    res.status(500).json({
      message: `Error Fetching simulation: ${err.message}`,
    });
  }
};
