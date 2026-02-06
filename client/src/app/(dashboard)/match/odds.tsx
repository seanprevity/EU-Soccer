"use client";

import { useGetOddsQuery, useGetSimulationQuery } from "@/state/api";
import { upcomingMatches } from "@/types/drizzleTypes";
import HomeAwayRecord from "./homeAwayRecord";

const Odds = ({
  match,
  matchId,
}: {
  match: upcomingMatches;
  matchId: string;
}) => {
  const { data: odds } = useGetOddsQuery({ id: matchId });
  const { data: simulation, isLoading: isSimulationLoading } =
    useGetSimulationQuery({
      homeTeam: match.homeTeam,
      awayTeam: match.awayTeam,
    });
  console.log(simulation);
  if (!odds || odds.length === 0 || !simulation) return null;
  const numericOdds = odds.map((o) => ({
    ...o,
    oddsHome: Number(o.oddsHome),
    oddsDraw: Number(o.oddsDraw),
    oddsAway: Number(o.oddsAway),
  }));

  const avgOdds = { home: 0, draw: 0, away: 0 };
  numericOdds.forEach((o) => {
    avgOdds.home += o.oddsHome;
    avgOdds.draw += o.oddsDraw;
    avgOdds.away += o.oddsAway;
  });
  avgOdds.home /= odds.length;
  avgOdds.draw /= odds.length;
  avgOdds.away /= odds.length;

  const bestSim = Math.max(
    simulation.home_win_prob,
    simulation.draw_prob,
    simulation.away_win_prob
  );
  const favoriteOutcome =
    bestSim === simulation.home_win_prob
      ? "home"
      : bestSim === simulation.away_win_prob
      ? "away"
      : "draw";

  const calcImplied = (decimal: number) => Math.round(decimal * 100);

  const findBestOdds = (outcome: "oddsHome" | "oddsDraw" | "oddsAway") => {
    const oddsWithValues = numericOdds.map((o) => ({
      bookmaker: o.bookmaker,
      value: o[outcome],
    }));
    const max = Math.max(...oddsWithValues.map((o) => Number(o.value!)));
    return oddsWithValues
      .filter((o) => o.value === max)
      .map((o) => o.bookmaker);
  };

  const bestHome = findBestOdds("oddsHome");
  const bestDraw = findBestOdds("oddsDraw");
  const bestAway = findBestOdds("oddsAway");

  let homeSim = calcImplied(simulation.home_win_prob);
  let awaySim = calcImplied(simulation.away_win_prob);
  let drawSim = calcImplied(simulation.draw_prob);
  const mostLikelyScore = simulation.most_likely_score;
  const mostLikelyScorePct = Math.round(
    simulation.most_likely_score_prob * 100
  );

  const total = homeSim + awaySim + drawSim;
  if (total > 100) {
    if (homeSim > awaySim && homeSim > drawSim) {
      homeSim -= 1;
    } else if (awaySim > homeSim && awaySim > drawSim) {
      awaySim -= 1;
    } else {
      drawSim -= 1;
    }
  }
  if (total < 100 && total > 0) {
    if (homeSim < awaySim && homeSim < drawSim) {
      homeSim += 1;
    } else if (awaySim < homeSim && awaySim < drawSim) {
      awaySim += 1;
    } else {
      drawSim += 1;
    }
  }

  return (
    <section className="my-4 sm:my-8 p-4 sm:p-6 bg-gray-100 dark:bg-gray-800 rounded-lg shadow-sm">
      <h2 className="text-center text-lg sm:text-xl dark:text-gray-200 font-bold relative mb-2 after:content-[''] after:block after:w-12 after:h-1 after:bg-black dark:after:bg-gray-500 after:mx-auto after:mt-2">
        Prediction
      </h2>
      <p className="text-center text-xs italic text-gray-600 dark:text-gray-400 mb-2">
        (Percentages based on Monte-Carlo simulations)
      </p>

      {/* Prediction */}
      <div className="w-full max-w-3xl mx-auto mb-6 sm:mb-8 p-4 sm:p-6 bg-white dark:bg-gray-700 rounded-lg shadow-sm">
        <div className="text-center mb-4">
          <div className="inline-flex flex-col items-center relative text-lg sm:text-xl dark:text-gray-200 font-bold">
            <span className="text-center px-2">
              {favoriteOutcome === "home"
                ? match.homeTeam
                : favoriteOutcome === "away"
                ? match.awayTeam
                : "Draw"}
            </span>
            <span
              className={`mt-2 text-xs px-2 py-1 rounded font-semibold ${
                favoriteOutcome === "home"
                  ? "bg-blue-600 text-white"
                  : favoriteOutcome === "away"
                  ? "bg-red-600 text-white"
                  : "bg-gray-600 dark:bg-gray-500 text-white"
              }`}
            >
              {favoriteOutcome === "home"
                ? "Home Favorite"
                : favoriteOutcome === "away"
                ? "Away Favorite"
                : "Draw Favorite"}
            </span>
          </div>
        </div>

        {/* Probability Bar */}
        <div className="flex h-8 sm:h-10 rounded-lg overflow-hidden mb-2">
          <div
            className="flex items-center bg-gradient-to-r from-blue-500 to-blue-600 duration-300 justify-center text-white text-xs sm:text-sm font-semibold min-w-[3rem] transition-all"
            style={{
              width: `${homeSim}%`,
            }}
          >
            {homeSim}%
          </div>
          <div
            className="flex items-center bg-gradient-to-r from-gray-400 to-gray-500 duration-500 justify-center text-white text-xs sm:text-sm font-semibold min-w-[3rem] transition-all"
            style={{
              width: `${drawSim}%`,
            }}
          >
            {drawSim}%
          </div>
          <div
            className="flex items-center bg-gradient-to-r from-red-500 to-red-600 duration-500 justify-center text-white text-xs sm:text-sm font-semibold min-w-[3rem] transition-all"
            style={{
              width: `${awaySim}%`,
            }}
          >
            {awaySim}%
          </div>
        </div>

        {/* Labels */}
        <div className="flex justify-between text-xs sm:text-sm font-semibold gap-2">
          <div className="text-left text-blue-600 dark:text-blue-400 flex-1 min-w-0 break-words">
            {match.homeTeam}
          </div>
          <div className="text-center text-gray-500 dark:text-gray-200 flex-shrink-0">
            Draw
          </div>
          <div className="text-right text-red-600 dark:text-red-400 flex-1 min-w-0 break-words">
            {match.awayTeam}
          </div>
        </div>

        <p className="text-center text-xs sm:text-sm text-gray-600 dark:text-gray-300 mt-1">
          Most common scoreline:{" "}
          <span className="font-semibold text-gray-800 dark:text-gray-100">
            {mostLikelyScore}
          </span>{" "}
          <span className="text-gray-500 dark:text-gray-400">
            ({mostLikelyScorePct}%)
          </span>
        </p>
      </div>

      {/* Bookmaker Odds */}
      <div className="w-full max-w-3xl mx-auto">
        <h3 className="text-center text-base sm:text-lg dark:text-gray-200 font-semibold mb-2">
          Bookmaker Odds
        </h3>
        <p className="text-center text-xs sm:text-sm italic text-gray-600 dark:text-gray-400 mb-2 px-2">
          Highlighted cells show the best odds for each outcome
        </p>

        <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
          <div className="rounded-b-lg overflow-hidden min-w-[500px] sm:min-w-0">
            {/* Header */}
            <div className="flex bg-gray-200 dark:bg-gray-700 rounded-t-lg font-semibold text-gray-700 dark:text-gray-200 px-3 sm:px-4 py-2">
              <div className="w-[120px] sm:w-auto sm:flex-1 flex-shrink-0">
                Bookmaker
              </div>
              <div className="grid grid-cols-3 flex-1 text-center gap-1 sm:gap-2">
                <span className="text-blue-600 dark:text-blue-400 text-xs sm:text-sm truncate">
                  {match.homeTeam}
                </span>
                <span className="text-xs sm:text-sm">Draw</span>
                <span className="text-red-600 dark:text-red-400 text-xs sm:text-sm truncate">
                  {match.awayTeam}
                </span>
              </div>
            </div>

            {/* Rows */}
            {odds.map((o) => (
              <div
                key={o.bookmaker}
                className="flex px-3 sm:px-4 py-2 items-center border-b last:border-b-0 even:bg-gray-50 dark:even:bg-gray-500 dark:odd:bg-gray-600 dark:odd:text-gray-300 dark:border-0"
              >
                <div className="w-[120px] sm:w-auto sm:flex-1 flex-shrink-0 font-medium text-sm sm:text-base truncate pr-2">
                  {o.bookmaker}
                </div>
                <div className="grid grid-cols-3 flex-1 text-center gap-1 sm:gap-2">
                  <div
                    className={`px-1 sm:px-2 py-1 dark:text-black rounded text-xs sm:text-sm font-semibold ${
                      bestHome.includes(o.bookmaker)
                        ? "bg-blue-200 text-blue-800 shadow-sm"
                        : "bg-gray-200"
                    }`}
                    title={
                      bestHome.includes(o.bookmaker)
                        ? "Best odds for home win"
                        : ""
                    }
                  >
                    {o.oddsHome}
                  </div>
                  <div
                    className={`px-1 sm:px-2 py-1 dark:text-black rounded text-xs sm:text-sm font-semibold ${
                      bestDraw.includes(o.bookmaker)
                        ? "bg-gray-300 dark:bg-gray-400 shadow-sm"
                        : "bg-gray-200"
                    }`}
                    title={
                      bestDraw.includes(o.bookmaker) ? "Best odds for draw" : ""
                    }
                  >
                    {o.oddsDraw}
                  </div>
                  <div
                    className={`px-1 sm:px-2 py-1 dark:text-black rounded text-xs sm:text-sm font-semibold ${
                      bestAway.includes(o.bookmaker)
                        ? "bg-red-200 text-red-800 shadow-sm"
                        : "bg-gray-200"
                    }`}
                    title={
                      bestAway.includes(o.bookmaker)
                        ? "Best odds for away win"
                        : ""
                    }
                  >
                    {o.oddsAway}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Odds;
