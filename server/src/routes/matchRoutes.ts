import express from "express";
import {
  getMatchStats,
  getOdds,
  getUpcomingMatches,
  getUpcomingMatchById,
  getLast5Matches,
  getRecentMatches,
  getSimulation,
  getPastMatches,
  getHomeAwayMatches,
} from "../controllers/matchController";

const router = express.Router();

router.get("/stats", getMatchStats);
router.get("/upcoming", getUpcomingMatches);
router.get("/past", getPastMatches);
router.get("/upcoming/:id", getUpcomingMatchById);
router.get("/odds/:id", getOdds);
router.get("/last5", getLast5Matches);
router.get("/recent", getRecentMatches);
router.get("/simulation", getSimulation);
router.get("/home-away", getHomeAwayMatches);

export default router;
