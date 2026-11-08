"use client";

import { TeamStatsCard } from "@/lib/uiUtils";
import {
  useGetLast5TeamStatsQuery,
  useGetSeasonTeamStatsQuery,
} from "@/state/api";
import { useState } from "react";
import { SegmentedTabs } from "@/components/segmentedTabs";

const MODES: ["season" | "last5", string][] = [
  ["season", "Season"],
  ["last5", "Last 5"],
];

const TeamStats = ({
  homeTeam,
  awayTeam,
}: {
  homeTeam: string;
  awayTeam: string;
}) => {
  const [mode, setMode] = useState<"season" | "last5">("season");
  const { data: last5TeamStats, isLoading: last5TeamStatsLoading } =
    useGetLast5TeamStatsQuery({ team1: homeTeam, team2: awayTeam });
  const { data: seasonTeamStats, isLoading: seasonTeamStatsLoading } =
    useGetSeasonTeamStatsQuery({ team1: homeTeam, team2: awayTeam });

  if (seasonTeamStatsLoading || last5TeamStatsLoading)
    return (
      <p className="text-center italic text-gray-500 dark:text-gray-200 py-8">
        Loading Team Statistics…
      </p>
    );

  const homeStats =
    mode === "season" ? seasonTeamStats?.[0] : last5TeamStats?.[0];
  const awayStats =
    mode === "season" ? seasonTeamStats?.[1] : last5TeamStats?.[1];

  return (
    <div>
      <h2 className="mx-auto max-w-3xl text-center text-2xl font-bold text-gray-800 dark:border-gray-400 dark:text-gray-200">
        Team Stats
      </h2>
      <SegmentedTabs
        ariaLabel="Team stats period"
        size="sm"
        className="my-6"
        options={[
          { key: "season", label: "Season" },
          { key: "last5", label: "Last 5" },
        ]}
        value={mode}
        onChange={setMode}
      />

      <div className="mx-auto flex max-w-4xl flex-col items-center gap-4 md:flex-row md:items-start md:justify-center md:gap-6">
        {homeStats && awayStats ? (
          <TeamStatsCard teamStandings={homeStats} opponentStats={awayStats} />
        ) : (
          <div>No home team stats available</div>
        )}

        {awayStats && homeStats ? (
          <TeamStatsCard teamStandings={awayStats} opponentStats={homeStats} />
        ) : (
          <div>No away team stats available</div>
        )}
      </div>
    </div>
  );
};

export default TeamStats;
