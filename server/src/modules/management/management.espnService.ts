import axios from "axios";
import { and, eq, gte, inArray, isNull, lt, or } from "drizzle-orm";
import { db } from "../../lib/db";
import {
  liveMatches,
  matchStats,
  players,
  teams,
} from "../../../drizzle/schema";
import { espnTeam } from "../../config/map";
import {
  HalfStats,
  LineupPlayer,
  MatchEvent,
  MatchLineups,
  MatchResult,
  NewLiveMatch,
  TeamLineup,
} from "@epl/shared";

// Site API: scoreboards and match summaries. Also used by the squad sync.
export const espn = axios.create({
  baseURL: "https://site.web.api.espn.com/apis/site/v2/sports/soccer",
  validateStatus: (status) => status < 500,
});

// Core API: detailed team statistics for one match, including xG
const ESPN_CORE_URL =
  "https://sports.core.api.espn.com/v2/sports/soccer/leagues";

export const ESPN_DELAY_MS = 1000;

export function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

// types

type Side = "home" | "away";

// Stat name to value: totalShots: 15, possessionPct: 57.2
type StatValues = Record<string, number>;

// One match from an ESPN scoreboard, with team names already mapped to ours
export type EspnMatch = {
  id: string;
  home: string; // our team name
  away: string;
  rawHome: string; // ESPN's team name, kept for logging unmapped teams
  rawAway: string;
  homeTeamId: string; // ESPN team ids
  awayTeamId: string;
  sideByTeamId: Map<string, Side>;
  date: string | null; // kickoff, ISO UTC
  statusName: string; // for example "STATUS_SECOND_HALF" or "STATUS_FULL_TIME"
  state: string; // "pre" before kickoff, "in" while playing, "post" after
  completed: boolean;
  clock: string | null; // ready to display, for example "90'+1'"
  period: string | null;
  homeScore: number | null;
  awayScore: number | null;
  events: MatchEvent[]; // goals and cards
  homeStats: StatValues; // the basic stats the scoreboard includes
  awayStats: StatValues;
};

type MinuteParts = {
  minute: number | null;
  extraMinute: number | null;
};

export type CoreStats = { home: StatValues | null; away: StatValues | null };

// Small helpers

// Both teams' core API statistics (the only source of xG)
export async function fetchCoreStats(
  espnLeague: string,
  match: EspnMatch,
): Promise<CoreStats> {
  const home = await fetchCoreTeamStats(espnLeague, match.id, match.homeTeamId);
  await sleep(ESPN_DELAY_MS);
  const away = await fetchCoreTeamStats(espnLeague, match.id, match.awayTeamId);
  return { home, away };
}

// "67'" becomes { minute: 67, extraMinute: null }; "45'+2'" becomes { minute: 45, extraMinute: 2 }
function parseMinute(displayValue: string | undefined): MinuteParts {
  const match = /(\d+)'?\s*(?:\+\s*(\d+))?/.exec(displayValue ?? "");
  if (!match) {
    return { minute: null, extraMinute: null };
  }
  return {
    minute: Number(match[1]),
    extraMinute: match[2] ? Number(match[2]) : null,
  };
}

// ESPN lists stats as [{ name, displayValue }]. This turns them into { name: number },
function readStats(holder: any): StatValues {
  const stats: StatValues = {};
  for (const stat of holder?.statistics ?? []) {
    const value = parseFloat(stat.displayValue);
    if (Number.isFinite(value)) {
      stats[stat.name] = value;
    }
  }
  return stats;
}

// Scores arrive as strings, for example "2"
function parseScore(score: unknown): number | null {
  const value = Number(score);
  return Number.isInteger(value) ? value : null;
}

function isGoal(kind: MatchEvent["kind"]): boolean {
  return kind === "goal" || kind === "penalty" || kind === "own_goal";
}

// Sort events by minute, then by added time
function compareByMinute(a: MatchEvent, b: MatchEvent): number {
  const minuteDifference = (a.minute ?? 0) - (b.minute ?? 0);
  if (minuteDifference !== 0) {
    return minuteDifference;
  }
  return (a.extraMinute ?? 0) - (b.extraMinute ?? 0);
}

// ESPN requests

