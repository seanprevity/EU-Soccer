import {
  LineupPlayer,
  MatchEvent,
  MatchLineups,
  Standings,
  TeamLineup,
  teamStats,
} from "@/types/drizzleTypes";
import React from "react";
import { calculatePercentage, cn, formationLayout, getLogoFile } from "./utils";
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
  isEqual,
}: {
  label: string;
  value: number;
  percentage: number;
  isPositive: boolean;
  isEqual: boolean;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-between items-baseline">
        <div className="text-sm text-gray-500 dark:text-gray-400">{label}</div>
        <div
          className={`text-xl font-semibold ${
            isPositive
              ? "text-emerald-600 dark:text-emerald-400"
              : isEqual
                ? "text-gray-600 dark:text-gray-400"
                : "text-red-600 dark:text-red-400"
          }`}
        >
          {value}
        </div>
      </div>
      <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 bg-gradient-to-r ${isPositive ? "from-sky-500 to-sky-600" : "from-gray-500 to-gray-500"}`}
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
  const xgPercentage = calculatePercentage(avgXgPg, oppAvgXgPg);
  const xgTotal = teamStandings.xg;
  const goalsMinusXg = teamStandings.gf - teamStandings.xg;
  return (
    <div
      className={`flex flex-col gap-2 min-w-[250px] max-w-[350px] flex-1 p-6 rounded-xl shadow-md bg-gray-100 dark:bg-gray-800/40`}
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
          isPositive={avgGpg > oppAvgGpg}
          isEqual={avgGpg === oppAvgGpg}
        />

        <TeamStatsRow
          label="Expected Goals (xG)"
          value={avgXgPg}
          percentage={xgPercentage}
          isPositive={avgXgPg > oppAvgXgPg}
          isEqual={avgXgPg === oppAvgXgPg}
        />

        <TeamStatsRow
          label="Shots"
          value={avgShotsPg}
          percentage={shotsPercentage}
          isPositive={avgShotsPg > oppAvgShotsPg}
          isEqual={avgShotsPg === oppAvgShotsPg}
        />

        <TeamStatsRow
          label="Shots on target"
          value={avgShotsOnTargetPg}
          percentage={shotsOnTargetPercentage}
          isPositive={avgShotsOnTargetPg > oppAvgShotsOnTargetPg}
          isEqual={avgShotsOnTargetPg === oppAvgShotsOnTargetPg}
        />

        <TeamStatsRow
          label="Corners"
          value={avgCornerPg}
          percentage={cornersPercentage}
          isPositive={avgCornerPg > oppAvgCornersPg}
          isEqual={avgCornerPg === oppAvgCornersPg}
        />

        <TeamStatsRow
          label="Conceded"
          value={avgGaPg}
          percentage={goalsConcededPercentage}
          isPositive={avgGaPg < oppAvgGaPg}
          isEqual={avgGaPg === oppAvgGaPg}
        />

        <TeamStatsRow
          label="Yellow Cards"
          value={avgYellowsPg}
          percentage={yellowsPercentage}
          isPositive={avgYellowsPg < oppAvgYellowsPg}
          isEqual={avgYellowsPg === oppAvgYellowsPg}
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

export function FormationPitch({ lineup }: { lineup: TeamLineup }) {
  const placed = formationLayout(lineup);
  if (!placed) return null; // show MatchLineupList instead

  return (
    <div className="relative aspect-[3/4] w-full rounded bg-green-700">
      {placed.map(({ player, x, y }) => (
        <div
          key={player.espnId || player.name}
          className="absolute flex w-16 -translate-x-1/2 -translate-y-1/2 flex-col items-center text-center"
          style={{ left: `${x}%`, top: `${y}%` }}
        >
          {player.headshot ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={player.headshot}
              alt=""
              className="h-8 w-8 rounded-full bg-white object-cover"
            />
          ) : (
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-xs font-bold">
              {player.jersey}
            </span>
          )}
          <span className="w-full truncate text-[10px] text-white">
            {player.shortName ?? player.name}
          </span>
        </div>
      ))}
    </div>
  );
}

function PlayerRow({
  player,
  subMinute,
}: {
  player: LineupPlayer;
  subMinute: string | null;
}) {
  return (
    <li className="flex items-center gap-2 py-1 text-sm">
      {player.headshot ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={player.headshot}
          alt=""
          className="h-6 w-6 shrink-0 rounded-full bg-gray-200 object-cover dark:bg-gray-700"
          onError={(e) =>
            ((e.currentTarget as HTMLImageElement).style.visibility = "hidden")
          }
        />
      ) : (
        <span className="h-6 w-6 shrink-0 rounded-full bg-gray-200 dark:bg-gray-700" />
      )}
      <span className="w-5 shrink-0 text-right text-xs tabular-nums text-gray-500 dark:text-gray-400">
        {player.jersey}
      </span>
      <span className="min-w-0 flex-1 truncate text-gray-900 dark:text-gray-100">
        {player.name}
      </span>
      {player.subbedOut && (
        <span className="shrink-0 text-xs tabular-nums text-red-600 dark:text-red-400">
          ↓ {subMinute}
        </span>
      )}
      {player.subbedIn && (
        <span className="shrink-0 text-xs tabular-nums text-green-600 dark:text-green-400">
          ↑ {subMinute}
        </span>
      )}
      <span className="w-8 shrink-0 text-right text-xs text-gray-500 dark:text-gray-400">
        {player.position}
      </span>
    </li>
  );
}

function TeamLineupColumn({
  team,
  lineup,
  subMinutes,
}: {
  team: string;
  lineup: MatchLineups["home"];
  subMinutes: Map<string, string>;
}) {
  const starters = lineup.players
    .filter((p) => p.starter)
    .sort((a, b) => (a.formationPlace ?? 99) - (b.formationPlace ?? 99));
  const bench = lineup.players.filter((p) => !p.starter);

  return (
    <div className="min-w-0">
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <h5 className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">
          {team}
        </h5>
        {lineup.formation && (
          <span className="shrink-0 text-xs tabular-nums text-gray-500 dark:text-gray-400">
            {lineup.formation}
          </span>
        )}
      </div>
      <ul className="divide-y divide-gray-100 dark:divide-gray-700">
        {starters.map((p) => (
          <PlayerRow
            key={p.espnId || p.name}
            player={p}
            subMinute={subMinutes.get(p.name) ?? null}
          />
        ))}
      </ul>
      {bench.length > 0 && (
        <>
          <p className="mt-3 mb-1 text-xs font-medium text-gray-500 dark:text-gray-400">
            Bench
          </p>
          <ul className="divide-y divide-gray-100 dark:divide-gray-700">
            {bench.map((p) => (
              <PlayerRow
                key={p.espnId || p.name}
                player={p}
                subMinute={subMinutes.get(p.name) ?? null}
              />
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

export function MatchLineupList({
  lineups,
  events,
  homeTeam,
  awayTeam,
}: {
  lineups: MatchLineups | null | undefined;
  events: MatchEvent[] | null | undefined;
  homeTeam: string;
  awayTeam: string;
}) {
  if (!lineups) return null;

  // Player name -> minute they came on or went off
  const subMinutes = new Map<string, string>();
  for (const e of events ?? []) {
    if (e.kind !== "sub") continue;
    const minute = formatMinute(e);
    if (e.player) subMinutes.set(e.player, minute);
    if (e.playerOut) subMinutes.set(e.playerOut, minute);
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <TeamLineupColumn
        team={homeTeam}
        lineup={lineups.home}
        subMinutes={subMinutes}
      />
      <TeamLineupColumn
        team={awayTeam}
        lineup={lineups.away}
        subMinutes={subMinutes}
      />
    </div>
  );
}
// Green arrow up (on) beside a red arrow down (off)
export function SubArrows({ size = 14 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 16 16"
      width={size}
      height={size}
      aria-label="Substitution"
      className="shrink-0"
    >
      <path d="M4 1.5 7.5 6H5.2v8.5H2.8V6H.5Z" fill="#16a34a" />
      <path d="M12 14.5 8.5 10h2.3V1.5h2.4V10h2.3Z" fill="#dc2626" />
    </svg>
  );
}

export const isGoalKind = (kind: MatchEvent["kind"]) =>
  kind === "goal" || kind === "penalty" || kind === "own_goal";

export const formatMinute = (e: MatchEvent) =>
  e.minute == null
    ? ""
    : `${e.minute}${e.extraMinute ? `+${e.extraMinute}` : ""}'`;

export const EVENT_ICON: Record<
  MatchEvent["kind"],
  { src: string; alt: string }
> = {
  goal: { src: "/goal.svg", alt: "Goal" },
  penalty: { src: "/penalty.svg", alt: "Penalty goal" },
  own_goal: { src: "/own-goal.svg", alt: "Own goal" },
  yellow: { src: "/yellow.svg", alt: "Yellow card" },
  red: { src: "/Red.svg", alt: "Red card" },
  second_yellow: { src: "/second-yellow.svg", alt: "Second yellow card" },
  sub: { src: "/substitution.svg", alt: "Substitution" },
};

export function EventIcon({
  kind,
  size = 16,
}: {
  kind: MatchEvent["kind"];
  size?: number;
}) {
  const { src, alt } = EVENT_ICON[kind];
  const img = (
    <Image
      src={src}
      alt={alt}
      title={alt}
      width={size}
      height={size}
      unoptimized
      className="shrink-0 object-contain"
      style={{ width: size, height: size }}
    />
  );
  if (kind !== "penalty") return img;

  return (
    <span className="relative inline-flex shrink-0">
      {img}
      <span
        aria-hidden
        className="pointer-events-none absolute bottom-full left-1/2 mb-px -translate-x-1/2 whitespace-nowrap font-bold leading-none text-gray-900 dark:text-white"
        style={{ fontSize: Math.max(7, Math.round(size * 0.5)) }}
      >
        PEN.
      </span>
    </span>
  );
}

const BADGE_CORNER = {
  "top-right": "-right-1.5 -top-1.5",
  "bottom-right": "-right-1.5 -bottom-1.5",
} as const;

export function ArrowBadge({
  direction,
  corner = "top-right",
  size = 16,
}: {
  direction: "up" | "down";
  corner?: keyof typeof BADGE_CORNER;
  size?: number;
}) {
  const up = direction === "up";
  return (
    <Image
      src={up ? "/sub-on.svg" : "/sub-off.svg"}
      alt={up ? "Came on" : "Went off"}
      title={up ? "Came on" : "Went off"}
      width={size}
      height={size}
      unoptimized
      className={cn("absolute rounded-full shadow", BADGE_CORNER[corner])}
      style={{ width: size, height: size }}
    />
  );
}

// Player coming on above, player going off below (smaller, faded)
export function SubStack({
  on,
  off,
  align = "left",
}: {
  on: string | null;
  off: string | null | undefined;
  align?: "left" | "right";
}) {
  return (
    <div
      className={cn("min-w-0 leading-tight", align === "right" && "text-right")}
    >
      <p className="truncate text-[14px] font-medium text-gray-900 dark:text-gray-100">
        {on}
      </p>
      {off && (
        <p className="truncate text-[13px] text-gray-500 opacity-70 dark:text-gray-400">
          {off}
        </p>
      )}
    </div>
  );
}

// Each kind of event has its own weight: goals lead, cards and subs sit quieter.
function EventContent({
  event,
  align,
}: {
  event: MatchEvent;
  align: "left" | "right";
}) {
  const row = cn(
    "flex items-center gap-1.5",
    align === "right" && "flex-row-reverse",
  );

  if (event.kind === "sub")
    return (
      <div className={row}>
        <EventIcon kind="sub" size={16} />
        <SubStack on={event.player} off={event.playerOut} align={align} />
      </div>
    );

  if (!isGoalKind(event.kind))
    return (
      <div className={row}>
        <EventIcon kind={event.kind} size={16} />
        <span className="truncate text-[14px] text-gray-600 dark:text-gray-200">
          {event.player}
        </span>
      </div>
    );

  return (
    <div className={row}>
      <EventIcon kind={event.kind} size={16} />
      <div
        className={cn(
          "min-w-0 leading-tight",
          align === "right" && "text-right",
        )}
      >
        <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
          {event.player}
        </p>
        {event.assist && (
          <p className="truncate text-xs text-gray-500 dark:text-gray-400">
            {event.assist}
          </p>
        )}
        {event.kind === "own_goal" && (
          <p className="truncate text-xs text-gray-500 dark:text-gray-400">
            Own Goal
          </p>
        )}
      </div>
    </div>
  );
}

function PeriodMarker({ label, score }: { label: string; score?: string }) {
  return (
    <li
      className="flex items-center gap-3 py-1"
      aria-label={score ? `${label} ${score}` : label}
    >
      <span className="h-px flex-1 bg-gray-300 dark:bg-gray-700" />
      <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
        {label}
        {score && (
          <span className="ml-2 font-bold tabular-nums text-gray-900 dark:text-gray-100">
            {score}
          </span>
        )}
      </span>
      <span className="h-px flex-1 bg-gray-300 dark:bg-gray-700" />
    </li>
  );
}

const periodOf = (e: MatchEvent) => {
  const m = e.minute ?? 0;
  if (e.minute == 45 && e.kind == "sub") return 2;
  return m <= 45 ? 1 : m <= 90 ? 2 : 3;
};

// Event content plus a connector that fades from the icon into the minute circle
function SideCell({
  row,
  align,
}: {
  row: { event: MatchEvent } | undefined;
  align: "left" | "right";
}) {
  if (!row) return <div className="min-w-0" />;

  const connector = (
    <span
      aria-hidden
      className={cn(
        "h-px w-6 shrink-0 from-gray-400 to-transparent dark:from-gray-600",
        align === "right" ? "bg-gradient-to-r" : "bg-gradient-to-l",
      )}
    />
  );

  return (
    <div
      className={cn(
        "flex min-w-0 items-center gap-1.5",
        align === "right" ? "justify-end" : "justify-start",
      )}
    >
      {align === "left" && connector}
      <div className="min-w-0">
        <EventContent event={row.event} align={align} />
      </div>
      {align === "right" && connector}
    </div>
  );
}

export function MatchTimeline({
  events,
}: {
  events: MatchEvent[] | null | undefined;
}) {
  if (!events?.length)
    return (
      <p className="text-center text-sm text-gray-500 dark:text-gray-400">
        No events recorded for this match.
      </p>
    );

  let home = 0;
  let away = 0;
  const rows = events.map((event) => {
    const goal = isGoalKind(event.kind);
    if (goal && event.side === "home") home++;
    if (goal && event.side === "away") away++;
    return { event, goal, period: periodOf(event), score: `${home}–${away}` };
  });

  const scoreAfter = (period: number) =>
    [...rows].reverse().find((r) => r.period <= period)?.score ?? "0–0";
  const hasExtraTime = rows.some((r) => r.period === 3);

  type Row = (typeof rows)[number];
  type Line = { first: Row; home?: Row; away?: Row };

  // Subs made in the same minute by opposite teams share a line
  const linesFor = (period: number): Line[] => {
    const lines: Line[] = [];
    const subLines = new Map<string, Line[]>(); // minute -> lines holding subs

    for (const r of rows) {
      if (r.period !== period) continue;
      const side = r.event.side;

      if (r.event.kind !== "sub" || !side) {
        lines.push({
          first: r,
          home: side === "home" ? r : undefined,
          away: side === "away" ? r : undefined,
        });
        continue;
      }

      const minute = formatMinute(r.event);
      const sameMinute = subLines.get(minute) ?? [];
      const open = sameMinute.find((l) => !l[side]);
      if (open) {
        open[side] = r;
      } else {
        const line: Line = { first: r, [side]: r };
        sameMinute.push(line);
        subLines.set(minute, sameMinute);
        lines.push(line);
      }
    }
    return lines;
  };

  const eventRows = (period: number) =>
    linesFor(period).map(({ first, home, away }, i) => {
      const { event, goal } = first;
      return (
        <li
          key={`${period}-${i}`}
          className="grid grid-cols-[1fr_auto_1fr] items-center py-1.5"
        >
          <SideCell row={home} align="right" />
          <span
            className={cn(
              "flex h-6 w-10 items-center justify-center rounded-full font-semibold tabular-nums",
              event.extraMinute ? "text-[10px]" : "text-xs",
              goal
                ? "bg-white text-gray-900"
                : "bg-gray-900 text-white dark:bg-gray-800",
            )}
          >
            {formatMinute(event)}
          </span>
          <SideCell row={away} align="left" />
        </li>
      );
    });

  // Built in match order, then reversed so the latest events sit at the top
  const items = [
    <PeriodMarker key="ko" label="Kick-off" />,
    ...eventRows(1),
    <PeriodMarker key="ht" label="Half-time" score={scoreAfter(1)} />,
    ...eventRows(2),
    ...(hasExtraTime
      ? [
          <PeriodMarker
            key="90"
            label="End of 90 minutes"
            score={scoreAfter(2)}
          />,
          ...eventRows(3),
        ]
      : []),
    <PeriodMarker key="ft" label="Full-time" score={scoreAfter(3)} />,
  ].reverse();

  return <ol className="space-y-1">{items}</ol>;
}
