import { matchStats } from "@/types/drizzleTypes";
import { statsKeys } from "@/lib/utils";
import { StatBar } from "@/lib/uiUtils";
import Image from "next/image";
import { getLogoFile } from "@/lib/utils";

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
  m: matchStats,
  side: "h" | "a",
  key: string,
): number | null => {
  const v = m[`${side}${key.slice(1)}` as keyof matchStats];
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

export default function Stats({ match }: { match: matchStats }) {
  const rows: Row[] = statsKeys
    .map(({ key, label }) => ({
      key,
      label,
      home: readStat(match, "h", key),
      away: readStat(match, "a", key),
    }))
    .filter(({ key, home, away }) => {
      if (home === null && away === null) return false;
      if (ZERO_MEANS_MISSING.has(key) && !home && !away) return false;
      return true;
    });

  // Shots off target, placed right after shots on target
  const homeOff = offTarget(match.hs, match.hst, match.hbs);
  const awayOff = offTarget(match.as, match.ast, match.abs);
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
