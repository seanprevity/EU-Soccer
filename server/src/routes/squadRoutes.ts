import express from "express";
import { getSquad, getTopPlayers } from "../controllers/squadController";

const router = express.Router();

router.get("/", getSquad);
router.get("/top-players", getTopPlayers);

export default router;
