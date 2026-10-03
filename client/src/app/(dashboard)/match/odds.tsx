"use client";

import Image from "next/image";
import { useGetOddsQuery, useGetSimulationQuery } from "@/state/api";
import { upcomingMatches } from "@/types/drizzleTypes";
import { cn, getLogoFile } from "@/lib/utils";

type Outcome = "home" | "draw" | "away";
type OddsKey = "oddsHome" | "oddsDraw" | "oddsAway";

const OUTCOME_STYLE: Record<
  Outcome,
  { bar: string; text: string; badge: string; best: string; label: string }
> = {
  home: {
    bar: "bg-sky-600",
    text: "text-sky-600 dark:text-sky-400",
    badge: "bg-sky-600 text-white",
    best: "bg-sky-100 text-sky-800 ring-1 ring-sky-300 dark:bg-sky-900/50 dark:text-sky-200 dark:ring-sky-700",
    label: "Home favourite",
  },
  draw: {
    bar: "bg-gray-400 dark:bg-gray-500",
    text: "text-gray-500 dark:text-gray-400",
    badge: "bg-gray-500 text-white",
    best: "bg-gray-200 text-gray-900 ring-1 ring-gray-300 dark:bg-gray-600 dark:text-white dark:ring-gray-500",
    label: "Draw favoured",
  },
  away: {
    bar: "bg-orange-500",
    text: "text-orange-600 dark:text-orange-400",
    badge: "bg-orange-500 text-white",
    best: "bg-orange-100 text-orange-800 ring-1 ring-orange-300 dark:bg-orange-900/50 dark:text-orange-200 dark:ring-orange-700",
    label: "Away favourite",
  },
};

// Whole-number percentages that always total exactly 100 (largest-remainder method)
const toPercents = (shares: number[]) => {
  const total = shares.reduce((a, b) => a + b, 0);
  if (!total) return shares.map(() => 0);
  const raw = shares.map((s) => (s / total) * 100);
  const result = raw.map(Math.floor);
  let left = 100 - result.reduce((a, b) => a + b, 0);
  raw
    .map((r, i) => ({ i, rem: r - Math.floor(r) }))
    .sort((a, b) => b.rem - a.rem)
    .forEach(({ i }) => {
      if (left-- > 0) result[i]++;
    });
  return result;
};

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-1 border-b-2 border-[#38003c] pb-2 text-center text-xl font-bold text-gray-800 dark:border-gray-400 dark:text-gray-200">
      {children}
    </h2>
  );
}

function TeamLabel({ team, align }: { team: string; align: "left" | "right" }) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-1 items-center gap-2",
        align === "right" && "flex-row-reverse text-right",
      )}
    >
      <Image
        src={`/${getLogoFile(team)}`}
        alt=""
        width={24}
        height={24}
        className="h-6 w-6 shrink-0 object-contain"
      />
      <span className="truncate text-sm font-semibold text-gray-800 dark:text-gray-200">
        {team}
      </span>
    </div>
  );
}

