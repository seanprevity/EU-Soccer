"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import { useGetTopPlayersQuery } from "@/state/api";
import {
  generateSeasons,
  LEAGUES,
  getLogoFile,
  getLeagueFile,
  cn,
} from "@/lib/utils";
import { useAppSelector } from "@/state/redux";
import { useDispatch } from "react-redux";
import { setLeague, setSeason } from "@/state";
import { TopPlayerCategory } from "@epl/shared";
import { StandingType } from "@/lib/liveStandings";
import LeagueTable from "@/components/leagueTable";

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

export default function Table() {
  const dispatch = useDispatch();
  const priority = useAppSelector((state) => state.global.priority);
  const league = useAppSelector((state) => state.global.league);
  const season = useAppSelector((state) => state.global.season);
  const [type, setType] = useState<StandingType>("TOTAL");
  const seasons = generateSeasons();
  const [category, setCategory] = useState<TopPlayerCategory>("goals");
  const activeCategory = TOP_PLAYER_CATEGORIES.find((c) => c.key === category);

  const { data: topPlayers, isFetching: isTopPlayersLoading } =
    useGetTopPlayersQuery({
      league,
      season,
      category,
    });

  // Sort and ranks top players
  const rankedPlayers = useMemo(() => {
    if (!topPlayers) return [];
    let rank = 1;
    return topPlayers.map((p, i) => {
      if (i > 0 && p.value < topPlayers[i - 1].value) rank = i + 1;
      return { ...p, rank };
    });
  }, [topPlayers]);

  const showTopPlayers = priority === "table";

  return (
    <section
      className={`w-full bg-white dark:bg-gray-800 rounded-lg shadow-md p-3 md:p-5 flex flex-col lg:flex-row gap-6 transition-all duration-500`}
    >
      {/* LHS: Standings Table */}
      <div className="@container min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2 pb-2.5">
          <select
            value={league}
            onChange={(e) => dispatch(setLeague(e.target.value))}
            className="flex-1 cursor-pointer rounded border-none bg-white px-3 py-2 font-medium text-gray-800 sm:flex-none dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
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
            className="flex-1 cursor-pointer rounded border-none bg-white px-3 py-2 font-medium text-gray-800 sm:flex-none dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
          >
            {seasons.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          <div className="flex w-full gap-2 sm:w-auto">
            {(["TOTAL", "HOME", "AWAY"] as const).map((t) => {
              const label = t.charAt(0) + t.substring(1).toLowerCase();
              return (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  className={cn(
                    "flex-1 cursor-pointer rounded-3xl px-3 py-2 text-xs font-medium transition-colors duration-150 sm:flex-none sm:text-sm",
                    type === t
                      ? "bg-white text-gray-900 shadow-sm dark:bg-gray-900 dark:text-white dark:ring-gray-500"
                      : "bg-gray-100 text-gray-800 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600/80",
                  )}
                >
                  {label}
                </button>
              );
            })}
          </div>

          <div className="ml-auto hidden shrink-0 items-center gap-2 sm:flex">
            <div className="relative size-7 shrink-0 md:size-9" title={league}>
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

        <LeagueTable league={league} season={season} type={type} />
      </div>

      {/* RHS: Top Scorers */}
      <div
        inert={!showTopPlayers}
        className={cn(
          "w-full shrink-0 overflow-hidden motion-reduce:transition-none lg:w-[280px]",
          "transition-[width,margin,opacity,transform] duration-500 ease-[cubic-bezier(0.45,0,0.55,1)]",
          showTopPlayers
            ? "translate-x-0 opacity-100"
            : "translate-x-10 opacity-0 max-lg:hidden lg:-ml-6 lg:w-0",
        )}
      >
        {/* Fixed width inside, so the content doesn't squash while the outer width animates */}
        <div className="w-full lg:w-[280px]">
          <div className="mb-3 flex items-center justify-between gap-2 border-b border-gray-200 pb-1 dark:border-gray-400">
            <h3 className="truncate text-lg font-semibold text-[#38003c] dark:text-gray-200">
              {activeCategory?.title}
            </h3>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as TopPlayerCategory)}
              aria-label="Top players category"
              className="shrink-0 cursor-pointer rounded bg-gray-100 px-2 py-1 text-xs font-medium text-gray-800 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
            >
              {TOP_PLAYER_CATEGORIES.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.label}
                </option>
              ))}
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
        </div>
      </div>
    </section>
  );
}
