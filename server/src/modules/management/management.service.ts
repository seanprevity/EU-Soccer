import {
  standings,
  matchStats,
  upcomingMatches,
  teams,
  head2Head,
  players,
  odds,
  squad,
  topPlayers,
} from "../../../drizzle/schema";
import {
  and,
  eq,
  lt,
  or,
  desc,
  gt,
  sql,
  isNull,
  ne,
  notInArray,
  inArray,
} from "drizzle-orm";
import { db } from "../../lib/db";
import axios from "axios";
import {
  toInt,
  map_team,
  map_team_name,
  ODDS_MAP,
  curSeason,
  espnTeam,
} from "../../config/map";
import { StandingsStats, bookmakers } from "../../config/arrays";
import { updatePlayerImagesService } from "./management.imageService";
import { ESPN_DELAY_MS, sleep } from "./management.espnService";
import { env } from "../../config/env";
import { TOP_PLAYER_CATEGORIES, TopPlayerCategory } from "@epl/shared";
import { withDbSpan, withSpan } from "../../lib/span";
import { AnyPgColumn } from "drizzle-orm/pg-core";

const football_api_key = env.FOOTBALL_DATA_API_KEY;
const odds_api_key = env.ODDS_API_KEY;
const football_url = "https://api.football-data.org/v4";
const headers = { "X-Auth-Token": football_api_key };
const espn = axios.create({
  baseURL: "https://site.web.api.espn.com/apis/site/v2/sports/soccer",
  validateStatus: (s) => s < 500,
});
const TOP_N = 10;

// The value from the row being inserted, for ON CONFLICT DO UPDATE (quotes camelCase names)
const fromExcluded = (column: AnyPgColumn) =>
  sql`excluded.${sql.identifier(column.name)}`;
// keeps the stored value when the new one is null
const fromExcludedOrKeep = (column: AnyPgColumn) =>
  sql`coalesce(excluded.${sql.identifier(column.name)}, ${column})`;

// NOTE: RUN UPDATEMATCHSERVICE FIRST THEN UPDATESTANDINGSSERVICE

// adds next 10 days of upcoming matches to table
export const updateFutureMatchesService = async (
  competition: string,
  league: string,
) => {
  return await withSpan(
    "management.updateFutureMatches",
    { "management.competition": competition, "management.league": league },
    async (span) => {
      try {
        const today = new Date();
        const dateTo = new Date();
        dateTo.setDate(today.getDate() + 10);
        const dateFromStr = today.toISOString().split("T")[0];
        const dateToStr = dateTo.toISOString().split("T")[0];
        span.setAttributes({
          "management.date_from": dateFromStr,
          "management.date_to": dateToStr,
        });

        const url = `${football_url}/competitions/${competition}/matches`;
        const res = await axios.get(url, {
          headers,
          params: {
            status: "SCHEDULED",
            dateFrom: dateFromStr,
            dateTo: dateToStr,
          },
        });
        const data = res.data;

        await withDbSpan(
          "upcomingMatches",
          async () => {
            await db
              .delete(upcomingMatches)
              .where(lt(upcomingMatches.matchDate, new Date().toISOString()));
          },
          "DELETE",
        );

        const listed = new Set<string>();
        let unmapped = 0;
        // Insert upcoming matches
        for (const match of data["matches"]) {
          const home = map_team(match["homeTeam"]["shortName"]);
          const away = map_team(match["awayTeam"]["shortName"]);
          const date = new Date(match["utcDate"]);
          if (!home || !away || !date) {
            unmapped++;
            continue;
          }
          listed.add(`${home}|${away}`);
          await withDbSpan(
            "upcomingMatches",
            async () => {
              await db
                .insert(upcomingMatches)
                .values({
                  homeTeam: home,
                  awayTeam: away,
                  matchDate: date.toISOString(),
                  league: league,
                })
                .onConflictDoUpdate({
                  target: [upcomingMatches.homeTeam, upcomingMatches.awayTeam],
                  set: { matchDate: date.toISOString() },
                });
            },
            "INSERT",
          );
          await updateH2HService(home, away);
        }

        let staleRemoved = 0;
        if (listed.size > 0) {
          const stored = await withDbSpan("upcomingMatches", async (dbSpan) => {
            const result = await db
              .select({
                id: upcomingMatches.id,
                homeTeam: upcomingMatches.homeTeam,
                awayTeam: upcomingMatches.awayTeam,
              })
              .from(upcomingMatches)
              .where(eq(upcomingMatches.league, league));
            dbSpan.setAttribute("db.response.returned_rows", result.length);
            return result;
          });

          const staleIds: number[] = [];
          for (const row of stored) {
            if (!listed.has(`${row.homeTeam}|${row.awayTeam}`))
              staleIds.push(row.id);
          }
          if (staleIds.length > 0) {
            await withDbSpan(
              "upcomingMatches",
              async () => {
                await db
                  .delete(upcomingMatches)
                  .where(inArray(upcomingMatches.id, staleIds));
              },
              "DELETE",
            );
            staleRemoved = staleIds.length;
            console.log(
              `[upcoming] removed ${staleIds.length} fixtures no longer listed for ${league}`,
            );
          }
        }

        span.setAttribute("management.fixtures", data["matches"].length);
        span.setAttribute("management.fixtures_unmapped", unmapped);
        span.setAttribute("management.stale_removed", staleRemoved);

        return { success: true, count: data["matches"].length };
      } catch (err: any) {
        console.error("Match API error:", err.message);
        throw new Error(err.message);
      }
    },
  );
};

