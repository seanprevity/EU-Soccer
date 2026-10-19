import axios from "axios";
import { and, eq, gte, inArray, isNull, lt, or } from "drizzle-orm";
import { db } from "../lib/db";
import {
  LineupPlayer,
  MatchEvent,
  MatchLineups,
  matchStats,
  players,
  TeamLineup,
  teams,
} from "../../drizzle/schema";
import { curSeason, espnTeam } from "../config/map";

// Shared ESPN plumbing (also used by the squad sync)
export const espn = axios.create({
  baseURL: "https://site.web.api.espn.com/apis/site/v2/sports/soccer",
  validateStatus: (s) => s < 500, // handle 4xx ourselves instead of throwing
});

const CORE = "https://sports.core.api.espn.com/v2/sports/soccer/leagues";

export const ESPN_DELAY_MS = 1000;
export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type Side = "home" | "away";

type EspnMatch = {
  id: string;
  home: string;
  away: string;
  rawHome: string; // ESPN names, for logging unmatched teams
  rawAway: string;
  sideById: Map<string, Side>; // ESPN team id -> side
  completed: boolean;
  homePoss: number | null;
  awayPoss: number | null;
  events: MatchEvent[];
  date: string | null; // kickoff, ISO UTC
  statusName: string; // e.g. "STATUS_FULL_TIME"
  homeScore: number | null;
  awayScore: number | null;
  homeTeamId: string;
  awayTeamId: string;
};

const isGoal = (kind: MatchEvent["kind"]) =>
  kind === "goal" || kind === "penalty" || kind === "own_goal";

// "67'" -> 67, "45'+2'" -> 45 + 2
const parseMinute = (display: string | undefined) => {
  const m = /(\d+)'?\s*(?:\+\s*(\d+))?/.exec(display ?? "");
  return {
    minute: m ? Number(m[1]) : null,
    extraMinute: m?.[2] ? Number(m[2]) : null,
  };
};

// statistics[] -> { name, displayValue }, used on scoreboard competitors
const statValue = (holder: any, name: string): number | null => {
  const stat = holder?.statistics?.find((s: any) => s.name === name);
  const value = stat ? parseFloat(stat.displayValue) : NaN;
  return Number.isFinite(value) ? value : null;
};

const flip = (side: MatchEvent["side"]): MatchEvent["side"] =>
  side === "home" ? "away" : side === "away" ? "home" : null;

const byMinute = (a: MatchEvent, b: MatchEvent) =>
  (a.minute ?? 0) - (b.minute ?? 0) ||
  (a.extraMinute ?? 0) - (b.extraMinute ?? 0);

const toScore = (v: unknown) => {
  const n = Number(v);
  return Number.isInteger(n) ? n : null;
};

// Scoreboard: events[] -> competitions[0] -> competitors[] + details[]
const parseEspnEvent = (ev: any): EspnMatch | null => {
  const comp = ev.competitions?.[0];
  const home = comp?.competitors?.find((c: any) => c.homeAway === "home");
  const away = comp?.competitors?.find((c: any) => c.homeAway === "away");
  if (!home || !away) return null;

  const sideById = new Map<string, Side>([
    [String(home.team?.id), "home"],
    [String(away.team?.id), "away"],
  ]);

  const events: MatchEvent[] = (comp.details ?? [])
    .filter((d: any) => {
      if (d.shootout) return false;
      if (d.scoringPlay) return true;
      // Cards shown to coaches/staff have no athletesInvolved, so there's no player to show
      if (d.yellowCard || d.redCard)
        return Boolean(d.athletesInvolved?.[0]?.displayName);
      return false;
    })
    .map((d: any): MatchEvent => {
      const player = d.athletesInvolved?.[0];
      const eventSide = sideById.get(String(d.team?.id)) ?? null;
      const minutes = parseMinute(d.clock?.displayValue);

      if (!d.scoringPlay) {
        // Card: side is the team of the carded player
        const typeText = String(d.type?.text ?? "").toLowerCase();
        return {
          ...minutes,
          side: eventSide,
          player: player?.displayName ?? null,
          assist: null,
          kind: d.redCard
            ? typeText.includes("second")
              ? "second_yellow"
              : "red"
            : "yellow",
        };
      }

      // Goal: side is stored as the team the goal counts for. For an own goal that's the
      // opposite of the scorer's team, when ESPN tells us the scorer's team.
      const scorerSide = sideById.get(String(player?.team?.id)) ?? null;
      return {
        ...minutes,
        side: d.ownGoal
          ? scorerSide
            ? flip(scorerSide)
            : eventSide
          : eventSide,
        player: player?.displayName ?? null,
        assist: d.athletesInvolved?.[1]?.displayName ?? null,
        kind: d.ownGoal ? "own_goal" : d.penaltyKick ? "penalty" : "goal",
      };
    })
    .sort(byMinute);

  const rawHome = home.team?.displayName ?? home.team?.name ?? "";
  const rawAway = away.team?.displayName ?? away.team?.name ?? "";

  return {
    id: String(ev.id),
    home: espnTeam(rawHome),
    away: espnTeam(rawAway),
    rawHome,
    rawAway,
    sideById,
    completed: ev.status?.type?.completed === true,
    homePoss: statValue(home, "possessionPct"),
    awayPoss: statValue(away, "possessionPct"),
    events,
    date: ev.date ? new Date(ev.date).toISOString() : null,
    statusName: ev.status?.type?.name ?? "",
    homeScore: toScore(home.score),
    awayScore: toScore(away.score),
    homeTeamId: String(home.team?.id),
    awayTeamId: String(away.team?.id),
  };
};

