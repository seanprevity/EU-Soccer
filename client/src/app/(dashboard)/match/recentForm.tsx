"use client";

import {
  MatchTimeline,
  RedCardBadge,
  renderForm,
  StatBar,
} from "@/lib/uiUtils";
import {
  getLogoFile,
  getResultColors,
  getMatchResult,
  statsKeys,
} from "@/lib/utils";
import { useGetLast5MatchesQuery } from "@/state/api";
import { matchStats } from "@/types/drizzleTypes";
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import Pager from "@/components/Pager";

const PAGE_SIZE = 5;

const teamHref = (team: string) => `/team/${team.split(" ").join("_")}`;

const readStat = (m: matchStats, side: "h" | "a", key: string): number => {
  const v = m[`${side}${key.slice(1)}` as keyof matchStats];
  return typeof v === "number" ? v : 0;
};

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
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
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

function StatsTeam({ team, side }: { team: string; side: "left" | "right" }) {
  const logo = (
    <Image
      src={`/${getLogoFile(team)}`}
      alt={`${team} logo`}
      width={36}
      height={36}
      className="object-contain"
    />
  );
  return (
    <div
      className={`flex items-center gap-1.5 sm:gap-2 ${side === "left" ? "text-left" : "text-right"}`}
    >
      {side === "left" && logo}
      <span className="text-sm sm:text-base">
        <Link
          href={teamHref(team)}
          className="no-underline gap-2 hover:opacity-60 transition-opacity"
        >
          {team}
        </Link>
      </span>
      {side === "right" && logo}
    </div>
  );
}

function MatchCard({
  m,
  team,
  open,
  onToggle,
}: {
  m: matchStats;
  team: string;
  open: boolean;
  onToggle: () => void;
}) {
  const colors = getResultColors(getMatchResult(m, team));
  const homeWon = m.fthg! > m.ftag!;
  const awayWon = m.ftag! > m.fthg!;

  return (
    <li className="bg-white dark:bg-gray-800 rounded-md shadow-sm overflow-hidden">
      <button
        onClick={onToggle}
        aria-expanded={open}
        className={`relative w-full flex items-center ${colors.gradient} p-2 sm:p-3 hover:bg-gray-100 dark:hover:bg-gray-700 hover:rounded-md cursor-pointer transition text-left gap-3 ${
          open
            ? "hover:rounded-b-none bg-gray-300 dark:bg-gray-600 rounded-t-md"
            : ""
        }`}
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
      </button>

      <AnimatePresence mode="wait">
        {open && (
          <motion.div
            key={`match-${m.id}`}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0, transition: { duration: 0.3 } }}
            transition={{ duration: 0.35, ease: [0.45, 0, 0.55, 1] }}
            className="overflow-hidden"
          >
            <div className="p-3 sm:p-4 bg-gray-50 dark:bg-gray-600 border-t dark:border-gray-800 rounded-b-md">
              <h4 className="text-center text-xs sm:text-sm font-bold text-gray-600 dark:text-gray-200 mb-2 sm:mb-3">
                Match Stats Comparison
              </h4>
              <div className="flex items-center justify-between mb-2 sm:mb-3 dark:text-gray-200">
                <StatsTeam team={m.homeTeam} side="left" />
                <StatsTeam team={m.awayTeam} side="right" />
              </div>

              {m.events && (
                <div className="mb-3 border-b border-gray-200 pb-3 dark:border-gray-600">
                  <MatchTimeline events={m.events} />
                </div>
              )}

              {statsKeys.map(({ key, label }) => {
                const homeValue = readStat(m, "h", key);
                const awayValue = readStat(m, "a", key);
                if (
                  (key === "hxg" || key === "hposs") &&
                  homeValue === 0 &&
                  awayValue === 0
                )
                  return null;
                return (
                  <StatBar
                    key={key}
                    label={label}
                    homeValue={homeValue}
                    awayValue={awayValue}
                  />
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  );
}

function TeamColumn({ team, form }: { team: string; form: string | null }) {
  const [page, setPage] = useState(0);
  const [expanded, setExpanded] = useState<number[]>([]);
  const { matches, isLoading, total, totalPages } = useRecentMatches(
    team,
    page,
  );

  const toggle = (id: number) =>
    setExpanded((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );

  const goTo = (next: number) => {
    setPage(next);
    setExpanded([]);
  };

  return (
    <div className="w-full md:w-1/2 px-2 self-stretch">
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
        <span className="px-1 py-2 justify-center gap-[2px] flex">
          {renderForm(form)}
        </span>
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
        <div className="max-w-xl mx-auto mb-6">
          <div className="flex justify-end mb-2">
            <Pager
              page={page}
              pageSize={PAGE_SIZE}
              total={total}
              totalPages={totalPages}
              disabled={isLoading}
              onChange={goTo}
            />
          </div>
          <ul
            className={`space-y-3 sm:space-y-4 transition-opacity ${isLoading ? "opacity-50" : ""}`}
          >
            {matches.map((m) => (
              <MatchCard
                key={m.id}
                m={m}
                team={team}
                open={expanded.includes(m.id)}
                onToggle={() => toggle(m.id)}
              />
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
  homeForm,
  awayForm,
}: {
  homeTeam: string;
  awayTeam: string;
  homeForm: string | null;
  awayForm: string | null;
}) => (
  <div className="w-full pt-2">
    <h2 className="text-center text-2xl font-bold text-gray-800 dark:text-gray-100 mb-4 md:mb-0 mt-6">
      Recent Form
    </h2>
    <div className="flex flex-col gap-1 md:flex-row w-full items-start justify-center">
      <TeamColumn team={homeTeam} form={homeForm} />
      <TeamColumn team={awayTeam} form={awayForm} />
    </div>
  </div>
);

export default RecentForm;
