import express from "express"
import { getH2H, getUpcomingH2H } from "../controllers/h2hController";

const router = express.Router();

// Works, upcoming may be inefficient
router.get('/teams', getH2H);
router.get('/upcoming', getUpcomingH2H);

export default router;