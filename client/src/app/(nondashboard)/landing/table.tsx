"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import { useGetTopPlayersQuery, useGetStandingsQuery } from "@/state/api";
import { Standings, TopPlayerCategory } from "@/types/drizzleTypes";
import {
  generateSeasons,
  LEAGUES,
  getLogoFile,
  getLeagueFile,
  HEADER_CONFIG,
  cn,
} from "@/lib/utils";
import { renderForm } from "@/lib/uiUtils";
import { useAppSelector } from "@/state/redux";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useDispatch } from "react-redux";
import { setLeague, setSeason } from "@/state";

const TOP_PLAYER_CATEGORIES: {
  key: TopPlayerCategory;
  label: string;
  title: string;
}[] = [
  { key: "goals", label: "Goals", title: "Top Scorers" },
  { key: "assists", label: "Assists", title: "Top Assists" },
  { key: "saves", label: "Saves", title: "Most Saves" },
  { key: "yellow_cards", label: "Yellows", title: "Most Yellow Cards" },
  { key: "red_cards", label: "Reds", title: "Most Red Cards" },
];

// remove xPosition on this pages table
const LEAGUE_HEADERS = HEADER_CONFIG.filter(
  (h) => h.key !== "expectedPosition",
);

export default function Table() {
  const dispatch = useDispatch();
  const priority = useAppSelector((state) => state.global.priority);
  const league = useAppSelector((state) => state.global.league);
  const season = useAppSelector((state) => state.global.season);
  const [type, setType] = useState("TOTAL");
  const [sortConfig, setSortConfig] = useState({
    key: "position",
    direction: "asc",
  });
  const seasons = generateSeasons();
  const { data: teams, isLoading: isStandingsLoading } = useGetStandingsQuery({
    league,
    season,
  });
  const [category, setCategory] = useState<TopPlayerCategory>("goals");
  const activeCategory = TOP_PLAYER_CATEGORIES.find((c) => c.key === category);

  const { data: topPlayers, isFetching: isTopPlayersLoading } =
    useGetTopPlayersQuery({
      league,
      season,
      category,
    });

  const filteredTeams = useMemo(() => {
    if (!teams) return [];
    return teams.filter((t) => t.type === type);
  }, [teams, type]);

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
    if (!filteredTeams) return [];
    return [...filteredTeams].sort((a, b) => {
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
  }, [filteredTeams, sortConfig]);

  // Sort and ranks top players
  const rankedPlayers = useMemo(() => {
    if (!topPlayers) return [];
    let rank = 1;
    return topPlayers.map((p, i) => {
      if (i > 0 && p.value < topPlayers[i - 1].value) rank = i + 1;
      return { ...p, rank };
    });
  }, [topPlayers]);

  return (
    <section
      className={`w-full bg-white dark:bg-gray-800 rounded-lg shadow-md p-3 md:p-5 flex flex-col lg:flex-row gap-6 transition-all duration-500`}
    >
      {/* LHS: Standings Table */}
      <div className="flex-1 min-w-0">
        <div className="@container flex w-full flex-wrap items-center gap-3 mb-4 sm:flex-nowrap">
          <div className="flex gap-2 flex-wrap w-full sm:w-auto sm:shrink-0">
            <select
              value={league}
              onChange={(e) => dispatch(setLeague(e.target.value))}
              className="bg-white dark:bg-gray-700 dark:hover:bg-gray-600 border-none px-3 py-2 rounded text-gray-800 dark:text-gray-200 font-medium cursor-pointer flex-1 sm:flex-none"
            >
              {LEAGUES.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>

            <select
              value={season}
              onChange={(e) => dispatch(setSeason(e.target.value))}
              className="bg-white dark:bg-gray-700 border-none px-3 py-2 rounded text-gray-800 dark:text-gray-200 dark:hover:bg-gray-600 font-medium cursor-pointer flex-1 sm:flex-none"
            >
              {seasons.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>

            <div className="flex gap-2 w-full sm:w-auto">
              {["TOTAL", "HOME", "AWAY"].map((t) => {
                const label = t.charAt(0) + t.substring(1).toLowerCase();
                return (
                  <button
                    key={t}
                    onClick={() => setType(t)}
                    className={`
                    flex-1 sm:flex-none px-3 py-2 rounded-3xl font-medium text-xs sm:text-sm
                    transition-colors duration-150 cursor-pointer
                    ${
                      type === t
                        ? "bg-[#38003c] dark:bg-purple-900 text-white shadow-md"
                        : "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                    }
                  `}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="ml-auto hidden shrink-0 items-center gap-2 sm:flex">
            <div
              className="relative h-[28px] w-[28px] shrink-0 md:h-[36px] md:w-[36px]"
              title={league}
            >
              <Image
                src={getLeagueFile(league)}
                alt={`${league} logo`}
                fill
                className="object-contain"
              />
            </div>
            <span
              className={cn(
                "whitespace-nowrap font-semibold text-[#38003c] dark:text-gray-200",
                league === "Premier League"
                  ? "hidden text-sm md:text-base @min-[641px]:inline"
                  : "text-base md:text-lg",
              )}
            >
              {league}
            </span>
          </div>
        </div>

        {/* Table */}
        <div className="w-full overflow-x-auto rounded-lg">
          <table className="w-full border-collapse shadow-sm text-[0.65rem] sm:text-[0.75rem] md:text-[0.85rem] lg:text-[0.9rem]">
            <thead className="bg-[#38003c] dark:bg-gray-900 text-white sticky top-0 z-10">
              <tr>
                {LEAGUE_HEADERS.map(({ label, key }) => (
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
              {isStandingsLoading ? (
                <tr>
                  <td
                    colSpan={LEAGUE_HEADERS.length}
                    className="py-8 text-center text-gray-600 dark:text-gray-400"
                  >
                    Loading {season}…
                  </td>
                </tr>
              ) : (
                sortedTeams.map((team: any, idx: number) => {
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
                      className={`border-b border-gray-200 dark:border-gray-700 transition-colors duration-200 hover:bg-gray-50 dark:hover:bg-gray-700`}
                    >
                      <td
                        className={`px-1 py-1 text-center ${borderClass} text-black dark:text-gray-200 overflow-hidden`}
                      >
                        {borderColor && (
                          <div
                            className={`absolute left-0 top-1/2 -translate-y-1/2 w-3 h-[70%] ${borderColor} rounded-r-md -translate-x-1/2`}
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
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* RHS: Top Scorers */}
      <AnimatePresence mode="wait">
        {priority === "table" && (
          <motion.div
            key={priority}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0, transition: { delay: 0.15 } }}
            exit={{
              opacity: 0,
              x: 60,
              transition: { duration: 0.15 },
            }}
            transition={{ duration: 1, ease: [0.45, 0, 0.55, 1] }}
            className={`w-full lg:w-[280px] flex-shrink-0 overflow-hidden`}
          >
            <div className="mb-3 flex items-center justify-between gap-2 border-b border-gray-200 pb-1 dark:border-gray-400">
              <h3 className="truncate text-lg font-semibold text-[#38003c] dark:text-gray-200">
                {activeCategory?.title}
              </h3>
              <select
                value={category}
                onChange={(e) =>
                  setCategory(e.target.value as TopPlayerCategory)
                }
                aria-label="Top players category"
                className="shrink-0 cursor-pointer rounded bg-gray-100 px-2 py-1 text-xs font-medium text-gray-800 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
              >
                {season >= "2026" ? (
                  TOP_PLAYER_CATEGORIES.map((c) => (
                    <option key={c.key} value={c.key}>
                      {c.label}
                    </option>
                  ))
                ) : (
                  <option key={"goals"} value={"goals"}>
                    Goals
                  </option>
                )}
              </select>
            </div>

            {isTopPlayersLoading ? (
              <p className="text-gray-500 dark:text-gray-200 text-sm text-center py-4">
                Loading…
              </p>
            ) : rankedPlayers.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-200 text-sm text-center py-4">
                No {activeCategory?.label.toLowerCase()} data for {season}.
              </p>
            ) : (
              <div className="flex flex-col gap-3">
                {rankedPlayers.map((p) => (
                  <div
                    key={p.player}
                    className="flex items-center justify-between bg-[#f8f8f8] dark:bg-gray-700 px-3 py-2 rounded-md border-l-4 border-[#38003c] dark:border-indigo-400"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="text-sm font-bold text-gray-800 dark:text-gray-200 w-5 text-center">
                        {p.rank}
                      </span>
                      <div className="relative w-[38px] h-[38px] flex-shrink-0 rounded-full overflow-hidden">
                        <Image
                          src={p.imageUrl || "/placeholder-player.svg"}
                          alt={`${p.player} picture`}
                          fill
                          className={`${p.imageUrl ? "scale-175" : "scale-100"} origin-top`}
                        />
                      </div>
                      <div className="flex min-w-0 flex-col leading-tight">
                        <span className="truncate font-medium text-sm text-gray-800 dark:text-gray-200">
                          {p.player}
                        </span>
                        <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-300">
                          <div className="relative w-[16px] h-[16px] flex-shrink-0">
                            <Image
                              src={`/${getLogoFile(p.team)}`}
                              alt={`${p.team} logo`}
                              fill
                              className="object-contain"
                            />
                          </div>
                          <span className="truncate">{p.team}</span>
                        </div>
                      </div>
                    </div>
                    <div className="ml-2 flex shrink-0 flex-col items-end leading-tight">
                      <span className="font-semibold text-[#38003c] dark:text-gray-200 text-sm tabular-nums">
                        {p.value}
                      </span>
                      {p.appearances != null && (
                        <span className="text-[10px] text-gray-500 dark:text-gray-400 tabular-nums">
                          {p.appearances} apps
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
