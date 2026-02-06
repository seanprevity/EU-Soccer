import express from "express";
import { getLeagueByTeam, getTeamByName } from "../controllers/teamsController";

const router = express.Router();

// Works
router.get("/", getTeamByName);
router.get("/league", getLeagueByTeam);

export default router;
