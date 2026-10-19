import { head2Head, matchStats } from "../../../drizzle/schema";
import { eq, and, or, desc, inArray } from "drizzle-orm";
import { db } from "../../lib/db";
import { upcomingMatches } from "../../../drizzle/schema";
import { PAGE_SIZE } from "../matches/matches.service";
import { H2H, MatchPreview } from "@epl/shared";

const pairOf = (teamA: string, teamB: string): [string, string] => {
  const [team1, team2] = [teamA, teamB].sort();
  return [team1!, team2!];
};

export const getH2HService = async (
  teamA: string,
  teamB: string,
): Promise<H2H | null> => {
  const [team1, team2] = pairOf(teamA, teamB);
  const [row] = await db
    .select()
    .from(head2Head)
    .where(and(eq(head2Head.team1, team1), eq(head2Head.team2, team2)))
    .limit(1);
  return row ?? null;
};

export const get5H2HMatchesService = async (
  teamA: string,
  teamB: string,
  page = 0,
): Promise<MatchPreview[]> => {
  const [team1, team2] = pairOf(teamA, teamB);
  const where = or(
    and(eq(matchStats.homeTeam, team1), eq(matchStats.awayTeam, team2)),
    and(eq(matchStats.homeTeam, team2), eq(matchStats.awayTeam, team1)),
  );
  return await db
    .select({
      id: matchStats.id,
      espnId: matchStats.espnId,
      homeTeam: matchStats.homeTeam,
      awayTeam: matchStats.awayTeam,
      league: matchStats.league,
      matchDate: matchStats.matchDate,
      ftr: matchStats.ftr,
      fthg: matchStats.fthg,
      ftag: matchStats.ftag,
      hr: matchStats.hr,
      ar: matchStats.ar,
    })
    .from(matchStats)
    .where(where)
    .orderBy(desc(matchStats.matchDate))
    .limit(PAGE_SIZE)
    .offset(page * PAGE_SIZE);
};

export const getUpcomingH2HService = async (
  matchIds: number[],
): Promise<H2H[]> => {
  const matches = await db
    .select({
      id: upcomingMatches.id,
      homeTeam: upcomingMatches.homeTeam,
      awayTeam: upcomingMatches.awayTeam,
    })
    .from(upcomingMatches)
    .where(inArray(upcomingMatches.id, matchIds));
  if (matches.length === 0) return [];

  const pairs = matches.map((m) => pairOf(m.homeTeam, m.awayTeam));
  const records = await db
    .select()
    .from(head2Head)
    .where(
      or(
        ...pairs.map(([team1, team2]) =>
          and(eq(head2Head.team1, team1), eq(head2Head.team2, team2)),
        ),
      ),
    );

  // Put the results back in the order the ids were asked for
  const recordByPair = new Map(
    records.map((r) => [`${r.team1}|${r.team2}`, r]),
  );
  const pairByMatchId = new Map(
    matches.map((m) => [m.id, pairOf(m.homeTeam, m.awayTeam).join("|")]),
  );
  return matchIds.flatMap((id) => {
    const record = recordByPair.get(pairByMatchId.get(id) ?? "");
    return record ? [record] : [];
  });
};
