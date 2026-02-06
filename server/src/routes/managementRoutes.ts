import express from "express";
import {
  updateStandings,
  updateMatchStats,
  updateFutureMatches,
  updateAll,
  updateGoalScorers,
  updateOdds,
  updateImageUrls,
  updateSquad,
} from "../controllers/managementController";

const router = express.Router();

router.post("/standings", updateStandings);
router.post("/match-stats", updateMatchStats);
router.post("/future-matches", updateFutureMatches);
router.post("/update-all", updateAll);
router.get("/goal-scorers", updateGoalScorers);
router.post("/odds", updateOdds);
router.post("/images", updateImageUrls);
router.post("/squad", updateSquad);

export default router;
