import { matchStats } from "@/types/drizzleTypes";
import { MatchTimeline } from "@/lib/uiUtils";

type KeyStat = {
  label: string;
  home: number;
  away: number;
  format: (v: number) => string;
};

function LeaderTriangle() {
  return (
    <svg
      viewBox="0 0 10 8"
      width={8}
      height={7}
      aria-hidden="true"
      className="shrink-0"
    >
      <path d="M5 0 10 8H0Z" fill="#16a34a" />
    </svg>
  );
}

function KeyStatItem({
  stat,
  homeName,
  awayName,
}: {
  stat: KeyStat;
  homeName: string;
  awayName: string;
}) {
  const { label, home, away, format } = stat;
  const total = home + away;
  const homeShare = total ? (home / total) * 100 : 50;
  const leader = home > away ? homeName : away > home ? awayName : null;

  return (
    <div className="min-w-0 flex-1 space-y-1.5">
      <p className="text-center text-xs text-gray-500 dark:text-gray-300">
        {label}
      </p>
      <div className="flex h-4 items-center gap-1 text-xs font-medium text-gray-900 dark:text-white">
        {leader && (
          <>
            <span className="truncate">{leader}</span>
            <LeaderTriangle />
            <span className="sr-only">leads</span>
          </>
        )}
      </div>
      <div className="flex items-baseline justify-between text-sm font-semibold tabular-nums">
        <span
          className={
            home > away
              ? "text-green-600 dark:text-green-400"
              : "text-gray-500 dark:text-gray-400"
          }
        >
          {format(home)}
        </span>
        <span
          className={
            away > home
              ? "text-green-600 dark:text-green-400"
              : "text-gray-500 dark:text-gray-400"
          }
        >
          {format(away)}
        </span>
      </div>
      <div className="flex h-1.5 gap-0.5 overflow-hidden rounded-full">
        <div
          className={homeShare > 50 ? "bg-green-400" : "bg-gray-500"}
          style={{ width: `${homeShare}%` }}
        />
        <div
          className={
            homeShare >= 50 ? "flex-1 bg-gray-500" : "flex-1 bg-green-400"
          }
        />
      </div>
    </div>
  );
}

function KeyStatistics({
  match,
  onShowStats,
}: {
  match: matchStats;
  onShowStats: () => void;
}) {
  const homeName = match.homeTeam;
  const awayName = match.awayTeam;

  const candidates: (KeyStat | null)[] = [
    match.hposs != null && match.aposs != null
      ? {
          label: "Possession",
          home: match.hposs,
          away: match.aposs,
          format: (v) => `${v}%`,
        }
      : null,
    match.hst != null && match.ast != null
      ? {
          label: "Shots on target",
          home: match.hst,
          away: match.ast,
          format: String,
        }
      : null,
    match.hc != null && match.ac != null
      ? { label: "Corners", home: match.hc, away: match.ac, format: String }
      : null,
  ];
  const stats = candidates.filter((s): s is KeyStat => s !== null);
  if (!stats.length) return null;

  return (
    <button
      type="button"
      onClick={onShowStats}
      className="block w-full rounded-lg bg-white p-4 text-left transition-colors hover:bg-gray-50 hover:cursor-pointer focus-visible:outline focus-visible:outline-sky-500 dark:bg-gray-800 dark:hover:bg-gray-700"
    >
      <div className="mb-3 flex items-baseline justify-between">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
          Key statistics
        </h3>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          See all stats
        </span>
      </div>
      <div className="flex gap-6">
        {stats.map((s) => (
          <KeyStatItem
            key={s.label}
            stat={s}
            homeName={homeName}
            awayName={awayName}
          />
        ))}
      </div>
    </button>
  );
}

export default function Timeline({
  match,
  onShowStats,
}: {
  match: matchStats;
  onShowStats: () => void;
}) {
  return (
    <div className="space-y-4">
      <section
        aria-label="Timeline"
        className="rounded-lg bg-white p-4 dark:bg-gray-900"
      >
        <MatchTimeline events={match.events} />
      </section>
      <KeyStatistics match={match} onShowStats={onShowStats} />
    </div>
  );
}