// I want 10 future days available on the home page - update H2H for those matches as they come in
export const updateH2HService = async (teamA: string, teamB: string) => {
  return await withSpan(
    "management.updateH2H",
    { "management.team_a": teamA, "management.team_b": teamB },
    async (span) => {
      try {
        // normalizes teams so they will be in lexicographical order, not home vs away order
        const [team1, team2] = [teamA, teamB].sort();
        // Get all previous matches between team1 and team2 (both home/away swapped)
        const h2hMatches = await withDbSpan("matchStats", async (dbSpan) => {
          const result = await db
            .select({
              id: matchStats.id,
              HomeTeam: matchStats.homeTeam,
              AwayTeam: matchStats.awayTeam,
              FTHG: matchStats.fthg,
              FTAG: matchStats.ftag,
              MatchDate: matchStats.matchDate,
            })
            .from(matchStats)
            .where(
              or(
                and(
                  eq(matchStats.homeTeam, team1),
                  eq(matchStats.awayTeam, team2),
                ),
                and(
                  eq(matchStats.homeTeam, team2),
                  eq(matchStats.awayTeam, team1),
                ),
              ),
            )
            .orderBy(desc(matchStats.matchDate));
          dbSpan.setAttribute("db.response.returned_rows", result.length);
          return result;
        });
        span.setAttribute("management.h2h_matches", h2hMatches.length);

        if (h2hMatches.length === 0) {
          console.log(`No H2H matches found between ${team1} and ${team2}`);
          await withDbSpan(
            "head2head",
            async () => {
              await db
                .insert(head2Head)
                .values({
                  team1: team1,
                  team2: team2,
                  mp: 0,
                  team1Wins: 0,
                  team2Wins: 0,
                  draws: 0,
                  last5: [],
                })
                .onConflictDoNothing();
            },
            "INSERT",
          );
          return;
        }
        // console.log(h2hMatches);
        let team1Wins = 0;
        let team2Wins = 0;
        let draws = 0;

        // Go through each match and count results
        for (const match of h2hMatches) {
          const { HomeTeam, AwayTeam, FTHG, FTAG } = match;
          if (FTHG === null || FTAG === null) continue;
          if (FTHG === FTAG) {
            draws++;
          } else if (
            (HomeTeam === team1 && FTHG > FTAG) ||
            (AwayTeam === team1 && FTAG > FTHG)
          ) {
            team1Wins++;
          } else {
            team2Wins++;
          }
        }

        // Prepare H2H summary
        const matchesPlayed = h2hMatches.length;
        const last5 = h2hMatches.slice(0, 5).map((m) => m.id); // last 5 match IDs

        // Upsert
        await withDbSpan(
          "head2head",
          async () => {
            await db
              .insert(head2Head)
              .values({
                team1: team1,
                team2: team2,
                mp: matchesPlayed,
                team1Wins: team1Wins,
                team2Wins: team2Wins,
                draws: draws,
                last5: last5,
              })
              .onConflictDoUpdate({
                target: [head2Head.team1, head2Head.team2],
                set: {
                  mp: matchesPlayed,
                  team1Wins: team1Wins,
                  team2Wins: team2Wins,
                  draws: draws,
                  last5: last5,
                },
              });
          },
          "INSERT",
        );
        console.log(`Updated H2H for ${team1} vs ${team2}`);
        return { success: true };
      } catch (err) {
        console.error("Error updating H2H:", err);
        throw err;
      }
    },
  );
};

