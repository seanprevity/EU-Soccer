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
} from "@/lib/utils";
import { useEffect, useMemo, useRef } from "react";
import { head2Head, upcomingMatches } from "@/types/drizzleTypes";
import { useMatchesByDate } from "@/hooks/useMatchesByDate";
import { PastMatchesList } from "./pastMatches";
import { useAppSelector } from "@/state/redux";
import { useDispatch } from "react-redux";
import { setMatchDate } from "@/state";

function UpcomingMatchCard({
  match: m,
  h2h,
  h2hLoading,
}: {
  match: upcomingMatches;
  h2h: head2Head | undefined;
  h2hLoading: boolean;
}) {
  const winsFor = (team: string) =>
    h2h ? (h2h.team1 === team ? h2h.team1Wins : h2h.team2Wins) : null;

  const teamBlock = (team: string) => (
    <div className="flex flex-col items-center gap-1 w-2/5 font-semibold text-sm text-gray-800 dark:text-gray-300 text-center">
      <div className="relative w-6 h-6 mb-1">
        <Image
          src={`/${getLogoFile(team)}`}
          alt={`${team} logo`}
          fill
          className="object-contain"
        />
      </div>
      <span>{team}</span>
    </div>
  );

  return (
    <Link href={`/match/${m.id}`} className="no-underline">
      <div className="p-4 rounded-md bg-[#f8f8f8] dark:bg-gray-700 border-l-4 border-[#38003c] dark:border-gray-700 transition-transform duration-200 ease-in-out hover:-translate-y-[2px] hover:shadow-lg">
        <div className="flex items-center justify-between mb-2">
          {teamBlock(m.homeTeam)}
          <span className="text-gray-600 dark:text-gray-400 font-normal text-sm mx-2">
            vs
          </span>
          {teamBlock(m.awayTeam)}
        </div>

        <p className="text-sm text-gray-600 dark:text-gray-200 mb-3 text-center">
          {new Date(m.matchDate).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}{" "}
          (GMT)
        </p>

        {/* H2H wins, draws, and losses */}
        <div className="grid grid-cols-3 gap-2 bg-white dark:bg-gray-600 p-3 rounded text-xs md:grid-cols-1">
          {h2hLoading ? (
            <p className="col-span-3 text-center text-gray-400 dark:text-gray-200 text-[0.7rem]">
              Loading H2H…
            </p>
          ) : (
            <>
              <div className="flex justify-between text-[0.7rem] text-gray-600 dark:text-gray-200 font-semibold mb-1">
                <span className="text-left w-1/3">{m.homeTeam}</span>
                <span className="text-center w-1/3">Draws</span>
                <span className="text-right w-1/3">{m.awayTeam}</span>
              </div>
              <div className="flex justify-between text-[0.75rem] text-gray-800 dark:text-gray-300 font-medium">
                <span className="text-left w-1/3">
                  {winsFor(m.homeTeam) ?? "0"}
                </span>
                <span className="text-center w-1/3">{h2h?.draws ?? "0"}</span>
                <span className="text-right w-1/3">
                  {winsFor(m.awayTeam) ?? "0"}
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    </Link>
  );
}

export default function Matches() {
  const { data: upcomingMatches, isLoading: isUpcomingLoading } =
    useGetUpcomingMatchesQuery();
  const { data: pastMatches, isLoading: isPastLoading } =
    useGetPastMatchesQuery();
  const { data: h2hData, isFetching: isH2HFetching } =
    useGetUpcomingHead2HeadQuery(
      { ids: upcomingMatches?.map((m) => m.id) },
      { skip: !upcomingMatches?.length },
    );

  const dispatch = useDispatch();
  const selectedDate = useAppSelector((state) => state.global.matchDate);

  // Each list keeps its own type: no casts, no union
  const past = useMatchesByDate(pastMatches, selectedDate);
  const upcoming = useMatchesByDate(upcomingMatches, selectedDate);

  const dateBarRef = useRef<HTMLDivElement>(null);
  const activeDateRef = useRef<HTMLButtonElement>(null);
  const hasScrolled = useRef(false);

  useEffect(() => {
    const bar = dateBarRef.current;
    const btn = activeDateRef.current;
    if (!bar || !btn) return;
    bar.scrollTo({
      left: btn.offsetLeft - bar.clientWidth / 2 + btn.offsetWidth / 2,
      behavior: hasScrolled.current ? "smooth" : "instant",
    });
    hasScrolled.current = true;
  }, [selectedDate]);

  const h2hMap = useMemo(() => {
    const map = new Map<string, head2Head>();
    for (const h of h2hData ?? []) {
      if (h.team1 && h.team2) map.set(normalizeTeams(h.team1, h.team2), h);
    }
    return map;
  }, [h2hData]);

  const dateRange = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return Array.from({ length: 17 }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() + i - 7);
      return d;
    });
  }, []);

  const todayKey = new Date().toDateString();
  const selectedKey = new Date(selectedDate).toDateString();
  const isLoading = isUpcomingLoading || isPastLoading;

  return (
    <section className="w-full max-w-full p-4 md:p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
      <h1 className="text-xl font-bold text-center text-gray-800 dark:text-gray-200 mb-5 border-b-2 border-[#38003c] dark:border-gray-400 pb-2">
        Matches
      </h1>

      {/* --- Date Selector --- */}
      <div
        ref={dateBarRef}
        className="relative flex gap-2 overflow-x-auto mb-4 pb-2 scrollbar-thin scrollbar-thumb-[#38003c]"
      >
        {dateRange.map((date) => {
          const dateStr = date.toISOString();
          const isToday = date.toDateString() === todayKey;
          const isActive = date.toDateString() === selectedKey;
          return (
            <button
              key={dateStr}
              ref={isActive ? activeDateRef : undefined}
              onClick={() => dispatch(setMatchDate(dateStr))}
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
        {isLoading ? (
          <p className="text-center text-gray-500 dark:text-gray-200 py-6">
            Loading Matches…
          </p>
        ) : past.count + upcoming.count === 0 ? (
          <p className="text-center text-gray-500 dark:text-gray-200 py-6">
            No matches scheduled for this date.
          </p>
        ) : (
          LEAGUES.map((league) => {
            const finished = past.byLeague[league];
            const scheduled = upcoming.byLeague[league];
            if (!finished.length && !scheduled.length) return null;
            return (
              <div key={league}>
                <h2 className="flex items-center justify-center gap-2 text-2xl font-bold text-[#38003c] dark:text-gray-300 mb-3 border-b border-gray-200 dark:border-gray-400 pb-1">
                  <div className="relative h-[40px] w-[40px] flex-shrink-0">
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
                  {finished.length > 0 && (
                    <PastMatchesList matches={finished} />
                  )}
                  {scheduled.map((m) => (
                    <UpcomingMatchCard
                      key={m.id}
                      match={m}
                      h2h={h2hMap.get(normalizeTeams(m.homeTeam, m.awayTeam))}
                      h2hLoading={isH2HFetching}
                    />
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
