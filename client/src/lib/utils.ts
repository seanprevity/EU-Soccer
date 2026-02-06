import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { toast } from "sonner";
import { head2Head, matchStats } from "@/types/drizzleTypes";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type MutationMessages = {
  success?: string;
  error: string;
};

export const withToast = async <T>(
  mutationFn: Promise<T>,
  messages: Partial<MutationMessages>
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

export const currentSeason = "2025";
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
    x.toLowerCase().localeCompare(y.toLowerCase())
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
  awayTeam: string
) {
  if (!last5Matches || !data) return [];

  const sumStat = (
    statHome: keyof matchStats,
    statAway: keyof matchStats,
    team: string
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
    { homeWins: 0, awayWins: 0 }
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

export const getMatchResult = (match: matchStats, teamName: string) => {
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
  { key: "hs", label: "Shots" },
  { key: "hst", label: "Shots on Target" },
  { key: "hc", label: "Corners" },
  { key: "hf", label: "Fouls" },
  { key: "hy", label: "Yellow Cards" },
  { key: "hr", label: "Red Cards" },
];

export const HEADER_CONFIG = [
  { label: "Position", key: "position" },
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
