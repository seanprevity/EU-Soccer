"use client";

import { TeamStatsCard } from "@/lib/uiUtils";
import {
  useGetLast5TeamStatsQuery,
  useGetSeasonTeamStatsQuery,
} from "@/state/api";
import { useState } from "react";

const TeamStats = ({
  homeTeam,
  awayTeam,
}: {
  homeTeam: string;
  awayTeam: string;
}) => {
  const [mode, setMode] = useState<"last5" | "season">("season");
  const { data: last5TeamStats, isLoading: last5TeamStatsLoading } =
    useGetLast5TeamStatsQuery({
      team1: homeTeam,
      team2: awayTeam,
    });
  const { data: seasonTeamStats, isLoading: seasonTeamStatsLoading } =
    useGetSeasonTeamStatsQuery({ team1: homeTeam, team2: awayTeam });

  if (seasonTeamStatsLoading || last5TeamStatsLoading)
    return (
      <p className="text-center italic text-gray-500 dark:text-gray-200 py-8">
        Loading Team Statistics…
      </p>
    );

  const homeSeasonStats = seasonTeamStats?.[0];
  const awaySeasonStats = seasonTeamStats?.[1];
  const homeLast5Stats = last5TeamStats?.[0];
  const awayLast5Stats = last5TeamStats?.[1];

  // Select correct data for current mode
  const homeStats = mode === "season" ? homeSeasonStats : homeLast5Stats;
  const awayStats = mode === "season" ? awaySeasonStats : awayLast5Stats;

  return (
    <div>
      <h3 className="text-xl text-semibold text-center dark:text-gray-200 mb-6 relative after:content-[''] after:absolute after:-bottom-2 after:left-1/2 after:-translate-x-1/2 after:w-12 after:h-[3px] after:bg-gray-300">
        Team Stats
      </h3>

      <div className="flex justify-center my-6 gap-4">
        <button
          onClick={() => setMode("season")}
          className={`border-2 px-4 py-2 rounded-lg transition-all duration-200 cursor-pointer ${
            mode === "season"
              ? "font-bold border-blue-500 bg-blue-50 dark:bg-gray-700 dark:text-gray-200 dark:border-purple-800 dark:hover:bg-gray-600"
              : "border-gray-200 hover:bg-gray-100 dark:bg-gray-700 dark:border-gray-400 dark:hover:bg-gray-500 dark:text-gray-200"
          }`}
        >
          Season
        </button>
        <button
          onClick={() => setMode("last5")}
          className={`border-2 px-4 py-2 rounded-lg transition-all duration-200 cursor-pointer ${
            mode === "last5"
              ? "font-bold border-blue-500 bg-blue-50 dark:bg-gray-700 dark:text-gray-200 dark:border-purple-800 dark:hover:bg-gray-600"
              : "border-gray-200 hover:bg-gray-100 dark:bg-gray-700 dark:border-gray-400 dark:hover:bg-gray-500 dark:text-gray-200"
          }`}
        >
          Last 5
        </button>
      </div>

      <div className="flex justify-around max-w-3xl mx-auto flex-col md:flex-row md:items-start items-center gap-4 md:gap-0">
        {homeStats && awayStats ? (
          <TeamStatsCard teamStandings={homeStats} opponentStats={awayStats}/>
        ) : (
          <div>No home team stats available</div>
        )}

        {awayStats && homeStats ? (
          <TeamStatsCard teamStandings={awayStats} opponentStats={homeStats}/>
        ) : (
          <div>No away team stats available</div>
        )}
      </div>
    </div>
  );
};

export default TeamStats;
