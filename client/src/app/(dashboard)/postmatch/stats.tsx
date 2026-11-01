import { cn, statsKeys } from "@/lib/utils";
import { StatBar } from "@/lib/uiUtils";
import Image from "next/image";
import { getLogoFile } from "@/lib/utils";
import { MatchStats } from "@epl/shared";
import { statsForPeriod, StatsPeriod } from "@/lib/halfStats";
import { useState } from "react";
import { LiveInfo } from "./matchView";

function TeamLogo({ team }: { team: string }) {
  return (
    <Image
      src={`/${getLogoFile(team)}`}
      alt={`${team} logo`}
      title={team}
      width={40}
      height={40}
      className="h-7 w-7 object-contain sm:h-9 sm:w-9"
    />
  );
}

const readStat = (
  m: MatchStats,
  side: "h" | "a",
  key: string,
): number | null => {
  const v = m[`${side}${key.slice(1)}` as keyof MatchStats];
  return typeof v === "number" ? v : null;
};

// Stats stored as 0-0 before being recorded
const ZERO_MEANS_MISSING = new Set(["hxg", "hposs"]);

// Total shots minus shots on target minus blocked shots. Null unless all three are known.
const offTarget = (
  total: number | null,
  onTarget: number | null,
  blocked: number | null,
) =>
  total == null || onTarget == null || blocked == null
    ? null
    : Math.max(0, total - onTarget - blocked);

type Row = {
  key: string;
  label: string;
  home: number | null;
  away: number | null;
};

const PERIODS: { key: StatsPeriod; label: string }[] = [
  { key: "total", label: "Total" },
  { key: "first", label: "1st half" },
  { key: "second", label: "2nd half" },
];

export default function Stats({
  match,
  live,
}: {
  match: MatchStats;
  live?: LiveInfo;
}) {
  const [period, setPeriod] = useState<StatsPeriod>("total");
  let secondHalfMinutes = 45;
  if (live)
    secondHalfMinutes = Math.min(45, Math.max(0, (live.minute ?? 0) - 45));

  const hasFirstHalf = match.firstHalf != null;
  const available: Record<StatsPeriod, boolean> = {
    total: true,
    first: hasFirstHalf,
    second: hasFirstHalf && secondHalfMinutes > 0,
  };
  const active: StatsPeriod = available[period] ? period : "total";
  const shown = statsForPeriod(match, active, secondHalfMinutes);

  const rows: Row[] = statsKeys
    .map(({ key, label }) => ({
      key,
      label,
      home: readStat(shown, "h", key),
      away: readStat(shown, "a", key),
    }))
    .filter(({ key, home, away }) => {
      if (home === null && away === null) return false;
      if (active === "total" && ZERO_MEANS_MISSING.has(key) && !home && !away)
        return false;
      return true;
    });

  // Shots off target from `shown`
  const homeOff = offTarget(shown.hs, shown.hst, shown.hbs);
  const awayOff = offTarget(shown.as, shown.ast, shown.abs);
  if (homeOff !== null && awayOff !== null) {
    const afterOnTarget = rows.findIndex((r) => r.key === "hst") + 1;
    rows.splice(afterOnTarget || rows.length, 0, {
      key: "hoff",
      label: "Shots off target",
      home: homeOff,
      away: awayOff,
    });
  }

  return (
    <section
      aria-label="Match stats"
      className="space-y-3 rounded-lg bg-white p-4 dark:bg-gray-900"
    >
      <div
        role="tablist"
        className="mx-auto flex w-fit rounded-md bg-gray-100 p-0.5 dark:bg-gray-800"
      >
        {PERIODS.map(({ key, label }) => (
          <button
            key={key}
            role="tab"
            aria-selected={active === key}
            disabled={!available[key]}
            title={
              available[key] ? undefined : "Not available for this match yet"
            }
            onClick={() => setPeriod(key)}
            className={cn(
              "rounded px-3 py-1 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40",
              active === key
                ? "bg-white text-gray-900 shadow-sm dark:bg-gray-950 dark:text-white"
                : "cursor-pointer text-gray-600 dark:text-gray-400",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {rows.length ? (
        <>
          <div className="flex items-center justify-between pb-1">
            <TeamLogo team={match.homeTeam} />
            <TeamLogo team={match.awayTeam} />
          </div>
          {rows.map(({ key, label, home, away }) => (
            <StatBar
              key={key}
              label={label}
              homeValue={home ?? 0}
              awayValue={away ?? 0}
            />
          ))}
        </>
      ) : (
        <p className="text-center text-sm text-gray-500 dark:text-gray-400">
          No stats were recorded for this match.
        </p>
      )}
    </section>
  );
}
