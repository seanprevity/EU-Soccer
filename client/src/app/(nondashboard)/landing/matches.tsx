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
  cn,
} from "@/lib/utils";
import { useEffect, useMemo, useRef } from "react";
import { head2Head, upcomingMatches } from "@/types/drizzleTypes";
import { useMatchesByDate } from "@/hooks/useMatchesByDate";
import { PastMatchesList } from "./pastMatches";
import { useAppSelector } from "@/state/redux";
import { useDispatch } from "react-redux";
import { setMatchDate } from "@/state";
import { edgeFor, matchColors } from "@/lib/array";

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

  const homeWins = winsFor(m.homeTeam) ?? 0;
  const awayWins = winsFor(m.awayTeam) ?? 0;
  const draws = h2h?.draws ?? 0;
  const total = homeWins + draws + awayWins;
  const colors = matchColors(m.homeTeam, m.awayTeam);

  const segments = [
    { key: "home", count: homeWins, color: colors.home.bg },
    { key: "draw", count: draws, color: null },
    { key: "away", count: awayWins, color: colors.away.bg },
  ];

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
            hour: "numeric",
            minute: "2-digit",
          })}{" "}
        </p>

        {/* Head to head */}
        <div className="rounded bg-white p-3 dark:bg-gray-600">
          {h2hLoading ? (
            <p className="text-center text-[0.7rem] text-gray-400 dark:text-gray-200">
              Loading H2H…
            </p>
          ) : total === 0 ? (
            <p className="text-center text-[0.7rem] text-gray-500 dark:text-gray-300">
              First meeting
            </p>
          ) : (
            <>
              <p className="mb-1.5 text-center text-[0.65rem] font-medium uppercase tracking-wide text-gray-500 dark:text-gray-300">
                Head to head · {total} {total === 1 ? "meeting" : "meetings"}
              </p>
              <div className="mb-1.5 grid grid-cols-3 items-center text-[0.7rem] text-gray-500 dark:text-gray-300">
                <span className="flex min-w-0 items-center gap-1">
                  <Image
                    src={`/${getLogoFile(m.homeTeam)}`}
                    alt={`${m.homeTeam} logo`}
                    width={20}
                    height={20}
                    className="h-6 w-6 shrink-0 object-contain"
                  />
                  <span className="text-sm font-bold tabular-nums text-gray-900 dark:text-white">
                    {homeWins}
                  </span>
                  <span className="truncate">
                    {homeWins === 1 ? "Win" : "Wins"}
                  </span>
                </span>
                <span className="flex items-center justify-center gap-1">
                  <span className="text-sm font-bold tabular-nums text-gray-900 dark:text-white">
                    {draws}
                  </span>
                  <span>{draws === 1 ? "Draw" : "Draws"}</span>
                </span>
                <span className="flex min-w-0 items-center justify-end gap-1">
                  <span className="text-sm font-bold tabular-nums text-gray-900 dark:text-white">
                    {awayWins}
                  </span>
                  <span className="truncate">
                    {awayWins === 1 ? "Win" : "Wins"}
                  </span>
                  <Image
                    src={`/${getLogoFile(m.awayTeam)}`}
                    alt={`${m.awayTeam} logo`}
                    width={20}
                    height={20}
                    className="h-6 w-6 shrink-0 object-contain"
                  />
                </span>
              </div>
              <div
                className="flex h-1.5 gap-0.5 overflow-hidden rounded-full"
                role="img"
                aria-label={`${m.homeTeam} ${homeWins} wins, ${draws} draws, ${m.awayTeam} ${awayWins} wins`}
              >
                {segments.map((s) =>
                  s.count > 0 ? (
                    <div
                      key={s.key}
                      className={cn(
                        "h-full",
                        s.color
                          ? edgeFor(s.color)
                          : "bg-gray-400 dark:bg-gray-500",
                      )}
                      style={{
                        width: `${(s.count / total) * 100}%`,
                        ...(s.color && { backgroundColor: s.color }),
                      }}
                    />
                  ) : null,
                )}
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
