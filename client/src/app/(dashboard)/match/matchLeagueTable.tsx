"use client";

import Image from "next/image";
import { useState } from "react";
import LeagueTable from "@/components/leagueTable";
import { SegmentedTabs } from "@/components/segmentedTabs";
import { StandingType } from "@/lib/liveStandings";
import { generateSeasons, genCurrentSeason, getLeagueFile } from "@/lib/utils";

const TYPE_OPTIONS = [
  { key: "TOTAL", label: "Total" },
  { key: "HOME", label: "Home" },
  { key: "AWAY", label: "Away" },
] as const;

export default function MatchLeagueTable({
  league,
  homeTeam,
  awayTeam,
}: {
  league: string;
  homeTeam: string;
  awayTeam: string;
}) {
  const [season, setSeason] = useState(genCurrentSeason());
  const [type, setType] = useState<StandingType>("TOTAL");
  const seasons = generateSeasons();

  return (
    <section className="mx-auto w-full max-w-5xl px-4 pb-8 sm:px-6">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="relative size-8 shrink-0">
            <Image
              src={getLeagueFile(league)}
              alt=""
              fill
              className="object-contain"
            />
          </div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {league}
          </h2>
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <select
            aria-label="Season"
            value={season}
            onChange={(event) => setSeason(event.target.value)}
            className="cursor-pointer rounded bg-gray-100 px-2 py-1 text-xs font-medium text-gray-800 hover:bg-gray-200 sm:text-sm dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
          >
            {seasons.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          <SegmentedTabs
            ariaLabel="Table type"
            size="sm"
            className="mx-0"
            options={TYPE_OPTIONS}
            value={type}
            onChange={setType}
          />
        </div>
      </div>

      <LeagueTable
        league={league}
        season={season}
        type={type}
        highlight={[homeTeam, awayTeam]}
      />
    </section>
  );
}
