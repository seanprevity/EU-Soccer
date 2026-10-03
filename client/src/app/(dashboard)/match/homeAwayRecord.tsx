"use client";

import { Standings } from "@/types/drizzleTypes";
import { cn } from "@/lib/utils";

type Split = "HOME" | "AWAY";

type SplitStats = {
  played: number;
  won: number;
  draw: number;
  lost: number;
  points: number;
  ppg: number | null;
  winPct: number | null;
  drawPct: number | null;
  lossPct: number | null;
};

type Side = { team: string; split: Split; stats: SplitStats | null };

type Metric = {
  key: "ppg" | "winPct" | "drawPct" | "lossPct";
  label: string;
  max: number;
  better: "high" | "low" | null;
  format: (v: number) => string;
};

const pct = (v: number) => `${v.toFixed(1)}%`;

// Rates rather than raw counts, so teams with different games played compare fairly.
const METRICS: Metric[] = [
  {
    key: "ppg",
    label: "Points per game",
    max: 3,
    better: "high",
    format: (v) => v.toFixed(2),
  },
  { key: "winPct", label: "Win rate", max: 100, better: "high", format: pct },
  { key: "drawPct", label: "Draw rate", max: 100, better: null, format: pct },
  { key: "lossPct", label: "Loss rate", max: 100, better: "low", format: pct },
];

const LEFT = { bar: "bg-sky-500", text: "text-sky-600 dark:text-sky-400" };
const RIGHT = {
  bar: "bg-orange-500",
  text: "text-orange-600 dark:text-orange-400",
};

function toSplitStats(r?: Standings): SplitStats | null {
  if (!r) return null;
  const played = r.played ?? 0;
  const won = r.won ?? 0;
  const draw = r.draw ?? 0;
  const lost = r.lost ?? 0;
  const points = r.points ?? won * 3 + draw;
  const rate = (n: number) => (played ? (n / played) * 100 : null);
  return {
    played,
    won,
    draw,
    lost,
    points,
    ppg: played ? points / played : null,
    winPct: rate(won),
    drawPct: rate(draw),
    lossPct: rate(lost),
  };
}

const splitLabel = (split: Split) => (split === "HOME" ? "at home" : "away");

function RecordStrip({ stats }: { stats: SplitStats }) {
  if (!stats.played)
    return <div className="h-1.5 rounded-full bg-gray-200 dark:bg-gray-800" />;
  const w = (n: number) => `${(n / stats.played) * 100}%`;
  return (
    <div className="flex h-1.5 overflow-hidden rounded-full" aria-hidden>
      <div className="bg-green-500" style={{ width: w(stats.won) }} />
      <div className="bg-gray-500" style={{ width: w(stats.draw) }} />
      <div className="bg-red-500" style={{ width: w(stats.lost) }} />
    </div>
  );
}

function SideHeader({
  side,
  align,
  color,
}: {
  side: Side;
  align: "left" | "right";
  color: string;
}) {
  const s = side.stats;
  return (
    <div
      className={cn("min-w-0 space-y-1.5", align === "right" && "text-right")}
    >
      <p className="truncate font-semibold text-gray-900 dark:text-white">
        {side.team}
      </p>
      <p className={cn("text-sm", color)}>{splitLabel(side.split)}</p>
      {s ? (
        <>
          <p className="text-sm tabular-nums text-gray-600 dark:text-gray-300">
            {s.won}W {s.draw}D {s.lost}L
          </p>
          <RecordStrip stats={s} />
        </>
      ) : (
        <p className="text-sm text-gray-500">No data</p>
      )}
    </div>
  );
}

function CompareRow({
  metric,
  a,
  b,
}: {
  metric: Metric;
  a: number | null;
  b: number | null;
}) {
  const winner =
    a == null || b == null || metric.better == null || a === b
      ? null
      : (metric.better === "high") === a > b
        ? "a"
        : "b";
  const width = (v: number | null) =>
    `${v == null ? 0 : Math.min(v / metric.max, 1) * 100}%`;
  const valueClass = (isWinner: boolean) =>
    cn(
      "w-14 shrink-0 text-sm tabular-nums",
      isWinner
        ? "font-semibold text-gray-900 dark:text-white"
        : "text-gray-500 dark:text-gray-400",
    );

  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-3">
      <div className="flex items-center gap-2">
        <span className={cn(valueClass(winner === "a"), "text-right")}>
          {a == null ? "–" : metric.format(a)}
        </span>
        <div className="flex h-2 flex-1 justify-end overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
          <div
            className={cn("h-full rounded-full", LEFT.bar)}
            style={{ width: width(a) }}
          />
        </div>
      </div>
      <span className="w-24 text-center text-xs text-gray-500 dark:text-gray-400 sm:w-28">
        {metric.label}
      </span>
      <div className="flex items-center gap-2">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
          <div
            className={cn("h-full rounded-full", RIGHT.bar)}
            style={{ width: width(b) }}
          />
        </div>
        <span className={valueClass(winner === "b")}>
          {b == null ? "–" : metric.format(b)}
        </span>
      </div>
    </div>
  );
}

function MatchupPanel({
  title,
  left,
  right,
}: {
  title: string;
  left: Side;
  right: Side;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-800">
      <h3 className="mb-4 text-sm font-medium text-gray-700 dark:text-gray-300">
        {title}
      </h3>
      <div className="mb-5 grid grid-cols-2 gap-6">
        <SideHeader side={left} align="left" color={LEFT.text} />
        <SideHeader side={right} align="right" color={RIGHT.text} />
      </div>
      <div className="space-y-3">
        {METRICS.map((m) => (
          <CompareRow
            key={m.key}
            metric={m}
            a={left.stats?.[m.key] ?? null}
            b={right.stats?.[m.key] ?? null}
          />
        ))}
      </div>
    </div>
  );
}

const HomeAwayRecord = ({
  stats,
  homeTeam,
  awayTeam,
}: {
  stats: Standings[];
  homeTeam: string;
  awayTeam: string;
}) => {
  if (!stats)
    return (
      <p className="py-8 text-center italic text-gray-500 dark:text-gray-200">
        Loading home/away record…
      </p>
    );

  const get = (team: string, split: Split) =>
    toSplitStats(stats.find((s) => s.name === team && s.type === split));

  const homeAtHome = get(homeTeam, "HOME");
  const homeAway = get(homeTeam, "AWAY");
  const awayAtHome = get(awayTeam, "HOME");
  const awayAway = get(awayTeam, "AWAY");

  return (
    <section className="space-y-4 rounded-lg bg-gray-100 p-4 dark:bg-gray-900">
      <h2 className="text-center text-2xl font-bold text-gray-900 dark:text-white">
        Home and away form
      </h2>

      <div className="grid gap-4 lg:grid-cols-2">
        <MatchupPanel
          title="This fixture"
          left={{ team: homeTeam, split: "HOME", stats: homeAtHome }}
          right={{ team: awayTeam, split: "AWAY", stats: awayAway }}
        />
        <MatchupPanel
          title="Reverse fixture"
          left={{ team: homeTeam, split: "AWAY", stats: homeAway }}
          right={{ team: awayTeam, split: "HOME", stats: awayAtHome }}
        />
      </div>
    </section>
  );
};

export default HomeAwayRecord;
