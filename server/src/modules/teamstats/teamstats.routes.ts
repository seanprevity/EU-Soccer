import express from "express";
import { getLast5TeamStats, getSeasonTeamStats } from "./teamstats.controller";

const router = express.Router();

router.get("/season", getSeasonTeamStats);
router.get("/last5", getLast5TeamStats);

export default router;
