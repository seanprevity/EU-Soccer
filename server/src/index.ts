import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import "../drizzle/relations";
import "./lib/db";
import standingsRoutes from "./routes/standingsRoutes";
import managementRoutes from "./routes/managementRoutes";
import matchRoutes from "./routes/matchRoutes";
import h2hRoutes from "./routes/h2hRoutes";
import teamStatsRoutes from "./routes/teamStatsRoutes";
import teamsRoutes from "./routes/teamsRoutes";
import squadRoutes from "./routes/squadRoutes";
import { requireAdminKey } from "./middleware/requireAdminKey";

const allowedOrigins =
  process.env.FRONTEND_URL?.split(",") // split different urls by comma
    .map((o) => o.trim())
    .filter(Boolean) ?? [];

const app = express();
app.set("trust proxy", 1);
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(cors({ origin: allowedOrigins.length ? allowedOrigins : false }));
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/standings", standingsRoutes);
app.use("/management", requireAdminKey, managementRoutes);
app.use("/matches", matchRoutes);
app.use("/h2h", h2hRoutes);
app.use("/teamstats", teamStatsRoutes);
app.use("/teams", teamsRoutes);
app.use("/squad", squadRoutes);

const PORT = Number(process.env.PORT) || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
