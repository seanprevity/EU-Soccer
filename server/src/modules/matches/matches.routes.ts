import express from "express";
import { validate } from "../../middleware/validation";
import {
  getHomeAwayMatches,
  getLast5Matches,
  getMatchStats,
  getOdds,
  getPastMatches,
  getRecentMatches,
  getSimulation,
  getUpcomingMatchById,
  getUpcomingMatches,
} from "./matches.controller";
import {
  getMatchStatsSchemas,
  getMatchupSchemas,
  getOddsSchemas,
  getTeamMatchesSchemas,
  getUpcomingMatchByIdSchemas,
} from "./matches.schemas";

const router = express.Router();

router.get("/stats", validate(getMatchStatsSchemas), getMatchStats);
router.get("/upcoming", getUpcomingMatches);
router.get("/past", getPastMatches);
router.get(
  "/upcoming/:id",
  validate(getUpcomingMatchByIdSchemas),
  getUpcomingMatchById,
);
router.get("/odds/:id", validate(getOddsSchemas), getOdds);
router.get("/last5", validate(getTeamMatchesSchemas), getLast5Matches);
router.get("/recent", validate(getTeamMatchesSchemas), getRecentMatches);
router.get("/simulation", validate(getMatchupSchemas), getSimulation);
router.get("/home-away", validate(getMatchupSchemas), getHomeAwayMatches);

export default router;
