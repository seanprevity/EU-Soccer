import express from "express";
import { validate } from "../../middleware/validation";
import {
  backfillMatches,
  getStatus,
  importMatches,
  updateAll,
  updateFutureMatches,
  updateImages,
  updateOdds,
  updateSquads,
  updateStandings,
  updateTopPlayers,
} from "./management.controller";
import {
  backfillSchemas,
  imagesSchemas,
  importMatchesSchemas,
  leagueJobSchemas,
} from "./management.schemas";

const router = express.Router();

router.get("/status", getStatus);
router.post("/update-all", validate(leagueJobSchemas), updateAll);
router.post("/import-matches", validate(importMatchesSchemas), importMatches);
router.post("/backfill", validate(backfillSchemas), backfillMatches);
router.post("/standings", validate(leagueJobSchemas), updateStandings);
router.post("/future-matches", validate(leagueJobSchemas), updateFutureMatches);
router.post("/odds", validate(leagueJobSchemas), updateOdds);
router.post("/squad", validate(leagueJobSchemas), updateSquads);
router.post("/top-players", validate(leagueJobSchemas), updateTopPlayers);
router.post("/images", validate(imagesSchemas), updateImages);

export default router;
