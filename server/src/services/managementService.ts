import {
  standings,
  matchStats,
  upcomingMatches,
  teams,
  head2Head,
  players,
  odds,
  squad,
  MatchEvent,
  MatchLineups,
  TeamLineup,
  LineupPlayer,
  topPlayers,
  TopPlayerCategory,
  TOP_PLAYER_CATEGORIES,
} from "../../drizzle/schema";
import {
  and,
  eq,
  lt,
  or,
  desc,
  gt,
  sql,
  isNull,
  gte,
  inArray,
  ne,
  notInArray,
} from "drizzle-orm";
import { db } from "../lib/db";
import csv from "csv-parser";
import { Readable } from "stream";
import axios from "axios";
import dotenv from "dotenv";
import {
  normalize_name,
  toInt,
  map_team,
  map_team_name,
  ODDS_MAP,
  curSeason,
  ESPN_MAP,
} from "../utils/map";
import { StandingsStats, bookmakers } from "../config/arrays";
import { updatePlayerImagesService } from "./imageService";

dotenv.config();

const football_api_key = process.env.FOOTBALL_DATA_API_KEY;
const odds_api_key = process.env.ODDS_API_KEY;
const football_url = "https://api.football-data.org/v4";
const headers = { "X-Auth-Token": football_api_key };
const espn = axios.create({
  baseURL: "https://site.web.api.espn.com/apis/site/v2/sports/soccer",
  validateStatus: (s) => s < 500,
});
const TOP_N = 10;

// NOTE: RUN UPDATEMATCHSERVICE FIRST THEN UPDATESTANDINGSSERVICE

// updates the matchStats table with the finished matches stats - uses football-data.co.uk csv
export const updateMatchStatsService = async (url: string, league: string) => {
  try {
    const response = await axios.get(url, {
      responseType: "stream",
    });
    const results: any[] = [];
    await new Promise<void>((resolve, reject) => {
      (response.data as Readable)
        .pipe(csv())
        .on("data", (row: any) => results.push(row))
        .on("end", () => resolve())
        .on("error", reject);
    });

    for (const row of results) {
      const homeTeamName = normalize_name(row["HomeTeam"].trim());
      const awayTeamName = normalize_name(row["AwayTeam"].trim());
      const [dayStr, monthStr, yearStrRaw] = row["Date"].split("/");
      const [hourStr, minuteStr] = (row["Time"] || "00:00").split(":");
      const day = parseInt(dayStr, 10);
      const month = parseInt(monthStr, 10) - 1;
      let yearNum = parseInt(yearStrRaw, 10);

      // Handle both YY and YYYY formats
      const fullYear =
        yearNum < 100
          ? yearNum < 50
            ? 2000 + yearNum
            : 1900 + yearNum
          : yearNum;

      const matchDate = new Date(
        Date.UTC(
          fullYear,
          month,
          day,
          parseInt(hourStr, 10),
          parseInt(minuteStr, 10),
        ),
      );

      if (isNaN(matchDate.getTime())) {
        console.warn(
          `⚠️ Invalid match date parsed — raw: "${row["Date"]}", time: "${
            row["Time"]
          }" → fullYear=${fullYear}, month=${month + 1}, day=${day}`,
        );
        console.warn("Full row:", row);
        continue; // Skip bad rows
      }

      // Ensure both teams exist in `teams` table
      for (const teamName of [homeTeamName, awayTeamName]) {
        const existingTeam = await db.query.teams.findFirst({
          where: eq(teams.teamName, teamName),
        });
        if (!existingTeam) {
          await db.insert(teams).values({
            teamName: teamName,
          });
        }
      }

      // Skip if this match (or flipped) already exists
      const existingMatch = await db.query.matchStats.findFirst({
        where: sql`(
          ("HomeTeam" = ${homeTeamName} AND "AwayTeam" = ${awayTeamName})
          OR ("HomeTeam" = ${awayTeamName} AND "AwayTeam" = ${homeTeamName})
        )
        AND "MatchDate" = ${matchDate.toISOString()}`,
      });

      if (existingMatch) {
        console.log(
          `⏩ Skipped duplicate: ${homeTeamName} vs ${awayTeamName} (${matchDate.toISOString()})`,
        );
        continue;
      }

      await db.insert(matchStats).values({
        homeTeam: homeTeamName,
        awayTeam: awayTeamName,
        matchDate: matchDate.toISOString(),
        fthg: parseInt(row["FTHG"]),
        ftag: parseInt(row["FTAG"]),
        ftr: row["FTR"] || null,
        hs: toInt(row["HS"]),
        as: toInt(row["AS"]),
        hst: toInt(row["HST"]),
        ast: toInt(row["AST"]),
        hc: toInt(row["HC"]),
        ac: toInt(row["AC"]),
        hy: toInt(row["HY"]),
        ay: toInt(row["AY"]),
        hr: toInt(row["HR"]),
        ar: toInt(row["AR"]),
        hf: toInt(row["HF"]),
        af: toInt(row["AF"]),
        hxg: parseFloat(row["HxG"]),
        axg: parseFloat(row["AxG"]),
        league: league,
      });
    }
    return { count: results.length };
  } catch (err) {
    console.error("Error updating match stats:", err);
    throw err;
  }
};

