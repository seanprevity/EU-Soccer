import Image from "next/image";
import Link from "next/link";
import { cn, getLogoFile, getResultColors } from "@/lib/utils";
import { EventIcon } from "@/lib/uiUtils";
import { MatchPreview } from "@epl/shared";

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
const byKickoff = (a: MatchPreview, b: MatchPreview) => {
  if (!a.matchDate || !b.matchDate)
    return a.matchDate ? -1 : b.matchDate ? 1 : 0;
  return (
    a.matchDate.localeCompare(b.matchDate) ||
    a.homeTeam.localeCompare(b.homeTeam)
  );
};

export function PastMatchesList({ matches }: { matches: MatchPreview[] }) {
  const ordered = [...matches].sort(byKickoff);

  // Neutral grey for every finished match: this list isn't from one team's side
  const colors = getResultColors("draw");

  return (
    <ul className="space-y-3">
      {ordered.map((m) => {
        const homeWon = m.fthg != null && m.ftag != null && m.fthg > m.ftag;
        const awayWon = m.fthg != null && m.ftag != null && m.ftag > m.fthg;

        return (
          <li key={m.id}>
            <Link
              href={`/postmatch/${m.id}`}
              className={cn(
                "relative flex items-center gap-3 overflow-hidden rounded-md bg-[#f8f8f8] p-3 no-underline transition-transform duration-200 ease-in-out hover:-translate-y-[2px] hover:shadow-lg dark:bg-gray-700/50",
                colors.gradient,
              )}
            >
              {/* The bar on the left edge, like the live and history cards */}
              <div
                className={cn(
                  "absolute left-0 top-1/2 z-10 h-[55%] w-3 -translate-x-1/2 -translate-y-1/2 rounded-r-md",
                  colors.rectangle,
                )}
              />

              <span className="shrink-0 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-600 dark:text-white">
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
