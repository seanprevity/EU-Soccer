import express from "express";
import {
  getMatchStats,
  getOdds,
  getTeamMatchStats,
  getUpcomingMatches,
  getUpcomingMatchById,
  getLast5Matches,
  getRecentMatches,
  getSimulation,
  getPastMatches,
} from "../controllers/matchController";

const router = express.Router();

// All Works
router.get("/stats", getMatchStats);
router.get("/upcoming", getUpcomingMatches);
router.get("/past", getPastMatches);
router.get("/upcoming/:id", getUpcomingMatchById);
router.get("/odds/:id", getOdds);
router.get("/teams", getTeamMatchStats);
router.get("/last5", getLast5Matches);
router.get("/recent", getRecentMatches);
router.get("/simulation", getSimulation);

export default router;