// updates standings for a league/season, gives home standings, away standings, total standings
export const updateStandingsService = async (
  league: string,
  season: string,
) => {
  const startDate = new Date(Date.UTC(Number(season), 7, 1)); // aug 1
  const endDate = new Date(Date.UTC(Number(season) + 1, 6, 1)); // july 1

  return await withSpan(
    "management.updateStandings",
    {
      "management.league": league,
      "management.season": season,
      "management.season_start": startDate.toISOString(),
      "management.season_end": endDate.toISOString(),
    },
    async (span) => {
      // Fetch all matches for this league + season
      const seasonMatches = await withDbSpan("matchStats", async (dbSpan) => {
        const result = await db
          .select({
            homeTeam: matchStats.homeTeam,
            awayTeam: matchStats.awayTeam,
            fthg: matchStats.fthg,
            ftag: matchStats.ftag,
            matchDate: matchStats.matchDate,
          })
          .from(matchStats)
          .where(
            and(
              eq(matchStats.league, league),
              gt(matchStats.matchDate, startDate.toISOString()),
              lt(matchStats.matchDate, endDate.toISOString()),
            ),
          );
        dbSpan.setAttribute("db.response.returned_rows", result.length);
        return result;
      });

      // Initialize table per team
      const table: Record<
        string, // team name
        {
          HOME: StandingsStats;
          AWAY: StandingsStats;
          TOTAL: StandingsStats;
        }
      > = {};

      for (const match of seasonMatches) {
        for (const team of [match.homeTeam, match.awayTeam]) {
          if (!table[team]) {
            table[team] = {
              HOME: {
                played: 0,
                won: 0,
                draw: 0,
                lost: 0,
                goalsFor: 0,
                goalsAgainst: 0,
                points: 0,
              },
              AWAY: {
                played: 0,
                won: 0,
                draw: 0,
                lost: 0,
                goalsFor: 0,
                goalsAgainst: 0,
                points: 0,
              },
              TOTAL: {
                played: 0,
                won: 0,
                draw: 0,
                lost: 0,
                goalsFor: 0,
                goalsAgainst: 0,
                points: 0,
              },
            };
          }
        }
      }

      // Compute stats
      for (const match of seasonMatches) {
        const home = table[match.homeTeam];
        const away = table[match.awayTeam];

        // Update HOME stats
        home.HOME.played += 1;
        home.HOME.goalsFor += match.fthg ?? 0;
        home.HOME.goalsAgainst += match.ftag ?? 0;

        // Update AWAY stats
        away.AWAY.played += 1;
        away.AWAY.goalsFor += match.ftag ?? 0;
        away.AWAY.goalsAgainst += match.fthg ?? 0;

        // Update TOTAL stats
        home.TOTAL.played += 1;
        home.TOTAL.goalsFor += match.fthg ?? 0;
        home.TOTAL.goalsAgainst += match.ftag ?? 0;

        away.TOTAL.played += 1;
        away.TOTAL.goalsFor += match.ftag ?? 0;
        away.TOTAL.goalsAgainst += match.fthg ?? 0;

        // Determine result
        if ((match.fthg ?? 0) > (match.ftag ?? 0)) {
          home.HOME.won += 1;
          home.HOME.points += 3;
          away.AWAY.lost += 1;

          home.TOTAL.won += 1;
          home.TOTAL.points += 3;
          away.TOTAL.lost += 1;
        } else if ((match.fthg ?? 0) < (match.ftag ?? 0)) {
          away.AWAY.won += 1;
          away.AWAY.points += 3;
          home.HOME.lost += 1;

          away.TOTAL.won += 1;
          away.TOTAL.points += 3;
          home.TOTAL.lost += 1;
        } else {
          home.HOME.draw += 1;
          away.AWAY.draw += 1;
          home.HOME.points += 1;
          away.AWAY.points += 1;

          home.TOTAL.draw += 1;
          away.TOTAL.draw += 1;
          home.TOTAL.points += 1;
          away.TOTAL.points += 1;
        }
      }

      // Newest first, for recent form (ISO dates sort correctly as text)
      const newestFirst = [...seasonMatches].sort((a, b) =>
        (b.matchDate ?? "").localeCompare(a.matchDate ?? ""),
      );

      // One row per team and type, with its position and recent form
      const rows: (typeof standings.$inferInsert)[] = [];
      for (const type of ["HOME", "AWAY", "TOTAL"] as const) {
        // Sort by points, then goal difference, then goals for (same order as before)
        const teamsInOrder = Object.keys(table).sort((teamA, teamB) => {
          const a = table[teamA][type];
          const b = table[teamB][type];
          if (b.points !== a.points) return b.points - a.points;
          const differenceA = a.goalsFor - a.goalsAgainst;
          const differenceB = b.goalsFor - b.goalsAgainst;
          if (differenceB !== differenceA) return differenceB - differenceA;
          if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
          // Level on everything -> sort lexicographically for deterministic return
          return teamA.localeCompare(teamB);
        });

        teamsInOrder.forEach((team, index) => {
          const row = table[team][type];

          // The team's last 5 matches of this type, newest first
          const games: typeof seasonMatches = [];
          for (const match of newestFirst) {
            if (games.length === 5) break;
            const isHome = match.homeTeam === team;
            const isAway = match.awayTeam === team;
            if (type === "HOME" && !isHome) continue;
            if (type === "AWAY" && !isAway) continue;
            if (type === "TOTAL" && !isHome && !isAway) continue;
            games.push(match);
          }

          // Recent goals and form, same rules as before
          let gf = 0;
          let ga = 0;
          let form = "";
          for (const m of games) {
            if (m.fthg == null || m.ftag == null) continue;
            const isHome = m.homeTeam === team;
            gf += isHome ? m.fthg : m.ftag;
            ga += isHome ? m.ftag : m.fthg;
            if (m.fthg === m.ftag) form += "D";
            else if (
              (isHome && m.fthg > m.ftag) ||
              (!isHome && m.ftag > m.fthg)
            )
              form += "W";
            else form += "L";
          }
          // No matches of this type: null, so the upsert keeps what's stored (as before)
          const hasGames = games.length > 0;

          rows.push({
            name: team,
            league: league,
            season: season,
            type: type,
            position: index + 1,
            played: row.played,
            won: row.won,
            draw: row.draw,
            lost: row.lost,
            goalsFor: row.goalsFor,
            goalsAgainst: row.goalsAgainst,
            goalDifference: row.goalsFor - row.goalsAgainst,
            points: row.points,
            form: hasGames ? form.split("").reverse().join("") : null,
            recentGf: hasGames ? gf : null,
            recentGa: hasGames ? ga : null,
          });
        });
      }

      span.setAttribute("management.matches", seasonMatches.length);
      span.setAttribute("management.teams", Object.keys(table).length);
      span.setAttribute("management.rows", rows.length);

      // No matches yet this season: nothing to save (an empty insert is an error)
      if (rows.length === 0) return { success: true };

      // Every row in one statement
      await withDbSpan(
        "standings",
        async () => {
          await db
            .insert(standings)
            .values(rows)
            .onConflictDoUpdate({
              target: [standings.name, standings.season, standings.type],
              set: {
                position: fromExcluded(standings.position),
                played: fromExcluded(standings.played),
                won: fromExcluded(standings.won),
                draw: fromExcluded(standings.draw),
                lost: fromExcluded(standings.lost),
                goalsFor: fromExcluded(standings.goalsFor),
                goalsAgainst: fromExcluded(standings.goalsAgainst),
                goalDifference: fromExcluded(standings.goalDifference),
                points: fromExcluded(standings.points),
                form: fromExcludedOrKeep(standings.form),
                recentGf: fromExcludedOrKeep(standings.recentGf),
                recentGa: fromExcludedOrKeep(standings.recentGa),
              },
            });
        },
        "INSERT",
      );

      return { success: true };
    },
  );
};