// adds next 10 days of upcoming matches to table
export const updateFutureMatchesService = async (
  competition: string,
  league: string,
) => {
  try {
    const today = new Date();
    const dateTo = new Date();
    dateTo.setDate(today.getDate() + 10);
    const dateFromStr = today.toISOString().split("T")[0];
    const dateToStr = dateTo.toISOString().split("T")[0];

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

    await db
      .delete(upcomingMatches)
      .where(lt(upcomingMatches.matchDate, new Date().toISOString()));

    // Insert upcoming matches
    for (const match of data["matches"]) {
      const home = map_team(match["homeTeam"]["shortName"]);
      const away = map_team(match["awayTeam"]["shortName"]);
      const date = new Date(match["utcDate"]);
      if (!home || !away || !date) continue;
      await db
        .insert(upcomingMatches)
        .values({
          homeTeam: home,
          awayTeam: away,
          matchDate: date.toISOString(),
          league: league,
        })
        .onConflictDoNothing();
      // update H2H for these two teams so that it will be shown
      await updateH2HService(home, away);
    }
    return { success: true, count: data["matches"].length };
  } catch (err: any) {
    console.error("Match API error:", err.message);
    throw new Error(err.message);
  }
};

// I want 10 future days available on the home page - update H2H for those matches as they come in
export const updateH2HService = async (teamA: string, teamB: string) => {
  try {
    // normalizes teams so they will be in lexicographical order, not home vs away order
    const [team1, team2] = [teamA, teamB].sort();
    // Get all previous matches between team1 and team2 (both home/away swapped)
    const h2hMatches = await db
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
          and(eq(matchStats.homeTeam, team1), eq(matchStats.awayTeam, team2)),
          and(eq(matchStats.homeTeam, team2), eq(matchStats.awayTeam, team1)),
        ),
      )
      .orderBy(desc(matchStats.matchDate));

    if (h2hMatches.length === 0) {
      console.log(`No H2H matches found between ${team1} and ${team2}`);
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
    console.log(`Updated H2H for ${team1} vs ${team2}`);
    return { success: true };
  } catch (err) {
    console.error("Error updating H2H:", err);
    throw err;
  }
};

