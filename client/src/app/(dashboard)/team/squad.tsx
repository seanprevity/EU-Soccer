"use client";

import Image from "next/image";
import { useMemo } from "react";
import { useGetSquadQuery } from "@/state/api";
import { SquadPlayer } from "@/types/drizzleTypes";

const POSITION_ORDER = [
  "Coach",
  "Goalkeeper",
  "Defender",
  "Midfielder",
  "Forward",
];

type StatKey =
  | "appearances"
  | "goals"
  | "assists"
  | "saves"
  | "goalsConceded"
  | "yellowCards"
  | "redCards";
type StatColumn = { key: StatKey; label: string; title: string };

const OUTFIELD_STATS: StatColumn[] = [
  { key: "appearances", label: "Apps", title: "Appearances" },
  { key: "goals", label: "G", title: "Goals" },
  { key: "assists", label: "A", title: "Assists" },
  { key: "yellowCards", label: "YC", title: "Yellow cards" },
  { key: "redCards", label: "RC", title: "Red cards" },
];

const KEEPER_STATS: StatColumn[] = [
  { key: "appearances", label: "Apps", title: "Appearances" },
  { key: "saves", label: "SV", title: "Saves" },
  { key: "goalsConceded", label: "GA", title: "Goals conceded" },
  { key: "yellowCards", label: "YC", title: "Yellow cards" },
  { key: "redCards", label: "RC", title: "Red cards" },
];

// Age today from a "YYYY-MM-DD" date of birth
const ageFrom = (dob: string | null) => {
  if (!dob) return null;
  const [y, m, d] = dob.split("-").map(Number);
  const now = new Date();
  let age = now.getFullYear() - y;
  if (now.getMonth() + 1 < m || (now.getMonth() + 1 === m && now.getDate() < d))
    age--;
  return age;
};

const formatHeight = (inches: number | null) =>
  inches ? `${Math.floor(inches / 12)}′${inches % 12}″` : null;

const groupLabel = (position: string) =>
  position === "Coach" || !POSITION_ORDER.includes(position)
    ? position
    : `${position}s`;

// Same padding and border as a player row, so the stat labels line up with the numbers
function StatHeader({ stats }: { stats: StatColumn[] }) {
  return (
    <div className="flex items-center gap-2 border border-transparent px-3">
      <span className="flex-1" />
      <div className="flex shrink-0">
        {stats.map((s) => (
          <span
            key={s.key}
            title={s.title}
            className="w-9 text-center text-[10px] font-semibold uppercase tracking-wide text-gray-500 sm:w-11 dark:text-gray-400"
          >
            {s.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function PlayerRow({
  player: p,
  stats,
  isCoach,
}: {
  player: SquadPlayer;
  stats: StatColumn[];
  isCoach: boolean;
}) {
  const age = ageFrom(p.dateOfBirth);
  const details = [
    p.nationality,
    age != null && `${age} yrs`,
    formatHeight(p.heightIn),
    p.weightLbs != null && `${p.weightLbs} lbs`,
  ]
    .filter(Boolean)
    .join(" · ");
  const shirt = !isCoach && p.number != null ? `#${p.number}` : null;

  return (
    <li className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700">
      <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
        <Image
          src={p.imageUrl || "/placeholder-player.svg"}
          alt=""
          fill
          unoptimized
          className={
            p.imageUrl ? "scale-175 origin-top object-cover" : "object-cover"
          }
        />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-gray-900 dark:text-gray-100">
          {p.player}
        </p>
        {(shirt || details) && (
          <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
            {shirt && (
              <span className="shrink-0 font-bold tabular-nums text-gray-900 dark:text-white">
                {shirt}
              </span>
            )}
            {p.flagUrl && (
              <Image
                src={p.flagUrl}
                alt=""
                width={16}
                height={12}
                unoptimized
                className="h-3 w-4 shrink-0 rounded-[2px] object-cover"
              />
            )}
            {details && <span className="truncate">{details}</span>}
          </div>
        )}
      </div>

      {!isCoach && (
        <div className="flex shrink-0">
          {stats.map((s) => (
            <span
              key={s.key}
              title={
                s.key === "appearances" && p.subIns
                  ? `${p.appearances} appearances, ${p.subIns} as substitute`
                  : s.title
              }
              className="w-9 text-center text-sm tabular-nums text-gray-900 sm:w-11 dark:text-gray-100"
            >
              {p[s.key] ?? "–"}
            </span>
          ))}
        </div>
      )}
    </li>
  );
}

const Squad = ({ team }: { team: string }) => {
  const { data: squad, isLoading, isError } = useGetSquadQuery({ team });

  const grouped = useMemo(() => {
    if (!squad?.length) return [];
    const groups: Record<string, SquadPlayer[]> = {};
    for (const p of squad) (groups[p.position || "Unknown"] ??= []).push(p);

    // Known positions in order, then anything else ESPN sends, so no player is dropped
    const order = [
      ...POSITION_ORDER.filter((pos) => groups[pos]),
      ...Object.keys(groups).filter((pos) => !POSITION_ORDER.includes(pos)),
    ];
    return order.map((position) => ({
      position,
      players: [...groups[position]].sort(
        (a, b) =>
          (a.number ?? 999) - (b.number ?? 999) ||
          a.player.localeCompare(b.player),
      ),
    }));
  }, [squad]);

  const statsSeason = squad?.find((p) => p.statsSeason)?.statsSeason;

  if (isLoading) {
    return (
      <div className="flex min-h-[72.4vh] w-full items-center justify-center bg-background dark:bg-gray-900">
        <p className="text-sm text-muted-foreground dark:text-gray-400">
          Loading Squad...
        </p>
      </div>
    );
  }

  if (!squad?.length || isError) {
    return (
      <div className="flex min-h-[72.4vh] w-full items-center justify-center bg-background dark:bg-gray-900">
        <p className="px-4 text-center text-sm text-muted-foreground dark:text-gray-400">
          No squad available for this team. The team might not currently be in
          one of the top 5 leagues.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 bg-background p-4 dark:bg-gray-900">
      {statsSeason && (
        <p className="text-right text-xs text-gray-500 dark:text-gray-400">
          League stats, {statsSeason}/{(Number(statsSeason) + 1) % 100}
        </p>
      )}

      {grouped.map(({ position, players }) => {
        const isCoach = position === "Coach";
        const stats = position === "Goalkeeper" ? KEEPER_STATS : OUTFIELD_STATS;
        return (
          <section key={position} className="space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold tracking-tight dark:text-white">
                {groupLabel(position)}
              </h2>
              <span className="rounded-full bg-muted px-3 py-1 text-sm font-medium text-muted-foreground dark:bg-gray-700 dark:text-gray-300">
                {players.length}
              </span>
            </div>
            <div className="h-px bg-border dark:bg-gray-700" />

            {!isCoach && <StatHeader stats={stats} />}
            <ul className="space-y-1.5">
              {players.map((p) => (
                <PlayerRow
                  key={p.player}
                  player={p}
                  stats={stats}
                  isCoach={isCoach}
                />
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
};

export default Squad;
