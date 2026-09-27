"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { cn, getLogoFile, statsKeys } from "@/lib/utils";
import { head2Head, matchStats } from "@/types/drizzleTypes";
import { useGet5H2HMatchesQuery } from "@/state/api";
import { RedCardBadge, StatBar } from "@/lib/uiUtils";

type Segment = "home" | "draw" | "away";
const PAGE_SIZE = 5;

const COLORS: Record<Segment, { bar: string; text: string }> = {
  home: { bar: "bg-sky-500", text: "text-sky-600 dark:text-sky-400" },
  draw: {
    bar: "bg-gray-400 dark:bg-gray-500",
    text: "text-gray-500 dark:text-gray-400",
  },
  away: { bar: "bg-orange-500", text: "text-orange-600 dark:text-orange-400" },
};

const panel =
  "rounded-lg border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-800";

// Largest-remainder rounding so the three percentages always sum to exactly 100
function toPercentages(values: number[], total: number): number[] {
  if (!total) return values.map(() => 0);
  const raw = values.map((v) => (v / total) * 100);
  const floored = raw.map(Math.floor);
  let remaining = 100 - floored.reduce((a, b) => a + b, 0);
  raw
    .map((v, i) => ({ i, rem: v - Math.floor(v) }))
    .sort((a, b) => b.rem - a.rem)
    .forEach(({ i }) => {
      if (remaining > 0) {
        floored[i] += 1;
        remaining -= 1;
      }
    });
  return floored;
}

// returns a stat from a match
const getStatValue = (m: matchStats, side: "h" | "a", key: string): number => {
  const v = m[`${side}${key.slice(1)}` as keyof matchStats];
  return typeof v === "number" ? v : 0;
};

function useH2HMatches(h2h: head2Head | null, page: number) {
  const { data, isLoading, isFetching } = useGet5H2HMatchesQuery(
    {
      team1: h2h?.team1 ?? "",
      team2: h2h?.team2 ?? "",
      page: page,
    },
    { skip: !h2h?.team1 || !h2h?.team2 },
  );
  const total = h2h?.mp ?? 0;
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
    <div className="flex items-center gap-2">
      <div className="relative">
        <Image
          src={`/${getLogoFile(team)}`}
          alt={`${team} logo`}
          width={20}
          height={20}
          className="h-4 w-4 object-contain sm:h-5 sm:w-5"
        />
        <RedCardBadge count={red} />
      </div>
      <span
        className={cn(
          "truncate text-sm",
          won
            ? "font-semibold text-gray-900 dark:text-white"
            : "text-gray-600 dark:text-gray-300",
        )}
      >
        {team}
      </span>
    </div>
  );
}

