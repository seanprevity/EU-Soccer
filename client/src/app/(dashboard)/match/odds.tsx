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

function TeamLogo({ team }: { team: string }) {
  return (
    <Image
      src={`/${getLogoFile(team)}`}
      alt=""
      width={24}
      height={24}
      className="h-5 w-5 shrink-0 object-contain sm:h-6 sm:w-6"
    />
  );
}

const Pct = ({ value }: { value: number }) => (
  <span className="text-base font-bold tabular-nums text-gray-900 sm:text-lg dark:text-white">
    {value}%
  </span>
);

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
    <section className="my-4 space-y-8 rounded-lg bg-white p-4 shadow-md sm:my-8 md:p-6 dark:bg-gray-800/40">
      {simulation && (
        <div className="mx-auto max-w-3xl space-y-5">
          <div>
            <h2 className="text-center text-xl font-bold text-gray-800 dark:text-gray-200">
              Prediction
            </h2>
            <p className="text-center text-xs italic text-gray-500 dark:text-gray-400">
              Based on Monte Carlo simulations
            </p>
          </div>

          {/* Favourite */}
          <div className="flex justify-center">
            {favourite === "draw" ? (
              <span className="rounded-full bg-gray-600 px-3.5 py-1 text-lg font-bold text-white dark:bg-gray-500">
                Draw
              </span>
            ) : (
              <span
                className={cn(
                  "rounded-full px-3.5 py-1 text-lg font-bold",
                  edgeFor(teamColor[favourite].bg),
                )}
                style={{
                  backgroundColor: `${teamColor[favourite].bg}cc`,
                  color: teamColor[favourite].text,
                }}
              >
                {favouriteName}
              </span>
            )}
          </div>

          <div className="space-y-2">
            {/* Labels with their percentages */}
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <TeamLogo team={match.homeTeam} />
                <span className="truncate text-sm font-semibold text-gray-800 dark:text-gray-200">
                  {match.homeTeam}
                </span>
                <Pct value={homePct} />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-semibold text-gray-500 dark:text-gray-400">
                  Draw
                </span>
                <Pct value={drawPct} />
              </div>
              <div className="flex min-w-0 items-center justify-end gap-2">
                <Pct value={awayPct} />
                <span className="truncate text-sm font-semibold text-gray-800 dark:text-gray-200">
                  {match.awayTeam}
                </span>
                <TeamLogo team={match.awayTeam} />
              </div>
            </div>

            {/* Probability bar: three rounded segments */}
            <div
              className="flex h-2.5 gap-1"
              role="img"
              aria-label={`${match.homeTeam} ${homePct}%, draw ${drawPct}%, ${match.awayTeam} ${awayPct}%`}
            >
              {segments.map(({ outcome, pct, name }) => {
                if (pct <= 0) return null;
                const size = { flexGrow: pct, flexBasis: 0 };
                if (outcome === "draw")
                  return (
                    <div
                      key={outcome}
                      title={`${name}: ${pct}%`}
                      className="min-w-0 rounded-full bg-gray-300 transition-all duration-500 dark:bg-gray-500"
                      style={size}
                    />
                  );
                const { bg } = teamColor[outcome];
                return (
                  <div
                    key={outcome}
                    title={`${name}: ${pct}%`}
                    className={cn(
                      "min-w-0 rounded-full transition-all duration-500",
                      edgeFor(bg),
                    )}
                    style={{ ...size, backgroundColor: bg }}
                  />
                );
              })}
            </div>
          </div>

          <p className="text-center text-xs text-gray-600 sm:text-sm dark:text-gray-300">
            Most likely scoreline{" "}
            <span className="font-semibold text-gray-900 dark:text-white">
              {simulation.most_likely_score}
            </span>{" "}
            <span className="tabular-nums text-gray-500 dark:text-gray-400">
              ({Math.round(simulation.most_likely_score_prob * 100)}%)
            </span>
          </p>
        </div>
      )}

      {hasOdds && (
        <div className="mx-auto max-w-3xl space-y-2">
          <h2 className="text-center text-xl font-bold text-gray-800 dark:text-gray-200">
            Odds
          </h2>
          {marketPct && (
            <p className="text-center text-xs tabular-nums text-gray-600 sm:text-sm dark:text-gray-300">
              Implied chances:{" "}
              <span className="font-semibold text-gray-900 dark:text-white">
                {match.homeTeam} {marketPct[0]}%
              </span>
              {" · "}
              <span>Draw {marketPct[1]}%</span>
              {" · "}
              <span className="font-semibold text-gray-900 dark:text-white">
                {match.awayTeam} {marketPct[2]}%
              </span>
            </p>
          )}
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
