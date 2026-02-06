"use client";

import Link from "next/link";
import Image from "next/image";
import {
  useGetPastMatchesQuery,
  useGetUpcomingHead2HeadQuery,
  useGetUpcomingMatchesQuery,
} from "@/state/api";
import {
  getLogoFile,
  normalizeTeams,
  LEAGUES,
  getLeagueFile,
  isPastMatch,
} from "@/lib/utils";
import { useMemo, useState } from "react";
import { head2Head, MatchBase, matchStats } from "@/types/drizzleTypes";
import { useMatchesByDate } from "@/hooks/useMatchesByDate";
import { PastMatchesList } from "./pastMatches";

export default function Matches() {
  const { data: upcomingMatches, isLoading: isMatchesLoading } =
    useGetUpcomingMatchesQuery();
  const { data: pastMatches, isLoading: isPastMatchesLoading } =
    useGetPastMatchesQuery();
  const { data: h2hData, isFetching: isH2HFetching } =
    useGetUpcomingHead2HeadQuery(
      {
        ids: upcomingMatches?.map((m) => Number(m.id)),
      },
      { skip: !upcomingMatches || upcomingMatches.length === 0 }
    );
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today.toISOString();
  });

  const isPastSelectedDate = isPastMatch(selectedDate);

  let allMatches = isPastSelectedDate ? pastMatches : upcomingMatches;

  const { filteredMatches, matchesByLeague, isPastDay } = useMatchesByDate({
    matches: allMatches as MatchBase[] | undefined,
    selectedDateISO: selectedDate,
  });

  const h2hMap = useMemo(() => {
    if (!h2hData) return new Map<string, head2Head>();
    const map = new Map<string, head2Head>();
    for (const h of h2hData) {
      if (h.team1 && h.team2) {
        map.set(normalizeTeams(h.team1, h.team2), h);
      }
    }
    return map;
  }, [h2hData]);

  const dateRange = useMemo(() => {
    const dates: Date[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = -7; i < 10; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      dates.push(d);
    }
    return dates;
  }, []);

  return (
    <section className="w-full max-w-full p-4 md:p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
      <h1 className="text-xl font-bold text-center text-gray-800 dark:text-gray-200 mb-5 border-b-2 border-[#38003c] dark:border-gray-400 pb-2">
        Matches
      </h1>

      {/* --- Date Selector --- */}
      <div className="flex gap-2 overflow-x-auto mb-4 pb-2 scrollbar-thin scrollbar-thumb-[#38003c]">
        {dateRange.map((date) => {
          const dateStr = date.toISOString();
          const todayISO = new Date().setHours(0, 0, 0, 0);
          const isToday = date.setHours(0, 0, 0, 0) === todayISO;

          const isActive =
            new Date(dateStr).toISOString().split("T")[0] ===
            new Date(selectedDate).toISOString().split("T")[0];
          return (
            <button
              key={dateStr}
              onClick={() => setSelectedDate(dateStr)}
              className={`px-3 py-1 rounded-md border text-sm font-medium transition-colors cursor-pointer flex flex-col items-center ${
                isActive
                  ? "bg-[#38003c] dark:bg-gray-700 text-white dark:text-gray-200 border-[#38003c] dark:border-gray-700 dark:hover:bg-gray-600"
                  : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-900"
              }`}
            >
              {isToday ? (
                <>
                  <span>Today</span>
                  <span>{date.getDate()}</span>
                  <span>
                    {date.toLocaleString("en-GB", { month: "short" })}
                  </span>
                </>
              ) : (
                date
                  .toLocaleDateString("en-GB", {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                  })
                  .replace(",", "")
              )}
            </button>
          );
        })}
      </div>

      <div
        className="flex flex-col gap-4 overflow-y-auto pr-2 
        [&::-webkit-scrollbar]:w-[2px] 
        [&::-webkit-scrollbar-track]:bg-[#f1f1f1] [&::-webkit-scrollbar-track]:rounded-[10px] dark:[&::-webkit-scrollbar-track]:bg-gray-800
        [&::-webkit-scrollbar-thumb]:bg-[#38003c] [&::-webkit-scrollbar-thumb]:rounded-[10px] dark:[&::-webkit-scrollbar-thumb]:bg-gray-400
        md:max-h-[97.23vh]"
      >
        {isMatchesLoading || isPastMatchesLoading ? (
          <p className="text-center text-gray-500 dark:text-gray-200 py-6">
            Loading Matches…
          </p>
        ) : filteredMatches.length === 0 ? (
          <p className="text-center text-gray-500 dark:text-gray-200 py-6">
            No matches scheduled for this date.
          </p>
        ) : (
          LEAGUES.map((league) => {
            const leagueMatches = matchesByLeague[league];
            if (leagueMatches.length === 0) return null;
            return (
              <div key={league}>
                <h2 className="flex items-center justify-center gap-2 text-2xl font-bold text-[#38003c] dark:text-gray-300 mb-3 border-b border-gray-200 dark:border-gray-400 pb-1">
                  <div className={`relative h-[40px] w-[40px] flex-shrink-0`}>
                    <Image
                      src={getLeagueFile(league)}
                      alt={`${league} logo`}
                      fill
                      className="object-contain"
                    />
                  </div>
                  <span>{league}</span>
                </h2>
                <div className="flex flex-col gap-4">
                  {isPastDay ? (
                    <PastMatchesList matches={leagueMatches as matchStats[]} />
                  ) : (
                    leagueMatches.map((m) => {
                      const key = normalizeTeams(m.homeTeam!, m.awayTeam!);
                      const h2h = h2hMap.get(key);

                      const homeWins = h2h
                        ? h2h.team1 === m.homeTeam
                          ? h2h.team1Wins
                          : h2h.team2Wins
                        : null;
                      const awayWins = h2h
                        ? h2h.team1 === m.awayTeam
                          ? h2h.team1Wins
                          : h2h.team2Wins
                        : null;
                      return (
                        <Link
                          key={m.id}
                          href={`/match/${m.id}`}
                          className="no-underline"
                        >
                          <div
                            className="p-4 rounded-md bg-[#f8f8f8] dark:bg-gray-700 border-l-4 border-[#38003c] dark:border-gray-700
                        transition-transform duration-200 ease-in-out hover:-translate-y-[2px] hover:shadow-lg"
                          >
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex flex-col items-center gap-1 w-2/5 font-semibold text-sm text-gray-800 dark:text-gray-300 text-center">
                                  <div className="relative w-6 h-6 mb-1">
                                    <Image
                                      src={`/${getLogoFile(m.homeTeam!)}`}
                                      alt={`${m.homeTeam} logo`}
                                      fill
                                      className="object-contain"
                                    />
                                  </div>
                                  <span>{m.homeTeam}</span>
                                </div>
                                <span className="text-gray-600 dark:text-gray-400 font-normal text-sm mx-2">
                                  vs
                                </span>
                                <div className="flex flex-col items-center gap-1 w-2/5 font-semibold text-sm text-gray-800 dark:text-gray-300 text-center">
                                  <div className="relative w-6 h-6 mb-1">
                                    <Image
                                      src={`/${getLogoFile(m.awayTeam!)}`}
                                      alt={`${m.awayTeam} logo`}
                                      fill
                                      className="object-contain"
                                    />
                                  </div>
                                  <span>{m.awayTeam}</span>
                                </div>
                              </div>

                              <p className="text-sm text-gray-600 dark:text-gray-200 mb-3 text-center">
                                {new Date(m.matchDate!).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}{" "}
                                (GMT)
                              </p>
                            </div>

                            {/* H2H wins, draws, and losses for upcoming match */}
                            <div className="grid grid-cols-3 gap-2 bg-white dark:bg-gray-600 p-3 rounded text-xs md:grid-cols-1">
                              {isH2HFetching ? (
                                <p className="col-span-3 text-center text-gray-400 dark:text-gray-200 text-[0.7rem]">
                                  Loading H2H…
                                </p>
                              ) : (
                                <>
                                  {/* Row 1: Labels */}
                                  <div className="flex justify-between text-[0.7rem] text-gray-600 dark:text-gray-200 font-semibold mb-1">
                                    <span className="text-left w-1/3">
                                      {m.homeTeam}
                                    </span>
                                    <span className="text-center w-1/3">
                                      Draws
                                    </span>
                                    <span className="text-right w-1/3">
                                      {m.awayTeam}
                                    </span>
                                  </div>

                                  {/* Row 2: Values */}
                                  <div className="flex justify-between text-[0.75rem] text-gray-800 dark:text-gray-300 font-medium">
                                    <span className="text-left w-1/3">
                                      {homeWins ?? "0"}
                                    </span>
                                    <span className="text-center w-1/3">
                                      {h2h?.draws ?? "0"}
                                    </span>
                                    <span className="text-right w-1/3">
                                      {awayWins ?? "0"}
                                    </span>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        </Link>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
