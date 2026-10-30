import { curSeason } from "../../config/map";
import { importEspnMatchesService } from "./management.espnService";

// One past season for one league, using the normal ESPN import.
// refresh: overwrite matches that are already complete with ESPN's values.
export async function backfillEspnSeason(
  league: string,
  espnLeague: string,
  seasonsAgo = 1,
  refresh = false,
) {
  const seasonStartYear = Number(curSeason) - seasonsAgo;
  // Seasons run from 1 August to the following 1 August (month 7 is August in JavaScript)
  const seasonStart = new Date(Date.UTC(seasonStartYear, 7, 1));
  const seasonEnd = new Date(Date.UTC(seasonStartYear + 1, 7, 1));

  return importEspnMatchesService(league, espnLeague, seasonStart, {
    refresh,
    to: seasonEnd,
  });
}