// update recent form from last 5 away/home/total matches using matchStats db
export const updateRecentFormService = async (team: string, season: number) => {
  // get season matches from a team - update recent_gf, recent_ga, form in standings table
  try {
    const startDate = new Date(Date.UTC(season, 7, 1)); // aug 1
    const endDate = new Date(Date.UTC(season + 1, 6, 1)); // july 1
    const matches = await db
      .select({
        HomeTeam: matchStats.homeTeam,
        AwayTeam: matchStats.awayTeam,
        FTHG: matchStats.fthg,
        FTAG: matchStats.ftag,
        MatchDate: matchStats.matchDate,
      })
      .from(matchStats)
      .where(
        and(
          or(eq(matchStats.homeTeam, team), eq(matchStats.awayTeam, team)),
          gt(matchStats.matchDate, startDate.toISOString()),
          lt(matchStats.matchDate, endDate.toISOString()),
        ),
      )
      .orderBy(desc(matchStats.matchDate));
    if (!matches.length) return;

    const homeMatches = matches.filter((m) => m.HomeTeam === team).slice(0, 5);
    const awayMatches = matches.filter((m) => m.AwayTeam === team).slice(0, 5);
    const totalMatches = matches.slice(0, 5);

    const calcForm = async (games: typeof matches, type: string) => {
      if (!games.length) return;
      let gf = 0,
        ga = 0,
        form = "";
      for (const m of games) {
        if (m.FTHG == null || m.FTAG == null) continue;
        const isHome = m.HomeTeam === team;
        gf += isHome ? m.FTHG : m.FTAG;
        ga += isHome ? m.FTAG : m.FTHG;
        if (m.FTHG === m.FTAG) form += "D";
        else if ((isHome && m.FTHG > m.FTAG) || (!isHome && m.FTAG > m.FTHG))
          form += "W";
        else form += "L";
      }
      await db
        .update(standings)
        .set({
          recentGf: gf,
          recentGa: ga,
          form: form.split("").reverse().join(""),
        })
        .where(
          and(
            eq(standings.name, team),
            eq(standings.season, String(season)),
            eq(standings.type, type),
          ),
        );
    };

    await calcForm(totalMatches, "TOTAL");
    await calcForm(homeMatches, "HOME");
    await calcForm(awayMatches, "AWAY");

    console.log(`Updated recent form for ${team}`);
  } catch (err: any) {
    console.log(`Error updating recent form for ${team}, `, err);
    throw err;
  }
};

// updates standings for a league/season, gives home standings, away standings, total standings
export const updateStandingsService = async (
  league: string,
  season: string,
) => {
  // Fetch all matches for this league + season
  const startDate = new Date(Date.UTC(Number(season), 7, 1)); // aug 1
  const endDate = new Date(Date.UTC(Number(season) + 1, 6, 1)); // july 1
  const seasonMatches = await db
    .select()
    .from(matchStats)
    .where(
      and(
        eq(matchStats.league, league),
        gt(matchStats.matchDate, startDate.toISOString()),
        lt(matchStats.matchDate, endDate.toISOString()),
      ),
    );

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

  // Insert into DB per type
  for (const [team, stats] of Object.entries(table)) {
    for (const type of ["HOME", "AWAY", "TOTAL"] as const) {
      const row = stats[type];
      await db
        .insert(standings)
        .values({
          name: team,
          league: league,
          season: season,
          type: type,
          position: 0, // temp val
          played: row.played,
          won: row.won,
          draw: row.draw,
          lost: row.lost,
          goalsFor: row.goalsFor,
          goalsAgainst: row.goalsAgainst,
          goalDifference: row.goalsFor - row.goalsAgainst,
          points: row.points,
        })
        .onConflictDoUpdate({
          target: [standings.name, standings.season, standings.type],
          set: {
            played: row.played,
            won: row.won,
            draw: row.draw,
            lost: row.lost,
            goalsFor: row.goalsFor,
            goalsAgainst: row.goalsAgainst,
            goalDifference: row.goalsFor - row.goalsAgainst,
            points: row.points,
          },
        });
    }
  }

  for (const type of ["TOTAL", "AWAY", "HOME"]) {
    const standingsRows = await db
      .select()
      .from(standings)
      .where(
        and(
          eq(standings.league, league),
          eq(standings.season, season),
          eq(standings.type, type),
        ),
      );
    // Sort and update positions
    standingsRows.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.goalDifference !== a.goalDifference)
        return b.goalDifference - a.goalDifference;
      return b.goalsFor - a.goalsFor;
    });

    await Promise.all(
      standingsRows.map((row, i) =>
        db
          .update(standings)
          .set({ position: i + 1 })
          .where(eq(standings.id, row.id)),
      ),
    );
  }

  // update every teams recent form
  await Promise.all(
    Object.keys(table).map((team) =>
      updateRecentFormService(team, Number(season)),
    ),
  );
  return { success: true };
};

