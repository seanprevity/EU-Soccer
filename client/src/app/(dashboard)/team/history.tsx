"use client";

import Pager from "@/components/Pager";
import { RedCardBadge } from "@/lib/uiUtils";
import { getLogoFile, getMatchResult, getResultColors } from "@/lib/utils";
import { setTeamPage } from "@/state";
import { useGetRecentMatchesQuery } from "@/state/api";
import { useAppSelector } from "@/state/redux";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useRef } from "react";
import { useDispatch } from "react-redux";

const PAGE_SIZE = 5;

const History = ({ team }: { team: string }) => {
  const router = useRouter();
  const dispatch = useDispatch();
  const stored = useAppSelector((state) => state.global.teamPage);
  const page = stored.team === team ? stored.page : 0;
  const setPage = (page: number) => {
    dispatch(setTeamPage({ team, page }));
  };
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const {
    data: recentMatches,
    isLoading,
    isFetching,
  } = useGetRecentMatchesQuery({
    team,
    page,
  });

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
            total={recentMatches?.total ?? 0}
            disabled={isFetching}
            onChange={setPage}
          />
        </div>
        <ul
          className={`mb-6 space-y-3 sm:space-y-4 transition-opacity ${isFetching ? "opacity-50" : ""}`}
        >
          {recentMatches?.matches?.map((m) => {
            const result = getMatchResult(m, team!);
            const colors = getResultColors(result);

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
                    {/* Left side - Teams with logos */}
                    <div className="flex flex-col gap-1.5 flex-1">
                      {/* Home Team */}
                      <div
                        className={`flex items-center gap-2 ${
                          m.fthg! > m.ftag!
                            ? "font-bold text-green-600 dark:text-green-500"
                            : "text-gray-700 dark:text-gray-200"
                        }`}
                      >
                        <div className="relative">
                          <Image
                            src={`/${getLogoFile(m.homeTeam)}`}
                            alt={`${m.homeTeam} logo`}
                            width={28}
                            height={28}
                            className="object-contain w-5 h-5 sm:w-6 sm:h-6"
                          />
                          <RedCardBadge count={m.hr} />
                        </div>
                        <span className="text-xs sm:text-sm">{m.homeTeam}</span>
                      </div>

                      {/* Away Team */}
                      <div
                        className={`flex items-center gap-2 ${
                          m.ftag! > m.fthg!
                            ? "font-bold text-green-600 dark:text-green-500"
                            : "text-gray-700 dark:text-gray-200"
                        }`}
                      >
                        <div className="relative">
                          <Image
                            src={`/${getLogoFile(m.awayTeam)}`}
                            alt={`${m.awayTeam} logo`}
                            width={28}
                            height={28}
                            className="object-contain w-5 h-5 sm:w-6 sm:h-6"
                          />
                          <RedCardBadge count={m.ar} />
                        </div>
                        <span className="text-xs sm:text-sm">{m.awayTeam}</span>
                      </div>
                    </div>

                    {/* Right side - Scores */}
                    <div className="flex flex-col gap-1.5 items-end ml-4">
                      <span
                        className={`text-lg sm:text-xl font-bold ${
                          m.fthg! > m.ftag!
                            ? "text-green-600 dark:text-green-500"
                            : "text-gray-700 dark:text-gray-300"
                        }`}
                      >
                        {m.fthg}
                      </span>
                      <span
                        className={`text-lg sm:text-xl font-bold ${
                          m.ftag! > m.fthg!
                            ? "text-green-600 dark:text-green-500"
                            : "text-gray-700 dark:text-gray-300"
                        }`}
                      >
                        {m.ftag}
                      </span>
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
