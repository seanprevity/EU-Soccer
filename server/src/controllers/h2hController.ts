import { Request, Response } from "express";
import { getH2HService, getUpcomingH2HService } from "../services/h2hService";
import { head2Head } from "../../drizzle/schema";

export const getH2H = async (req: Request, res: Response): Promise<void> => {
  try {
    const team1 = req.query.team1 as string;
    const team2 = req.query.team2 as string;
    const normalizedTeam1 = team1.split("_").join(" ");
    const normalizedTeam2 = team2.split("_").join(" ");
    const data = await getH2HService(normalizedTeam1, normalizedTeam2);
    if (!data.length) {
      res.status(404).json({ error: "H2H not found" });
      return;
    }
    res.json(data[0]);
  } catch (err: any) {
    console.error("Failed to get H2H ", err);
    res.status(500).json({
      message: `Error fetching H2H: ${err.message}`,
    });
  }
};

export const getUpcomingH2H = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const idList = req.query.ids as string;
    if (!idList) {
      res.status(400).json({ message: "Missing 'ids' query parameter" });
      return;
    }
    const ids = idList
      .split(",")
      .map((id) => Number(id.trim()))
      .filter(Boolean);
    if (ids.length === 0) {
      res.status(400).json({ message: "No valid IDs provided" });
      return;
    }
    const data = await Promise.all(ids.map((id) => getUpcomingH2HService(id)));
    const flattened = data.flat().filter(Boolean);
    res.json(flattened);
  } catch (err: any) {
    console.error("Failed to fetch upcoming H2H ", err);
    res.status(500).json({
      message: `Error fetching upcoming H2H: ${err.message}`,
    });
  }
};
