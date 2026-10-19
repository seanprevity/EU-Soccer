import express from "express";
import { getH2H, getH2HMatches, getUpcomingH2H } from "./h2h.controller";

const router = express.Router();

router.get("/teams", getH2H);
router.get("/matches", getH2HMatches);
router.get("/upcoming", getUpcomingH2H);

export default router;