// Every match in one league on one day. The date is YYYYMMDD; ESPN rejects date ranges.
export async function fetchScoreboard(
  espnLeague: string,
  date: string,
): Promise<EspnMatch[] | null> {
  const response = await espn.get(`/${espnLeague}/scoreboard`, {
    params: { dates: date },
  });
  if (response.status !== 200) {
    console.warn(
      `ESPN scoreboard ${espnLeague} ${date} → ${response.status}`,
      response.data,
    );
    return null;
  }

  const matches: EspnMatch[] = [];
  for (const event of response.data?.events ?? []) {
    const match = parseEspnEvent(event);
    if (match) {
      matches.push(match);
    }
  }
  return matches;
}

// One match's summary: lineups (rosters), substitutions and assists (keyEvents),
// and the full box score
export async function fetchSummary(
  espnLeague: string,
  eventId: string,
): Promise<any | null> {
  const response = await espn.get(`/${espnLeague}/summary`, {
    params: { event: eventId },
  });
  if (response.status !== 200) {
    console.warn(
      `ESPN summary ${espnLeague} ${eventId} → ${response.status}`,
      response.data,
    );
    return null;
  }
  return response.data;
}

// One team's statistics for one match from the core API. This is the only source of xG.
async function fetchCoreTeamStats(
  espnLeague: string,
  eventId: string,
  teamId: string,
): Promise<StatValues | null> {
  const url = `${ESPN_CORE_URL}/${espnLeague}/events/${eventId}/competitions/${eventId}/competitors/${teamId}/statistics`;
  const response = await axios.get(url, {
    validateStatus: (status) => status < 500,
  });
  if (response.status !== 200) {
    console.warn(`ESPN core stats ${eventId}/${teamId} → ${response.status}`);
    return null;
  }

  // Stats are grouped into categories, flatten them
  const stats: StatValues = {};
  for (const category of response.data?.splits?.categories ?? []) {
    for (const stat of category.stats ?? []) {
      if (Number.isFinite(stat.value)) {
        stats[stat.name] = stat.value;
      }
    }
  }
  return stats;
}

// Scoreboard parsing

// Turns one scoreboard event into an EspnMatch
export function parseEspnEvent(event: any): EspnMatch | null {
  const competition = event.competitions?.[0];
  const competitors: any[] = competition?.competitors ?? [];
  const homeCompetitor = competitors.find(
    (competitor) => competitor.homeAway === "home",
  );
  const awayCompetitor = competitors.find(
    (competitor) => competitor.homeAway === "away",
  );
  if (!homeCompetitor || !awayCompetitor) {
    return null;
  }

  const homeTeamId = String(homeCompetitor.team?.id);
  const awayTeamId = String(awayCompetitor.team?.id);
  const sideByTeamId = new Map<string, Side>([
    [homeTeamId, "home"],
    [awayTeamId, "away"],
  ]);

  const rawHome =
    homeCompetitor.team?.displayName ?? homeCompetitor.team?.name ?? "";
  const rawAway =
    awayCompetitor.team?.displayName ?? awayCompetitor.team?.name ?? "";
  const status = event.status;

  return {
    id: String(event.id),
    home: espnTeam(rawHome),
    away: espnTeam(rawAway),
    rawHome,
    rawAway,
    homeTeamId,
    awayTeamId,
    sideByTeamId,
    date: event.date ? new Date(event.date).toISOString() : null,
    statusName: status?.type?.name ?? "",
    state: status?.type?.state ?? "",
    completed: status?.type?.completed === true,
    clock: status?.displayClock ?? null,
    period: status?.period != null ? String(status.period) : null,
    homeScore: parseScore(homeCompetitor.score),
    awayScore: parseScore(awayCompetitor.score),
    events: parseGoalsAndCards(competition.details ?? [], sideByTeamId),
    homeStats: readStats(homeCompetitor),
    awayStats: readStats(awayCompetitor),
  };
}

