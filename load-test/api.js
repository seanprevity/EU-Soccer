import http from "k6/http";
import { check, group, sleep } from "k6";

// The API's public URL (the same one as NEXT_PUBLIC_BASE_API_URL), passed in with -e
const BASE_URL = __ENV.BASE_URL;
if (!BASE_URL) {
  throw new Error(
    "Set BASE_URL: k6 run -e BASE_URL=... load-tests/api.js",
  );
}

const TEAMS = [
  "Arsenal",
  "Liverpool",
  "Man City",
  "Chelsea",
  "Newcastle",
  "Bayern Munich",
  "Real Madrid",
  "Inter",
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

function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

// One GET, labelled by endpoint so results are grouped per route
function get(path, endpoint) {
  const res = http.get(`${BASE_URL}${path}`, { tags: { name: endpoint } });
  check(res, { [`${endpoint}: status 200`]: (r) => r.status === 200 });
  return res;
}

// Each virtual user does a home page visit, then a team page visit
export default function () {
  group("home page", () => {
    get("/matches/live", "live");
    get("/matches/upcoming", "upcoming");
    get("/standings?league=Premier%20League&season=2026", "standings");
  });
  sleep(2); // reading time

  const team = encodeURIComponent(pick(TEAMS));
  group("team page", () => {
    get(`/matches/recent?team=${team}&offset=0&limit=10`, "recent");
    get(`/matches/filters?team=${team}`, "filters");
  });
  sleep(3);
}
