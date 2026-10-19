import Image from "next/image";
import Link from "next/link";
import { matchPreview } from "@/types/drizzleTypes";
import { cn, getLogoFile } from "@/lib/utils";
import { EventIcon } from "@/lib/uiUtils";

function TeamRow({
  team,
  score,
  reds,
  won,
  lost,
}: {
  team: string;
  score: number | null;
  reds: number | null;
  won: boolean;
  lost: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <Image
        src={`/${getLogoFile(team)}`}
        alt=""
        width={24}
        height={24}
        className="h-5 w-5 shrink-0 object-contain sm:h-6 sm:w-6"
      />
      <div className="flex min-w-0 flex-1 items-center gap-1.5">
        <span
          className={cn(
            "truncate text-sm",
            won
              ? "font-semibold text-gray-900 dark:text-white"
              : lost
                ? "text-gray-500 dark:text-gray-400"
                : "text-gray-800 dark:text-gray-200",
          )}
        >
          {team}
        </span>
        {!!reds && (
          <span
            className="flex shrink-0 items-center gap-0.5"
            title={`${reds} red card${reds > 1 ? "s" : ""}`}
          >
            <EventIcon kind="red" size={14} />
            {reds > 1 && (
              <span className="text-[10px] font-bold tabular-nums text-gray-600 dark:text-gray-300">
                ×{reds}
              </span>
            )}
          </span>
        )}
      </div>
      <span
        className={cn(
          "w-6 text-right text-lg font-bold tabular-nums",
          lost
            ? "text-gray-400 dark:text-gray-500"
            : "text-gray-900 dark:text-white",
        )}
      >
        {score ?? "–"}
      </span>
    </div>
  );
}

// sort matches by kickoff
const byKickoff = (a: matchPreview, b: matchPreview) => {
  if (!a.matchDate || !b.matchDate)
    return a.matchDate ? -1 : b.matchDate ? 1 : 0;
  return (
    a.matchDate.localeCompare(b.matchDate) ||
    a.homeTeam.localeCompare(b.homeTeam)
  );
};

export function PastMatchesList({ matches }: { matches: matchPreview[] }) {
  const ordered = [...matches].sort(byKickoff);

  return (
    <ul className="space-y-3">
      {ordered.map((m) => {
        const homeWon = m.fthg != null && m.ftag != null && m.fthg > m.ftag;
        const awayWon = m.fthg != null && m.ftag != null && m.ftag > m.fthg;

        return (
          <li key={m.id}>
            <Link
              href={`/postmatch/${m.id}`}
              className="flex items-center gap-3 rounded-md border-l-4 border-gray-300 bg-[#f8f8f8] p-3 no-underline transition-transform duration-200 ease-in-out hover:-translate-y-[2px] hover:shadow-lg dark:border-gray-500 dark:bg-gray-700"
            >
              <span className="shrink-0 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-600 dark:bg-gray-700 dark:text-white">
                FT
              </span>
              <span
                aria-hidden
                className="h-10 w-px shrink-0 bg-gray-300 dark:bg-gray-500"
              />
              <div className="min-w-0 flex-1 space-y-1.5">
                <TeamRow
                  team={m.homeTeam}
                  score={m.fthg}
                  reds={m.hr}
                  won={homeWon}
                  lost={awayWon}
                />
                <TeamRow
                  team={m.awayTeam}
                  score={m.ftag}
                  reds={m.ar}
                  won={awayWon}
                  lost={homeWon}
                />
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
