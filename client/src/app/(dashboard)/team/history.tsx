"use client";

import Pager from "@/components/Pager";
import { LiveDot } from "@/components/liveBadges";
import { RedCardBadge } from "@/lib/uiUtils";
import { getLogoFile, getMatchResult, getResultColors } from "@/lib/utils";
import { setTeamPage } from "@/state";
import { useGetLiveMatchesQuery, useGetRecentMatchesQuery } from "@/state/api";
import { useAppSelector } from "@/state/redux";
import { LiveMatch } from "@epl/shared";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { useDispatch } from "react-redux";

const PAGE_SIZE = 5;

// One team's line on a card: logo with red cards, and the name
function TeamLine({
  team,
  reds,
  ahead,
}: {
  team: string;
  reds: number | null;
  ahead: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-2 ${
        ahead
          ? "font-bold text-green-600 dark:text-green-500"
          : "text-gray-700 dark:text-gray-200"
      }`}
    >
      <div className="relative">
        <Image
          src={`/${getLogoFile(team)}`}
          alt={`${team} logo`}
          width={28}
          height={28}
          className="object-contain w-5 h-5 sm:w-6 sm:h-6"
        />
        <RedCardBadge count={reds} />
      </div>
      <span className="text-xs sm:text-sm">{team}</span>
    </div>
  );
}

function Score({ value, ahead }: { value: number | null; ahead: boolean }) {
  return (
    <span
      className={`text-lg sm:text-xl font-bold ${
        ahead
          ? "text-green-600 dark:text-green-500"
          : "text-gray-700 dark:text-gray-300"
      }`}
    >
      {value}
    </span>
  );
}

// The team's match that's being played right now, styled like the history cards
function LiveMatchRow({ match }: { match: LiveMatch }) {
  const colors = getResultColors("live");
  const isHalfTime = match.status === "STATUS_HALFTIME";

  let minute = match.clock ?? "Live";
  if (isHalfTime) minute = "HT";

  const homeAhead = match.homeScore > match.awayScore;
  const awayAhead = match.awayScore > match.homeScore;

  return (
    <li className="bg-white dark:bg-gray-800 rounded-md shadow-sm overflow-hidden">
      <Link
        href={`/live/${match.espnId}`}
        className={`relative w-full flex items-center p-2 sm:p-3 hover:bg-gray-100 dark:hover:bg-gray-700 ${colors.gradient} hover:rounded-md cursor-pointer transition text-left gap-3 no-underline`}
      >
        <div
          className={`absolute left-0 top-1/2 -translate-y-1/2 w-3 h-[55%] ${colors.rectangle} rounded-r-md -translate-x-1/2 z-10`}
        />

        {/* In place of the date: the live minute */}
        <div className="flex items-center gap-1.5 whitespace-nowrap text-xs font-semibold text-orange-600 dark:text-orange-400">
          <LiveDot />
          {minute}
        </div>

        <div className="text-gray-400 dark:text-gray-500 text-sm">|</div>

        <div className="flex items-center justify-between w-full">
          <div className="flex flex-col gap-1.5 flex-1">
            <TeamLine team={match.homeTeam} reds={match.hr} ahead={homeAhead} />
            <TeamLine team={match.awayTeam} reds={match.ar} ahead={awayAhead} />
          </div>
          <div className="flex flex-col gap-1.5 items-end ml-4">
            <Score value={match.homeScore} ahead={homeAhead} />
            <Score value={match.awayScore} ahead={awayAhead} />
          </div>
        </div>
      </Link>
    </li>
  );
}

const History = ({ team }: { team: string }) => {
  const router = useRouter();
  const dispatch = useDispatch();
  const stored = useAppSelector((state) => state.global.teamPage);
  const page = stored.team === team ? stored.page : 0;
  const setPage = (page: number) => {
    dispatch(setTeamPage({ team, page }));
  };
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  // This team's match, if it's being played right now
  const { data: liveMatches } = useGetLiveMatchesQuery(undefined, {
    pollingInterval: 30_000,
  });
  const liveMatch = liveMatches?.find(
    (match) => match.homeTeam === team || match.awayTeam === team,
  );

  // A live match takes the first slot on page 1, so every finished match moves down one
  const liveCount = liveMatch ? 1 : 0;

  let offset = page * PAGE_SIZE - liveCount;
  let limit = PAGE_SIZE;
  if (page === 0) {
    offset = 0;
    limit = PAGE_SIZE - liveCount;
  }

  const {
    data: recentMatches,
    isLoading,
    isFetching,
    refetch: refetchRecentMatches,
  } = useGetRecentMatchesQuery({ team, offset, limit });

  // When the live match ends, its row disappears: fetch the history again so
  // the finished match shows up as a normal result card
  const liveId = liveMatch?.espnId ?? null;
  const previousLiveId = useRef<string | null>(null);

  useEffect(() => {
    const matchJustEnded = previousLiveId.current !== null && liveId === null;
    if (matchJustEnded) refetchRecentMatches();
    previousLiveId.current = liveId;
  }, [liveId, refetchRecentMatches]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[75vh] w-full dark:bg-gray-900">
        <p className="text-gray-600 dark:text-gray-400 text-lg font-medium">
          Loading {team} Matches...
        </p>
      </div>
    );
  }

  return (
    <div className="flex justify-center w-full p-2">
      <div
        ref={scrollContainerRef}
        className="w-full max-w-xl overflow-y-auto max-h-[600px] px-4"
        style={{ scrollbarGutter: "stable" }}
      >
        <div className="flex justify-end mb-2">
          <Pager
            page={page}
            pageSize={PAGE_SIZE}
            total={(recentMatches?.total ?? 0) + liveCount}
            disabled={isFetching}
            onChange={setPage}
          />
        </div>
        <ul
          className={`mb-6 space-y-3 sm:space-y-4 transition-opacity ${isFetching ? "opacity-50" : ""}`}
        >
          {/* The newest matches are on the first page, so that's where a live one goes */}
          {page === 0 && liveMatch && <LiveMatchRow match={liveMatch} />}

          {recentMatches?.matches?.map((m) => {
            const result = getMatchResult(m, team!);
            const colors = getResultColors(result);
            const homeAhead = m.fthg! > m.ftag!;
            const awayAhead = m.ftag! > m.fthg!;

            return (
              <li
                key={m.id}
                className="bg-white dark:bg-gray-800 rounded-md shadow-sm overflow-hidden"
              >
                <button
                  onClick={() => router.push(`/postmatch/${m.id}`)}
                  className={`relative w-full flex items-center p-2 sm:p-3 hover:bg-gray-100 dark:hover:bg-gray-700 ${
                    colors.gradient
                  } hover:rounded-md cursor-pointer transition text-left gap-3
                `}
                >
                  <div
                    className={`absolute left-0 top-1/2 -translate-y-1/2 w-3 h-[55%] ${colors.rectangle} rounded-r-md -translate-x-1/2 z-10`}
                  />
                  <div className="text-gray-500 dark:text-gray-400 text-xs font-medium whitespace-nowrap">
                    {m.matchDate
                      ? new Date(m.matchDate).toLocaleDateString("en-US", {
                          year: "2-digit",
                          month: "2-digit",
                          day: "2-digit",
                        })
                      : "N/A"}
                  </div>

                  <div className="text-gray-400 dark:text-gray-500 text-sm">
                    |
                  </div>

                  <div className="flex items-center justify-between w-full">
                    <div className="flex flex-col gap-1.5 flex-1">
                      <TeamLine
                        team={m.homeTeam}
                        reds={m.hr}
                        ahead={homeAhead}
                      />
                      <TeamLine
                        team={m.awayTeam}
                        reds={m.ar}
                        ahead={awayAhead}
                      />
                    </div>
                    <div className="flex flex-col gap-1.5 items-end ml-4">
                      <Score value={m.fthg} ahead={homeAhead} />
                      <Score value={m.ftag} ahead={awayAhead} />
                    </div>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
};

export default History;
