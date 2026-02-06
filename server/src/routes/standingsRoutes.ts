import express from "express";
import {
  getGoalScorers,
  getStandings,
  getTeamStandings,
  getRecentTeamStandings,
  getRecentTableStandings,
} from "../controllers/standingsController";

const router = express.Router();

// Works
router.get("/", getStandings);
router.get("/recent", getRecentTeamStandings);
router.get("/table", getRecentTableStandings);
router.get("/goal-scorers", getGoalScorers);
router.get('/teams', getTeamStandings);

export default router;
