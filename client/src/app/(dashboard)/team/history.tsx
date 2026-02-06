"use client";

import { StatBar } from "@/lib/uiUtils";
import {
  getLogoFile,
  getMatchResult,
  getResultColors,
  statsKeys,
} from "@/lib/utils";
import { useGetRecentMatchesQuery } from "@/state/api";
import type { matchStats } from "@/types/drizzleTypes";
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useState, useRef } from "react";

const History = ({ team }: { team: string }) => {
  const endDate = new Date().toISOString().split("T")[0];
  const [expandedMatchId, setExpandedMatchId] = useState<number[]>([]);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const { data: recentMatches, isLoading: isRecentMatchesLoading } =
    useGetRecentMatchesQuery({
      team,
      endDate,
    });

  if (isRecentMatchesLoading) {
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
        <ul className="mb-6 space-y-3 sm:space-y-4">
          {recentMatches?.map((m) => {
            const result = getMatchResult(m, team!);
            const colors = getResultColors(result);

            return (
              <li
                key={m.id}
                className="bg-white dark:bg-gray-800 rounded-md shadow-sm overflow-hidden"
              >
                <button
                  onClick={() =>
                    setExpandedMatchId((prev) =>
                      prev.includes(m.id)
                        ? prev.filter((id) => id !== m.id)
                        : [...prev, m.id]
                    )
                  }
                  className={`relative w-full flex items-center p-2 sm:p-3 hover:bg-gray-100 dark:hover:bg-gray-700 ${
                    colors.gradient
                  } hover:rounded-md cursor-pointer transition text-left gap-3
                ${
                  expandedMatchId.includes(m.id)
                    ? "hover:rounded-b-none bg-gray-300 dark:bg-gray-600 rounded-t-md"
                    : ""
                }
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
                          {typeof m.hr === "number" && m.hr > 0 && (
                            <div className="absolute -top-1 -right-1 w-[10px] h-[10px] flex items-center justify-center">
                              <Image
                                src="/Red.svg"
                                alt="Red card"
                                width={10}
                                height={10}
                                className="object-contain"
                              />
                              {m.hr > 1 && (
                                <span className="absolute text-[11px] font-bold text-black leading-none">
                                  {m.hr}
                                </span>
                              )}
                            </div>
                          )}
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
                          {typeof m.ar === "number" && m.ar > 0 && (
                            <div className="absolute -top-1 -right-1 w-[10px] h-[10px] flex items-center justify-center">
                              <Image
                                src="/Red.svg"
                                alt="Red card"
                                width={10}
                                height={10}
                                className="object-contain"
                              />
                              {m.ar > 1 && (
                                <span className="absolute text-[11px] font-bold text-black leading-none">
                                  {m.ar}
                                </span>
                              )}
                            </div>
                          )}
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
                <AnimatePresence mode="wait">
                  {expandedMatchId.includes(m.id) && (
                    <motion.div
                      key={`match-${m.id}`}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{
                        height: 0,
                        opacity: 0,
                        transition: { duration: 0.3 },
                      }}
                      transition={{
                        duration: 0.35,
                        ease: [0.45, 0, 0.55, 1],
                      }}
                      className="overflow-hidden"
                    >
                      <div className="p-3 sm:p-4 bg-gray-50 dark:bg-gray-600 border-t dark:border-gray-800 rounded-b-md">
                        <h4 className="text-center text-xs sm:text-sm font-bold text-gray-600 dark:text-gray-200 mb-2 sm:mb-3">
                          Match Stats Comparison
                        </h4>
                        <div className="flex items-center justify-between mb-2 sm:mb-3 dark:text-gray-200">
                          <div className="flex items-center gap-1.5 sm:gap-2 text-left">
                            <Image
                              src={`/${getLogoFile(m.homeTeam)}`}
                              alt={`${m.homeTeam} logo`}
                              width={36}
                              height={36}
                              className="object-contain"
                            />
                            <span className="text-sm sm:text-base">
                              <Link
                                href={`/team/${m.homeTeam
                                  .split(" ")
                                  .join("_")}`}
                                className="no-underline gap-2 hover:opacity-80 transition-opacity"
                              >
                                {m.homeTeam}
                              </Link>
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 sm:gap-2 text-right">
                            <span className="text-sm sm:text-base">
                              <Link
                                href={`/team/${m.awayTeam
                                  .split(" ")
                                  .join("_")}`}
                                className="no-underline gap-2 hover:opacity-80 transition-opacity"
                              >
                                {m.awayTeam}
                              </Link>
                            </span>
                            <Image
                              src={`/${getLogoFile(m.awayTeam)}`}
                              alt={`${m.awayTeam} logo`}
                              width={36}
                              height={36}
                              className="object-contain"
                            />
                          </div>
                        </div>
                        {statsKeys.map(({ key, label }) => {
                          const getStatValue = (
                            side: "h" | "a",
                            statKey: string,
                            match: matchStats
                          ): number => {
                            const fullKey = `${side}${statKey.slice(
                              1
                            )}` as keyof matchStats;
                            const value = match[fullKey];
                            return typeof value === "number" ? value : 0;
                          };
                          return (
                            <StatBar
                              key={key}
                              label={label}
                              homeValue={getStatValue("h", key, m)}
                              awayValue={getStatValue("a", key, m)}
                            />
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
};

export default History;
