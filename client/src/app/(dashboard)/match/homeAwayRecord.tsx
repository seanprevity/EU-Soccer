"use client";

import { HomeAwayStats, Standings } from "@/types/drizzleTypes";
import { cn, getLogoFile } from "@/lib/utils";
import Image from "next/image";
import { useGetHomeAwayMatchStatsQuery } from "@/state/api";

type Split = "HOME" | "AWAY";

type SplitStats = {
  played: number;
  won: number;
  draw: number;
  lost: number;
  goalsForPg: number | null;
  goalsAgainstPg: number | null;
  xgPg: number | null;
  xgaPg: number | null;
  shotsOnTargetPg: number | null;
  possession: number | null;
};

type Side = { team: string; split: Split; stats: SplitStats | null };

type Metric = {
  key: Exclude<keyof SplitStats, "played" | "won" | "draw" | "lost">;
  label: string;
  max?: number;
  better: "high" | "low";
  format: (v: number) => string;
};

const pct = (v: number) => `${v.toFixed(1)}%`;
const twoDp = (v: number) => v.toFixed(2);

// Rates rather than raw counts, so teams with different games played compare fairly.
const METRICS: Metric[] = [
  { key: "goalsForPg", label: "Goals Scored", better: "high", format: twoDp },
  {
    key: "goalsAgainstPg",
    label: "Goals Conceded",
    better: "low",
    format: twoDp,
  },
  { key: "xgPg", label: "xG", better: "high", format: twoDp },
  { key: "xgaPg", label: "xG Against", better: "low", format: twoDp },
  {
    key: "shotsOnTargetPg",
    label: "Shots On Target",
    better: "high",
    format: twoDp,
  },
  { key: "possession", label: "Possession", better: "high", format: pct },
];

const avg = (values: (number | null)[]) => {
  const known = values.filter((v): v is number => v != null);
  return known.length ? known.reduce((a, b) => a + b, 0) / known.length : null;
};

const fromTeamView = (m: HomeAwayStats, split: Split) => {
  const home = split === "HOME";
  return {
    xg: home ? m.hxg : m.axg,
    xga: home ? m.axg : m.hxg,
    shotsOnTarget: home ? m.hst : m.ast,
    possession: home ? m.hposs : m.aposs,
  };
};

function toSplitStats(
  r: Standings | undefined,
  matches: HomeAwayStats[] | undefined,
  split: Split,
): SplitStats | null {
  if (!r) return null;
  const played = r.played ?? 0;
  const won = r.won ?? 0;
  const draw = r.draw ?? 0;
  const lost = r.lost ?? 0;
  const perGame = (n: number) => (played ? n / played : null);
  const views = (matches ?? []).map((m) => fromTeamView(m, split));
  return {
    played,
    won,
    draw,
    lost,
    goalsForPg: perGame(r.goalsFor ?? 0),
    goalsAgainstPg: perGame(r.goalsAgainst ?? 0),
    xgPg: avg(views.map((v) => v.xg)),
    xgaPg: avg(views.map((v) => v.xga)),
    shotsOnTargetPg: avg(views.map((v) => v.shotsOnTarget)),
    possession: avg(views.map((v) => v.possession)),
  };
}

function RecordStrip({ stats }: { stats: SplitStats }) {
  if (!stats.played)
    return <div className="h-1.5 rounded-full bg-gray-200 dark:bg-gray-700" />;

  const segments = [
    {
      key: "won",
      count: stats.won,
      label: "Won",
      className: "bg-green-600",
    },
    {
      key: "draw",
      count: stats.draw,
      label: "Drawn",
      className: "bg-slate-400 dark:bg-slate-500",
    },
    {
      key: "lost",
      count: stats.lost,
      label: "Lost",
      className: "bg-red-600",
    },
  ];

  return (
    <div className="flex h-1.5 gap-1" aria-hidden>
      {segments.map((s) =>
        s.count > 0 ? (
          <div
            key={s.key}
            title={`${s.label} ${s.count}`}
            className={cn(
              "min-w-0 rounded-full transition-all duration-500 ",
              s.className,
            )}
            style={{ flexGrow: s.count, flexBasis: 0 }}
          />
        ) : null,
      )}
    </div>
  );
}