// The scoreboard's "details" list holds the match's goals and cards
function parseGoalsAndCards(
  details: any[],
  sideByTeamId: Map<string, Side>,
): MatchEvent[] {
  const events: MatchEvent[] = [];

  for (const detail of details) {
    // Penalty shootouts aren't part of the match timeline
    if (detail.shootout) {
      continue;
    }

    const player = detail.athletesInvolved?.[0];
    const minutes = parseMinute(detail.clock?.displayValue);
    const teamSide = sideByTeamId.get(String(detail.team?.id)) ?? null;

    if (detail.scoringPlay) {
      // The side is the team the goal counts for. For an own goal that's the opposite
      // of the scorer's team, when ESPN tells us which team the scorer plays for.
      let side = teamSide;
      if (detail.ownGoal) {
        const scorerSide = sideByTeamId.get(String(player?.team?.id));
        if (scorerSide === "home") side = "away";
        if (scorerSide === "away") side = "home";
      }

      let kind: MatchEvent["kind"] = "goal";
      if (detail.ownGoal) kind = "own_goal";
      else if (detail.penaltyKick) kind = "penalty";

      events.push({
        ...minutes,
        side,
        player: player?.displayName ?? null,
        assist: detail.athletesInvolved?.[1]?.displayName ?? null,
        kind,
      });
      continue;
    }

    const isCard = detail.yellowCard || detail.redCard;
    // Cards shown to coaches and staff have no player attached, so there's nothing to show
    if (!isCard || !player?.displayName) {
      continue;
    }

    let kind: MatchEvent["kind"] = "yellow";
    if (detail.redCard) {
      const typeText = String(detail.type?.text ?? "").toLowerCase();
      kind = typeText.includes("second") ? "second_yellow" : "red";
    }

    events.push({
      ...minutes,
      side: teamSide,
      player: player.displayName,
      assist: null,
      kind,
    });
  }

  return events.sort(compareByMinute);
}

// Summary parsing

// "Trey Nyoni replaces Florian Wirtz": participants[0] comes on, participants[1] goes off.
function parseSubstitutions(summary: any, match: EspnMatch): MatchEvent[] {
  const substitutions: MatchEvent[] = [];
  for (const keyEvent of summary?.keyEvents ?? []) {
    if (keyEvent.type?.type !== "substitution") {
      continue;
    }
    substitutions.push({
      ...parseMinute(keyEvent.clock?.displayValue),
      side: match.sideByTeamId.get(String(keyEvent.team?.id)) ?? null,
      player: keyEvent.participants?.[0]?.athlete?.displayName ?? null,
      playerOut: keyEvent.participants?.[1]?.athlete?.displayName ?? null,
      assist: null,
      kind: "sub",
    });
  }
  return substitutions;
}

// Both teams' lineups from the summary's rosters. Null unless both teams have one.
function parseLineups(summary: any): MatchLineups | null {
  function lineupFor(side: Side): TeamLineup | null {
    const roster = (summary?.rosters ?? []).find(
      (entry: any) => entry.homeAway === side,
    );
    if (!roster?.roster?.length) {
      return null;
    }

    const lineupPlayers: LineupPlayer[] = roster.roster.map((entry: any) => ({
      espnId: String(entry.athlete?.id ?? ""),
      name: entry.athlete?.displayName ?? "",
      shortName: entry.athlete?.shortName ?? null,
      jersey: entry.jersey ?? null,
      position: entry.position?.abbreviation ?? null,
      positionName: entry.position?.displayName ?? null,
      formationPlace: entry.formationPlace
        ? Number(entry.formationPlace)
        : null,
      starter: Boolean(entry.starter),
      subbedIn: Boolean(entry.subbedIn),
      subbedOut: Boolean(entry.subbedOut),
      headshot: entry.athlete?.headshot?.href ?? null,
    }));

    return { formation: roster.formation ?? null, players: lineupPlayers };
  }

  const home = lineupFor("home");
  const away = lineupFor("away");
  if (!home || !away) {
    return null;
  }
  return { home, away };
}

// Confirmed XIs for pre-matches - Null until ESPN publishes
export async function fetchConfirmedLineups(
  espnLeague: string,
  eventId: string,
): Promise<MatchLineups | null> {
  const summary = await fetchSummary(espnLeague, eventId);
  if (!summary) return null;

  const lineups = parseLineups(summary);
  if (!lineups) return null;

  const homeStarters = lineups.home.players.filter(
    (player) => player.starter,
  ).length;
  const awayStarters = lineups.away.players.filter(
    (player) => player.starter,
  ).length;
  if (homeStarters < 11 || awayStarters < 11) return null;

  await fillMissingHeadshots(lineups);
  return lineups;
}

// "Assisted by Bukayo Saka with a cross." == "Bukayo Saka"
function assistFromText(text: string | undefined): string | null {
  if (!text) {
    return null;
  }
  const match = text.match(
    /Assisted by (.+?)(?=\s+(?:with|following|after)\b|\.(?:\s|$)|$)/,
  );
  return match ? match[1] : null;
}

