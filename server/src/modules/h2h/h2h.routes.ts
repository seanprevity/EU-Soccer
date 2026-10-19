import express from "express";
import { validate } from "../../middleware/validation";
import { getH2H, getH2HMatches, getUpcomingH2H } from "./h2h.controller";
import {
  getH2HMatchesSchemas,
  getH2HSchemas,
  getUpcomingH2HSchemas,
} from "./h2h.schemas";

const router = express.Router();

router.get("/teams", validate(getH2HSchemas), getH2H);
router.get("/matches", validate(getH2HMatchesSchemas), getH2HMatches);
router.get("/upcoming", validate(getUpcomingH2HSchemas), getUpcomingH2H);

export default router;