function SideHeader({ side, align }: { side: Side; align: "left" | "right" }) {
  const s = side.stats;
  return (
    <div
      className={cn("min-w-0 space-y-1.5", align === "right" && "text-right")}
    >
      <Image
        src={`/${getLogoFile(side.team)}`}
        alt={`${side.team} logo`}
        width={20}
        height={20}
        className={cn(
          "h-6 w-6 shrink-0 object-contain sm:h-9 sm:w-9",
          align === "right" && "ml-auto",
        )}
      />
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
    a == null || b == null || a === b
      ? null
      : (metric.better === "high") === a > b
        ? "a"
        : "b";
  const scale = metric.max ?? (a ?? 0) + (b ?? 0);
  const width = (v: number | null) =>
    `${v == null || !scale ? 0 : Math.min(v / scale, 1) * 100}%`;
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
            className={cn(
              "h-full rounded-full transition-all duration-500",
              winner === "a"
                ? "bg-green-600"
                : "bg-slate-400 dark:bg-slate-500",
            )}
            style={{ width: width(a) }}
          />
        </div>
      </div>
      <span
        className="w-24 text-center text-xs text-gray-500 dark:text-gray-400 sm:w-28"
        title={metric.better === "low" ? "Lower is better" : undefined}
      >
        {metric.label}
      </span>
      <div className="flex items-center gap-2">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-500",
              winner === "b"
                ? "bg-green-600"
                : "bg-slate-400 dark:bg-slate-500",
            )}
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
  matchup,
  left,
  right,
}: {
  title: string;
  matchup: string;
  left: Side;
  right: Side;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-800">
      <h3 className="mb-4 text-sm font-medium text-gray-700 dark:text-gray-300">
        {title} - {matchup}
      </h3>
      <div className="mb-5 grid grid-cols-2 gap-6">
        <SideHeader side={left} align="left" />
        <SideHeader side={right} align="right" />
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
  const { data: homeAwayMatches, isFetching } = useGetHomeAwayMatchStatsQuery({
    homeTeam,
    awayTeam,
  });

  if (!stats)
    return (
      <p className="py-8 text-center italic text-gray-500 dark:text-gray-200">
        Loading home/away record…
      </p>
    );

  const get = (team: string, split: Split, matches?: HomeAwayStats[]) =>
    toSplitStats(
      stats.find((s) => s.name === team && s.type === split),
      matches,
      split,
    );

  const homeAtHome = get(homeTeam, "HOME", homeAwayMatches?.homeHome);
  const homeAway = get(homeTeam, "AWAY", homeAwayMatches?.homeAway);
  const awayAtHome = get(awayTeam, "HOME", homeAwayMatches?.awayHome);
  const awayAway = get(awayTeam, "AWAY", homeAwayMatches?.awayAway);

  return (
    <section className="space-y-4 rounded-lg bg-gray-100 p-4 dark:bg-gray-900">
      <h2 className="text-center text-2xl font-bold text-gray-900 dark:text-white">
        Home and away form
      </h2>

      <div
        className={cn(
          "grid gap-4 transition-opacity lg:grid-cols-2",
          isFetching && "opacity-60",
        )}
      >
        <MatchupPanel
          title="This fixture"
          matchup={`${homeTeam} (H) vs ${awayTeam} (A)`}
          left={{ team: homeTeam, split: "HOME", stats: homeAtHome }}
          right={{ team: awayTeam, split: "AWAY", stats: awayAway }}
        />
        <MatchupPanel
          title="Reverse fixture"
          matchup={`${homeTeam} (A) vs ${awayTeam} (H)`}
          left={{ team: homeTeam, split: "AWAY", stats: homeAway }}
          right={{ team: awayTeam, split: "HOME", stats: awayAtHome }}
        />
      </div>
    </section>
  );
};

export default HomeAwayRecord;
