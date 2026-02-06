import { head2Head } from "../../drizzle/schema";
import { eq, and, or } from "drizzle-orm";
import { db } from "../lib/db";
import { upcomingMatches } from "../../drizzle/schema";

export const getH2HService = async (teamA: string, teamB: string) => {
  const [team1, team2] = [teamA, teamB].sort();
  return await db
    .select()
    .from(head2Head)
    .where(and(eq(head2Head.team1, team1), eq(head2Head.team2, team2)));
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
