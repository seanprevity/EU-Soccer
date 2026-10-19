import express from "express";
import { getSquad, getTopPlayers } from "./squads.controller";

const router = express.Router();

router.get("/", getSquad);
router.get("/top-players", getTopPlayers);

export default router;
