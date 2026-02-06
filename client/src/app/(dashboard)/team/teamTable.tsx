"use client";

import { renderForm } from "@/lib/uiUtils";
import { currentSeason, getLogoFile, HEADER_CONFIG } from "@/lib/utils";
import { useGetRecentTableStandingsQuery } from "@/state/api";
import { Standings } from "@/types/drizzleTypes";
import Image from "next/image";
import Link from "next/link";
import React, { useMemo, useState } from "react";

// this will be the table that highlights the selected team
const TeamTable = ({
  teamName,
  league,
}: {
  teamName: string;
  league: string;
}) => {
  const { data: teams, isLoading: isStandingsLoading } =
    useGetRecentTableStandingsQuery({ team: teamName });

  const [sortConfig, setSortConfig] = useState({
    key: "position",
    direction: "asc",
  });

  const handleSort = (key: string) => {
    setSortConfig((prev) => {
      if (prev.key === key) {
        return {
          key,
          direction: prev.direction === "asc" ? "desc" : "asc",
        };
      }
      return { key, direction: "desc" };
    });
  };

  const sortedTeams = useMemo(() => {
    if (!teams) return [];
    return [...teams].sort((a, b) => {
      const key = sortConfig.key as keyof Standings;
      let aVal = a[key];
      let bVal = b[key];

      if (sortConfig.key === "form") {
        const score = (str: string) => {
          const wins = (str.match(/W/g) || []).length;
          const draws = (str.match(/D/g) || []).length;
          return wins * 3 + draws;
        };
        aVal = score(a.form || "");
        bVal = score(b.form || "");
      }
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });
  }, [teams, sortConfig]);

  if (isStandingsLoading) {
    return (
      <div className="flex justify-center items-center min-h-[75vh] w-full bg-gray-50 dark:bg-gray-900">
        <p className="text-gray-600 dark:text-gray-300 text-lg font-medium animate-pulse">
          Loading Table…
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 bg-white dark:bg-gray-900">
      <span className="block text-center text-gray-600 dark:text-gray-400 mb-1 text-sm font-medium">
        {teams?.[0]?.season
          ? `${teams[0].season}/${(Number(teams[0].season) + 1) % 2000}`
          : `${currentSeason}/${(Number(currentSeason) + 1) % 2000}`}
      </span>
      <div className="w-full overflow-x-auto rounded-lg">
        <table className="w-full border-collapse shadow-sm text-[0.65rem] sm:text-[0.75rem] md:text-[0.85rem] lg:text-[0.9rem]">
          <thead className="bg-[#38003c] dark:bg-gray-900 text-white sticky top-0 z-10">
            <tr>
              {HEADER_CONFIG.map(({ label, key }) => (
                <th
                  key={key}
                  onClick={() => handleSort(key)}
                  className={`px-1 py-2 text-center font-semibold cursor-pointer select-none hover:bg-white/10 text-[0.65rem] sm:text-[0.75rem] md:text-[0.85rem]
                      ${key === "position" ? "w-[60px] sm:w-[80px]" : ""}
                    `}
                >
                  {label}
                  {sortConfig.key === key &&
                    (sortConfig.direction === "asc" ? " ↑" : " ↓")}
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="bg-white dark:bg-gray-800">
            {sortedTeams.map((team: any, idx: number) => {
              const logo = getLogoFile(team.name);

              // Border color by rank + league
              let borderClass = "";
              let borderColor = "";
              // Champions League
              if (idx <= 3 && (league !== "Ligue 1" || idx !== 3)) {
                borderColor = "bg-[#38003c] dark:bg-blue-600";
              }
              // Champions League Qualification
              else if (idx === 3 && league === "Ligue 1") {
                borderColor = "bg-[#301934] dark:bg-purple-800";
              }
              // Europa League
              else if (idx === 4) {
                borderColor = "bg-[#ff3333]";
              }
              // Europa Conference League Qualification
              else if (idx === 5 && league !== "Premier League") {
                borderColor = "bg-[#00A300]";
              }
              // Relegation
              else if (idx > sortedTeams.length - 3) {
                borderColor = "bg-[#ff2882]";
              }
              // Relegation
              else if (
                idx === sortedTeams.length - 3 &&
                (league === "Premier League" ||
                  league === "Serie A" ||
                  league === "La Liga")
              ) {
                borderColor = "bg-[#ff2882]";
              }
              // Relegation Play-Off
              else if (
                idx === sortedTeams.length - 3 &&
                (league === "Ligue 1" || league === "Bundesliga")
              ) {
                borderColor = "bg-[#ADADAD]";
              }
              if (borderColor !== "") borderClass = "relative";

              return (
                <tr
                  key={team.name}
                  className={`border-b border-gray-200 dark:border-gray-700 transition-colors duration-200 hover:bg-gray-50 dark:hover:bg-gray-700
                      ${
                        team.name === teamName
                          ? "bg-gray-400 dark:bg-gray-600"
                          : ""
                      }`}
                >
                  <td
                    className={`px-1 py-1 text-center ${borderClass} text-black dark:text-gray-200`}
                  >
                    {borderColor && (
                      <div
                        className={`absolute left-0 top-1/2 -translate-y-1/2 w-3 h-[60%] ${borderColor} rounded-r-md -translate-x-1/2`}
                      />
                    )}
                    <span className="relative z-10">{team.position}</span>
                  </td>
                  <td className="px-2 py-1 text-left font-medium">
                    <Link
                      href={`/team/${team.name.split(" ").join("_")}`}
                      className="no-underline flex items-center hover:opacity-90 transition-opacity"
                    >
                      <div className="flex items-center gap-2">
                        <div className="relative w-[20px] h-[20px] sm:w-[24px] sm:h-[24px] flex-shrink-0 md:w-[28px] md:h-[28px]">
                          <Image
                            src={`/${logo}`}
                            alt={`${team.name} logo`}
                            fill
                            className="object-contain"
                          />
                        </div>
                        <span className="whitespace-nowrap text-black dark:text-gray-200">
                          {team.name}
                        </span>
                      </div>
                    </Link>
                  </td>
                  <td className="px-1 py-2 text-center text-black dark:text-gray-200">
                    {team.played}
                  </td>
                  <td className="px-1 py-2 text-center text-black dark:text-gray-200">
                    {team.won}
                  </td>
                  <td className="px-1 py-2 text-center text-black dark:text-gray-200">
                    {team.draw}
                  </td>
                  <td className="px-1 py-2 text-center text-black dark:text-gray-200">
                    {team.lost}
                  </td>
                  <td className="px-1 py-1 text-center text-black dark:text-gray-200">
                    {team.goalsFor}
                  </td>
                  <td className="px-1 py-1 text-center text-black dark:text-gray-200">
                    {team.goalsAgainst}
                  </td>
                  <td className="px-1 py-1 text-center text-black dark:text-gray-200">
                    {team.goalDifference}
                  </td>
                  <td className="px-1 py-2 text-center text-black dark:text-gray-200">
                    {team.points}
                  </td>
                  <td className="px-1 py-2 justify-center gap-[2px] flex">
                    {renderForm(team.form)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TeamTable;
