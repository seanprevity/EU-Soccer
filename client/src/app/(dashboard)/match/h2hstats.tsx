"use client";
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";
import Image from "next/image";
import { getChartData, getLogoFile, statsKeys } from "@/lib/utils";
import { head2Head, matchStats } from "@/types/drizzleTypes";
import { useGetMatchStatsQuery } from "@/state/api";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { StatBar } from "@/lib/uiUtils";
import Link from "next/link";

// displays last 5 head to head matches and stats from the game, and compares them through a graph
const H2HStats = ({
  data,
  homeTeam,
}: {
  data: head2Head;
  homeTeam: string;
}) => {
  const { team1, team2, team1Wins, team2Wins, mp, last5 } = data;
  const { data: last5Matches, isLoading: isLast5Loading } =
    useGetMatchStatsQuery({
      ids: last5,
    });
  const is1Home = homeTeam === team1;
  const awayTeam = is1Home ? team2 : team1;
  const [expandedMatchId, setExpandedMatchId] = useState<number[]>([]);

  const chartData = getChartData(
    data ?? null,
    last5Matches ?? null,
    is1Home ? team1 : team2,
    awayTeam
  );

  // get record for last 5 H2H
  const h2hRecord = last5Matches?.reduce(
    (acc, m) => {
      if (m.fthg == null || m.ftag == null) return acc;
      if (m.fthg > m.ftag) {
        acc[m.homeTeam]++;
      } else if (m.ftag > m.fthg) {
        acc[m.awayTeam]++;
      } else {
        acc.draw++;
      }
      return acc;
    },
    { [team1]: 0, [team2]: 0, draw: 0 } as Record<string, number>
  );

  return (
    <section className="mt-6 sm:mt-8 md:mt-12 mb-6 sm:mb-10 md:mb-12 p-4 sm:p-5 md:p-6 rounded-lg bg-gray-100 dark:bg-gray-800 shadow-md">
      <h2 className="text-center text-lg sm:text-xl md:text-2xl dark:text-gray-300 font-bold mb-4 sm:mb-5 md:mb-6 relative after:block after:w-8 sm:after:w-10 md:after:w-12 after:h-1 after:bg-black dark:after:bg-gray-600 after:mx-auto after:mt-2">
        Last 5 H2H Matches
      </h2>

      {last5Matches && (
        <div className="text-center text-sm sm:text-base text-gray-700 dark:text-gray-300 mb-4 sm:mb-5 md:mb-6">
          <span className="font-semibold text-blue-600 dark:text-blue-400">
            {is1Home ? team1 : team2}
          </span>
          : {is1Home ? h2hRecord?.[team1] ?? 0 : h2hRecord?.[team2] ?? 0}{" "}
          &nbsp;&nbsp;
          <span className="font-semibold text-gray-600 dark:text-gray-400">
            Draw
          </span>
          : {h2hRecord?.draw ?? 0} &nbsp;&nbsp;
          <span className="font-semibold text-red-600 dark:text-red-400">
            {is1Home ? team2 : team1}
          </span>
          : {is1Home ? h2hRecord?.[team2] ?? 0 : h2hRecord?.[team1] ?? 0}
        </div>
      )}

      <ul className="max-w-2xl mx-auto mb-6 sm:mb-7 md:mb-8 space-y-3 sm:space-y-4">
        {last5Matches?.map((m) => (
          <li
            key={m.id}
            className="bg-white dark:bg-gray-700 rounded-md shadow-sm overflow-hidden"
          >
            <button
              onClick={() =>
                setExpandedMatchId((prev) =>
                  prev.includes(m.id)
                    ? prev.filter((id) => id !== m.id)
                    : [...prev, m.id]
                )
              }
              className={`w-full flex items-center p-2 sm:p-3 hover:bg-gray-100 dark:hover:bg-gray-600 hover:rounded-md cursor-pointer transition text-left gap-3
                ${
                  expandedMatchId.includes(m.id)
                    ? "hover:rounded-b-none bg-gray-300 dark:bg-gray-700 rounded-t-md"
                    : ""
                }
                `}
            >
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

              <div className="flex justify-between items-center w-full">
                {/* Teams on the left */}
                <div className="flex flex-col gap-1.5 flex-1">
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <div className="relative">
                      <Image
                        src={`/${getLogoFile(m.homeTeam)}`}
                        alt={`${m.homeTeam} logo`}
                        width={20}
                        height={20}
                        className="object-contain w-4 h-4 sm:w-5 sm:h-5"
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
                    <span
                      className={`text-xs sm:text-sm ${
                        m.fthg! > m.ftag!
                          ? "font-bold text-green-600 dark:text-green-500"
                          : "dark:text-gray-200"
                      }`}
                    >
                      {m.homeTeam}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <div className="relative">
                      <Image
                        src={`/${getLogoFile(m.awayTeam)}`}
                        alt={`${m.awayTeam} logo`}
                        width={20}
                        height={20}
                        className="object-contain w-4 h-4 sm:w-5 sm:h-5"
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
                    <span
                      className={`text-xs sm:text-sm ${
                        m.ftag! > m.fthg!
                          ? "font-bold text-green-600 dark:text-green-500"
                          : "dark:text-gray-200"
                      }`}
                    >
                      {m.awayTeam}
                    </span>
                  </div>
                </div>

                {/* Scores on the right */}
                <div className="flex flex-col gap-1.5 items-end">
                  <span
                    className={`text-lg sm:text-xl font-bold ${
                      m.fthg! > m.ftag!
                        ? "text-green-600 dark:text-green-500"
                        : "dark:text-gray-200"
                    }`}
                  >
                    {m.fthg}
                  </span>
                  <span
                    className={`text-lg sm:text-xl font-bold ${
                      m.ftag! > m.fthg!
                        ? "text-green-600 dark:text-green-500"
                        : "dark:text-gray-200"
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
                  transition={{ duration: 0.35, ease: [0.45, 0, 0.55, 1] }}
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
                            href={`/team/${m.homeTeam.split(" ").join("_")}`}
                            className="no-underline gap-2 hover:opacity-60 transition-opacity"
                          >
                            {m.homeTeam}
                          </Link>
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 sm:gap-2 text-right">
                        <span className="text-sm sm:text-base">
                          <Link
                            href={`/team/${m.awayTeam.split(" ").join("_")}`}
                            className="no-underline gap-2 hover:opacity-60 transition-opacity"
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
        ))}
      </ul>

      <h2 className="text-center text-lg sm:text-xl md:text-2xl dark:text-gray-300 font-bold mb-4 sm:mb-5 md:mb-6 relative after:block after:w-8 sm:after:w-10 md:after:w-12 after:h-1 after:bg-black dark:after:bg-gray-600 after:mx-auto after:mt-2">
        Last 5 H2H Stats Comparison
      </h2>
      <div className="max-w-3xl mx-auto h-56 sm:h-64 md:h-72 mb-6 sm:mb-7 md:mb-8">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 10, right: 10, left: 0, bottom: 5 }}
          >
            <XAxis
              dataKey="name"
              tick={{ fontSize: 12, fill: "currentColor" }}
              stroke="currentColor"
              className="text-gray-700 dark:text-gray-300"
            />
            <YAxis
              domain={[0, (dataMax: number) => dataMax + 2]}
              tick={{ fontSize: 12, fill: "currentColor" }}
              stroke="currentColor"
              className="text-gray-700 dark:text-gray-300"
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "white",
                border: "1px solid #e5e7eb",
                borderRadius: "0.375rem",
                padding: "0.5rem 0.75rem",
                fontSize: "0.875rem",
              }}
              wrapperClassName="dark:[&_.recharts-tooltip-wrapper]:text-gray-900"
            />
            <Legend wrapperStyle={{ fontSize: "0.875rem" }} />
            <Bar
              dataKey={homeTeam}
              fill="#1E88E5"
              name={homeTeam}
              label={{ position: "top", fill: "#1E88E5", fontSize: 12 }}
            />
            <Bar
              dataKey={awayTeam}
              fill="#E53935"
              name={awayTeam}
              label={{ position: "top", fill: "#E53935", fontSize: 12 }}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
};

export default H2HStats;