// One league, one date (YYYYMMDD). ESPN rejects date ranges for soccer.
const fetchEspnDay = async (
  espnLeague: string,
  date: string,
): Promise<EspnMatch[] | null> => {
  const res = await espn.get(`/${espnLeague}/scoreboard`, {
    params: { dates: date },
  });
  if (res.status !== 200) {
    console.warn(
      `ESPN scoreboard ${espnLeague} ${date} → ${res.status}`,
      res.data,
    );
    return null;
  }
  const events: any[] = res.data?.events ?? [];
  return events.map(parseEspnEvent).filter((m): m is EspnMatch => m !== null);
};

// Summary: rosters[] (lineups), keyEvents[] (subs, assists)
const fetchEspnSummary = async (
  espnLeague: string,
  eventId: string,
): Promise<any | null> => {
  const res = await espn.get(`/${espnLeague}/summary`, {
    params: { event: eventId },
  });
  if (res.status !== 200) {
    console.warn(
      `ESPN summary ${espnLeague} ${eventId} → ${res.status}`,
      res.data,
    );
    return null;
  }
  return res.data;
};

const parseSubs = (summary: any, match: EspnMatch): MatchEvent[] =>
  (summary?.keyEvents ?? [])
    .filter((e: any) => e.type?.type === "substitution")
    .map(
      (e: any): MatchEvent => ({
        ...parseMinute(e.clock?.displayValue),
        side: match.sideById.get(String(e.team?.id)) ?? null,
        // "Trey Nyoni replaces Florian Wirtz": participants[0] comes on, participants[1] goes off
        player: e.participants?.[0]?.athlete?.displayName ?? null,
        playerOut: e.participants?.[1]?.athlete?.displayName ?? null,
        assist: null,
        kind: "sub",
      }),
    );

const parseLineups = (summary: any): MatchLineups | null => {
  const team = (homeAway: Side): TeamLineup | null => {
    const r = (summary?.rosters ?? []).find(
      (x: any) => x.homeAway === homeAway,
    );
    if (!r?.roster?.length) return null;
    return {
      formation: r.formation ?? null,
      players: r.roster.map(
        (p: any): LineupPlayer => ({
          espnId: String(p.athlete?.id ?? ""),
          name: p.athlete?.displayName ?? "",
          shortName: p.athlete?.shortName ?? null,
          jersey: p.jersey ?? null,
          position: p.position?.abbreviation ?? null,
          positionName: p.position?.displayName ?? null,
          formationPlace: p.formationPlace ? Number(p.formationPlace) : null,
          starter: Boolean(p.starter),
          subbedIn: Boolean(p.subbedIn),
          subbedOut: Boolean(p.subbedOut),
          headshot: p.athlete?.headshot?.href ?? null,
        }),
      ),
    };
  };
  const home = team("home");
  const away = team("away");
  return home && away ? { home, away } : null;
};

// Players ESPN has no headshot for: fall back to the image already stored in the players table
const fillMissingHeadshots = async (lineups: MatchLineups) => {
  const all = [...lineups.home.players, ...lineups.away.players];
  const missing = all.filter((p) => !p.headshot && p.name).map((p) => p.name);
  if (!missing.length) return;
  const rows = await db
    .select({ name: players.name, imageUrl: players.imageUrl })
    .from(players)
    .where(inArray(players.name, missing));
  const byName = new Map(rows.map((r) => [r.name, r.imageUrl]));
  for (const p of all) if (!p.headshot) p.headshot = byName.get(p.name) ?? null;
};

// Fallback: gets assist from the text if it is there: "Assisted by Bukayo Saka with a cross." -> "Bukayo Saka"
const assistFromText = (text: string | undefined) =>
  /Assisted by (.+?)(?=\s+(?:with|following|after)\b|\.(?:\s|$)|$)/.exec(
    text ?? "",
  )?.[1] ?? null;

