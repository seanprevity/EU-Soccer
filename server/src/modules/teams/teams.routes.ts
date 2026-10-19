import express from "express";
import { getLeagueByTeam, getTeamByName } from "./teams.controller";
import { getLeagueByTeamSchemas, getTeamByNameSchemas } from "./teams.schemas";
import { validate } from "../../middleware/validation";

const router = express.Router();

router.get("/", validate(getTeamByNameSchemas), getTeamByName);
router.get("/league", validate(getLeagueByTeamSchemas), getLeagueByTeam);

export default router;
