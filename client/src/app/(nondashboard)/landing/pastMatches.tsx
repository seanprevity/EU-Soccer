import Image from "next/image";
import { useState } from "react";
import { matchStats } from "@/types/drizzleTypes";
import { getLogoFile, statsKeys } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { StatBar } from "@/lib/uiUtils";

type Props = {
  matches?: matchStats[];
};

export function PastMatchesList({ matches }: Props) {
  const [expandedMatchId, setExpandedMatchId] = useState<number[]>([]);

  if (!matches || matches.length === 0) {
    return (
      <p className="text-center text-gray-500 dark:text-gray-300 py-6">
        No past matches for this date.
      </p>
    );
  }

  return (
    <ul className="mb-6 space-y-3 sm:space-y-4">
      {matches.map((m) => {
        const colors = {
          gradient: "bg-gray-100 dark:bg-gray-700",
          rectangle: "bg-gray-400 dark:bg-gray-500",
        };

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
              className={`relative w-full flex items-center p-2 sm:p-3
                ${colors.gradient}
                hover:bg-gray-200 dark:hover:bg-gray-600
                cursor-pointer transition text-left gap-3
                ${
                  expandedMatchId.includes(m.id) ? "rounded-t-md" : "rounded-md"
                }
              `}
            >
              {/* Left indicator */}
              <div
                className={`absolute left-0 top-1/2 -translate-y-1/2 w-3 h-[55%]
                ${colors.rectangle} rounded-r-md -translate-x-1/2`}
              />

              {/* Date */}
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

              {/* Teams + score */}
              <div className="flex items-center justify-between w-full">
                <div className="flex flex-col gap-1.5 flex-1">
                  {/* Home */}
                  <div className="flex items-center gap-2 text-gray-800 dark:text-gray-200">
                    <Image
                      src={`/${getLogoFile(m.homeTeam)}`}
                      alt={m.homeTeam}
                      width={22}
                      height={22}
                    />
                    <span className="text-xs sm:text-sm">{m.homeTeam}</span>
                  </div>

                  {/* Away */}
                  <div className="flex items-center gap-2 text-gray-800 dark:text-gray-200">
                    <Image
                      src={`/${getLogoFile(m.awayTeam)}`}
                      alt={m.awayTeam}
                      width={22}
                      height={22}
                    />
                    <span className="text-xs sm:text-sm">{m.awayTeam}</span>
                  </div>
                </div>

                {/* Scores */}
                <div className="flex flex-col gap-1.5 items-end ml-4">
                  <span className="text-lg sm:text-xl font-bold text-gray-700 dark:text-gray-300">
                    {m.fthg}
                  </span>
                  <span className="text-lg sm:text-xl font-bold text-gray-700 dark:text-gray-300">
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
                            href={`/team/${m.homeTeam.split(" ").join("_")}`}
                            className="no-underline gap-2 hover:opacity-80 transition-opacity"
                          >
                            {m.homeTeam}
                          </Link>
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 sm:gap-2 text-right">
                        <span className="text-sm sm:text-base">
                          <Link
                            href={`/team/${m.awayTeam.split(" ").join("_")}`}
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
  );
}