// Current-season leaderboards for one league, built from the squad table.
// called after leagueSquadService finishes
export const updateTopPlayersService = async (league: string) => {
  return await withSpan(
    "management.updateTopPlayers",
    { "management.league": league, "management.season": curSeason },
    async (span) => {
      const rows = await withDbSpan("squad", async (dbSpan) => {
        const result = await db
          .select({
            player: squad.player,
            team: squad.team,
            appearances: squad.appearances,
            goals: squad.goals,
            assists: squad.assists,
            saves: squad.saves,
            yellowCards: squad.yellowCards,
            redCards: squad.redCards,
          })
          .from(squad)
          .where(
            and(eq(squad.league, league), eq(squad.statsSeason, curSeason)),
          );
        dbSpan.setAttribute("db.response.returned_rows", result.length);
        return result;
      });

      // No current-season squad data means the sync hasn't run or failed: keep what's stored
      if (!rows.length) {
        console.warn(
          `Top players: no ${curSeason} squad stats for ${league}, left unchanged`,
        );
        span.setAttribute("management.entries", 0);
        return { league, season: curSeason, rows: 0 };
      }

      const entries: (typeof topPlayers.$inferInsert)[] = [];

      for (const [category, column] of Object.entries(
        TOP_PLAYER_CATEGORIES,
      ) as [
        TopPlayerCategory,
        (typeof TOP_PLAYER_CATEGORIES)[TopPlayerCategory],
      ][]) {
        // A player listed at two clubs in the same league keeps his higher figure
        const best = new Map<string, (typeof rows)[number]>();
        for (const r of rows) {
          if (!r.player || !r.team || !r[column]) continue; // skips null and 0
          const prev = best.get(r.player);
          if (!prev || r[column]! > prev[column]!) best.set(r.player, r);
        }

        const ranked = [...best.values()].sort(
          (a, b) => b[column]! - a[column]!,
        );
        // Top 10, plus anyone tied with 10th place
        const cutoff = ranked[TOP_N - 1]?.[column];
        const top =
          cutoff == null ? ranked : ranked.filter((r) => r[column]! >= cutoff);

        for (const r of top)
          entries.push({
            player: r.player!,
            team: r.team!,
            league,
            season: curSeason,
            category,
            value: r[column]!,
            appearances: r.appearances,
          });
      }

      await db.transaction(async (tx) => {
        await withDbSpan(
          "topPlayers",
          async () => {
            await tx
              .delete(topPlayers)
              .where(
                and(
                  eq(topPlayers.league, league),
                  eq(topPlayers.season, curSeason),
                ),
              );
          },
          "DELETE",
        );
        if (entries.length) {
          await withDbSpan(
            "topPlayers",
            async () => {
              await tx.insert(topPlayers).values(entries);
            },
            "INSERT",
          );
        }
      });

      span.setAttribute("management.entries", entries.length);
      console.log(
        `Top players: ${entries.length} rows for ${league} ${curSeason}`,
      );
      return { league, season: curSeason, rows: entries.length };
    },
  );
};

