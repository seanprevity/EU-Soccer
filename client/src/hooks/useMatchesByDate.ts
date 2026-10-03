import { useMemo } from "react";
import { LEAGUES } from "@/lib/utils";

type Dated = { matchDate: string | null; league: string | null };

// Matches on the selected calendar day (in the user's time zone), grouped by league
export function useMatchesByDate<T extends Dated>(
  matches: T[] | undefined,
  selectedDate: string,
) {
  return useMemo(() => {
    const day = new Date(selectedDate).toDateString();
    const byLeague: Record<string, T[]> = Object.fromEntries(
      LEAGUES.map((league) => [league, []]),
    );
    let count = 0;

    for (const m of matches ?? []) {
      if (!m.matchDate || new Date(m.matchDate).toDateString() !== day)
        continue;
      const list = byLeague[m.league ?? ""];
      if (!list) continue;
      list.push(m);
      count++;
    }

    return { byLeague, count };
  }, [matches, selectedDate]);
}
