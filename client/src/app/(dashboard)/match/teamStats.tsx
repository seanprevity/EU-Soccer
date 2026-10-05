"use client";

import { TeamStatsCard } from "@/lib/uiUtils";
import {
  useGetLast5TeamStatsQuery,
  useGetSeasonTeamStatsQuery,
} from "@/state/api";
import { cn } from "@/lib/utils";
import { useState } from "react";

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
      <div
        role="tablist"
        className="mx-auto my-6 flex w-fit rounded-lg bg-gray-200 p-1 dark:bg-gray-700"
      >
        {MODES.map(([key, label]) => (
          <button
            key={key}
            role="tab"
            aria-selected={mode === key}
            onClick={() => setMode(key)}
            className={cn(
              "cursor-pointer rounded-md px-4 py-1.5 text-sm font-medium transition-colors",
              mode === key
                ? "bg-white text-gray-900 shadow-sm dark:bg-gray-900 dark:text-white"
                : "text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex justify-around max-w-3xl mx-auto flex-col md:flex-row md:items-start items-center gap-4 md:gap-0">
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