// Get assists from summary key events if available
const addAssists = (events: MatchEvent[], summary: any): MatchEvent[] => {
  const goalEvents: any[] = (summary?.keyEvents ?? []).filter(
    (k: any) => k.scoringPlay,
  );
  const used = new Set<any>();

  return events.map((e) => {
    if (!isGoal(e.kind) || e.kind === "own_goal" || e.assist) return e;
    const match = goalEvents.find((k) => {
      if (used.has(k)) return false;
      const m = parseMinute(k.clock?.displayValue);
      return (
        m.minute === e.minute &&
        m.extraMinute === e.extraMinute &&
        k.participants?.[0]?.athlete?.displayName === e.player
      );
    });
    if (!match) return e;
    used.add(match);
    const assist =
      match.participants?.[1]?.athlete?.displayName ??
      assistFromText(match.text);
    return assist ? { ...e, assist } : e;
  });
};

// Core API team statistics (shots, corners, fouls, cards, possession, xG)

// One team's match statistics: stat name -> exact value
const fetchEspnTeamStats = async (
  espnLeague: string,
  eventId: string,
  teamId: string,
) => {
  const res = await axios.get(
    `${CORE}/${espnLeague}/events/${eventId}/competitions/${eventId}/competitors/${teamId}/statistics`,
    { validateStatus: (s) => s < 500 },
  );
  if (res.status !== 200) {
    console.warn(`ESPN core stats ${eventId}/${teamId} → ${res.status}`);
    return null;
  }
  const values = new Map<string, number>();
  for (const category of res.data?.splits?.categories ?? [])
    for (const s of category.stats ?? [])
      if (Number.isFinite(s.value)) values.set(s.name, s.value);
  return values;
};

type StatMap = Map<string, number> | null;

const statColumns = (h: StatMap, a: StatMap) => {
  const value = (m: StatMap, name: string) => m?.get(name) ?? null;
  // Counts arrive as numbers like 13 or 13.0; this only strips the float representation
  const count = (m: StatMap, name: string) => {
    const v = value(m, name);
    return v == null ? null : Math.round(v);
  };
  // Two decimal places; EPSILON nudges values like 1.005 so they round up as expected
  const twoDp = (v: number | null) =>
    v == null ? null : Math.round((v + Number.EPSILON) * 100) / 100;
  return {
    hs: count(h, "totalShots"),
    as: count(a, "totalShots"),
    hst: count(h, "shotsOnTarget"),
    ast: count(a, "shotsOnTarget"),
    hc: count(h, "wonCorners"),
    ac: count(a, "wonCorners"),
    hf: count(h, "foulsCommitted"),
    af: count(a, "foulsCommitted"),
    hy: count(h, "yellowCards"),
    ay: count(a, "yellowCards"),
    hr: count(h, "redCards"),
    ar: count(a, "redCards"),
    hbs: count(h, "blockedShots"),
    abs: count(a, "blockedShots"),
    hsv: count(h, "saves"),
    asv: count(a, "saves"),
    hxg: twoDp(value(h, "expectedGoals")),
    axg: twoDp(value(a, "expectedGoals")),
  };
};

// Import

// Matches ESPN lists for a date but that weren't actually played to a result
const SKIP_STATUSES = new Set([
  "STATUS_POSTPONED",
  "STATUS_CANCELED",
  "STATUS_ABANDONED",
  "STATUS_SUSPENDED",
  "STATUS_FORFEIT",
]);

// Drop null and undefined fields, so an update never erases a value already stored
const definedOnly = <T extends object>(o: T) =>
  Object.fromEntries(
    Object.entries(o).filter(([, v]) => v != null),
  ) as Partial<T>;

// Every UTC day from `from` to `to`, as ESPN's YYYYMMDD
const utcDays = (from: Date, to: Date) => {
  const days: string[] = [];
  const d = new Date(
    Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()),
  );
  while (d <= to) {
    days.push(d.toISOString().slice(0, 10).replace(/-/g, ""));
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return days;
};

type StoredMatch = typeof matchStats.$inferSelect;
const isComplete = (r: StoredMatch) =>
  Boolean(r.espnId && r.events && r.lineups && r.hxg != null);

