import express from "express";
import {
  getStandings,
  getTeamStandings,
  getRecentTeamStandings,
  getRecentTableStandings,
  getTeamsExpectedStandings,
} from "../controllers/standingsController";

const router = express.Router();

// Works
router.get("/", getStandings);
router.get("/recent", getRecentTeamStandings);
router.get("/table", getRecentTableStandings);
router.get("/teams", getTeamStandings);
router.get("/expected", getTeamsExpectedStandings);

export default router;
