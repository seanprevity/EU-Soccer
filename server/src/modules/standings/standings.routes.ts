import express from "express";
import {
  getStandings,
  getTeamStandings,
  getRecentTeamStandings,
  getRecentTableStandings,
  getTeamsExpectedStandings,
} from "./standings.controller";

const router = express.Router();

router.get("/", getStandings);
router.get("/recent", getRecentTeamStandings);
router.get("/table", getRecentTableStandings);
router.get("/teams", getTeamStandings);
router.get("/expected", getTeamsExpectedStandings);

export default router;