// Completed matches from ESPN between `since` and `to`: inserts new ones and fills in anything
// missing. `refresh` re-fetches matches that are already complete (for one-off backfills).
export const importEspnMatchesService = async (
  league: string,
  espnLeague: string,
  since: Date,
  { refresh = false, to = new Date() }: { refresh?: boolean; to?: Date } = {},
) => {
  const known = new Set(
    (await db.select({ name: teams.teamName }).from(teams)).map((t) => t.name),
  );
  let inserted = 0;
  let updated = 0;

  for (const date of utcDays(since, to)) {
    const day = await fetchEspnDay(espnLeague, date);
    await sleep(ESPN_DELAY_MS);
    if (!day) continue;

    for (const m of day) {
      if (!m.completed || SKIP_STATUSES.has(m.statusName)) continue;

      // Never create teams from ESPN names: an unmapped name would split a club in two
      if (!known.has(m.home) || !known.has(m.away)) {
        console.warn(
          `ESPN import: unknown team in "${m.rawHome} vs ${m.rawAway}" (mapped to "${m.home}" / "${m.away}"), add it to ESPN_MAP`,
        );
        continue;
      }
      if (m.homeScore == null || m.awayScore == null || !m.date) {
        console.warn(
          `ESPN import: ${m.home} vs ${m.away} has no score or date, skipped`,
        );
        continue;
      }

      // Existing row: by ESPN id, or a CSV-era row for the same fixture on the same UTC day
      const dayKey = m.date.slice(0, 10);
      const [existing] = await db
        .select()
        .from(matchStats)
        .where(
          or(
            eq(matchStats.espnId, m.id),
            and(
              isNull(matchStats.espnId),
              eq(matchStats.homeTeam, m.home),
              eq(matchStats.awayTeam, m.away),
              gte(matchStats.matchDate, `${dayKey}T00:00:00.000Z`),
              lt(matchStats.matchDate, `${dayKey}T23:59:59.999Z`),
            ),
          ),
        )
        .limit(1);

      if (existing && !refresh && isComplete(existing)) continue;

      const summary = await fetchEspnSummary(espnLeague, m.id);
      await sleep(ESPN_DELAY_MS);
      const homeStats = await fetchEspnTeamStats(
        espnLeague,
        m.id,
        m.homeTeamId,
      );
      await sleep(ESPN_DELAY_MS);
      const awayStats = await fetchEspnTeamStats(
        espnLeague,
        m.id,
        m.awayTeamId,
      );
      await sleep(ESPN_DELAY_MS);

      // Goal events must add up to the final score, or the timeline is incomplete
      const goals = m.events.filter((e) => isGoal(e.kind));
      const eventsOk =
        !m.events.some((e) => e.side === null) &&
        goals.filter((g) => g.side === "home").length === m.homeScore &&
        goals.filter((g) => g.side === "away").length === m.awayScore;
      if (!eventsOk)
        console.warn(
          `ESPN import: ${m.home} vs ${m.away} goal events don't add up to ${m.homeScore}-${m.awayScore}; timeline left empty`,
        );

      const lineups = summary ? parseLineups(summary) : null;
      if (lineups) await fillMissingHeadshots(lineups);
      if (summary && !lineups)
        console.warn(`ESPN import: no lineups for ${m.home} vs ${m.away}`);

      const events = !eventsOk
        ? null
        : summary
          ? [...addAssists(m.events, summary), ...parseSubs(summary, m)].sort(
              byMinute,
            )
          : m.events;

      const values = {
        espnId: m.id,
        league,
        homeTeam: m.home,
        awayTeam: m.away,
        matchDate: m.date,
        fthg: m.homeScore,
        ftag: m.awayScore,
        ftr:
          m.homeScore > m.awayScore
            ? "H"
            : m.homeScore < m.awayScore
              ? "A"
              : "D",
        ...statColumns(homeStats, awayStats),
        hposs: homeStats?.get("possessionPct") ?? m.homePoss,
        aposs: awayStats?.get("possessionPct") ?? m.awayPoss,
        events,
        lineups,
      };

      if (existing) {
        await db
          .update(matchStats)
          .set(definedOnly(values))
          .where(eq(matchStats.id, existing.id));
        updated++;
      } else {
        await db.insert(matchStats).values(values);
        inserted++;
      }
    }
  }

  console.log(`ESPN import ${league}: ${inserted} new, ${updated} updated`);
  return { inserted, updated };
};

// One past season for one league: 1 = last season, 2 = the one before, and so on.
// Fills in what's missing by default; pass refresh to overwrite with ESPN's values.
export const backfillEspnMatchDataService = (
  league: string,
  espnLeague: string,
  seasonsAgo = 1,
  refresh = false,
) =>
  importEspnMatchesService(
    league,
    espnLeague,
    new Date(Date.UTC(Number(curSeason) - seasonsAgo, 7, 1)),
    {
      refresh,
      to: new Date(Date.UTC(Number(curSeason) - seasonsAgo + 1, 7, 1)),
    },
  );
