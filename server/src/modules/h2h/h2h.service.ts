import { head2Head, matchStats } from "../../../drizzle/schema";
import { eq, and, or, desc, inArray, getTableColumns } from "drizzle-orm";
import { db } from "../../lib/db";
import { upcomingMatches } from "../../../drizzle/schema";
import { PAGE_SIZE } from "../matches/matches.service";
import { H2H, MatchPreview } from "@epl/shared";
import { withDbSpan, withSpan } from "../../lib/span";

const pairOf = (teamA: string, teamB: string): [string, string] => {
  const [team1, team2] = [teamA, teamB].sort();
  return [team1!, team2!];
};

export const getH2HService = async (
  teamA: string,
  teamB: string,
): Promise<H2H | null> => {
  return await withSpan(
    "h2h.getH2H",
    { "h2h.team_a": teamA, "h2h.team_b": teamB },
    async (span) => {
      const [team1, team2] = pairOf(teamA, teamB);

      const rows = await withDbSpan("head2head", async (dbSpan) => {
        const result = await db
          .select()
          .from(head2Head)
          .where(and(eq(head2Head.team1, team1), eq(head2Head.team2, team2)))
          .limit(1);
        dbSpan.setAttribute("db.response.returned_rows", result.length);
        return result;
      });

      const row = rows[0];
      span.setAttribute("h2h.found", row !== undefined);

      return row ?? null;
    },
  );
};

export const get5H2HMatchesService = async (
  teamA: string,
  teamB: string,
  page = 0,
): Promise<MatchPreview[]> => {
  return await withSpan(
    "h2h.get5H2HMatches",
    { "h2h.team_a": teamA, "h2h.team_b": teamB, "h2h.page": page },
    async () => {
      const [team1, team2] = pairOf(teamA, teamB);
      const where = or(
        and(eq(matchStats.homeTeam, team1), eq(matchStats.awayTeam, team2)),
        and(eq(matchStats.homeTeam, team2), eq(matchStats.awayTeam, team1)),
      );

      return await withDbSpan("matchStats", async (dbSpan) => {
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
        dbSpan.setAttribute("db.response.returned_rows", matches.length);
        return matches;
      });
    },
  );
};

export const getUpcomingH2HService = async (
  matchIds: number[],
): Promise<H2H[]> => {
  return await withSpan(
    "h2h.getUpcomingH2H",
    { "h2h.match_count": matchIds.length },
    async (span) => {
      const rows = await withDbSpan("upcomingMatches", async (dbSpan) => {
        const result = await db
          .select({
            matchId: upcomingMatches.id,
            h2h: getTableColumns(head2Head),
          })
          .from(upcomingMatches)
          .innerJoin(
            head2Head,
            or(
              and(
                eq(head2Head.team1, upcomingMatches.homeTeam),
                eq(head2Head.team2, upcomingMatches.awayTeam),
              ),
              and(
                eq(head2Head.team1, upcomingMatches.awayTeam),
                eq(head2Head.team2, upcomingMatches.homeTeam),
              ),
            ),
          )
          .where(inArray(upcomingMatches.id, matchIds));
        dbSpan.setAttribute("db.response.returned_rows", result.length);
        return result;
      });

      // Put the results back in the order the ids were asked for
      const recordByMatchId = new Map(
        rows.map((row) => [row.matchId, row.h2h]),
      );
      const result = matchIds.flatMap((id) => {
        const record = recordByMatchId.get(id);
        return record ? [record] : [];
      });

      span.setAttribute("h2h.records_found", result.length);
      return result;
    },
  );
};
