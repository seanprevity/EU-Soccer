import { urlSeason } from "../utils/map";

// Prem, Bundesliga, Ligue 1, Serie A, La Liga.
export const competition_codes = ["PL", "BL1", "FL1", "SA", "PD"];

export const csv_urls = [
  `https://www.football-data.co.uk/mmz4281/${urlSeason}/E0.csv`,
  `https://www.football-data.co.uk/mmz4281/${urlSeason}/D1.csv`,
  `https://www.football-data.co.uk/mmz4281/${urlSeason}/F1.csv`,
  `https://www.football-data.co.uk/mmz4281/${urlSeason}/I1.csv`,
  `https://www.football-data.co.uk/mmz4281/${urlSeason}/SP1.csv`,
];

export const Leagues = [
  "Premier League",
  "Bundesliga",
  "Ligue 1",
  "Serie A",
  "La Liga",
];

export const odds_sports = [
  "soccer_epl",
  "soccer_spain_la_liga",
  "soccer_italy_serie_a",
  "soccer_germany_bundesliga",
  "soccer_france_ligue_one",
];

export const bookmakers = [
  "William Hill",
  "Sky Bet",
  "Betfair",
  "FanDuel",
  "DraftKings",
  "BetMGM",
];

export type StandingsStats = {
  played: number;
  won: number;
  draw: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
};
