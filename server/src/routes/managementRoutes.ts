import express from "express";
import {
  updateStandings,
  updateFutureMatches,
  updateAll,
  updateOdds,
  updateImageUrls,
  updateSquad,
  updateTopPlayers,
} from "../controllers/managementController";

const router = express.Router();

router.post("/standings", updateStandings);
router.post("/future-matches", updateFutureMatches);
router.post("/update-all", updateAll);
router.get("/top-players", updateTopPlayers);
router.post("/odds", updateOdds);
router.post("/images", updateImageUrls);
router.post("/squad", updateSquad);

export default router;
