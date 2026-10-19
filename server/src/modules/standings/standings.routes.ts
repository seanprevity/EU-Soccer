import express from "express";
import {
  getStandings,
  getTeamStandings,
  getRecentTeamStandings,
  getRecentTableStandings,
  getTeamsExpectedStandings,
} from "./standings.controller";
import { validate } from "../../middleware/validation";
import {
  getRecentStandingsSchemas,
  getStandingsSchemas,
  getTeamsExpectedStandingsSchemas,
  getTeamStandingsSchemas,
} from "./standings.schemas";

const router = express.Router();

router.get("/", validate(getStandingsSchemas), getStandings);
router.get(
  "/recent",
  validate(getRecentStandingsSchemas),
  getRecentTeamStandings,
);
router.get(
  "/table",
  validate(getRecentStandingsSchemas),
  getRecentTableStandings,
);
router.get("/teams", validate(getTeamStandingsSchemas), getTeamStandings);
router.get(
  "/expected",
  validate(getTeamsExpectedStandingsSchemas),
  getTeamsExpectedStandings,
);

export default router;
