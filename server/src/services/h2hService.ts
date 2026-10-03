import { head2Head, MatchPreview, matchStats } from "../../drizzle/schema";
import { eq, and, or, desc, count } from "drizzle-orm";
import { db } from "../lib/db";
import { upcomingMatches } from "../../drizzle/schema";
import { MatchRow, PAGE_SIZE } from "./matchService";

export const getH2HService = async (teamA: string, teamB: string) => {
  const [team1, team2] = [teamA, teamB].sort();
  return await db
    .select()
    .from(head2Head)
    .where(and(eq(head2Head.team1, team1), eq(head2Head.team2, team2)));
};

export const get5H2HMatchesService = async (
  teamA: string,
  teamB: string,
  page = 0,
): Promise<{ matches: MatchPreview[] }> => {
  const [team1, team2] = [teamA, teamB].sort();
  const where = or(
    and(eq(matchStats.homeTeam, team1), eq(matchStats.awayTeam, team2)),
    and(eq(matchStats.homeTeam, team2), eq(matchStats.awayTeam, team1)),
  );
  const matches = await db
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
  return { matches };
};

export const getUpcomingH2HService = async (matchId: number) => {
  const [match] = await db
    .select()
    .from(upcomingMatches)
    .where(eq(upcomingMatches.id, matchId));
  if (!match) return null;
  const [team1, team2] = [match.homeTeam, match.awayTeam].sort();
  const [h2hRecord] = await db
    .select()
    .from(head2Head)
    .where(and(eq(head2Head.team1, team1), eq(head2Head.team2, team2)));

  return h2hRecord || null;
};
