"use client";

import Image from "next/image";
import { useGetOddsQuery, useGetSimulationQuery } from "@/state/api";
import { upcomingMatches } from "@/types/drizzleTypes";
import { cn, getLogoFile } from "@/lib/utils";
import { edgeFor, matchColors } from "@/lib/array";

type Outcome = "home" | "draw" | "away";
type OddsKey = "oddsHome" | "oddsDraw" | "oddsAway";

const OUTCOME_LABEL: Record<Outcome, string> = {
  home: "Home favourite",
  draw: "Draw favoured",
  away: "Away favourite",
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

  // Club colours, with the away side switching to its secondary if the two clash
  const colors = matchColors(match.homeTeam, match.awayTeam);
  const teamColor: Record<
    Exclude<Outcome, "draw">,
    { bg: string; text: string }
  > = {
    home: colors.home,
    away: colors.away,
  };

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
    <section className="my-4 space-y-6 rounded-lg bg-white p-4 shadow-md sm:my-8 md:p-6 dark:bg-gray-800/40">
      {simulation && (
        <div className="space-y-4">
          <div>
            <h2 className="text-center text-xl font-bold text-gray-800 dark:text-gray-200">
              Prediction
            </h2>
            <p className="text-center text-xs italic text-gray-500 dark:text-gray-400">
              Based on Monte Carlo simulations
            </p>
          </div>

          <div className="mx-auto max-w-3xl space-y-4 rounded-md bg-[#f8f8f8] p-4 sm:p-5 dark:bg-gray-700">
            {/* Favourite */}
            <div className="flex flex-col items-center gap-1 text-center">
              <span className="text-lg font-bold text-gray-900 sm:text-xl dark:text-white">
                {favouriteName}
              </span>
              {favourite === "draw" ? (
                <span className="rounded-full bg-gray-600 px-2.5 py-0.5 text-xs font-semibold text-white">
                  {OUTCOME_LABEL.draw}
                </span>
              ) : (
                <span
                  className={cn(
                    "rounded-full px-2.5 py-0.5 text-xs font-semibold",
                    edgeFor(teamColor[favourite].bg),
                  )}
                  style={{
                    backgroundColor: teamColor[favourite].bg,
                    color: teamColor[favourite].text,
                  }}
                >
                  {OUTCOME_LABEL[favourite]}
                </span>
              )}
            </div>

            {/* Probability bar */}
            <div className="flex h-7 gap-0.5 overflow-hidden rounded-full sm:h-8">
              {segments.map(({ outcome, pct, name }) => {
                if (pct <= 0) return null;
                const base =
                  "flex min-w-0 items-center justify-center text-xs sm:text-sm font-semibold tabular-nums transition-all duration-500";
                const size = { flexGrow: pct, flexBasis: 0 };
                const label = pct >= 8 && `${pct}%`;

                if (outcome === "draw")
                  return (
                    <div
                      key={outcome}
                      title={`${name}: ${pct}%`}
                      className={cn(
                        base,
                        "bg-gray-400 text-white dark:bg-gray-500",
                      )}
                      style={size}
                    >
                      {label}
                    </div>
                  );

                const { bg, text } = teamColor[outcome];
                return (
                  <div
                    key={outcome}
                    title={`${name}: ${pct}%`}
                    className={cn(base, edgeFor(bg))}
                    style={{ ...size, backgroundColor: bg, color: text }}
                  >
                    {label}
                  </div>
                );
              })}
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
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {marketPct[0]}%
                  </span>
                  {" · "}
                  <span className="text-gray-500 dark:text-gray-400">
                    {marketPct[1]}%
                  </span>
                  {" · "}
                  <span className="font-semibold text-gray-900 dark:text-white">
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
          <h2 className="text-center text-xl font-bold text-gray-800 dark:text-gray-200">
            Bookmaker Odds
          </h2>
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
                    {(["oddsHome", "oddsDraw", "oddsAway"] as OddsKey[]).map(
                      (key) => {
                        const isBest = best[key].has(r.bookmaker);
                        return (
                          <td key={key} className="px-2 py-1.5 text-center">
                            <span
                              title={isBest ? "Best available odds" : undefined}
                              className={cn(
                                "inline-block min-w-[3.25rem] rounded px-2 py-1 font-semibold tabular-nums",
                                isBest
                                  ? "bg-green-100 text-green-800 ring-1 ring-green-300 dark:bg-green-900/50 dark:text-green-200 dark:ring-green-700"
                                  : "text-gray-700 dark:text-gray-300",
                              )}
                            >
                              {r[key].toFixed(2)}
                            </span>
                          </td>
                        );
                      },
                    )}
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
