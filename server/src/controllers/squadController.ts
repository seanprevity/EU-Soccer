import { Request, Response } from "express";
import { getSquadService } from "../services/squadService";

export const getSquad = async (req: Request, res: Response): Promise<void> => {
  try {
    const team = req.query.team as string;
    const normalizedTeam = team.split("_").join(" ");
    const data = await getSquadService(normalizedTeam);
    res.json(data);
  } catch (err: any) {
    console.error("Error fetching squad: ", err);
    res.status(500).json({
      message: `Error fetching squad, ${err.message}`,
    });
  }
};
