import { cn } from "@/lib/utils";

// Relegation or European football, decided by place in the league table
export type Zone =
  | "championsLeague"
  | "championsLeagueQualifying"
  | "europaLeague"
  | "conferenceLeague"
  | "relegationPlayOff"
  | "relegation";

// Colour and description of each zone
export const ZONES: Record<Zone, { color: string; label: string }> = {
  championsLeague: {
    color: "bg-[#38003c] dark:bg-blue-600",
    label: "Champions League",
  },
  championsLeagueQualifying: {
    color: "bg-[#301934] dark:bg-purple-800",
    label: "Champions League qualifying",
  },
  europaLeague: { color: "bg-[#ff3333]", label: "Europa League" },
  conferenceLeague: {
    color: "bg-[#00A300]",
    label: "Conference League qualifying",
  },
  relegationPlayOff: { color: "bg-[#ADADAD]", label: "Relegation play-off" },
  relegation: { color: "bg-[#ff2882]", label: "Relegation" },
};

// index is the 0-based table position
export function zoneFor(
  index: number,
  teamCount: number,
  league: string,
): Zone | null {
  const thirdFromBottom = teamCount - 3;

  if (index <= 3 && (league !== "Ligue 1" || index !== 3))
    return "championsLeague";
  if (index === 3 && league === "Ligue 1") return "championsLeagueQualifying";
  if (index === 4) return "europaLeague";
  if (index === 5 && league !== "Premier League") return "conferenceLeague";
  if (index > thirdFromBottom) return "relegation";

  if (index === thirdFromBottom) {
    if (
      league === "Premier League" ||
      league === "Serie A" ||
      league === "La Liga"
    )
      return "relegation";
    if (league === "Ligue 1" || league === "Bundesliga")
      return "relegationPlayOff";
  }

  return null;
}

// The zones a table of this size uses, in table order
export function zonesInTable(teamCount: number, league: string): Zone[] {
  const found: Zone[] = [];
  for (let index = 0; index < teamCount; index++) {
    const zone = zoneFor(index, teamCount, league);
    if (zone && !found.includes(zone)) found.push(zone);
  }
  return found;
}

export function ZoneLegend({
  teamCount,
  league,
}: {
  teamCount: number;
  league: string;
}) {
  const zones = zonesInTable(teamCount, league);
  if (zones.length === 0) return null;

  return (
    <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-gray-600 dark:text-gray-300">
      {zones.map((zone) => (
        <li key={zone} className="flex items-center gap-1.5">
          <span
            aria-hidden
            className={cn("h-2 w-2 shrink-0 rounded-full", ZONES[zone].color)}
          />
          {ZONES[zone].label}
        </li>
      ))}
    </ul>
  );
}
