import express from "express";
import {
  getH2H,
  getH2HMatches,
  getUpcomingH2H,
} from "../controllers/h2hController";

const router = express.Router();

// Works, upcoming may be inefficient
router.get("/teams", getH2H);
router.get("/matches", getH2HMatches);
router.get("/upcoming", getUpcomingH2H);

export default router;
