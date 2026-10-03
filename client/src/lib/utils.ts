import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { toast } from "sonner";
import {
  head2Head,
  LineupPlayer,
  matchPreview,
  matchStats,
  TeamLineup,
} from "@/types/drizzleTypes";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type MutationMessages = {
  success?: string;
  error: string;
};

export const withToast = async <T>(
  mutationFn: Promise<T>,
  messages: Partial<MutationMessages>,
) => {
  const { success, error } = messages;

  try {
    const result = await mutationFn;
    if (success) toast.success(success);
    return result;
  } catch (err) {
    if (error) toast.error(error);
    throw err;
  }
};

export const LEAGUES = [
  "Premier League",
  "Bundesliga",
  "Serie A",
  "Ligue 1",
  "La Liga",
];

export const currentSeason = "2026";
export function generateSeasons() {
  const seasons = [];
  for (let start = 2005; start <= Number(currentSeason); start++) {
    const end = (start + 1) % 100;
    seasons.push(`${start}/${end.toString().padStart(2, "0")}`);
  }
  return seasons;
}

export function genCurrentSeason() {
  const next = (Number(currentSeason) + 1) % 100;
  return `${currentSeason}/${next.toString().padStart(2, "0")}`;
}

export function getLogoFile(teamName: string | null) {
  if (!teamName || teamName === "Treviso") return "crests/blank.svg";
  return "crests/" + teamName.replace(/\s+/g, "-") + ".svg";
}

export function getLeagueFile(league: string) {
  if (league === "") return "/leagues/Premier-League.png";
  if (league === "Premier League") {
    const path = "/leagues/" + league.replace(/\s+/g, "-") + ".png";
    return path;
  } else {
    const path = "/leagues/" + league.replace(/\s+/g, "-") + ".svg";
    return path;
  }
}

export function getCountryFile(country: string) {
  return "/countries/" + country.replace(/\s+/g, "-") + ".svg";
}

export function normalizeTeams(teamA: string, teamB: string): string {
  const [a, b] = [teamA.trim(), teamB.trim()].sort((x, y) =>
    x.toLowerCase().localeCompare(y.toLowerCase()),
  );
  return `${a}_${b}`;
}

export const emptyH2H = {
  team1: "",
  team2: "",
  mp: 0,
  team1Wins: 0,
  team2Wins: 0,
  draws: 0,
  last5: [],
};

export function getChartData(
  data: head2Head | null,
  last5Matches: matchStats[] | null,
  homeTeam: string,
  awayTeam: string,
) {
  if (!last5Matches || !data) return [];

  const sumStat = (
    statHome: keyof matchStats,
    statAway: keyof matchStats,
    team: string,
  ) =>
    last5Matches.reduce((sum, m) => {
      const homeValue =
        typeof m[statHome] === "number" ? (m[statHome] as number) : 0;
      const awayValue =
        typeof m[statAway] === "number" ? (m[statAway] as number) : 0;

      if (m.homeTeam === team) return sum + homeValue;
      if (m.awayTeam === team) return sum + awayValue;
      return sum;
    }, 0);
  // Calculate results from matches
  const results = last5Matches.reduce(
    (acc, m) => {
      if (m.fthg == null || m.ftag == null) return acc;
      if (m.fthg > m.ftag) {
        acc[m.homeTeam === homeTeam ? "homeWins" : "awayWins"]++;
      } else if (m.ftag > m.fthg) {
        acc[m.awayTeam === awayTeam ? "awayWins" : "homeWins"]++;
      }
      return acc;
    },
    { homeWins: 0, awayWins: 0 },
  );

  const homeGF = sumStat("fthg", "ftag", homeTeam);
  const awayGF = sumStat("fthg", "ftag", awayTeam);
  const homeShots = sumStat("hs", "as", homeTeam);
  const awayShots = sumStat("hs", "as", awayTeam);
  const homeShotsOnTarget = sumStat("hst", "ast", homeTeam);
  const awayShotsOnTarget = sumStat("hst", "ast", awayTeam);
  const homeCorners = sumStat("hc", "ac", homeTeam);
  const awayCorners = sumStat("hc", "ac", awayTeam);

  // Compose chart data
  const chartData = [
    {
      name: "Results",
      [homeTeam]: results.homeWins,
      [awayTeam]: results.awayWins,
    },
    {
      name: "Avg. Goals For",
      [homeTeam]: homeGF / 5,
      [awayTeam]: awayGF / 5,
    },
    {
      name: "Avg. Shots",
      [homeTeam]: homeShots / 5,
      [awayTeam]: awayShots / 5,
    },
    {
      name: "Avg. Shots on Target",
      [homeTeam]: homeShotsOnTarget / 5,
      [awayTeam]: awayShotsOnTarget / 5,
    },
    {
      name: "Avg. Corners",
      [homeTeam]: homeCorners / 5,
      [awayTeam]: awayCorners / 5,
    },
  ];

  return chartData;
}

export function calculatePercentage(value: number, oppositeValue: number) {
  if (!value) return 0;
  if (!oppositeValue) return 100;
  const total = value + oppositeValue;
  return (value / total) * 100;
}

export const getMatchResult = (
  match: matchStats | matchPreview,
  teamName: string,
) => {
  const isHomeTeam = match.homeTeam === teamName;
  const teamScore = isHomeTeam ? match.fthg : match.ftag;
  const opponentScore = isHomeTeam ? match.ftag : match.fthg;

  if (teamScore! > opponentScore!) return "win";
  if (teamScore! < opponentScore!) return "loss";
  return "draw";
};

