import { useMemo } from "react";
import { LEAGUES, isPastMatch } from "@/lib/utils";
import { MatchBase } from "@/types/drizzleTypes";

type Params<T extends MatchBase> = {
  matches?: T[];
  selectedDateISO: string;
};

export function useMatchesByDate<T extends MatchBase>({
  matches,
  selectedDateISO,
}: Params<T>) {
  const selectedUTC = useMemo(() => {
    const d = new Date(selectedDateISO);
    return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  }, [selectedDateISO]);

  const filteredMatches = useMemo(() => {
    if (!matches) return [];

    return matches.filter((m) => {
      if (!m.matchDate) return false;

      const date = new Date(m.matchDate);
      const matchUTC = Date.UTC(
        date.getUTCFullYear(),
        date.getUTCMonth(),
        date.getUTCDate(),
      );

      return matchUTC === selectedUTC;
    });
  }, [matches, selectedUTC]);

  const matchesByLeague = useMemo(() => {
    const grouped: Record<string, T[]> = {};
    for (const league of LEAGUES) grouped[league] = [];

    for (const match of filteredMatches) {
      grouped[match.league]?.push(match);
    }

    return grouped;
  }, [filteredMatches]);

  const isPastDay = useMemo(() => {
    return isPastMatch(selectedDateISO);
  }, [selectedDateISO]);

  return {
    filteredMatches,
    matchesByLeague,
    isPastDay,
  };
}