// Service to fetch and store odds
export const updateOddsService = async (sport: string) => {
  return await withSpan(
    "management.updateOdds",
    { "management.sport": sport },
    async (span) => {
      const url = `https://api.the-odds-api.com/v4/sports/${sport}/odds`;
      try {
        const res = await axios.get(url, {
          params: {
            regions: "uk,us",
            markets: "h2h",
            apiKey: odds_api_key,
            oddsFormat: "decimal",
          },
        });
        const data = res.data;

        let unmatched = 0;
        let stored = 0;
        let writeFailures = 0;

        for (const item of data) {
          // normalize names to db names
          const normalizedHome = map_team_name(
            ODDS_MAP.get(item["home_team"]) ?? item["home_team"],
          );
          const normalizedAway = map_team_name(
            ODDS_MAP.get(item["away_team"]) ?? item["away_team"],
          );

          // Step 2: find corresponding match in DB
          const match = await withDbSpan("upcomingMatches", async (dbSpan) => {
            const result = await db.query.upcomingMatches.findFirst({
              where: and(
                eq(upcomingMatches.homeTeam, normalizedHome),
                eq(upcomingMatches.awayTeam, normalizedAway),
              ),
              orderBy: (m: any) => m.matchDate,
            });
            dbSpan.setAttribute("db.response.returned_rows", result ? 1 : 0);
            return result;
          });

          const matchId = match?.id ?? null;
          if (!matchId) {
            console.warn(
              `No match found for ${normalizedHome}-${normalizedAway}`,
            );
            unmatched++;
            continue;
          }

          // Step 3: loop through bookmakers
          for (const bk of item["bookmakers"] ?? []) {
            if (!bookmakers.includes(bk["title"])) continue;

            const h2hMarket = bk["markets"]?.find(
              (m: any) => m["key"] === "h2h",
            );
            if (!h2hMarket) continue;

            const outcomes = Object.fromEntries(
              h2hMarket["outcomes"].map((o: any) => [o["name"], o["price"]]),
            );

            // Step 4: upsert odds into DB
            try {
              await withDbSpan(
                "odds",
                async () => {
                  await db
                    .insert(odds)
                    .values({
                      match: matchId,
                      bookmaker: bk["title"],
                      marketType: "h2h",
                      oddsAway: outcomes[item["away_team"]],
                      oddsDraw: outcomes["Draw"],
                      oddsHome: outcomes[item["home_team"]],
                    })
                    .onConflictDoUpdate({
                      target: [odds.match, odds.bookmaker],
                      set: {
                        oddsHome: outcomes[item["home_team"]],
                        oddsDraw: outcomes["Draw"],
                        oddsAway: outcomes[item["away_team"]],
                        updatedAt: new Date().toISOString(),
                      },
                    });
                },
                "INSERT",
              );
              stored++;
              console.log(
                `Stored odds for ${normalizedHome}-${normalizedAway} (${bk["title"]})`,
              );
            } catch (err) {
              writeFailures++;
              console.error(`DB error on ${matchId} (${bk["title"]}):`, err);
            }
          }
        }

        span.setAttribute("management.events", data.length);
        span.setAttribute("management.events_unmatched", unmatched);
        span.setAttribute("management.odds_stored", stored);
        span.setAttribute("management.odds_write_failures", writeFailures);

        return { success: true };
      } catch (err: any) {
        console.error("Odds API error:", err.message);
        throw new Error(err.message);
      }
    },
  );
};

