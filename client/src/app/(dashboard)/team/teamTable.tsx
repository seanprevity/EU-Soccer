"use client";

import { LiveDot, LiveScore, Movement } from "@/components/liveBadges";
import { SegmentedTabs } from "@/components/segmentedTabs";
import { StandingType, useLiveStandings } from "@/lib/liveStandings";
import { renderForm } from "@/lib/uiUtils";
import { currentSeason, getLogoFile, HEADER_CONFIG } from "@/lib/utils";
import {
  useGetMatchFilterOptionsQuery,
  useGetRecentTableStandingsQuery,
  useGetStandingsQuery,
  useGetTeamsExpectedStandingsQuery,
} from "@/state/api";
import Image from "next/image";
import Link from "next/link";
import React, { useMemo, useState } from "react";
import { zoneFor, ZoneLegend, ZONES } from "@/lib/zones";

const TYPE_OPTIONS = [
  { key: "TOTAL", label: "Total" },
  { key: "HOME", label: "Home" },
  { key: "AWAY", label: "Away" },
] as const;

const HEADERS_WITHOUT_EXPECTED = HEADER_CONFIG.filter(
  (h) => h.key !== "expectedPosition",
);

// "2026" -> "2026/27"
function seasonLabel(season: string): string {
  const startYear = Number(season);
  const endYear = String((startYear + 1) % 100).padStart(2, "0");
  return `${startYear}/${endYear}`;
}

function PerformanceArrow({
  position,
  expected,
}: {
  position: number;
  expected: number;
}) {
  if (position === expected) return null;
  const up = position < expected;
  return (
    <>
      <svg
        viewBox="0 0 10 8"
        width={8}
        height={7}
        aria-hidden="true"
        className="shrink-0"
      >
        <path
          d={up ? "M5 0 10 8H0Z" : "M5 8 0 0H10Z"}
          fill={up ? "#16a34a" : "#dc2626"}
        />
      </svg>
      <span className="sr-only">
        {up
          ? "Outperforming expected position"
          : "Underperforming expected position"}
      </span>
    </>
  );
}

