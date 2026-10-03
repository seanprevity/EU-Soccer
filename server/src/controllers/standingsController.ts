import { Request, Response } from "express";
import {
  getStandingsService,
  getTeamStandingsService,
  getRecentTeamStandingsService,
  getRecentTableStandingsService,
  getTeamsExpectedStandingsService,
} from "../services/standingsService";

// gets standings for a specific league + season
export const getStandings = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const league = req.query.league as string;
    const normalizedLeague = league.split("_").join(" ");
    const season = req.query.season as string;
    const standings = await getStandingsService(normalizedLeague, season);
    res.json(standings);
  } catch (error: any) {
    console.error("Error fetching standings ", error);
    res.status(500).json({
      message: `Error fetching standings: ${error.message}`,
    });
  }
};

// grabs team standings for two teams in the current season
export const getTeamStandings = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const team1 = req.query.team1 as string;
    const team2 = req.query.team2 as string;
    const normalizedTeam1 = team1.split("_").join(" ");
    const normalizedTeam2 = team2.split("_").join(" ");
    const data = await getTeamStandingsService(
      normalizedTeam1,
      normalizedTeam2,
    );
    if (!data.length) {
      res.status(404).json({ error: "Team Standings not found" });
      return;
    }
    res.json(data);
  } catch (err: any) {
    console.error("Error fetching a team's standings ", err);
    res.status(500).json({
      message: `Error fetching a team's standings: ${err.message}`,
    });
  }
};

export const getRecentTeamStandings = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const team = req.query.team as string;
    const normalizedTeam = team.split("_").join(" ");
    const data = await getRecentTeamStandingsService(normalizedTeam);
    res.json(data[0]);
  } catch (err: any) {
    console.error("Error fetching recent standings: ", err);
    res.status(500).json({
      message: `Error fetching recent standings: ${err.message}`,
    });
  }
};

export const getRecentTableStandings = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const team = req.query.team as string;
    const normalizedTeam = team.split("_").join(" ");
    const data = await getRecentTableStandingsService(normalizedTeam);
    res.json(data);
  } catch (err: any) {
    console.error("Error fetching recent standings: ", err);
    res.status(500).json({
      message: `Error fetching recent standings: ${err.message}`,
    });
  }
};

export const getTeamsExpectedStandings = async (
  req: Request,
  res: Response,
) => {
  const teams = String(req.query.teams ?? "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
  if (!teams.length) {
    res.status(400).json({ message: "Teams required" });
    return;
  }
  if (teams.length > 30) {
    res.status(400).json({ message: "Too many teams (max 30)" });
    return;
  }
  try {
    res.json(await getTeamsExpectedStandingsService(teams));
  } catch (error) {
    console.error("getTeamsExpectedStandings: ", error);
    res.status(500).json({ message: "Failed to load expected standings." });
  }
};