const excluded = (column: string) => sql.raw(`excluded.${column}`);

// statistics.splits.categories[].stats[] -> { name: value }; null when no stats block at all
const rosterStats = (athlete: any) => {
  const values = new Map<string, number>();
  for (const category of athlete.statistics?.splits?.categories ?? [])
    for (const s of category.stats ?? [])
      if (Number.isFinite(s.value)) values.set(s.name, s.value);
  const stat = (name: string) =>
    values.size ? (values.get(name) ?? null) : null;
  return {
    appearances: stat("appearances"),
    subIns: stat("subIns"),
    goals: stat("totalGoals"),
    assists: stat("goalAssists"),
    ownGoals: stat("ownGoals"),
    shots: stat("totalShots"),
    shotsOnTarget: stat("shotsOnTarget"),
    yellowCards: stat("yellowCards"),
    redCards: stat("redCards"),
    foulsCommitted: stat("foulsCommitted"),
    foulsSuffered: stat("foulsSuffered"),
    offsides: stat("offsides"),
    saves: stat("saves"),
    goalsConceded: stat("goalsConceded"),
  };
};

// updates squads for a team
export const updateSquadService = async (
  team: string, // DB team name
  league: string, // DB league name, e.g. "Premier League"
  espnLeague: string,
  espnTeamId: string,
) => {
  return await withSpan(
    "management.updateSquad",
    {
      "management.team": team,
      "management.league": league,
      "management.espn_league": espnLeague,
      "management.espn_team_id": espnTeamId,
    },
    async (span) => {
      const res = await espn.get(`/${espnLeague}/teams/${espnTeamId}/roster`);
      if (res.status !== 200)
        throw new Error(
          `ESPN roster ${espnLeague}/${espnTeamId} → ${res.status}`,
        );

      const athletes: any[] = (res.data?.athletes ?? [])
        .flatMap((a: any) => a.items ?? [a])
        .filter((a: any) => a.displayName);
      if (!athletes.length) {
        console.warn(`ESPN: empty roster for ${team}, squad left unchanged`);
        span.setAttribute("management.players", 0);
        return { team, players: 0 };
      }

      const now = new Date().toISOString();
      const statsSeason = String(res.data?.season?.year ?? curSeason);

      // One row per name: a duplicate inside one upsert statement is a Postgres error
      const byName = new Map<string, any>();
      for (const a of athletes) byName.set(a.displayName, a);

      const rows = [...byName.values()].map((a) => ({
        player: a.displayName as string,
        team,
        league,
        espnId: String(a.id),
        position: a.position?.name ?? null,
        number: toInt(a.jersey),
        nationality: a.citizenship ?? null,
        nationalityCode: a.citizenshipCountry?.abbreviation ?? null,
        flagUrl: a.flag?.href ?? null,
        dateOfBirth: a.dateOfBirth ? String(a.dateOfBirth).slice(0, 10) : null,
        heightIn: toInt(a.height),
        weightLbs: toInt(a.weight),
        statsSeason,
        ...rosterStats(a),
        updatedAt: now,
      }));
      const names = rows.map((r) => r.player);

      span.setAttribute("management.players", rows.length);
      span.setAttribute("management.stats_season", statsSeason);

      await db.transaction(async (tx) => {
        await withDbSpan(
          "players",
          async () => {
            await tx
              .insert(players)
              .values(
                rows.map((r) => ({
                  name: r.player,
                  imageUrl: byName.get(r.player)?.headshot?.href ?? null,
                })),
              )
              .onConflictDoUpdate({
                target: players.name,
                set: {
                  imageUrl: sql`coalesce(${players.imageUrl}, excluded.image_url)`,
                },
              });
          },
          "INSERT",
        );

        await withDbSpan(
          "squad",
          async () => {
            await tx
              .delete(squad)
              .where(
                and(
                  eq(squad.team, team),
                  or(isNull(squad.position), ne(squad.position, "Coach")),
                  notInArray(squad.player, names),
                ),
              );
          },
          "DELETE",
        );

        await withDbSpan(
          "squad",
          async () => {
            await tx
              .insert(squad)
              .values(rows)
              .onConflictDoUpdate({
                target: [squad.player, squad.team],
                set: {
                  league: excluded("league"),
                  espnId: excluded("espn_id"),
                  position: excluded("position"),
                  number: excluded("number"),
                  nationality: excluded("nationality"),
                  nationalityCode: excluded("nationality_code"),
                  flagUrl: excluded("flag_url"),
                  dateOfBirth: excluded("date_of_birth"),
                  heightIn: excluded("height_in"),
                  weightLbs: excluded("weight_lbs"),
                  statsSeason: excluded("stats_season"),
                  appearances: excluded("appearances"),
                  subIns: excluded("sub_ins"),
                  goals: excluded("goals"),
                  assists: excluded("assists"),
                  ownGoals: excluded("own_goals"),
                  shots: excluded("shots"),
                  shotsOnTarget: excluded("shots_on_target"),
                  yellowCards: excluded("yellow_cards"),
                  redCards: excluded("red_cards"),
                  foulsCommitted: excluded("fouls_committed"),
                  foulsSuffered: excluded("fouls_suffered"),
                  offsides: excluded("offsides"),
                  saves: excluded("saves"),
                  goalsConceded: excluded("goals_conceded"),
                  updatedAt: excluded("updated_at"),
                },
              });
          },
          "INSERT",
        );
      });

      console.log(`Squad updated for ${team} (${rows.length} players)`);
      return { team, players: rows.length };
    },
  );
};

