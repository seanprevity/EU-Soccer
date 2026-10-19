import express from "express";
import { getLeagueByTeam, getTeamByName } from "./teams.controller";

const router = express.Router();

router.get("/", getTeamByName);
router.get("/league", getLeagueByTeam);

export default router;
