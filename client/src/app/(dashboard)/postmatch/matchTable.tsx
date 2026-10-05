"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo } from "react";
import { useGetStandingsQuery } from "@/state/api";
import { matchStats, Standings } from "@/types/drizzleTypes";
import { cn, generateSeasons, getLogoFile, HEADER_CONFIG } from "@/lib/utils";
import { renderForm } from "@/lib/uiUtils";
import { matchColors } from "@/lib/array";

const TABLE_HEADERS = HEADER_CONFIG.filter((h) => h.key !== "expectedPosition");

const seasonFor = (matchDate: string) => {
  const d = new Date(matchDate);
  const startYear =
    d.getUTCMonth() >= 6 ? d.getUTCFullYear() : d.getUTCFullYear() - 1;
  return generateSeasons().find((s) => s.startsWith(String(startYear))) ?? null;
};

const teamHref = (team: string) => `/team/${team.split(" ").join("_")}`;

function Cell({ team, column }: { team: Standings; column: string }) {
  switch (column) {
    case "name":
      return (
        <Link
          href={teamHref(team.name)}
          className="flex min-w-max items-center gap-2 no-underline transition-opacity hover:opacity-70"
        >
          <Image
            src={`/${getLogoFile(team.name)}`}
            alt=""
            width={24}
            height={24}
            className="h-5 w-5 shrink-0 object-contain sm:h-6 sm:w-6"
          />
          <span className="whitespace-nowrap">{team.name}</span>
        </Link>
      );
    case "form":
      return (
        <span className="flex justify-center gap-[2px]">
          {renderForm(team.form)}
        </span>
      );
    case "goalDifference":
      return (
        <>
          {team.goalDifference > 0 ? "+" : ""}
          {team.goalDifference}
        </>
      );
    default:
      return <>{team[column as keyof Standings] ?? "–"}</>;
  }
}

export default function MatchTable({ match }: { match: matchStats }) {
  const season = match.matchDate ? seasonFor(match.matchDate) : null;
  const { data, isLoading, isError } = useGetStandingsQuery(
    { league: match.league, season: season ?? "" },
    { skip: !season },
  );

  const rows = useMemo(
    () =>
      (data ?? [])
        .filter((t) => t.type === "TOTAL")
        .sort((a, b) => a.position - b.position),
    [data],
  );
  const colors = matchColors(match.homeTeam, match.awayTeam);
  const rowColor = new Map([
    [match.homeTeam, colors.home],
    [match.awayTeam, colors.away],
  ]);

  if (!season)
    return (
      <p className="py-6 text-center text-sm text-gray-500 dark:text-gray-400">
        The season for this match couldn&apos;t be worked out.
      </p>
    );

  if (isLoading)
    return (
      <p className="py-6 text-center text-sm text-gray-500 dark:text-gray-400">
        Loading {season} table…
      </p>
    );

  if (isError || !rows.length)
    return (
      <p className="py-6 text-center text-sm text-gray-500 dark:text-gray-400">
        No table available for {match.league} {season}.
      </p>
    );

  return (
    <section
      aria-label={`${match.league} ${season} table`}
      className="space-y-3 rounded-lg bg-white px-4 pb-4 dark:bg-gray-900"
    >
      <div className="flex justify-center">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
          {match.league} {season}
        </h3>
      </div>

      <div className="w-full overflow-x-auto rounded-lg">
        <table className="w-full border-collapse text-[0.7rem] sm:text-xs md:text-sm">
          <thead className="bg-[#38003c] text-white dark:bg-gray-800">
            <tr>
              {TABLE_HEADERS.map(({ label, key }) => (
                <th
                  key={key}
                  className={cn(
                    "px-1.5 py-2 font-semibold",
                    key === "name"
                      ? "w-[1%] whitespace-nowrap pr-4 text-left"
                      : "text-center",
                  )}
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((team) => {
              const color = rowColor.get(team.name);
              return (
                <tr
                  key={team.name}
                  aria-current={color ? "true" : undefined}
                  className={cn(
                    "border-b border-gray-200 dark:border-gray-700",
                    color
                      ? "font-semibold text-gray-900 dark:text-white"
                      : "text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800",
                  )}
                  style={
                    color ? { backgroundColor: `${color.bg}46` } : undefined
                  }
                >
                  {TABLE_HEADERS.map(({ key }) => (
                    <td
                      key={key}
                      className={cn(
                        "px-1.5 py-1.5 tabular-nums",
                        key === "name"
                          ? "whitespace-nowrap pr-4 text-left"
                          : "text-center",
                      )}
                    >
                      <Cell team={team} column={key} />
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
