"use client";

import { head2Head } from "@/types/drizzleTypes";
import { useState } from "react";

const H2H = ({
  h2h,
  homeTeam,
}: {
  h2h: head2Head | null;
  homeTeam: string;
}) => {
  const [hovered, setHovered] = useState<"home" | "away" | "draw" | null>(null);
  if (h2h === null) return;
  const { team1Wins, team1, team2, team2Wins, draws, mp: totalMatches } = h2h;
  const team1IsHome = homeTeam === team1;
  const homeWins = team1IsHome ? team1Wins : team2Wins;
  const awayWins = team1IsHome ? team2Wins : team1Wins;
  const awayTeam = team1IsHome ? team2 : team1;

  let homeWinPercentage = Math.round((homeWins! / totalMatches!) * 100) || 0;
  let drawPercentage = Math.round((draws! / totalMatches!) * 100) || 0;
  let awayWinPercentage = Math.round((awayWins! / totalMatches!) * 100) || 0;
  const total = homeWinPercentage + drawPercentage + awayWinPercentage;

  if (total > 100) {
    if (
      homeWinPercentage > awayWinPercentage &&
      homeWinPercentage > drawPercentage
    ) {
      homeWinPercentage -= 1;
    } else if (
      awayWinPercentage > homeWinPercentage &&
      awayWinPercentage > drawPercentage
    ) {
      awayWinPercentage -= 1;
    } else {
      drawPercentage -= 1;
    }
  }

  if (total < 100 && total > 0) {
    if (
      homeWinPercentage < awayWinPercentage &&
      homeWinPercentage < drawPercentage
    ) {
      homeWinPercentage += 1;
    } else if (
      awayWinPercentage < homeWinPercentage &&
      awayWinPercentage < drawPercentage
    ) {
      awayWinPercentage += 1;
    } else {
      drawPercentage += 1;
    }
  }

  const hasData = totalMatches! > 0;

  const getBarOpacity = (section: "home" | "draw" | "away") => {
    if (hovered === null) return "opacity-100";
    return hovered === section ? "opacity-100" : "opacity-30";
  };

  return (
    <section className="mt-6 sm:mt-8 md:mt-12 mb-6 sm:mb-10 md:mb-12 p-4 sm:p-5 md:p-6 rounded-lg bg-gray-100 dark:bg-gray-800 shadow-md">
      <h2 className="text-center mb-6 sm:mb-8 text-xl sm:text-2xl md:text-3xl font-bold text-gray-800 dark:text-gray-300 relative after:content-[''] after:absolute after:-bottom-3 after:left-1/2 after:-translate-x-1/2 after:w-16 sm:after:w-20 after:h-1 after:bg-gradient-to-r after:from-blue-500 after:via-gray-400 after:to-red-500 after:rounded-full">
        Head to Head
      </h2>

      <div className="flex flex-col gap-6 sm:gap-8">
        {hasData ? (
          <>
            <div className="w-full max-w-3xl mx-auto">
              {/* Total matches summary */}
              <div className="text-center mb-4 sm:mb-6">
                <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300">
                  Total Matches:{" "}
                  <span className="font-bold text-gray-800 dark:text-gray-200">
                    {totalMatches}
                  </span>
                </p>
              </div>
              {/* Horizontal stacked bar */}
              <div className="relative h-6 sm:h-10 md:h-12 rounded-full overflow-hidden shadow-inner bg-gray-200">
                {/* Home wins section */}
                <div
                  className={`absolute left-0 top-0 h-full bg-gradient-to-r from-blue-600 to-blue-500 transition-all duration-300 flex items-center justify-center ${getBarOpacity(
                    "home"
                  )}`}
                  style={{ width: `${homeWinPercentage}%` }}
                >
                  {homeWinPercentage > 7 && (
                    <span className="text-white font-bold text-xs sm:text-sm md:text-base px-2 truncate">
                      {homeWinPercentage}%
                    </span>
                  )}
                </div>
                {/* Draws section */}
                <div
                  className={`absolute top-0 h-full bg-gradient-to-r from-gray-400 to-gray-500 transition-all duration-500 flex items-center justify-center ${getBarOpacity(
                    "draw"
                  )}`}
                  style={{
                    left: `${homeWinPercentage}%`,
                    width: `${drawPercentage}%`,
                  }}
                >
                  {drawPercentage > 7 && (
                    <span className="text-white font-bold text-xs sm:text-sm md:text-base px-2 truncate">
                      {drawPercentage}%
                    </span>
                  )}
                </div>
                {/* Away wins section */}
                <div
                  className={`absolute right-0 top-0 h-full bg-gradient-to-r from-red-500 to-red-600 transition-all duration-500 flex items-center justify-center ${getBarOpacity(
                    "away"
                  )}`}
                  style={{ width: `${awayWinPercentage}%` }}
                >
                  {awayWinPercentage > 7 && (
                    <span className="text-white font-bold text-xs sm:text-sm md:text-base px-2 truncate">
                      {awayWinPercentage}%
                    </span>
                  )}
                </div>
              </div>
              {/* Legend */}
              <div className="flex flex-wrap justify-center gap-3 sm:gap-4 md:gap-6 mt-4 sm:mt-6">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-gradient-to-r from-blue-600 to-blue-500"></div>
                  <span className="text-xs dark:text-gray-200 sm:text-sm text-gray-700 truncate max-w-[120px] sm:max-w-none">
                    {homeTeam} Wins
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-gradient-to-r from-gray-400 to-gray-500"></div>
                  <span className="text-xs sm:text-sm text-gray-700 dark:text-gray-200">
                    Draws
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-gradient-to-r from-red-500 to-red-600"></div>
                  <span className="text-xs sm:text-sm dark:text-gray-200 text-gray-700truncate max-w-[120px] sm:max-w-none">
                    {awayTeam} Wins
                  </span>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center text-gray-500 italic py-8 sm:py-12">
            No head-to-head data available
          </div>
        )}

        <div className="flex flex-wrap justify-center gap-4 sm:gap-5 md:gap-6 max-w-3xl mx-auto w-full">
          {/* Home card */}
          <div
            className="p-3 sm:p-4 md:p-5 rounded-lg text-center flex flex-col gap-1 sm:gap-2 shadow-sm transition-transform duration-200 hover:-translate-y-1 bg-blue-100 dark:bg-blue-200 border-l-3 border-blue-500"
            onMouseEnter={() => setHovered("home")}
            onMouseLeave={() => setHovered(null)}
          >
            <h3 className="text-blue-600 dark:text-blue-600 text-sm sm:text-base font-semibold truncate">
              {homeTeam}
            </h3>
            <div className="text-2xl sm:text-3xl font-bold">{homeWins}</div>
            <div className="text-xs sm:text-sm text-gray-600">Wins</div>
            <div className="text-sm sm:text-base font-semibold mt-1">
              {homeWinPercentage}%
            </div>
          </div>

          {/* Draw card */}
          <div
            className="p-3 sm:p-4 md:p-5 rounded-lg text-center flex flex-col gap-1 sm:gap-2 shadow-sm transition-transform duration-200 hover:-translate-y-1 bg-gray-200 border-l-3 border-gray-400"
            onMouseEnter={() => setHovered("draw")}
            onMouseLeave={() => setHovered(null)}
          >
            <h3 className="text-gray-600 dark:text-gray-700 text-sm sm:text-base font-semibold">
              Draws
            </h3>
            <div className="text-2xl sm:text-3xl font-bold">{draws}</div>
            <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-700">Matches</div>
            <div className="text-sm sm:text-base font-semibold mt-1">
              {drawPercentage}%
            </div>
          </div>

          {/* Away card */}
          <div
            className="p-3 sm:p-4 md:p-5 rounded-lg text-center flex flex-col gap-1 sm:gap-2 shadow-sm transition-transform duration-200 hover:-translate-y-1 bg-red-100 dark:bg-red-200 border-l-3 border-red-500"
            onMouseEnter={() => setHovered("away")}
            onMouseLeave={() => setHovered(null)}
          >
            <h3 className="text-red-600 text-sm sm:text-base font-semibold truncate">
              {awayTeam}
            </h3>
            <div className="text-2xl sm:text-3xl font-bold">{awayWins}</div>
            <div className="text-xs sm:text-sm text-gray-600">Wins</div>
            <div className="text-sm sm:text-base font-semibold mt-1">
              {awayWinPercentage}%
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default H2H;
