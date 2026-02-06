import express from "express";
import { getSquad } from "../controllers/squadController";

const router = express.Router();

router.get("/", getSquad);

export default router;
