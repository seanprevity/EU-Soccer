import express from "express";
import { validate } from "../../middleware/validation";
import {
  getHomeAwayMatches,
  getLiveMatch,
  getLiveMatches,
  getMatchFilterOptions,
  getMatchStats,
  getOdds,
  getPastMatches,
  getRecentMatches,
  getSimulation,
  getUpcomingLineups,
  getUpcomingMatchById,
  getUpcomingMatches,
} from "./matches.controller";
import {
  getLiveMatchSchemas,
  getMatchFilterOptionsSchemas,
  getMatchStatsSchemas,
  getMatchupSchemas,
  getOddsSchemas,
  getRecentMatchesSchemas,
  getUpcomingLineupsSchemas,
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
router.get("/recent", validate(getRecentMatchesSchemas), getRecentMatches);
router.get(
  "/filters",
  validate(getMatchFilterOptionsSchemas),
  getMatchFilterOptions,
);
router.get("/simulation", validate(getMatchupSchemas), getSimulation);
router.get("/home-away", validate(getMatchupSchemas), getHomeAwayMatches);
router.get("/live", getLiveMatches);
router.get("/live/:espnId", validate(getLiveMatchSchemas), getLiveMatch);
router.get(
  "/upcoming/:id/lineups",
  validate(getUpcomingLineupsSchemas),
  getUpcomingLineups,
);

export default router;
