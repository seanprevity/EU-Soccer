"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useGetStandingsQuery } from "@/state/api";
import { cn, genCurrentSeason, getLogoFile, HEADER_CONFIG } from "@/lib/utils";
import { renderForm } from "@/lib/uiUtils";
import { Standing } from "@epl/shared";
import { StandingType, useLiveStandings } from "@/lib/liveStandings";
import { LiveDot, LiveScore, Movement } from "@/components/liveBadges";
import { zoneFor, ZoneLegend, ZONES } from "@/lib/zones";

// No expected position on the league table
const LEAGUE_HEADERS = HEADER_CONFIG.filter(
  (h) => h.key !== "expectedPosition",
);

type SortConfig = { key: string; direction: "asc" | "desc" };

// Points from the last five results, for sorting by form
function formScore(form: string): number {
  const wins = (form.match(/W/g) || []).length;
  const draws = (form.match(/D/g) || []).length;
  return wins * 3 + draws;
}

// The standings table for one league and season: sortable, live during matches, with zones.
// Used on the home page and on the match page's Table tab.
export default function LeagueTable({
  league,
  season,
  type,
  highlight = [],
}: {
  league: string;
  season: string;
  type: StandingType;
  highlight?: string[]; // teams to pick out, e.g. the two teams in a match
}) {
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: "position",
    direction: "asc",
  });

  const {
    data: teams,
    isLoading,
    refetch,
  } = useGetStandingsQuery({ league, season });

  const filteredTeams = useMemo(() => {
    if (!teams) return [];
    return teams
      .filter((t) => t.type === type)
      .sort((a, b) => a.position - b.position);
  }, [teams, type]);

  const isCurrentSeason = season === genCurrentSeason();
  const liveTeams = useLiveStandings(
    filteredTeams,
    isCurrentSeason,
    refetch,
    type,
  );
  const isLive = liveTeams.some((team) => team.live !== null);

  function handleSort(key: string) {
    setSortConfig((prev) => {
      if (prev.key === key) {
        return { key, direction: prev.direction === "asc" ? "desc" : "asc" };
      }
      return { key, direction: "desc" };
    });
  }

  const sortedTeams = useMemo(() => {
    return [...liveTeams].sort((a, b) => {
      const key = sortConfig.key as keyof Standing;
      let aVal = a[key];
      let bVal = b[key];

      if (sortConfig.key === "form") {
        aVal = formScore(a.form || "");
        bVal = formScore(b.form || "");
      }
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });
  }, [liveTeams, sortConfig]);

  const cell = "px-1 py-2 text-center text-black dark:text-gray-200";

  return (
    <>
      {isLive && (
        <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-orange-600 dark:text-orange-400">
          <LiveDot />
          Live table, as it stands
        </p>
      )}

      <div className="w-full overflow-x-auto rounded-lg">
        <table className="w-full border-collapse text-[0.65rem] shadow-sm sm:text-[0.75rem] md:text-[0.85rem] lg:text-[0.9rem]">
          <thead className="sticky top-0 z-10 bg-[#38003c] text-white dark:bg-gray-900">
            <tr>
              {LEAGUE_HEADERS.map(({ label, key }) => (
                <th
                  key={key}
                  onClick={() => handleSort(key)}
                  className={cn(
                    "cursor-pointer select-none px-1 py-2 text-center text-[0.65rem] font-semibold hover:bg-white/10 sm:text-[0.75rem] md:text-[0.85rem]",
                    key === "position" && "w-[60px] sm:w-[80px]",
                  )}
                >
                  {label}
                  {sortConfig.key === key &&
                    (sortConfig.direction === "asc" ? " ↑" : " ↓")}
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="bg-white dark:bg-gray-800">
            {isLoading && (
              <tr>
                <td
                  colSpan={LEAGUE_HEADERS.length}
                  className="py-8 text-center text-gray-600 dark:text-gray-400"
                >
                  Loading {season}…
                </td>
              </tr>
            )}

            {!isLoading &&
              sortedTeams.map((team) => {
                // Zone from the league position, so it doesn't move when the table is re-sorted
                const zone = zoneFor(
                  team.position - 1,
                  sortedTeams.length,
                  league,
                );
                const isHighlighted = highlight.includes(team.name);

                return (
                  <tr
                    key={team.name}
                    className={cn(
                      "border-b border-gray-200 transition-colors duration-200 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700",
                      isHighlighted &&
                        "bg-gray-100 font-semibold dark:bg-gray-700/70",
                    )}
                  >
                    <td className={cn(cell, "relative py-1")}>
                      {zone && (
                        <div
                          className={cn(
                            "absolute left-0 top-1/2 h-[70%] w-1 -translate-y-1/2 rounded-r",
                            ZONES[zone].color,
                          )}
                        />
                      )}
                      <span className="relative z-10 inline-flex items-center gap-1">
                        {team.position}
                        <Movement value={team.movement} />
                      </span>
                    </td>
                    <td className="px-2 py-1 text-left font-medium">
                      <Link
                        href={`/team/${team.name.split(" ").join("_")}`}
                        className="flex items-center no-underline transition-opacity hover:opacity-90"
                      >
                        <div className="flex items-center gap-2">
                          <div className="relative h-[20px] w-[20px] shrink-0 sm:h-[24px] sm:w-[24px] md:h-[28px] md:w-[28px]">
                            <Image
                              src={`/${getLogoFile(team.name)}`}
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
                    <td className={cell}>{team.played}</td>
                    <td className={cell}>{team.won}</td>
                    <td className={cell}>{team.draw}</td>
                    <td className={cell}>{team.lost}</td>
                    <td className={cell}>{team.goalsFor}</td>
                    <td className={cell}>{team.goalsAgainst}</td>
                    <td className={cell}>{team.goalDifference}</td>
                    <td className={cell}>{team.points}</td>
                    <td className="flex justify-center gap-[2px] px-1 py-2">
                      {renderForm(team.form)}
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      <ZoneLegend teamCount={sortedTeams.length} league={league} />
    </>
  );
}