// Every team in a league: one teams request, then one roster request per team
export const updateLeagueSquadsService = async (
  league: string,
  espnLeague: string,
) => {
  return await withSpan(
    "management.updateLeagueSquads",
    { "management.league": league, "management.espn_league": espnLeague },
    async (span) => {
      const res = await espn.get(`/${espnLeague}/teams`);
      if (res.status !== 200)
        throw new Error(`ESPN teams ${espnLeague} → ${res.status}`);
      const espnTeams: any[] =
        res.data?.sports?.[0]?.leagues?.[0]?.teams?.map((t: any) => t.team) ??
        [];

      const teamRows = await withDbSpan("teams", async (dbSpan) => {
        const result = await db.select({ name: teams.teamName }).from(teams);
        dbSpan.setAttribute("db.response.returned_rows", result.length);
        return result;
      });
      const known = new Set(teamRows.map((t) => t.name));

      const results = [];
      let unmapped = 0;
      let failed = 0;
      for (const t of espnTeams) {
        const team = espnTeam(t.displayName);
        if (!known.has(team)) {
          console.warn(
            `No DB team for "${t.displayName}" (mapped to "${team}"), skipped`,
          );
          unmapped++;
          continue;
        }
        await sleep(ESPN_DELAY_MS);
        try {
          results.push(
            await updateSquadService(team, league, espnLeague, String(t.id)),
          );
        } catch (err: any) {
          console.warn(`Squad update failed for ${team}: ${err.message}`);
          failed++;
        }
      }
      await updateTopPlayersService(league);

      // Images for new players
      let images = null;
      try {
        images = await updatePlayerImagesService(league);
      } catch (err: any) {
        console.warn(`Player images failed for ${league}: ${err.message}`);
      }

      span.setAttribute("management.espn_teams", espnTeams.length);
      span.setAttribute("management.squads_updated", results.length);
      span.setAttribute("management.squads_failed", failed);
      span.setAttribute("management.teams_unmapped", unmapped);
      span.setAttribute("management.images_ran", images !== null);

      return { teams: results, images };
    },
  );
};
