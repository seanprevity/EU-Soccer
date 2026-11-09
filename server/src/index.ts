import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import "../drizzle/relations";
import "./lib/db";
import standingsRoutes from "./modules/standings/standings.routes";
import matchRoutes from "./modules/matches/matches.routes";
import h2hRoutes from "./modules/h2h/h2h.routes";
import teamStatsRoutes from "./modules/teamstats/teamstats.routes";
import teamsRoutes from "./modules/teams/teams.routes";
import squadRoutes from "./modules/squads/squads.routes";
import { env } from "./config/env";
import { errorHandler, notFound } from "./middleware/errorHandler";
import { startMetrics } from "./lib/metrics";
import { recordRequestMetrics } from "./middleware/metrics";

const app = express();
app.set("trust proxy", 1);
app.use(recordRequestMetrics);
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(cors({ origin: env.FRONTEND_URL }));
app.use(morgan(env.NODE_ENV === "production" ? "combined" : "dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/standings", standingsRoutes);
app.use("/matches", matchRoutes);
app.use("/h2h", h2hRoutes);
app.use("/teamstats", teamStatsRoutes);
app.use("/teams", teamsRoutes);
app.use("/squad", squadRoutes);

app.use(notFound);
app.use(errorHandler);

const PORT = env.PORT;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  startMetrics("api");
});