// Fill in assists from the summary's key events.
function addAssists(events: MatchEvent[], summary: any): MatchEvent[] {
  const scoringKeyEvents: any[] = (summary?.keyEvents ?? []).filter(
    (keyEvent: any) => keyEvent.scoringPlay,
  );
  const usedKeyEvents = new Set<any>();

  return events.map((event) => {
    const needsAssist =
      isGoal(event.kind) && event.kind !== "own_goal" && !event.assist;
    if (!needsAssist) {
      return event;
    }

    const keyEvent = scoringKeyEvents.find((candidate) => {
      if (usedKeyEvents.has(candidate)) {
        return false;
      }
      const minutes = parseMinute(candidate.clock?.displayValue);
      const scorer = candidate.participants?.[0]?.athlete?.displayName;
      return (
        minutes.minute === event.minute &&
        minutes.extraMinute === event.extraMinute &&
        scorer === event.player
      );
    });
    if (!keyEvent) {
      return event;
    }
    usedKeyEvents.add(keyEvent);

    const assist =
      keyEvent.participants?.[1]?.athlete?.displayName ??
      assistFromText(keyEvent.text);
    if (!assist) {
      return event;
    }
    return { ...event, assist };
  });
}

// Players ESPN has no headshot for get the image from our players table instead
async function fillMissingHeadshots(lineups: MatchLineups): Promise<void> {
  const allPlayers = [...lineups.home.players, ...lineups.away.players];
  const namesWithoutHeadshot = allPlayers
    .filter((player) => !player.headshot && player.name)
    .map((player) => player.name);
  if (namesWithoutHeadshot.length === 0) {
    return;
  }

  const rows = await db
    .select({ name: players.name, imageUrl: players.imageUrl })
    .from(players)
    .where(inArray(players.name, namesWithoutHeadshot));

  const imageByName = new Map<string, string | null>();
  for (const row of rows) {
    imageByName.set(row.name, row.imageUrl);
  }

  for (const player of allPlayers) {
    if (!player.headshot) {
      player.headshot = imageByName.get(player.name) ?? null;
    }
  }
}

// Stat columns shared by matchStats and liveMatches
function buildStatColumns(home: StatValues | null, away: StatValues | null) {
  // Counts can arrive as 13.0; rounding only removes the decimal part
  function count(stats: StatValues | null, name: string): number | null {
    const value = stats?.[name];
    return value == null ? null : Math.round(value);
  }

  // xG to two decimal places. EPSILON nudges values like 1.005 so they round up correctly.
  function twoDecimals(stats: StatValues | null, name: string): number | null {
    const value = stats?.[name];
    return value == null
      ? null
      : Math.round((value + Number.EPSILON) * 100) / 100;
  }

  return {
    hs: count(home, "totalShots"),
    as: count(away, "totalShots"),
    hst: count(home, "shotsOnTarget"),
    ast: count(away, "shotsOnTarget"),
    hc: count(home, "wonCorners"),
    ac: count(away, "wonCorners"),
    hf: count(home, "foulsCommitted"),
    af: count(away, "foulsCommitted"),
    hy: count(home, "yellowCards"),
    ay: count(away, "yellowCards"),
    hr: count(home, "redCards"),
    ar: count(away, "redCards"),
    hbs: count(home, "blockedShots"),
    abs: count(away, "blockedShots"),
    hsv: count(home, "saves"),
    asv: count(away, "saves"),
    hxg: twoDecimals(home, "expectedGoals"),
    axg: twoDecimals(away, "expectedGoals"),
    hposs: home?.possessionPct ?? null,
    aposs: away?.possessionPct ?? null,
  };
}

// Copies a row without its null fields, so an update never erases a value already stored
function withoutNulls<T extends object>(row: T): Partial<T> {
  const result: Partial<T> = {};
  for (const key of Object.keys(row) as (keyof T)[]) {
    if (row[key] != null) {
      result[key] = row[key];
    }
  }
  return result;
}

// Live matches

