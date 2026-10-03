"use client";

import { RedCardBadge } from "@/lib/uiUtils";
import { getLogoFile, getResultColors, getMatchResult } from "@/lib/utils";
import { useGetLast5MatchesQuery } from "@/state/api";
import { matchPreview } from "@/types/drizzleTypes";
import Image from "next/image";
import Link from "next/link";
import Pager from "@/components/Pager";
import { useDispatch } from "react-redux";
import { useAppSelector } from "@/state/redux";
import { setAwayRFPage, setHomeRFPage } from "@/state";

const PAGE_SIZE = 5;

const teamHref = (team: string) => `/team/${team.split(" ").join("_")}`;

function useRecentMatches(team: string, page: number) {
  const { data, isLoading, isFetching } = useGetLast5MatchesQuery({
    team,
    page,
  });
  const total = data?.total ?? 0;
  return {
    matches: data?.matches ?? [],
    isLoading: isLoading || isFetching,
    total,
  };
}

function TeamLine({
  team,
  red,
  won,
}: {
  team: string;
  red: number | null | undefined;
  won: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-2 ${
        won
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
        <RedCardBadge count={red} />
      </div>
      <span className="text-xs sm:text-sm">{team}</span>
    </div>
  );
}

function Score({ value, won }: { value: number | null; won: boolean }) {
  return (
    <span
      className={`text-lg sm:text-xl font-bold ${
        won
          ? "text-green-600 dark:text-green-500"
          : "text-gray-700 dark:text-gray-300"
      }`}
    >
      {value}
    </span>
  );
}

function MatchRow({ m, team }: { m: matchPreview; team: string }) {
  const colors = getResultColors(getMatchResult(m, team));
  const homeWon = m.fthg! > m.ftag!;
  const awayWon = m.ftag! > m.fthg!;

  return (
    <li className="bg-white dark:bg-gray-800 rounded-md shadow-sm overflow-hidden">
      <Link
        href={`/postmatch/${m.id}`}
        className={`relative w-full flex items-center ${colors.gradient} p-2 sm:p-3 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md cursor-pointer transition text-left gap-3`}
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

        <div className="text-gray-400 dark:text-gray-500 text-sm">|</div>

        <div className="flex items-center justify-between w-full">
          <div className="flex flex-col gap-1.5 flex-1">
            <TeamLine team={m.homeTeam} red={m.hr} won={homeWon} />
            <TeamLine team={m.awayTeam} red={m.ar} won={awayWon} />
          </div>
          <div className="flex flex-col gap-1.5 items-end ml-4">
            <Score value={m.fthg} won={homeWon} />
            <Score value={m.ftag} won={awayWon} />
          </div>
        </div>
      </Link>
    </li>
  );
}

function TeamColumn({ team, isHome }: { team: string; isHome: boolean }) {
  const dispatch = useDispatch();
  const page = useAppSelector((state) =>
    isHome ? state.global.homeRFPage : state.global.awayRFPage,
  );
  const setPage = (page: number) => {
    if (isHome) dispatch(setHomeRFPage(page));
    else dispatch(setAwayRFPage(page));
  };
  const { matches, isLoading, total } = useRecentMatches(team, page);

  return (
    <div className="w-full md:flex-1 md:max-w-xl px-2 self-stretch">
      <div className="flex flex-col items-center mb-4">
        <Image
          src={`/${getLogoFile(team)}`}
          alt={`${team} Logo`}
          width={40}
          height={40}
          className="w-10 h-10 mb-2"
        />
        <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200">
          <Link
            href={teamHref(team)}
            className="no-underline gap-2 hover:opacity-60 transition-opacity"
          >
            {team}
          </Link>
        </h3>
      </div>

      {isLoading && !matches.length ? (
        <div className="text-center text-sm text-gray-500 dark:text-gray-400">
          Loading {team} recent matches…
        </div>
      ) : !total ? (
        <div className="text-center text-sm text-gray-500 dark:text-gray-400">
          No recent matches.
        </div>
      ) : (
        <div className="mb-6">
          <div className="flex justify-end mb-2">
            <Pager
              page={page}
              pageSize={PAGE_SIZE}
              total={total}
              disabled={isLoading}
              onChange={setPage}
            />
          </div>
          <ul
            className={`space-y-3 sm:space-y-4 transition-opacity ${isLoading ? "opacity-50" : ""}`}
          >
            {matches.map((m) => (
              <MatchRow key={m.id} m={m} team={team} />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

const RecentForm = ({
  homeTeam,
  awayTeam,
}: {
  homeTeam: string;
  awayTeam: string;
}) => (
  <div className="w-full pt-2">
    <h2 className="text-center text-2xl font-bold text-gray-800 dark:text-gray-100 mb-4 md:mb-0 mt-6">
      Match History
    </h2>
    <div className="flex flex-col md:flex-row w-full items-start justify-center gap-6 md:gap-8">
      <TeamColumn team={homeTeam} isHome={true} />
      <TeamColumn team={awayTeam} isHome={false} />
    </div>
  </div>
);

export default RecentForm;
