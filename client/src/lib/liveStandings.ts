import { useGetLiveMatchesQuery } from "@/state/api";
import { LiveMatch, Standing } from "@epl/shared";
import { useEffect, useMemo, useRef } from "react";

export type LiveResult = {
  score: string; // "2–1"
  result: "W" | "D" | "L";
  opponent: string;
};

export type LiveStanding = Standing & {
  movement: number; // places gained (+) or lost (−) compared to before the match table spot
  live: LiveResult | null; // set when this team is playing right now
};

export type StandingType = "TOTAL" | "HOME" | "AWAY";

// The table as it would look if every live match ended at its current score.
export function applyLiveResults(
  table: Standing[],
  liveMatches: LiveMatch[],
  type: StandingType = "TOTAL",
): LiveStanding[] {
  // Copies, so the cached standings from RTK Query are never changed
  const rows = new Map<string, LiveStanding>();
  for (const team of table) {
    rows.set(team.name, { ...team, movement: 0, live: null });
  }

  let anyApplied = false;
  for (const match of liveMatches) {
    const home = rows.get(match.homeTeam);
    const away = rows.get(match.awayTeam);
    if (!home || !away) continue; // for another league, skip

    if (type !== "AWAY") {
      addResult(home, match.homeScore, match.awayScore, match.awayTeam);
      anyApplied = true;
    }
    if (type !== "HOME") {
      addResult(away, match.awayScore, match.homeScore, match.homeTeam);
      anyApplied = true;
    }
  }

  // Nothing live in this league: keep the stored order exactly as it is
  if (!anyApplied) return [...rows.values()];

  const sorted = [...rows.values()].sort(compareRows);
  for (let index = 0; index < sorted.length; index++) {
    const row = sorted[index];
    const newPosition = index + 1;
    row.movement = row.position - newPosition; // moved from 7th to 5th → +2
    row.position = newPosition;
  }
  return sorted;
}

function addResult(
  row: LiveStanding,
  scored: number,
  conceded: number,
  opponent: string,
): void {
  row.played = (row.played ?? 0) + 1;
  row.goalsFor = (row.goalsFor ?? 0) + scored;
  row.goalsAgainst = (row.goalsAgainst ?? 0) + conceded;
  row.goalDifference = row.goalsFor - row.goalsAgainst;

  let result: LiveResult["result"];
  if (scored > conceded) {
    result = "W";
    row.won = (row.won ?? 0) + 1;
    row.points = (row.points ?? 0) + 3;
  } else if (scored === conceded) {
    result = "D";
    row.draw = (row.draw ?? 0) + 1;
    row.points = (row.points ?? 0) + 1;
  } else {
    result = "L";
    row.lost = (row.lost ?? 0) + 1;
  }

  row.live = { score: `${scored}–${conceded}`, result, opponent };
}

// Points, then goal difference, then goals scored. If still level, keep order.
function compareRows(a: LiveStanding, b: LiveStanding): number {
  if (b.points !== a.points) return (b.points ?? 0) - (a.points ?? 0);
  if (b.goalDifference !== a.goalDifference)
    return (b.goalDifference ?? 0) - (a.goalDifference ?? 0);
  if (b.goalsFor !== a.goalsFor) return (b.goalsFor ?? 0) - (a.goalsFor ?? 0);
  return a.position - b.position;
}

/**
 * Applies live results to a table and keeps it up to date.
 * `enabled`: only for the current season.
 * `refetchStandings`: called when a match goes live or finishes, because at
 * full time the stored standings change on the server.
 */
export function useLiveStandings(
  table: Standing[],
  enabled: boolean,
  refetchStandings: () => void,
  type: StandingType = "TOTAL",
): LiveStanding[] {
  const { data: liveMatches } = useGetLiveMatchesQuery(undefined, {
    pollingInterval: 30_000,
    skip: !enabled,
  });

  // A string, so the effect only runs when the set of live matches really changes
  const liveIds = (liveMatches ?? [])
    .map((m) => m.espnId)
    .sort()
    .join(",");
  const previousLiveIds = useRef<string | null>(null);

  useEffect(() => {
    const changed =
      previousLiveIds.current !== null && previousLiveIds.current !== liveIds;
    if (changed) refetchStandings();
    previousLiveIds.current = liveIds;
  }, [liveIds, refetchStandings]);

  return useMemo(() => {
    const live = enabled ? (liveMatches ?? []) : [];
    return applyLiveResults(table, live, type);
  }, [table, liveMatches, enabled, type]);
}
