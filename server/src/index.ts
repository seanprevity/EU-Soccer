import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";
import bodyParser from "body-parser";
import "../drizzle/relations";
import standingsRoutes from "./routes/standingsRoutes";
import managementRoutes from "./routes/managementRoutes";
import matchRoutes from "./routes/matchRoutes";
import h2hRoutes from "./routes/h2hRoutes";
import teamStatsRoutes from "./routes/teamStatsRoutes";
import teamsRoutes from "./routes/teamsRoutes";
import squadRoutes from "./routes/squadRoutes";
import "./lib/db";

dotenv.config();

const app = express();
app.use(express.json());
app.use(helmet());
app.use(helmet.crossOriginResourcePolicy({ policy: "cross-origin" }));
app.use(morgan("common"));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cors());

app.get("/", (req, res) => {
  res.send("This is the home route.");
});

app.use("/standings", standingsRoutes);
app.use("/management", managementRoutes);
app.use("/matches", matchRoutes);
app.use("/h2h", h2hRoutes);
app.use("/teamstats", teamStatsRoutes);
app.use("/teams", teamsRoutes);
app.use("/squad", squadRoutes);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
