import http from "k6/http";
import { check, group, sleep } from "k6";

// The API's public URL (the same one as NEXT_PUBLIC_BASE_API_URL), passed in with -e
const BASE_URL = __ENV.BASE_URL;
if (!BASE_URL) {
  throw new Error("Set BASE_URL: k6 run -e BASE_URL=... load-test/api.js");
}

// League names exactly as stored in the database
const LEAGUES = [
  "Premier League",
  "La Liga",
  "Serie A",
  "Bundesliga",
  "Ligue 1",
];

// Seasons as stored (the starting year, e.g. "2026" for 2026-27)
const FIRST_SEASON = 2005;
const LAST_SEASON = 2026;
const SEASONS = [];
for (let year = FIRST_SEASON; year <= LAST_SEASON; year++) {
  SEASONS.push(String(year));
}

// Team names exactly as stored in the teams table
const TEAMS = [
  // Premier League
  "Arsenal",
  "Liverpool",
  "Man City",
  "Man United",
  "Chelsea",
  "Tottenham",
  "Newcastle",
  "Aston Villa",
  "Brighton",
  "Hull",
  "Everton",

  // La Liga
  "Real Madrid",
  "Barcelona",
  "Atletico Madrid",
  "Sevilla",
  "Villarreal",
  "Real Sociedad",
  "Real Betis",

  // Serie A
  "Inter",
  "Milan",
  "Juventus",
  "Napoli",
  "Roma",
  "Lazio",
  "Atalanta",

  // Bundesliga
  "Bayern Munich",
  "Dortmund",
  "Leverkusen",
  "RB Leipzig",
  "Eintracht Frankfurt",
  "VfB Stuttgart",

  // Ligue 1
  "PSG",
  "Marseille",
  "Lyon",
  "Monaco",
  "Lille",
  "Nice",
];

export const options = {
  // Ramp up, hold, ramp down: about 5 minutes in total
  stages: [
    { duration: "1m", target: 5 },
    { duration: "3m", target: 20 },
    { duration: "1m", target: 0 },
  ],
  // Pass/fail criteria: under 1% errors, and 95% of requests within 800 ms
  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<800"],
  },
};

// One GET, labelled by endpoint so results are grouped per route
function get(path, endpoint) {
  const res = http.get(`${BASE_URL}${path}`, { tags: { name: endpoint } });
  check(res, { [`${endpoint}: status 200`]: (r) => r.status === 200 });
  if (res.status !== 200)
    console.warn(
      `${endpoint} → ${res.status}: ${String(res.body).slice(0, 80)}`,
    );
  return res;
}

function pick(list) {
  if (!list || list.length === 0) return undefined;
  return list[Math.floor(Math.random() * list.length)];
}

// Parses a JSON body, or returns a fallback when the request failed
function jsonOr(res, fallback) {
  if (res.status !== 200) return fallback;
  return res.json();
}

const TOP_PLAYER_CATEGORIES = [
  "goals",
  "assists",
  "saves",
  "yellow_cards",
  "red_cards",
];

// Each virtual user does a home page visit, previews a match, then a team page visit
export default function () {
  const league = encodeURIComponent(pick(LEAGUES));
  const season = encodeURIComponent(pick(SEASONS));
  let fixtures = [];

  group("home page", () => {
    // loads live, upcoming, and past matches
    get("/matches/live", "live");
    get("/matches/past", "past");
    fixtures = jsonOr(get("/matches/upcoming", "upcoming"), []);
    const fixture = pick(fixtures);
    if (fixture) get(`/matches/odds/${fixture.id}`, "odds/:id");

    // loads first table, then random table with top players
    get(
      `/standings?league=${encodeURIComponent(LEAGUES[0])}&season=2026`,
      "standings",
    );
    get(`/standings?league=${league}&season=${season}`, "standings");
    get(
      `/squad/top-players?league=${league}&season=2026&category=${pick(TOP_PLAYER_CATEGORIES)}`,
      "top-players",
    );

    if (fixtures.length > 0) {
      const ids = fixtures.map((f) => f.id).join(",");
      get(`/h2h/upcoming?ids=${encodeURIComponent(ids)}`, "h2h-upcoming");
    }
  });
  sleep(5);

  // Match preview: one real upcoming fixture
  const fixture = pick(fixtures);
  if (fixture) {
    const home = encodeURIComponent(fixture.homeTeam);
    const away = encodeURIComponent(fixture.awayTeam);
    group("match preview", () => {
      get(`/matches/upcoming/${fixture.id}`, "upcoming/:id");
      get(`/matches/odds/${fixture.id}`, "odds/:id");
      get(`/matches/upcoming/${fixture.id}/lineups`, "lineups");
      get(`/h2h/matches?team1=${home}&team2=${away}`, "h2h-matches");
      get(
        `/matches/simulation?homeTeam=${home}&awayTeam=${away}`,
        "simulation",
      );
      get(`/teamstats/season?team1=${home}&team2=${away}`, "teamstats-season");
    });
    sleep(5);
  }

  const team = encodeURIComponent(pick(TEAMS));
  group("team page", () => {
    const recent = jsonOr(
      get(`/matches/recent?team=${team}&offset=0&limit=10`, "recent"),
      { matches: [] },
    );
    check(recent, { "recent: has matches": (r) => r.matches.length > 0 });
    get(`/matches/filters?team=${team}`, "filters");
    get(`/squad?team=${team}`, "squad");
  });
  sleep(5);
}