const TeamTable = ({
  teamName,
  league,
}: {
  teamName: string;
  league: string;
}) => {
  const [selectedSeason, setSelectedSeason] = useState<string | null>(null);
  const [type, setType] = useState<StandingType>("TOTAL");
  const [sortConfig, setSortConfig] = useState({
    key: "position",
    direction: "asc",
  });

  // The team's latest table: where we start, before a season is picked
  const { data: recentTable, isLoading: isRecentLoading } =
    useGetRecentTableStandingsQuery({
      team: teamName,
    });
  const defaultSeason = recentTable?.[0]?.season ?? currentSeason;
  const season = selectedSeason ?? defaultSeason;

  // Seasons the team has matches in, i.e. was in this league. Shared with the Matches tab
  const { data: filterOptions } = useGetMatchFilterOptionsQuery({
    team: teamName,
  });
  const seasonOptions = useMemo(() => {
    const seasons = (filterOptions?.seasons ?? []).map(String);
    // Always offer the season being shown, even before they've played a match in it
    if (!seasons.includes(defaultSeason)) seasons.unshift(defaultSeason);
    return seasons;
  }, [filterOptions, defaultSeason]);

  // The chosen season's table: all three types come back, Total/Home/Away picks one
  const {
    data: standings,
    isLoading: isStandingsLoading,
    isFetching: isStandingsFetching,
    refetch: refetchStandings,
  } = useGetStandingsQuery({ league, season }, { skip: isRecentLoading });

  // In table order
  const tableRows = useMemo(() => {
    if (!standings) return [];
    return standings
      .filter((t) => t.type === type)
      .sort((a, b) => a.position - b.position);
  }, [standings, type]);

  const teamNames = useMemo(
    () => tableRows.map((t) => t.name).sort(),
    [tableRows],
  );
  const { data: xPositions, isFetching: isXPositionsLoading } =
    useGetTeamsExpectedStandingsQuery(
      { teams: teamNames },
      { skip: teamNames.length === 0 },
    );

  const isCurrentSeason = season === currentSeason;
  const liveTeams = useLiveStandings(
    tableRows,
    isCurrentSeason,
    refetchStandings,
    type,
  );
  const isLive = liveTeams.some((team) => team.live !== null);

  // Expected positions on top of the live table, so the arrows compare against
  // where the team is right now
  const rows = useMemo(() => {
    const byTeam = new Map((xPositions ?? []).map((x) => [x.team, x]));
    return liveTeams.map((t) => {
      const x = byTeam.get(t.name);
      const hasHistory = x?.expectedPosition != null;
      return {
        ...t,
        expectedPosition: hasHistory
          ? Number(x!.expectedPosition!.toFixed(1))
          : t.position,
        expectedSeasons: x?.seasons ?? 0,
        hasHistory,
      };
    });
  }, [liveTeams, xPositions]);

  const showExpected = type === "TOTAL";
  const headers = showExpected ? HEADER_CONFIG : HEADERS_WITHOUT_EXPECTED;

  function changeType(next: StandingType) {
    setType(next);
    // The xPos column disappears off Total, so don't stay sorted by it
    if (next !== "TOTAL" && sortConfig.key === "expectedPosition") {
      setSortConfig({ key: "position", direction: "asc" });
    }
  }

  const handleSort = (key: string) => {
    setSortConfig((prev) => {
      if (prev.key === key) {
        return { key, direction: prev.direction === "asc" ? "desc" : "asc" };
      }
      return { key, direction: "desc" };
    });
  };

  const sortedTeams = useMemo(() => {
    if (!rows.length) return [];
    return [...rows].sort((a, b) => {
      const key = sortConfig.key as keyof (typeof rows)[number];
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
  }, [rows, sortConfig]);

  if (isRecentLoading || isStandingsLoading) {
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
      <div className="mb-3 flex flex-wrap items-center justify-center gap-2">
        <select
          aria-label="Season"
          value={season}
          onChange={(event) => setSelectedSeason(event.target.value)}
          className="cursor-pointer rounded bg-gray-100 px-2 py-1 text-xs font-medium text-gray-800 hover:bg-gray-200 sm:text-sm dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
        >
          {seasonOptions.map((option) => (
            <option key={option} value={option}>
              {seasonLabel(option)}
            </option>
          ))}
        </select>

        <SegmentedTabs
          ariaLabel="Table type"
          size="sm"
          className="mx-0"
          options={TYPE_OPTIONS}
          value={type}
          onChange={changeType}
        />
      </div>

      {isLive && (
        <p className="mb-2 flex items-center justify-center gap-1.5 text-xs font-medium text-orange-600 dark:text-orange-400">
          <LiveDot />
          Live table, as it stands
        </p>
      )}

      <div
        className={`w-full overflow-x-auto rounded-lg transition-opacity ${isStandingsFetching ? "opacity-50" : ""}`}
      >
        <table className="w-full border-collapse shadow-sm text-[0.65rem] sm:text-[0.75rem] md:text-[0.85rem] lg:text-[0.9rem]">
          <thead className="bg-[#38003c] dark:bg-gray-900 text-white sticky top-0 z-10">
            <tr>
              {headers.map(({ label, key }) => (
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
            {sortedTeams.length === 0 && (
              <tr>
                <td
                  colSpan={headers.length}
                  className="py-8 text-center text-gray-600 dark:text-gray-400"
                >
                  No table for {seasonLabel(season)}.
                </td>
              </tr>
            )}

            {sortedTeams.map((team) => {
              const logo = getLogoFile(team.name);
              const zone = zoneFor(
                team.position - 1,
                sortedTeams.length,
                league,
              );
              const borderColor = zone ? ZONES[zone].color : "";
              const borderClass = zone ? "relative" : "";
              return (
                <tr
                  key={team.name}
                  className={`border-b border-gray-200 dark:border-gray-700 transition-colors duration-200 hover:bg-gray-50 dark:hover:bg-gray-700
                      ${team.name === teamName ? "bg-gray-400 dark:bg-gray-600" : ""}`}
                >
                  <td
                    className={`px-1 py-1 text-center ${borderClass} text-black dark:text-gray-200`}
                  >
                    {borderColor && (
                      <div
                        className={`absolute left-0 top-1/2 h-[70%] w-1 -translate-y-1/2 rounded-r ${borderColor}`}
                      />
                    )}
                    <span className="relative z-10 inline-flex items-center gap-1">
                      {team.position}
                      <Movement value={team.movement} />
                    </span>
                  </td>

                  {showExpected && (
                    <td
                      className="px-1 py-1 text-center tabular-nums text-black dark:text-gray-200"
                      title={
                        team.hasHistory
                          ? `Average finish over ${team.expectedSeasons} season${team.expectedSeasons === 1 ? "" : "s"}`
                          : "No previous seasons in this league, showing current position"
                      }
                    >
                      {isXPositionsLoading ? (
                        "…"
                      ) : (
                        <span className="inline-flex items-center justify-center gap-1">
                          {team.hasHistory
                            ? team.expectedPosition.toFixed(1)
                            : team.expectedPosition}
                          <PerformanceArrow
                            position={team.position}
                            expected={team.expectedPosition}
                          />
                        </span>
                      )}
                    </td>
                  )}

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
                        {team.live && <LiveScore live={team.live} />}
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
      <ZoneLegend teamCount={sortedTeams.length} league={league} />
    </div>
  );
};

export default TeamTable;