export const getResultColors = (result: string) => {
  switch (result) {
    case "win":
      return {
        rectangle: "bg-green-500",
        gradient:
          "bg-[linear-gradient(to_right,rgb(34_197_94/0.2)_0%,rgb(34_197_94/0.1)_20%,transparent_45%)]",
      };
    case "loss":
      return {
        rectangle: "bg-red-500",
        gradient:
          "bg-[linear-gradient(to_right,rgb(239_68_68/0.2)_0%,rgb(239_68_68/0.1)_20%,transparent_46%)]",
      };
    case "draw":
      return {
        rectangle: "bg-gray-500",
        gradient:
          "bg-[linear-gradient(to_right,rgb(156_163_175/0.2)_0%,rgb(156_163_175/0.1)_20%,transparent_46%)]",
      };
    default:
      return {
        rectangle: "bg-gray-500",
        gradient:
          "bg-[linear-gradient(to_right,rgb(156_163_175/0.2)_0%,rgb(156_163_175/0.1)_20%,transparent_46%)]",
      };
  }
};

export const statsKeys = [
  { key: "hxg", label: "Expected Goals" },
  { key: "hposs", label: "Possession" },
  { key: "hs", label: "Shots" },
  { key: "hst", label: "Shots on Target" },
  { key: "hbs", label: "Blocked Shots" },
  { key: "hsv", label: "Saves" },
  { key: "hc", label: "Corners" },
  { key: "hf", label: "Fouls" },
  { key: "hy", label: "Yellow Cards" },
];

export const HEADER_CONFIG = [
  { label: "Position", key: "position" },
  { label: "XPosition", key: "expectedPosition" },
  { label: "Club", key: "name" },
  { label: "P", key: "played" },
  { label: "W", key: "won" },
  { label: "D", key: "draw" },
  { label: "L", key: "lost" },
  { label: "GF", key: "goalsFor" },
  { label: "GA", key: "goalsAgainst" },
  { label: "GD", key: "goalDifference" },
  { label: "Pts", key: "points" },
  { label: "Form", key: "form" },
];

export function isPastMatch(matchDate: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const match = new Date(matchDate);
  match.setHours(0, 0, 0, 0);

  console.log(today);
  console.log(match);

  return match < today;
}

const POSITION_DEPTH: Record<string, number> = {
  G: 0,
  LB: 1,
  RB: 1,
  CD: 1,
  "CD-L": 1,
  "CD-R": 1,
  LWB: 1.5,
  RWB: 1.5,
  DM: 2,
  "DM-L": 2,
  "DM-R": 2,
  LM: 2.5,
  RM: 2.5,
  CM: 2.5,
  "CM-L": 2.5,
  "CM-R": 2.5,
  AM: 3,
  "AM-L": 3,
  "AM-R": 3,
  LW: 3,
  RW: 3,
  CF: 3.5,
  "CF-L": 3.5,
  "CF-R": 3.5,
  SS: 3.5,
  LF: 3.5,
  RF: 3.5,
  F: 4,
};

// Left-to-right order within a line: wide positions (LB, LM, RW...) sit outside
// the "-L"/"-R" central ones (CD-L, CM-R...), plain positions (CD, AM, F) in the middle.
const lateral = (pos: string | null) => {
  if (!pos) return 0;
  if (/-L$/.test(pos)) return -1;
  if (/-R$/.test(pos)) return 1;
  if (/^L/.test(pos)) return -2;
  if (/^R/.test(pos)) return 2;
  return 0;
};

export type PitchPlayer = { player: LineupPlayer; x: number; y: number }; // percentages

const KEEPER_Y = 86;
const BACK_LINE_Y = 70;
const FRONT_LINE_Y = 12;
const SIDE_MARGIN = 12;
const MAX_GAP = 34;

// Returns each starter's position on a vertical pitch (own goal at the bottom),
// or null when the data doesn't fit the formation, so callers can fall back to a list.
export function formationLayout(lineup: TeamLineup): PitchPlayer[] | null {
  const starters = lineup.players.filter((p) => p.starter);
  const lines = (lineup.formation ?? "").split("-").map(Number);
  if (
    starters.length !== 11 ||
    !lines.length ||
    lines.some((n) => !Number.isInteger(n) || n <= 0) ||
    lines.reduce((a, b) => a + b, 0) !== 10
  )
    return null;

  const keeper =
    starters.find((p) => p.position === "G") ??
    starters.find((p) => p.formationPlace === 1);
  if (!keeper) return null;

  const place = (p: LineupPlayer) => p.formationPlace ?? 99;
  const depth = (p: LineupPlayer) => POSITION_DEPTH[p.position ?? ""] ?? 2.5;

  const outfield = starters
    .filter((p) => p !== keeper)
    .sort((a, b) => depth(a) - depth(b) || place(a) - place(b));

  const placed: PitchPlayer[] = [{ player: keeper, x: 50, y: KEEPER_Y }];
  let i = 0;

  lines.forEach((size, lineIndex) => {
    const y =
      lines.length === 1
        ? (FRONT_LINE_Y + BACK_LINE_Y) / 2
        : BACK_LINE_Y -
          (lineIndex * (BACK_LINE_Y - FRONT_LINE_Y)) / (lines.length - 1);

    // Spread across the width between the margins
    const gap =
      size === 1 ? 0 : Math.min((100 - 2 * SIDE_MARGIN) / (size - 1), MAX_GAP);
    const startX = 50 - (gap * (size - 1)) / 2;

    const line = outfield
      .slice(i, i + size)
      .sort(
        (a, b) =>
          lateral(a.position) - lateral(b.position) || place(a) - place(b),
      );
    line.forEach((player, j) =>
      placed.push({ player, x: startX + j * gap, y }),
    );
    i += size;
  });

  return placed;
}