function MatchCard({
  m,
  open,
  onToggle,
}: {
  m: matchStats;
  open: boolean;
  onToggle: () => void;
}) {
  const homeWon = m.fthg! > m.ftag!;
  const awayWon = m.ftag! > m.fthg!;

  return (
    <li className={cn(panel, "overflow-hidden")}>
      <button
        onClick={onToggle}
        aria-expanded={open}
        className={cn(
          "flex w-full items-center gap-3 p-3 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-900",
          open && "bg-gray-50 dark:bg-gray-900",
        )}
      >
        <span className="w-16 shrink-0 text-xs tabular-nums text-gray-500 dark:text-gray-400">
          {m.matchDate
            ? new Date(m.matchDate).toLocaleDateString("en-US", {
                year: "2-digit",
                month: "2-digit",
                day: "2-digit",
              })
            : "N/A"}
        </span>

        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <TeamLine team={m.homeTeam} red={m.hr} won={homeWon} />
          <TeamLine team={m.awayTeam} red={m.ar} won={awayWon} />
        </div>

        <div className="flex flex-col items-end gap-1.5 text-lg font-bold tabular-nums leading-5">
          <span
            className={
              homeWon ? "text-gray-900 dark:text-white" : "text-gray-400"
            }
          >
            {m.fthg}
          </span>
          <span
            className={
              awayWon ? "text-gray-900 dark:text-white" : "text-gray-400"
            }
          >
            {m.ftag}
          </span>
        </div>

        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-gray-400 transition-transform",
            open && "rotate-180",
          )}
        />
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
            <div className="border-t border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900">
              <div className="mb-3 flex items-center justify-between text-sm text-gray-900 dark:text-gray-100">
                <Link
                  href={`/team/${m.homeTeam.split(" ").join("_")}`}
                  className="flex items-center gap-2 transition-opacity hover:opacity-60"
                >
                  <Image
                    src={`/${getLogoFile(m.homeTeam)}`}
                    alt={`${m.homeTeam} logo`}
                    width={32}
                    height={32}
                    className="object-contain"
                  />
                  {m.homeTeam}
                </Link>
                <Link
                  href={`/team/${m.awayTeam.split(" ").join("_")}`}
                  className="flex items-center gap-2 transition-opacity hover:opacity-60"
                >
                  {m.awayTeam}
                  <Image
                    src={`/${getLogoFile(m.awayTeam)}`}
                    alt={`${m.awayTeam} logo`}
                    width={32}
                    height={32}
                    className="object-contain"
                  />
                </Link>
              </div>
              {statsKeys.map(({ key, label }) => {
                const homeValue = getStatValue(m, "h", key);
                const awayValue = getStatValue(m, "a", key);
                if (key === "hxg" && homeValue === 0 && awayValue === 0)
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

const Head2Head = ({
  h2h,
  homeTeam,
}: {
  h2h: head2Head | null;
  homeTeam: string;
}) => {
  const [hovered, setHovered] = useState<Segment | null>(null);
  const [page, setPage] = useState(0);
  const [expandedMatchId, setExpandedMatchId] = useState<number[]>([]);
  const {
    matches,
    isLoading,
    total: pagedTotal,
    totalPages,
  } = useH2HMatches(h2h, page);

  if (h2h === null) return null;

  const { team1, team2, team1Wins, draws, team2Wins, mp } = h2h;
  const team1IsHome = homeTeam === team1;
  const awayTeam = team1IsHome ? team2 : team1;
  const homeWins = (team1IsHome ? team1Wins : team2Wins) ?? 0;
  const awayWins = (team1IsHome ? team2Wins : team1Wins) ?? 0;
  const drawCount = draws ?? 0;
  const total = mp ?? 0;

  const [homePct, drawPct, awayPct] = toPercentages(
    [homeWins, drawCount, awayWins],
    total,
  );

  const segments: {
    key: Segment;
    label: string;
    count: number;
    pct: number;
  }[] = [
    { key: "home", label: homeTeam, count: homeWins, pct: homePct },
    { key: "draw", label: "Draws", count: drawCount, pct: drawPct },
    { key: "away", label: awayTeam ?? "Away", count: awayWins, pct: awayPct },
  ];

  const verdict =
    homeWins === awayWins
      ? "The series is level"
      : `${homeWins > awayWins ? homeTeam : awayTeam} lead the series ${Math.max(homeWins, awayWins)}–${Math.min(homeWins, awayWins)}`;

  const dim = (key: Segment) =>
    hovered !== null && hovered !== key && "opacity-30";

  const toggle = (id: number) =>
    setExpandedMatchId((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );

  const goTo = (next: number) => {
    setPage(next);
    setExpandedMatchId([]);
  };

  const first = page * PAGE_SIZE + 1;
  const last = Math.min((page + 1) * PAGE_SIZE, pagedTotal);

  return (
    <section className="space-y-4 rounded-lg bg-gray-100 p-4 dark:bg-gray-900">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
        Head to head
      </h2>

      {total > 0 ? (
        <>
          {/* Series summary */}
          <div className={cn(panel, "mx-auto w-full p-3 lg:w-3/5")}>
            <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {verdict}
              </p>
              <p className="text-xs tabular-nums text-gray-500 dark:text-gray-400">
                {total} {total === 1 ? "meeting" : "meetings"}
              </p>
            </div>

            <div
              className="flex h-2 gap-0.5 overflow-hidden rounded-full"
              role="img"
              aria-label={`${homeTeam} ${homeWins} wins, ${drawCount} draws, ${awayTeam} ${awayWins} wins`}
            >
              {segments.map(
                (s) =>
                  s.count > 0 && (
                    <div
                      key={s.key}
                      className={cn(
                        "h-full transition-opacity duration-200",
                        COLORS[s.key].bar,
                        dim(s.key),
                      )}
                      style={{ width: `${(s.count / total) * 100}%` }}
                    />
                  ),
              )}
            </div>

            <div className="mt-2 grid grid-cols-3 gap-2">
              {segments.map((s, i) => (
                <div
                  key={s.key}
                  onMouseEnter={() => setHovered(s.key)}
                  onMouseLeave={() => setHovered(null)}
                  className={cn(
                    "flex min-w-0 cursor-default items-baseline gap-1.5 transition-opacity duration-200",
                    i === 1 && "justify-center",
                    i === 2 && "justify-end",
                    dim(s.key),
                  )}
                >
                  <span className="text-lg font-bold tabular-nums text-gray-900 dark:text-white">
                    {s.count}
                  </span>
                  <span className={cn("truncate text-xs", COLORS[s.key].text)}>
                    {s.label}
                  </span>
                  <span className="text-xs tabular-nums text-gray-500 dark:text-gray-400">
                    {s.pct}%
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Match list */}
          <div className="mx-auto w-full space-y-2 lg:w-3/5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Recent meetings
              </h3>
              {pagedTotal > 0 && (
                <div className="flex items-center gap-2 text-xs tabular-nums text-gray-500 dark:text-gray-400">
                  <span>
                    {first}–{last} of {pagedTotal}
                  </span>
                  <button
                    onClick={() => goTo(page - 1)}
                    disabled={page == 0 || isLoading}
                    aria-label="Previous page"
                    className="rounded p-1 hover:bg-gray-200 disabled:opacity-30 disabled:hover:bg-transparent dark:hover:bg-gray-800"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => goTo(page + 1)}
                    disabled={page >= totalPages - 1 || isLoading}
                    aria-label="Next page"
                    className="rounded p-1 hover:bg-gray-200 disabled:opacity-30 disabled:hover:bg-transparent dark:hover:bg-gray-800"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>

            <ul
              className={cn(
                "space-y-2 transition-opacity",
                isLoading && "opacity-50",
              )}
            >
              {matches.map((m) => (
                <MatchCard
                  key={m.id}
                  m={m}
                  open={expandedMatchId.includes(m.id)}
                  onToggle={() => toggle(m.id)}
                />
              ))}
            </ul>
          </div>
        </>
      ) : (
        <p className="py-6 text-center text-sm text-gray-500 dark:text-gray-400">
          No H2H data available.
        </p>
      )}
    </section>
  );
};

export default Head2Head;
