"use client";

import Image from "next/image";
import { useState } from "react";
import { cn, getLogoFile } from "@/lib/utils";
import { head2Head, matchPreview } from "@/types/drizzleTypes";
import { useGet5H2HMatchesQuery } from "@/state/api";
import { RedCardBadge } from "@/lib/uiUtils";
import Link from "next/link";
import { useAppSelector } from "@/state/redux";
import { useDispatch } from "react-redux";
import { setH2HPage } from "@/state";
import Pager from "@/components/Pager";

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

// Invisible card so final page keeps size
function PlaceholderCard() {
  return (
    <li aria-hidden className={cn(panel, "invisible")}>
      <div className="h-12 p-3 box-content" />
    </li>
  );
}

function MatchCard({ m }: { m: matchPreview }) {
  const homeWon = m.fthg! > m.ftag!;
  const awayWon = m.ftag! > m.fthg!;

  return (
    <li className={cn(panel, "overflow-hidden")}>
      <Link
        href={`/postmatch/${m.id}`}
        className={cn(
          "flex w-full items-center gap-3 p-3 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-900",
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

        <div className="flex flex-col items-end gap-2 pr-1 text-lg font-bold tabular-nums leading-5">
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
      </Link>
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
  const dispatch = useDispatch();
  const page = useAppSelector((state) => state.global.h2hPage);
  const { matches, isLoading, total: pagedTotal } = useH2HMatches(h2h, page);
  const setPage = (page: number) => {
    dispatch(setH2HPage(page));
  };

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
  // Only pad when paging exists: a series with 3 meetings in total should just show 3
  const fillers =
    total > PAGE_SIZE ? Math.max(0, PAGE_SIZE - matches.length) : 0;

  return (
    <section className="space-y-4 rounded-lg bg-gray-100 p-4 dark:bg-gray-900">
      <h2 className="text-center text-2xl font-bold text-gray-900 dark:text-white">
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
              <Pager
                page={page}
                pageSize={PAGE_SIZE}
                total={total}
                disabled={isLoading}
                onChange={setPage}
              />
            </div>

            <ul
              className={cn(
                "space-y-2 transition-opacity",
                isLoading && "opacity-50",
              )}
            >
              {matches.map((m) => (
                <MatchCard key={m.id} m={m} />
              ))}
              {Array.from({ length: fillers }, (_, i) => (
                <PlaceholderCard key={`filler-${i}`} />
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
