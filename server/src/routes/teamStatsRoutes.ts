import express from "express";
import {
  getLast5TeamStats,
  getSeasonTeamStats,
} from "../controllers/teamStatsController";

const router = express.Router();

// Works
router.get("/season", getSeasonTeamStats);
router.get("/last5", getLast5TeamStats);

export default router;
