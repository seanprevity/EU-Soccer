"use client";

import { useGetUpcomingLineupsQuery } from "@/state/api";
import type { MatchLineups, MatchStats, TeamLineup } from "@epl/shared";
import Lineups from "../postmatch/lineups"; // adjust to where Lineups lives
import TeamPanel from "./teamPanel";
import { matchColors } from "@/lib/array";

// The previous match's sub flags would show "Sub 67'" here, so clear them
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

  const confirmed = data.confirmed ?? null;

  // The confirmed lineups if they're out, otherwise each team's last XI
  let lineups: MatchLineups | null = null;
  if (confirmed) {
    lineups = {
      home: withoutSubs(confirmed.home),
      away: withoutSubs(confirmed.away),
    };
  } else if (data.home.previous && data.away.previous) {
    lineups = {
      home: withoutSubs(data.home.previous.lineup),
      away: withoutSubs(data.away.previous.lineup),
    };
  }

  // Lineups draws from a MatchStats; only these fields are read
  const match = {
    homeTeam,
    awayTeam,
    events: [],
    lineups,
  } as unknown as MatchStats;

  const colors = matchColors(homeTeam, awayTeam);

  let heading = "Unconfirmed lineups";
  if (confirmed) heading = "Confirmed lineups";

  return (
    <section className="space-y-4 px-4 sm:px-6 lg:px-10">
      <h2 className="text-center text-2xl font-bold text-gray-900 dark:text-white">
        {heading}
      </h2>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,28rem)_minmax(0,1fr)] lg:gap-8">
        {/* Home: drawn at the bottom of the pitch, so its panel sits low in its column */}
        <div className="order-3 lg:order-1 lg:self-start">
          <TeamPanel
            preview={data.home}
            confirmed={confirmed?.home ?? null}
            color={colors.home}
          />
        </div>

        <div className="order-2">
          {lineups ? (
            <Lineups match={match} prematch />
          ) : (
            <p className="rounded-lg bg-white p-6 text-center text-sm text-gray-500 dark:bg-gray-800 dark:text-gray-400">
              No lineup available yet.
            </p>
          )}
        </div>

        {/* Away: drawn at the top, so its panel sits high */}
        <div className="order-1 lg:order-3 lg:self-start">
          <TeamPanel
            preview={data.away}
            confirmed={confirmed?.away ?? null}
            color={colors.away}
          />
        </div>
      </div>
    </section>
  );
}