const Odds = ({
  match,
  matchId,
}: {
  match: upcomingMatches;
  matchId: string;
}) => {
  const { data: odds } = useGetOddsQuery({ id: matchId });
  const { data: simulation } = useGetSimulationQuery({
    homeTeam: match.homeTeam,
    awayTeam: match.awayTeam,
  });

  const rows = (odds ?? []).map((o) => ({
    bookmaker: o.bookmaker,
    oddsHome: Number(o.oddsHome),
    oddsDraw: Number(o.oddsDraw),
    oddsAway: Number(o.oddsAway),
  }));
  const hasOdds = rows.length > 0;
  if (!simulation && !hasOdds) return null;

  // Simulation
  const [homePct, drawPct, awayPct] = simulation
    ? toPercents([
        simulation.home_win_prob,
        simulation.draw_prob,
        simulation.away_win_prob,
      ])
    : [0, 0, 0];
  const favourite: Outcome =
    homePct >= drawPct && homePct >= awayPct
      ? "home"
      : awayPct >= drawPct
        ? "away"
        : "draw";
  const favouriteName =
    favourite === "home"
      ? match.homeTeam
      : favourite === "away"
        ? match.awayTeam
        : "Draw";

  // Bookmaker consensus: average odds -> implied probability, with the margin removed
  const avg = (key: OddsKey) =>
    rows.reduce((sum, r) => sum + r[key], 0) / rows.length;
  const marketPct = hasOdds
    ? toPercents([
        1 / avg("oddsHome"),
        1 / avg("oddsDraw"),
        1 / avg("oddsAway"),
      ])
    : null;

  const bestFor = (key: OddsKey) => {
    const max = Math.max(...rows.map((r) => r[key]));
    return new Set(rows.filter((r) => r[key] === max).map((r) => r.bookmaker));
  };
  const best: Record<OddsKey, Set<string>> = {
    oddsHome: bestFor("oddsHome"),
    oddsDraw: bestFor("oddsDraw"),
    oddsAway: bestFor("oddsAway"),
  };

  const segments: { outcome: Outcome; pct: number; name: string }[] = [
    { outcome: "home", pct: homePct, name: match.homeTeam },
    { outcome: "draw", pct: drawPct, name: "Draw" },
    { outcome: "away", pct: awayPct, name: match.awayTeam },
  ];

  return (
    <section className="my-4 space-y-6 rounded-lg bg-white p-4 shadow-md sm:my-8 md:p-6 dark:bg-gray-800">
      {simulation && (
        <div className="space-y-4">
          <div>
            <SectionTitle>Prediction</SectionTitle>
            <p className="text-center text-xs italic text-gray-500 dark:text-gray-400">
              Based on Monte Carlo simulations
            </p>
          </div>

          <div className="mx-auto max-w-3xl space-y-4 rounded-md bg-[#f8f8f8] p-4 sm:p-6 dark:bg-gray-700">
            {/* Favourite */}
            <div className="flex flex-col items-center gap-2 text-center">
              <span className="text-lg font-bold text-gray-900 sm:text-xl dark:text-white">
                {favouriteName}
              </span>
              <span
                className={cn(
                  "rounded-full px-2.5 py-0.5 text-xs font-semibold",
                  OUTCOME_STYLE[favourite].badge,
                )}
              >
                {OUTCOME_STYLE[favourite].label}
              </span>
            </div>

            {/* Probability bar */}
            <div className="flex h-9 gap-0.5 overflow-hidden rounded-full sm:h-10">
              {segments.map(({ outcome, pct, name }) =>
                pct > 0 ? (
                  <div
                    key={outcome}
                    title={`${name}: ${pct}%`}
                    className={cn(
                      "flex min-w-0 items-center justify-center text-xs font-semibold tabular-nums text-white transition-all duration-500 sm:text-sm",
                      OUTCOME_STYLE[outcome].bar,
                    )}
                    style={{ flexGrow: pct, flexBasis: 0 }}
                  >
                    {pct >= 8 && `${pct}%`}
                  </div>
                ) : null,
              )}
            </div>

            <div className="flex items-center gap-3">
              <TeamLabel team={match.homeTeam} align="left" />
              <span className="shrink-0 text-sm font-semibold text-gray-500 dark:text-gray-400">
                Draw
              </span>
              <TeamLabel team={match.awayTeam} align="right" />
            </div>

            <div className="flex flex-col items-center gap-1 border-t border-gray-200 pt-3 text-xs text-gray-600 sm:text-sm dark:border-gray-600 dark:text-gray-300">
              <p>
                Most likely scoreline{" "}
                <span className="font-semibold text-gray-900 dark:text-white">
                  {simulation.most_likely_score}
                </span>{" "}
                <span className="tabular-nums text-gray-500 dark:text-gray-400">
                  ({Math.round(simulation.most_likely_score_prob * 100)}%)
                </span>
              </p>
              {marketPct && (
                <p className="tabular-nums">
                  Bookmakers:{" "}
                  <span className={OUTCOME_STYLE.home.text}>
                    {marketPct[0]}%
                  </span>
                  {" · "}
                  <span className={OUTCOME_STYLE.draw.text}>
                    {marketPct[1]}%
                  </span>
                  {" · "}
                  <span className={OUTCOME_STYLE.away.text}>
                    {marketPct[2]}%
                  </span>
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {hasOdds && (
        <div className="mx-auto max-w-3xl space-y-2">
          <SectionTitle>Bookmaker Odds</SectionTitle>
          <p className="text-center text-xs italic text-gray-500 dark:text-gray-400">
            Highlighted cells are the best odds for each outcome
          </p>

          <div className="overflow-x-auto rounded-lg shadow-sm">
            <table className="w-full min-w-[420px] border-collapse text-sm">
              <thead className="bg-[#38003c] text-white dark:bg-gray-900">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold">
                    Bookmaker
                  </th>
                  <th className="w-1/5 px-2 py-2 text-center font-semibold">
                    <span className="block truncate">{match.homeTeam}</span>
                  </th>
                  <th className="w-1/5 px-2 py-2 text-center font-semibold">
                    Draw
                  </th>
                  <th className="w-1/5 px-2 py-2 text-center font-semibold">
                    <span className="block truncate">{match.awayTeam}</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800">
                {rows.map((r) => (
                  <tr
                    key={r.bookmaker}
                    className="border-b border-gray-200 transition-colors last:border-b-0 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700"
                  >
                    <td className="truncate px-3 py-2 font-medium text-gray-800 dark:text-gray-200">
                      {r.bookmaker}
                    </td>
                    {(
                      [
                        ["oddsHome", "home"],
                        ["oddsDraw", "draw"],
                        ["oddsAway", "away"],
                      ] as [OddsKey, Outcome][]
                    ).map(([key, outcome]) => {
                      const isBest = best[key].has(r.bookmaker);
                      return (
                        <td key={key} className="px-2 py-1.5 text-center">
                          <span
                            title={isBest ? "Best available odds" : undefined}
                            className={cn(
                              "inline-block min-w-[3.25rem] rounded px-2 py-1 font-semibold tabular-nums",
                              isBest
                                ? OUTCOME_STYLE[outcome].best
                                : "text-gray-700 dark:text-gray-300",
                            )}
                          >
                            {r[key].toFixed(2)}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
};

export default Odds;
