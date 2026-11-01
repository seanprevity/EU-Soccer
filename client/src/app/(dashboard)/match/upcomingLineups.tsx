"use client";

import { useGetUpcomingLineupsQuery } from "@/state/api";
import type { MatchStats, PreviousLineup, TeamLineup } from "@epl/shared";
import Lineups from "../postmatch/lineups";

// The previous match's sub flags would show "Sub 67'" on this page, so clear them
function withoutSubs(lineup: TeamLineup): TeamLineup {
  return {
    ...lineup,
    players: lineup.players.map((player) => ({
      ...player,
      subbedIn: false,
      subbedOut: false,
    })),
  };
}

function describe(team: string, previous: PreviousLineup): string {
  const date = new Date(previous.matchDate).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
  const venue = previous.wasHome ? "vs" : "at";
  return `${team} ${venue} ${previous.opponent}, ${date}`;
}

export default function UpcomingLineups({
  matchId,
  homeTeam,
  awayTeam,
}: {
  matchId: number;
  homeTeam: string;
  awayTeam: string;
}) {
  const { data, isLoading, isError } = useGetUpcomingLineupsQuery(matchId, {
    pollingInterval: 5 * 60 * 1000,
  });

  if (isLoading)
    return (
      <p className="py-6 text-center text-sm text-gray-500">Loading lineups…</p>
    );
  if (isError || !data)
    return (
      <p className="py-6 text-center text-sm text-gray-500">
        Lineups couldn&apos;t be loaded.
      </p>
    );
  if (!data.home || !data.away)
    return (
      <p className="py-6 text-center text-sm text-gray-500 dark:text-gray-400">
        No previous lineup is available for {data.home ? awayTeam : homeTeam}.
      </p>
    );

  if (data.confirmed) {
    const match = {
      homeTeam,
      awayTeam,
      events: [],
      lineups: data.confirmed,
    } as unknown as MatchStats;

    return (
      <div className="space-y-3">
        <p className="rounded-lg bg-white p-3 text-center text-xs font-semibold text-green-700 dark:bg-gray-900 dark:text-green-400">
          Confirmed lineups
        </p>
        <Lineups match={match} prematch />
      </div>
    );
  }

  // Lineups draws from a MatchStats; only these fields are read
  const match = {
    homeTeam,
    awayTeam,
    events: [],
    lineups: {
      home: withoutSubs(data.home.lineup),
      away: withoutSubs(data.away.lineup),
    },
  } as unknown as MatchStats;

  return (
    <div className="space-y-1">
      <div className="rounded-lg bg-white p-3 text-center text-xs text-gray-600 dark:bg-gray-900 dark:text-gray-300">
        <p className="font-semibold text-gray-900 dark:text-white">
          Last starting XIs, not confirmed lineups
        </p>
        <p>{describe(homeTeam, data.home)}</p>
        <p>{describe(awayTeam, data.away)}</p>
      </div>
      <Lineups match={match} prematch />
    </div>
  );
}