// Current-season leaderboards for one league, built from the squad table.
// called after leagueSquadService finishes
export const updateTopPlayersService = async (league: string) => {
  const rows = await db
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
    .where(and(eq(squad.league, league), eq(squad.statsSeason, curSeason)));

  // No current-season squad data means the sync hasn't run or failed: keep what's stored
  if (!rows.length) {
    console.warn(
      `Top players: no ${curSeason} squad stats for ${league}, left unchanged`,
    );
    return { league, season: curSeason, rows: 0 };
  }

  const entries: (typeof topPlayers.$inferInsert)[] = [];

  for (const [category, column] of Object.entries(TOP_PLAYER_CATEGORIES) as [
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

    const ranked = [...best.values()].sort((a, b) => b[column]! - a[column]!);
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
    await tx
      .delete(topPlayers)
      .where(
        and(eq(topPlayers.league, league), eq(topPlayers.season, curSeason)),
      );
    if (entries.length) await tx.insert(topPlayers).values(entries);
  });

  console.log(`Top players: ${entries.length} rows for ${league} ${curSeason}`);
  return { league, season: curSeason, rows: entries.length };
};

// Service to fetch and store odds
export const updateOddsService = async (sport: string) => {
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

    for (const item of data) {
      // normalize names to db names
      const normalizedHome = map_team_name(
        ODDS_MAP.get(item["home_team"]) ?? item["home_team"],
      );
      const normalizedAway = map_team_name(
        ODDS_MAP.get(item["away_team"]) ?? item["away_team"],
      );

      // Step 2: find corresponding match in DB
      const match = await db.query.upcomingMatches.findFirst({
        where: and(
          eq(upcomingMatches.homeTeam, normalizedHome),
          eq(upcomingMatches.awayTeam, normalizedAway),
        ),
        orderBy: (m: any) => m.matchDate,
      });

      const matchId = match?.id ?? null;
      if (!matchId) {
        console.warn(`No match found for ${normalizedHome}-${normalizedAway}`);
        continue;
      }

      // Step 3: loop through bookmakers
      for (const bk of item["bookmakers"] ?? []) {
        if (!bookmakers.includes(bk["title"])) continue;

        const h2hMarket = bk["markets"]?.find((m: any) => m["key"] === "h2h");
        if (!h2hMarket) continue;

        const outcomes = Object.fromEntries(
          h2hMarket["outcomes"].map((o: any) => [o["name"], o["price"]]),
        );

        // Step 4: upsert odds into DB
        try {
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
          console.log(
            `Stored odds for ${normalizedHome}-${normalizedAway} (${bk["title"]})`,
          );
        } catch (err) {
          console.error(`DB error on ${matchId} (${bk["title"]}):`, err);
        }
      }
    }
    return { success: true };
  } catch (err: any) {
    console.error("Odds API error:", err.message);
    throw new Error(err.message);
  }
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
  const res = await espn.get(`/${espnLeague}/teams/${espnTeamId}/roster`);
  if (res.status !== 200)
    throw new Error(`ESPN roster ${espnLeague}/${espnTeamId} → ${res.status}`);

  const athletes: any[] = (res.data?.athletes ?? [])
    .flatMap((a: any) => a.items ?? [a])
    .filter((a: any) => a.displayName);
  if (!athletes.length) {
    console.warn(`ESPN: empty roster for ${team}, squad left unchanged`);
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

  await db.transaction(async (tx) => {
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

    await tx
      .delete(squad)
      .where(
        and(
          eq(squad.team, team),
          or(isNull(squad.position), ne(squad.position, "Coach")),
          notInArray(squad.player, names),
        ),
      );

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
  });

  console.log(`Squad updated for ${team} (${rows.length} players)`);
  return { team, players: rows.length };
};