// Builds one liveMatches row from a scoreboard match, plus its summary fetched
export function toLiveRow(
  league: string,
  match: EspnMatch,
  summary?: any,
  core?: CoreStats,
): NewLiveMatch | null {
  if (match.homeScore == null || match.awayScore == null || !match.date) {
    return null;
  }

  // The summary's box score has every stat; the scoreboard only has the basics
  let homeStats = match.homeStats;
  let awayStats = match.awayStats;
  let lineups: MatchLineups | null = null;
  let events: MatchEvent[] | null = null;

  if (summary) {
    for (const team of summary.boxscore?.teams ?? []) {
      const side = match.sideByTeamId.get(String(team.team?.id));
      if (side === "home") homeStats = readStats(team);
      if (side === "away") awayStats = readStats(team);
    }
    lineups = parseLineups(summary);
    // Scoreboard goals and cards, plus assists and substitutions from the summary
    events = [
      ...addAssists(match.events, summary),
      ...parseSubstitutions(summary, match),
    ].sort(compareByMinute);
  }

  if (core?.home?.expectedGoals != null) {
    homeStats = { ...homeStats, expectedGoals: core.home.expectedGoals };
  }
  if (core?.away?.expectedGoals != null) {
    awayStats = { ...awayStats, expectedGoals: core.away.expectedGoals };
  }

  const statColumns = buildStatColumns(homeStats, awayStats);

  let firstHalf: HalfStats | null = null;
  if (match.statusName === "STATUS_HALFTIME" && summary) {
    firstHalf = statColumns;
  }

  return {
    espnId: match.id,
    league,
    homeTeam: match.home,
    awayTeam: match.away,
    kickoff: match.date,
    status: match.statusName,
    period: match.period,
    clock: match.clock,
    homeScore: match.homeScore,
    awayScore: match.awayScore,
    events,
    lineups,
    updatedAt: new Date().toISOString(),
    ...buildStatColumns(homeStats, awayStats),
    ...statColumns,
    firstHalf,
  };
}

// Inserts the row, or updates the existing row for the same ESPN match.
export async function upsertLiveMatch(row: NewLiveMatch): Promise<void> {
  await db
    .insert(liveMatches)
    .values(row)
    .onConflictDoUpdate({ target: liveMatches.espnId, set: withoutNulls(row) });
}

export async function copyFirstHalfToMatchStats(
  espnIds: string[],
): Promise<void> {
  if (espnIds.length === 0) return;

  const rows = await db
    .select({ espnId: liveMatches.espnId, firstHalf: liveMatches.firstHalf })
    .from(liveMatches)
    .where(inArray(liveMatches.espnId, espnIds));

  for (const row of rows) {
    if (!row.firstHalf) continue;
    await db
      .update(matchStats)
      .set({ firstHalf: row.firstHalf })
      .where(eq(matchStats.espnId, row.espnId));
  }
}

// Finished matches (daily import)

// Statuses for matches ESPN lists on a date but that weren't played to a result
const SKIP_STATUSES = new Set([
  "STATUS_POSTPONED",
  "STATUS_CANCELED",
  "STATUS_ABANDONED",
  "STATUS_SUSPENDED",
  "STATUS_FORFEIT",
]);

// Every UTC day from `from` to `to`, in ESPN's YYYYMMDD format
function utcDaysBetween(from: Date, to: Date): string[] {
  const days: string[] = [];
  const day = new Date(
    Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()),
  );
  while (day <= to) {
    const isoDate = day.toISOString().slice(0, 10); // "2026-10-29"
    days.push(isoDate.replace(/-/g, "")); // "20261029"
    day.setUTCDate(day.getUTCDate() + 1);
  }
  return days;
}

async function findStoredMatch(
  espnId: string,
  homeTeam: string,
  awayTeam: string,
  kickoff: string,
) {
  const day = kickoff.slice(0, 10);
  const [row] = await db
    .select()
    .from(matchStats)
    .where(
      or(
        eq(matchStats.espnId, espnId),
        and(
          isNull(matchStats.espnId),
          eq(matchStats.homeTeam, homeTeam),
          eq(matchStats.awayTeam, awayTeam),
          gte(matchStats.matchDate, `${day}T00:00:00.000Z`),
          lt(matchStats.matchDate, `${day}T23:59:59.999Z`),
        ),
      ),
    )
    .limit(1);
  return row;
}

