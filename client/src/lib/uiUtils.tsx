import { GoalEvent, Standings, teamStats } from "@/types/drizzleTypes";
import React from "react";
import { calculatePercentage, cn, getLogoFile } from "./utils";
import Image from "next/image";
import Link from "next/link";

export const renderForm = (formString: string | null) => {
  if (!formString) return null;
  return formString.split("").map((result, index) => {
    let colorClass = "bg-gray-400";
    let symbol = result;
    let textClass = "";
    if (result === "W") {
      colorClass = "bg-[#01b956]";
      symbol = "✓";
      textClass = "text-[0.75rem]";
    } else if (result === "L") {
      colorClass = "bg-[#f03e3e]";
      symbol = "X";
      textClass = "text-[0.7rem]";
    } else if (result === "D") {
      colorClass = "bg-gray-400";
      symbol = "-";
      textClass = "text-[0.75rem] relative top-[-0.8px]";
    }
    return (
      <span
        key={index}
        className={`inline-flex items-center justify-center w-[18px] h-[18px] rounded-full text-white font-bold ${colorClass}`}
      >
        <span className={textClass}>{symbol}</span>
      </span>
    );
  });
};

export const StatBar = ({
  label,
  homeValue,
  awayValue,
}: {
  label: string;
  homeValue: number;
  awayValue: number;
}) => {
  const total = homeValue + awayValue || 1;
  const homePercent = (homeValue / total) * 100;
  const awayPercent = (awayValue / total) * 100;

  const isNegative = ["Fouls", "Yellow Cards", "Red Cards"].includes(label);
  const homeColor =
    homeValue > awayValue && !isNegative
      ? "bg-green-500"
      : homeValue < awayValue && isNegative
        ? "bg-green-500"
        : "bg-gray-400";
  const awayColor =
    awayValue > homeValue && !isNegative
      ? "bg-green-500"
      : awayValue < homeValue && isNegative
        ? "bg-green-500"
        : "bg-gray-400";
  return (
    <div className="mb-3 md:mb-4">
      <div className="flex justify-between text-xs sm:text-sm md:text-base font-semibold text-gray-700 dark:text-gray-300 mb-1">
        <span>{homeValue}</span>
        <span className="truncate px-2">{label}</span>
        <span>{awayValue}</span>
      </div>
      <div className="flex items-center justify-between w-full">
        <div className="flex justify-start w-1/2 pr-0.5 sm:pr-1">
          <div className="relative w-full h-[6px] sm:h-[8px] bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden flex justify-end">
            <div
              className={`${homeColor} h-full rounded-full transition-all duration-300`}
              style={{
                width: `${homePercent}%`,
              }}
            />
          </div>
        </div>
        <div className="flex justify-start w-1/2 pl-0.5 sm:pl-1">
          <div className="relative w-full h-[6px] sm:h-[8px] bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
            <div
              className={`${awayColor} h-full rounded-r-full transition-all duration-300`}
              style={{
                width: `${awayPercent}%`,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export function RenderCard({
  teamLabel,
  record,
  mode,
  className,
}: {
  teamLabel: string;
  record: Standings;
  mode: string;
  className?: string;
}) {
  const modeColor =
    "from-gray-300 to-gray-400 dark:from-gray-700 dark:to-gray-800";
  return (
    <div
      className={cn(
        "flex-1 p-6 bg-gradient-to-br rounded-xl shadow-lg border border-white/20",
        modeColor,
        className,
      )}
    >
      <div className="bg-gray-400 dark:bg-gray-700 backdrop-blur-sm rounded-lg p-4 mb-4 flex justify-between items-center">
        <h3 className="text-xl font-bold text-white">{teamLabel}</h3>
      </div>

      <div className="space-y-3">
        <StatRow label="Played" value={record.played} />
        <StatRow label="Wins" value={record.won} valueColor="text-green-400" />
        <StatRow label="Draws" value={record.draw} valueColor="text-gray-200" />
        <StatRow label="Losses" value={record.lost} valueColor="text-red-400" />

        {record.points !== undefined && (
          <div className="pt-3 mt-3 border-t border-white/20">
            <StatRow
              label="Points"
              value={record.points}
              valueColor="text-white font-bold"
              large
            />
          </div>
        )}
      </div>
    </div>
  );
}

function StatRow({
  label,
  value,
  valueColor = "text-white",
  large = false,
}: {
  label: string;
  value: number;
  valueColor?: string;
  large?: boolean;
}) {
  return (
    <div className="flex justify-between items-center py-2 px-3 bg-gray-400 dark:bg-gray-700 rounded-lg backdrop-blur-sm">
      <span
        className={cn(
          "text-white/90",
          large ? "text-base font-semibold" : "text-sm",
        )}
      >
        {label}
      </span>
      <span
        className={cn(
          valueColor,
          large ? "text-2xl font-bold" : "text-lg font-semibold",
        )}
      >
        {value}
      </span>
    </div>
  );
}

function TeamStatsRow({
  label,
  value,
  percentage,
  isPositive,
}: {
  label: string;
  value: number;
  percentage: number;
  isPositive: boolean;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-between items-baseline">
        <div className="text-sm text-gray-500 dark:text-gray-400">{label}</div>
        <div
          className={`text-xl font-semibold ${
            isPositive
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-red-600 dark:text-red-400"
          }`}
        >
          {value}
        </div>
      </div>
      <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 bg-gradient-to-r from-blue-500 to-blue-600`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

export function TeamStatsCard({
  teamStandings,
  opponentStats,
}: {
  teamStandings: teamStats;
  opponentStats: teamStats;
}) {
  const avgGpg = Number((teamStandings.gf / teamStandings.played).toFixed(2));
  const avgGaPg = Number((teamStandings.ga / teamStandings.played).toFixed(2));
  const avgShotsPg = Number(
    (teamStandings.shots / teamStandings.played).toFixed(2),
  );
  const avgShotsOnTargetPg = Number(
    (teamStandings.shotsOnTarget / teamStandings.played).toFixed(2),
  );
  const avgCornerPg = Number(
    (teamStandings.corners / teamStandings.played).toFixed(2),
  );
  const avgYellowsPg = Number(
    (teamStandings.yellows / teamStandings.played).toFixed(2),
  );
  const avgRedsPg = Number(
    (teamStandings.reds / teamStandings.played).toFixed(2),
  );
  const avgXgPg = Number((teamStandings.xg / teamStandings.played).toFixed(2));

  const oppAvgGpg = Number(
    (opponentStats.gf / opponentStats.played).toFixed(2),
  );
  const oppAvgGaPg = Number(
    (opponentStats.ga / opponentStats.played).toFixed(2),
  );
  const oppAvgShotsPg = Number(
    (opponentStats.shots / opponentStats.played).toFixed(2),
  );
  const oppAvgShotsOnTargetPg = Number(
    (opponentStats.shotsOnTarget / opponentStats.played).toFixed(2),
  );
  const oppAvgCornersPg = Number(
    (opponentStats.corners / opponentStats.played).toFixed(2),
  );
  const oppAvgYellowsPg = Number(
    (opponentStats.yellows / opponentStats.played).toFixed(2),
  );
  const oppAvgRedsPg = Number(
    (opponentStats.reds / opponentStats.played).toFixed(2),
  );
  const oppAvgXgPg = Number(
    (opponentStats.xg / opponentStats.played).toFixed(2),
  );

  const goalsScoredPercentage = calculatePercentage(avgGpg, oppAvgGpg);
  const goalsConcededPercentage = calculatePercentage(avgGaPg, oppAvgGaPg);
  const shotsPercentage = calculatePercentage(avgShotsPg, oppAvgShotsPg);
  const shotsOnTargetPercentage = calculatePercentage(
    avgShotsOnTargetPg,
    oppAvgShotsOnTargetPg,
  );
  const cornersPercentage = calculatePercentage(avgCornerPg, oppAvgCornersPg);
  const yellowsPercentage = calculatePercentage(avgYellowsPg, oppAvgYellowsPg);
  const redsPercentage = calculatePercentage(avgRedsPg, oppAvgRedsPg);
  const xgPercentage = calculatePercentage(avgXgPg, oppAvgXgPg);
  const xgTotal = teamStandings.xg;
  const goalsMinusXg = teamStandings.gf - teamStandings.xg;
  return (
    <div
      className={`flex flex-col gap-2 min-w-[250px] max-w-[350px] flex-1 p-6 rounded-xl shadow-md bg-blue-500/5 dark:bg-blue-900/20`}
    >
      <div className="flex justify-center items-center">
        <Image
          src={`/${getLogoFile(teamStandings.name)}`}
          alt={`${teamStandings.name} logo`}
          width={60}
          height={60}
          className="w-[60px] h-[60px] object-contain"
        />
      </div>
      <h3 className="text-2xl font-bold text-center dark:text-gray-200">
        <Link
          href={`/team/${teamStandings.name.split(" ").join("_")}`}
          className="no-underline gap-2 hover:opacity-60 transition-opacity"
        >
          {teamStandings.name}
        </Link>
      </h3>

      <div className="flex justify-center items-center gap-1 mt-0.5 text-sm text-gray-600 dark:text-gray-300">
        <span className="font-semibold text-emerald-600 dark:text-emerald-400">
          {teamStandings.won}W
        </span>
        <span className="text-gray-400">-</span>
        <span className="font-semibold text-gray-500 dark:text-gray-400">
          {teamStandings.draw}D
        </span>
        <span className="text-gray-400">-</span>
        <span className="font-semibold text-red-500 dark:text-red-400">
          {teamStandings.lost}L
        </span>
      </div>

      {teamStandings.form && (
        <div className="flex flex-col items-center mb-2">
          <span className="px-1 py-2 justify-center gap-[2px] flex">
            {renderForm(teamStandings.form)}
          </span>
        </div>
      )}

      <div className="flex flex-col gap-3">
        <TeamStatsRow
          label="Goals (per game)"
          value={avgGpg}
          percentage={goalsScoredPercentage}
          isPositive={avgGpg >= oppAvgGpg}
        />

        <TeamStatsRow
          label="Expected Goals (xG)"
          value={avgXgPg}
          percentage={xgPercentage}
          isPositive={avgXgPg >= oppAvgXgPg}
        />

        <TeamStatsRow
          label="Shots"
          value={avgShotsPg}
          percentage={shotsPercentage}
          isPositive={avgShotsPg >= oppAvgShotsPg}
        />

        <TeamStatsRow
          label="Shots on target"
          value={avgShotsOnTargetPg}
          percentage={shotsOnTargetPercentage}
          isPositive={avgShotsOnTargetPg >= oppAvgShotsOnTargetPg}
        />

        <TeamStatsRow
          label="Corners"
          value={avgCornerPg}
          percentage={cornersPercentage}
          isPositive={avgCornerPg >= oppAvgCornersPg}
        />

        <TeamStatsRow
          label="Conceded"
          value={avgGaPg}
          percentage={goalsConcededPercentage}
          isPositive={avgGaPg <= oppAvgGaPg}
        />

        <TeamStatsRow
          label="Yellow Cards"
          value={avgYellowsPg}
          percentage={yellowsPercentage}
          isPositive={avgYellowsPg <= oppAvgYellowsPg}
        />

        <TeamStatsRow
          label="Red Cards"
          value={avgRedsPg}
          percentage={redsPercentage}
          isPositive={avgRedsPg <= oppAvgRedsPg}
        />
      </div>

      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex justify-between items-center gap-2">
          <div className="text-center flex-1">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">
              GF
            </div>
            <div className="text-base font-semibold dark:text-gray-200">
              {teamStandings.gf}
            </div>
          </div>

          <div className="text-center flex-1">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">
              GA
            </div>
            <div className="text-base font-semibold dark:text-gray-200">
              {teamStandings.ga}
            </div>
          </div>

          <div className="text-center flex-1">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">
              GD
            </div>
            <div
              className={`text-base font-bold ${
                teamStandings.gd > 0
                  ? "text-emerald-500 dark:text-emerald-400"
                  : teamStandings.gd == 0
                    ? "dark:text-gray-200"
                    : "text-red-500 dark:text-red-400"
              }`}
            >
              {teamStandings.gd > 0 ? "+" : ""}
              {teamStandings.gd}
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center gap-2 mt-3">
          <div className="text-center flex-1">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">
              xG
            </div>
            <div className="text-base font-semibold dark:text-gray-200">
              {xgTotal.toFixed(2)}
            </div>
          </div>

          <div className="flex-1" />

          <div className="text-center flex-1">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">
              GF − xG
            </div>
            <div
              className={`text-base font-bold ${
                goalsMinusXg > 0
                  ? "text-emerald-500 dark:text-emerald-400"
                  : goalsMinusXg == 0
                    ? "dark:text-gray-200"
                    : "text-red-500 dark:text-red-400"
              }`}
            >
              {goalsMinusXg > 0 ? "+" : ""}
              {goalsMinusXg.toFixed(2)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export const getBorderLabel = (borderColor: string): string => {
  if (
    borderColor.includes("bg-[#38003c]") ||
    borderColor.includes("bg-purple-400")
  ) {
    return "Champions League";
  }
  if (borderColor.includes("bg-[#301934]")) {
    return "Champions League Qualification";
  }
  if (borderColor.includes("bg-[#00A300]")) {
    return "Europa League";
  }
  if (borderColor.includes("bg-[#ff3333]")) {
    return "Europa Conference League Qualification";
  }
  if (borderColor.includes("bg-[#ff2882]")) {
    return "Relegation";
  }
  if (borderColor.includes("bg-[#ADADAD]")) {
    return "Relegation Play-Off";
  }
  return "";
};

export function RedCardBadge({ count }: { count: number | null | undefined }) {
  if (typeof count !== "number" || count <= 0) return null;
  return (
    <div className="absolute -right-1 -top-1 flex h-[10px] w-[10px] items-center justify-center">
      <Image
        src="/Red.svg"
        alt="Red card"
        width={10}
        height={10}
        className="object-contain"
      />
      {count > 1 && (
        <span className="absolute text-[11px] font-bold leading-none text-black">
          {count}
        </span>
      )}
    </div>
  );
}

const formatMinute = (g: GoalEvent) =>
  g.minute == null
    ? ""
    : `${g.minute}${g.extraMinute ? `+${g.extraMinute}` : ""}'`;

function GoalIcon({ kind }: { kind: GoalEvent["kind"] }) {
  if (kind === "penalty")
    return (
      <span
        title="Penalty"
        className="inline-flex h-4 shrink-0 items-center justify-center rounded bg-gray-200 px-1 text-[10px] font-bold leading-none text-gray-700 dark:bg-gray-700 dark:text-gray-200"
      >
        PEN
      </span>
    );
  if (kind === "own_goal")
    return (
      <span
        title="Own goal"
        className="inline-flex h-4 shrink-0 items-center justify-center rounded bg-red-100 px-1 text-[10px] font-bold leading-none text-red-700 dark:bg-red-900/40 dark:text-red-300"
      >
        OG
      </span>
    );
  return (
    <span
      title="Goal"
      aria-label="Goal"
      className="shrink-0 text-sm leading-none"
    >
      ⚽
    </span>
  );
}

function GoalDetail({
  goal,
  align,
}: {
  goal: GoalEvent;
  align: "left" | "right";
}) {
  return (
    <div className={cn("min-w-0", align === "right" && "text-right")}>
      <div
        className={cn(
          "flex items-center gap-1.5",
          align === "right" && "flex-row-reverse",
        )}
      >
        <GoalIcon kind={goal.kind} />
        <span className="truncate font-medium text-gray-900 dark:text-gray-100">
          {goal.player}
        </span>
      </div>
      {goal.assist && (
        <p className="truncate text-xs text-gray-500 dark:text-gray-400">
          Assist: {goal.assist}
        </p>
      )}
    </div>
  );
}

// Home goals on the left, away goals on the right, minute and running score in the middle.
// goals === null means the timeline hasn't been synced yet, so nothing renders.
export function GoalTimeline({
  goals,
}: {
  goals: GoalEvent[] | null | undefined;
}) {
  if (!goals) return null;
  if (!goals.length)
    return (
      <p className="text-center text-xs text-gray-500 dark:text-gray-400">
        No goals
      </p>
    );

  let home = 0;
  let away = 0;
  const rows = goals.map((goal) => {
    const side = goal.side;
    if (side === "home") home++;
    else if (side === "away") away++;
    return { goal, side, score: `${home}–${away}` };
  });

  return (
    <ol className="space-y-2">
      {rows.map(({ goal, side, score }, i) => (
        <li
          key={i}
          className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-sm"
        >
          <div>
            {side === "home" && <GoalDetail goal={goal} align="right" />}
          </div>
          <div className="flex w-12 flex-col items-center tabular-nums leading-tight">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {formatMinute(goal)}
            </span>
            <span className="text-xs font-semibold text-gray-900 dark:text-gray-100">
              {score}
            </span>
          </div>
          <div>
            {side === "away" && <GoalDetail goal={goal} align="left" />}
          </div>
        </li>
      ))}
    </ol>
  );
}
