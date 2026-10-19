import express from "express";
import { getSquad, getTopPlayers } from "./squads.controller";
import { validate } from "../../middleware/validation";
import { getSquadSchemas, getTopPlayersSchemas } from "./squads.schemas";

const router = express.Router();

router.get("/", validate(getSquadSchemas), getSquad);
router.get("/top-players", validate(getTopPlayersSchemas), getTopPlayers);

export default router;