// Completed matches between `since` and `to`: inserts new ones and fills in anything missing.
// `refresh` re-fetches matches that are already complete.
export async function importEspnMatchesService(
  league: string,
  espnLeague: string,
  since: Date,
  options: { refresh?: boolean; to?: Date } = {},
) {
  const refresh = options.refresh ?? false;
  const to = options.to ?? new Date();

  const teamRows = await db.select({ name: teams.teamName }).from(teams);
  const knownTeams = new Set(teamRows.map((row) => row.name));

  let inserted = 0;
  let updated = 0;

  for (const date of utcDaysBetween(since, to)) {
    const matches = await fetchScoreboard(espnLeague, date);
    await sleep(ESPN_DELAY_MS);
    if (!matches) {
      continue;
    }

    for (const match of matches) {
      // Only matches that finished with a result
      if (!match.completed || SKIP_STATUSES.has(match.statusName)) {
        continue;
      }

      // Never create teams from ESPN names: an unmapped name would split one club into two
      if (!knownTeams.has(match.home) || !knownTeams.has(match.away)) {
        console.warn(
          `ESPN import: unknown team in "${match.rawHome} vs ${match.rawAway}" (mapped to "${match.home}" / "${match.away}"), add it to ESPN_MAP`,
        );
        continue;
      }

      if (match.homeScore == null || match.awayScore == null || !match.date) {
        console.warn(
          `ESPN import: ${match.home} vs ${match.away} has no score or date, skipped`,
        );
        continue;
      }

      // Skip matches we already have in full, unless refreshing
      const storedMatch = await findStoredMatch(
        match.id,
        match.home,
        match.away,
        match.date,
      );
      const alreadyComplete =
        storedMatch != null &&
        storedMatch.espnId != null &&
        storedMatch.events != null &&
        storedMatch.lineups != null &&
        storedMatch.hxg != null;
      if (alreadyComplete && !refresh) {
        continue;
      }

      // Fetch the details: summary for lineups, subs and assists; core stats for xG
      const summary = await fetchSummary(espnLeague, match.id);
      await sleep(ESPN_DELAY_MS);
      const homeStats = await fetchCoreTeamStats(
        espnLeague,
        match.id,
        match.homeTeamId,
      );
      await sleep(ESPN_DELAY_MS);
      const awayStats = await fetchCoreTeamStats(
        espnLeague,
        match.id,
        match.awayTeamId,
      );
      await sleep(ESPN_DELAY_MS);

      // The goal events must add up to the final score, or the timeline is incomplete
      const goals = match.events.filter((event) => isGoal(event.kind));
      const homeGoals = goals.filter((goal) => goal.side === "home").length;
      const awayGoals = goals.filter((goal) => goal.side === "away").length;
      const everyEventHasSide = match.events.every(
        (event) => event.side !== null,
      );
      const timelineIsComplete =
        everyEventHasSide &&
        homeGoals === match.homeScore &&
        awayGoals === match.awayScore;
      if (!timelineIsComplete) {
        console.warn(
          `ESPN import: ${match.home} vs ${match.away} goal events don't add up to ${match.homeScore}-${match.awayScore}; timeline left empty`,
        );
      }

      let events: MatchEvent[] | null = null;
      if (timelineIsComplete) {
        events = match.events;
        if (summary) {
          events = [
            ...addAssists(match.events, summary),
            ...parseSubstitutions(summary, match),
          ].sort(compareByMinute);
        }
      }

      const lineups = summary ? parseLineups(summary) : null;
      if (lineups) {
        await fillMissingHeadshots(lineups);
      } else if (summary) {
        console.warn(
          `ESPN import: no lineups for ${match.home} vs ${match.away}`,
        );
      }

      let result: MatchResult = "D";
      if (match.homeScore > match.awayScore) result = "H";
      if (match.homeScore < match.awayScore) result = "A";

      const statColumns = buildStatColumns(homeStats, awayStats);
      const row: typeof matchStats.$inferInsert = {
        espnId: match.id,
        league,
        homeTeam: match.home,
        awayTeam: match.away,
        matchDate: match.date,
        fthg: match.homeScore,
        ftag: match.awayScore,
        ftr: result,
        ...statColumns,
        // Fall back to the scoreboard's possession if the core stats request failed
        hposs: statColumns.hposs ?? match.homeStats.possessionPct ?? null,
        aposs: statColumns.aposs ?? match.awayStats.possessionPct ?? null,
        events,
        lineups,
      };

      if (storedMatch) {
        await db
          .update(matchStats)
          .set(withoutNulls(row))
          .where(eq(matchStats.id, storedMatch.id));
        updated++;
      } else {
        await db.insert(matchStats).values(row);
        inserted++;
      }
    }
  }

  console.log(`ESPN import ${league}: ${inserted} new, ${updated} updated`);
  return { inserted, updated };
}
