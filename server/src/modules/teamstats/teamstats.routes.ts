import express from "express";
import { getLast5TeamStats, getSeasonTeamStats } from "./teamstats.controller";
import { validate } from "../../middleware/validation";
import { getTeamStatsSchemas } from "./teamstats.schemas";

const router = express.Router();

router.get("/season", validate(getTeamStatsSchemas), getSeasonTeamStats);
router.get("/last5", validate(getTeamStatsSchemas), getLast5TeamStats);

export default router;