// Every team in a league: one teams request, then one roster request per team
export const updateLeagueSquadsService = async (
  league: string,
  espnLeague: string,
) => {
  const res = await espn.get(`/${espnLeague}/teams`);
  if (res.status !== 200)
    throw new Error(`ESPN teams ${espnLeague} → ${res.status}`);
  const espnTeams: any[] =
    res.data?.sports?.[0]?.leagues?.[0]?.teams?.map((t: any) => t.team) ?? [];

  const known = new Set(
    (await db.select({ name: teams.teamName }).from(teams)).map((t) => t.name),
  );

  const results = [];
  for (const t of espnTeams) {
    const team = espnTeam(t.displayName);
    if (!known.has(team)) {
      console.warn(
        `No DB team for "${t.displayName}" (mapped to "${team}"), skipped`,
      );
      continue;
    }
    await sleep(ESPN_DELAY_MS);
    try {
      results.push(
        await updateSquadService(team, league, espnLeague, String(t.id)),
      );
    } catch (err: any) {
      console.warn(`Squad update failed for ${team}: ${err.message}`);
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
  return { teams: results, images };
};

const ESPN_DELAY_MS = 1000;

type Side = "home" | "away";

type EspnMatch = {
  id: string;
  home: string; // mapped to your DB names
  away: string;
  rawHome: string; // ESPN's own names, for logging unmatched teams
  rawAway: string;
  sideById: Map<string, Side>; // ESPN team id -> side
  completed: boolean;
  homePoss: number | null;
  awayPoss: number | null;
  events: MatchEvent[];
};

type TeamStats = {
  shots: number | null;
  shotsOnTarget: number | null;
  blockedShots: number | null;
  saves: number | null;
};

const isGoal = (kind: MatchEvent["kind"]) =>
  kind === "goal" || kind === "penalty" || kind === "own_goal";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ESPN team name -> your DB team name. Unknown names fall through to map_team_name.
const espnTeam = (name: string | undefined | null) =>
  name ? map_team_name(ESPN_MAP.get(name) ?? name) : "";

// "67'" -> 67, "45'+2'" -> 45 + 2
const parseMinute = (display: string | undefined) => {
  const m = /(\d+)'?\s*(?:\+\s*(\d+))?/.exec(display ?? "");
  return {
    minute: m ? Number(m[1]) : null,
    extraMinute: m?.[2] ? Number(m[2]) : null,
  };
};

// statistics[] -> { name, displayValue }, used on scoreboard competitors and boxscore teams
const statValue = (holder: any, name: string): number | null => {
  const stat = holder?.statistics?.find((s: any) => s.name === name);
  const value = stat ? parseFloat(stat.displayValue) : NaN;
  return Number.isFinite(value) ? value : null;
};

const flip = (side: MatchEvent["side"]): MatchEvent["side"] =>
  side === "home" ? "away" : side === "away" ? "home" : null;

const byMinute = (a: MatchEvent, b: MatchEvent) =>
  (a.minute ?? 0) - (b.minute ?? 0) ||
  (a.extraMinute ?? 0) - (b.extraMinute ?? 0);

// Scoreboard: events[] -> competitions[0] -> competitors[] + details[]
const parseEspnEvent = (ev: any): EspnMatch | null => {
  const comp = ev.competitions?.[0];
  const home = comp?.competitors?.find((c: any) => c.homeAway === "home");
  const away = comp?.competitors?.find((c: any) => c.homeAway === "away");
  if (!home || !away) return null;

  const sideById = new Map<string, Side>([
    [String(home.team?.id), "home"],
    [String(away.team?.id), "away"],
  ]);

  const events: MatchEvent[] = (comp.details ?? [])
    .filter((d: any) => {
      if (d.shootout) return false;
      if (d.scoringPlay) return true;
      // Cards shown to coaches/staff have no athletesInvolved, so there's no player to show
      if (d.yellowCard || d.redCard)
        return Boolean(d.athletesInvolved?.[0]?.displayName);
      return false;
    })
    .map((d: any): MatchEvent => {
      const player = d.athletesInvolved?.[0];
      const eventSide = sideById.get(String(d.team?.id)) ?? null;
      const minutes = parseMinute(d.clock?.displayValue);

      if (!d.scoringPlay) {
        // Card: side is the team of the carded player
        const typeText = String(d.type?.text ?? "").toLowerCase();
        return {
          ...minutes,
          side: eventSide,
          player: player?.displayName ?? null,
          assist: null,
          kind: d.redCard
            ? typeText.includes("second")
              ? "second_yellow"
              : "red"
            : "yellow",
        };
      }

      // Goal: side is stored as the team the goal counts for. For an own goal that's the
      // opposite of the scorer's team, when ESPN tells us the scorer's team.
      const scorerSide = sideById.get(String(player?.team?.id)) ?? null;
      return {
        ...minutes,
        side: d.ownGoal
          ? scorerSide
            ? flip(scorerSide)
            : eventSide
          : eventSide,
        player: player?.displayName ?? null,
        assist: d.athletesInvolved?.[1]?.displayName ?? null,
        kind: d.ownGoal ? "own_goal" : d.penaltyKick ? "penalty" : "goal",
      };
    })
    .sort(byMinute);

  const rawHome = home.team?.displayName ?? home.team?.name ?? "";
  const rawAway = away.team?.displayName ?? away.team?.name ?? "";

  return {
    id: String(ev.id),
    home: espnTeam(rawHome),
    away: espnTeam(rawAway),
    rawHome,
    rawAway,
    sideById,
    completed: ev.status?.type?.completed === true,
    homePoss: statValue(home, "possessionPct"),
    awayPoss: statValue(away, "possessionPct"),
    events,
  };
};

// One league, one date (YYYYMMDD). ESPN rejects date ranges for soccer.
const fetchEspnDay = async (
  espnLeague: string,
  date: string,
): Promise<EspnMatch[] | null> => {
  const res = await espn.get(`/${espnLeague}/scoreboard`, {
    params: { dates: date },
  });
  if (res.status !== 200) {
    console.warn(
      `ESPN scoreboard ${espnLeague} ${date} → ${res.status}`,
      res.data,
    );
    return null;
  }
  const events: any[] = res.data?.events ?? [];
  return events.map(parseEspnEvent).filter((m): m is EspnMatch => m !== null);
};

// Summary: boxscore.teams[] (stats), rosters[] (lineups), keyEvents[] (subs)
const fetchEspnSummary = async (
  espnLeague: string,
  eventId: string,
): Promise<any | null> => {
  const res = await espn.get(`/${espnLeague}/summary`, {
    params: { event: eventId },
  });
  if (res.status !== 200) {
    console.warn(
      `ESPN summary ${espnLeague} ${eventId} → ${res.status}`,
      res.data,
    );
    return null;
  }
  return res.data;
};

const parseTeamStats = (
  summary: any,
  match: EspnMatch,
): Record<Side, TeamStats | null> => {
  const out: Record<Side, TeamStats | null> = { home: null, away: null };
  for (const t of summary?.boxscore?.teams ?? []) {
    const side = match.sideById.get(String(t.team?.id));
    if (!side) continue;
    out[side] = {
      shots: statValue(t, "totalShots"),
      shotsOnTarget: statValue(t, "shotsOnTarget"),
      blockedShots: statValue(t, "blockedShots"),
      saves: statValue(t, "saves"),
    };
  }
  return out;
};

const parseSubs = (summary: any, match: EspnMatch): MatchEvent[] =>
  (summary?.keyEvents ?? [])
    .filter((e: any) => e.type?.type === "substitution")
    .map(
      (e: any): MatchEvent => ({
        ...parseMinute(e.clock?.displayValue),
        side: match.sideById.get(String(e.team?.id)) ?? null,
        // "Trey Nyoni replaces Florian Wirtz": participants[0] comes on, participants[1] goes off
        player: e.participants?.[0]?.athlete?.displayName ?? null,
        playerOut: e.participants?.[1]?.athlete?.displayName ?? null,
        assist: null,
        kind: "sub",
      }),
    );

const parseLineups = (summary: any): MatchLineups | null => {
  const team = (homeAway: Side): TeamLineup | null => {
    const r = (summary?.rosters ?? []).find(
      (x: any) => x.homeAway === homeAway,
    );
    if (!r?.roster?.length) return null;
    return {
      formation: r.formation ?? null,
      players: r.roster.map(
        (p: any): LineupPlayer => ({
          espnId: String(p.athlete?.id ?? ""),
          name: p.athlete?.displayName ?? "",
          shortName: p.athlete?.shortName ?? null,
          jersey: p.jersey ?? null,
          position: p.position?.abbreviation ?? null,
          positionName: p.position?.displayName ?? null,
          formationPlace: p.formationPlace ? Number(p.formationPlace) : null,
          starter: Boolean(p.starter),
          subbedIn: Boolean(p.subbedIn),
          subbedOut: Boolean(p.subbedOut),
          headshot: p.athlete?.headshot?.href ?? null,
        }),
      ),
    };
  };
  const home = team("home");
  const away = team("away");
  return home && away ? { home, away } : null;
};

// Players ESPN has no headshot for: fall back to the image already stored in the players table
const fillMissingHeadshots = async (lineups: MatchLineups) => {
  const all = [...lineups.home.players, ...lineups.away.players];
  const missing = all.filter((p) => !p.headshot && p.name).map((p) => p.name);
  if (!missing.length) return;
  const rows = await db
    .select({ name: players.name, imageUrl: players.imageUrl })
    .from(players)
    .where(inArray(players.name, missing));
  const byName = new Map(rows.map((r) => [r.name, r.imageUrl]));
  for (const p of all) if (!p.headshot) p.headshot = byName.get(p.name) ?? null;
};

// Fallback: gets assist from the text if it is there: "Assisted by Bukayo Saka with a cross." -> "Bukayo Saka"
const assistFromText = (text: string | undefined) =>
  /Assisted by (.+?)(?=\s+(?:with|following|after)\b|\.(?:\s|$)|$)/.exec(
    text ?? "",
  )?.[1] ?? null;

// get assists from summary key events if available
const addAssists = (events: MatchEvent[], summary: any): MatchEvent[] => {
  const goalEvents: any[] = (summary?.keyEvents ?? []).filter(
    (k: any) => k.scoringPlay,
  );
  const used = new Set<any>();

  return events.map((e) => {
    if (!isGoal(e.kind) || e.kind === "own_goal" || e.assist) return e;
    const clock = parseMinute;
    const match = goalEvents.find((k) => {
      if (used.has(k)) return false;
      const m = clock(k.clock?.displayValue);
      return (
        m.minute === e.minute &&
        m.extraMinute === e.extraMinute &&
        k.participants?.[0]?.athlete?.displayName === e.player
      );
    });
    if (!match) return e;
    used.add(match);
    const assist =
      match.participants?.[1]?.athlete?.displayName ??
      assistFromText(match.text);
    return assist ? { ...e, assist } : e;
  });
};

export const syncEspnMatchDataService = async (
  league: string,
  espnLeague: string,
  since: Date,
  to = new Date(),
) => {
  const pending = await db
    .select()
    .from(matchStats)
    .where(
      and(
        eq(matchStats.league, league),
        or(isNull(matchStats.events), isNull(matchStats.lineups)),
        gte(matchStats.matchDate, since.toISOString()),
        lt(matchStats.matchDate, to.toISOString()),
      ),
    );
  if (!pending.length) return { updated: 0, remaining: 0 };

  // Group by UTC date: European kickoffs fall on the same calendar day in ESPN's (US) day boundaries
  const byDate = new Map<string, typeof pending>();
  for (const row of pending) {
    if (!row.matchDate) continue;
    const date = row.matchDate.slice(0, 10).replace(/-/g, ""); // "2026-09-20T..." -> "20260920"
    byDate.set(date, [...(byDate.get(date) ?? []), row]);
  }

  let updated = 0;

  for (const [date, rows] of byDate) {
    const day = await fetchEspnDay(espnLeague, date);
    await sleep(ESPN_DELAY_MS);
    if (!day) continue;

    for (const row of rows) {
      const hit = day.find(
        (m) => m.home === row.homeTeam && m.away === row.awayTeam,
      );
      if (!hit) {
        const onEspn =
          day.map((m) => `${m.rawHome} vs ${m.rawAway}`).join("; ") || "none";
        console.warn(
          `ESPN: no match for ${row.homeTeam} vs ${row.awayTeam} (${date}) | ESPN fixtures that day: ${onEspn}`,
        );
        continue;
      }
      if (!hit.completed) {
        console.warn(
          `ESPN: ${row.homeTeam} vs ${row.awayTeam} not marked completed yet`,
        );
        continue;
      }

      // Goals credited to each side must equal the CSV score exactly
      const goals = hit.events.filter((e) => isGoal(e.kind));
      const homeGoals = goals.filter((g) => g.side === "home").length;
      const awayGoals = goals.filter((g) => g.side === "away").length;
      const fthg = row.fthg ?? 0;
      const ftag = row.ftag ?? 0;
      if (
        hit.events.some((e) => e.side === null) ||
        homeGoals !== fthg ||
        awayGoals !== ftag
      ) {
        console.warn(
          `ESPN: ${row.homeTeam} vs ${row.awayTeam} goals ${homeGoals}-${awayGoals} don't match score ${fthg}-${ftag}, skipped`,
        );
        continue;
      }

      const summary = await fetchEspnSummary(espnLeague, hit.id);
      await sleep(ESPN_DELAY_MS);

      // Scoreboard data is saved either way. Without a summary, lineups stay null and the
      // row is picked up again next run.
      const update: Partial<typeof matchStats.$inferInsert> = {
        espnId: hit.id,
        events: hit.events,
        hposs: hit.homePoss,
        aposs: hit.awayPoss,
      };

      if (summary) {
        const stats = parseTeamStats(summary, hit);
        const subs = parseSubs(summary, hit);
        const lineups = parseLineups(summary);
        if (lineups) await fillMissingHeadshots(lineups);

        Object.assign(update, {
          events: [...addAssists(hit.events, summary), ...subs].sort(byMinute),
          lineups,
          hs: stats.home?.shots ?? row.hs,
          as: stats.away?.shots ?? row.as,
          hst: stats.home?.shotsOnTarget ?? row.hst,
          ast: stats.away?.shotsOnTarget ?? row.ast,
          hbs: stats.home?.blockedShots ?? null,
          abs: stats.away?.blockedShots ?? null,
          hsv: stats.home?.saves ?? null,
          asv: stats.away?.saves ?? null,
        });
        if (!lineups)
          console.warn(
            `ESPN: no lineups for ${row.homeTeam} vs ${row.awayTeam}`,
          );
      }

      await db.update(matchStats).set(update).where(eq(matchStats.id, row.id));
      updated++;
    }
  }

  console.log(`ESPN: updated ${updated}/${pending.length} ${league} matches`);
  return { updated, remaining: pending.length - updated };
};

// Whole season for one league.
export const backfillEspnMatchDataService = (
  league: string,
  espnLeague: string,
) =>
  syncEspnMatchDataService(
    league,
    espnLeague,
    new Date(Date.UTC(Number(curSeason) - 2, 7, 1)),
    new Date(Date.UTC(Number(curSeason) - 1, 7, 1)),
  );
