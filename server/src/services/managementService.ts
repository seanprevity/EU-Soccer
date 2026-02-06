import {
  standings,
  matchStats,
  upcomingMatches,
  teams,
  head2Head,
  goalScorers,
  players,
  odds,
  squad,
} from "../../drizzle/schema";
import { and, eq, lt, or, desc, gt, sql } from "drizzle-orm";
import { db } from "../lib/db";
import fs from "fs";
import path from "path";
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
  skip_coaches,
} from "../utils/map";
import { StandingsStats, bookmakers } from "../config/arrays";

dotenv.config();

const football_api_key = process.env.FOOTBALL_DATA_API_KEY;
const api_football_key = process.env.API_FOOTBALL_DATA_KEY;
const odds_api_key = process.env.ODDS_API_KEY;
const football_url = "https://api.football-data.org/v4";
const headers = { "X-Auth-Token": football_api_key };
const squads_url = "https://v3.football.api-sports.io";
const squad_headers = { "x-rapidapi-key": api_football_key };

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
          parseInt(minuteStr, 10)
        )
      );

      if (isNaN(matchDate.getTime())) {
        console.warn(
          `⚠️ Invalid match date parsed — raw: "${row["Date"]}", time: "${
            row["Time"]
          }" → fullYear=${fullYear}, month=${month + 1}, day=${day}`
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
          `⏩ Skipped duplicate: ${homeTeamName} vs ${awayTeamName} (${matchDate.toISOString()})`
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
  league: string
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
          and(eq(matchStats.homeTeam, team2), eq(matchStats.awayTeam, team1))
        )
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
          lt(matchStats.matchDate, endDate.toISOString())
        )
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
            eq(standings.type, type)
          )
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
  season: string
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
        lt(matchStats.matchDate, endDate.toISOString())
      )
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
          eq(standings.type, type)
        )
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
          .where(eq(standings.id, row.id))
      )
    );
  }

  // update every teams recent form
  await Promise.all(
    Object.keys(table).map((team) =>
      updateRecentFormService(team, Number(season))
    )
  );
  return { success: true };
};

// will find current top goalscorers
export const updateTopGoalScorer = async (
  league: string,
  competition: string,
  season: string
) => {
  try {
    const url = `${football_url}/competitions/${competition}/scorers?season=${season}`;
    const res = await axios.get(url, { headers });
    const data = res.data;
    // clear goalScorers table for current season+league to replace with updated data
    await db
      .delete(goalScorers)
      .where(
        and(eq(goalScorers.season, season), eq(goalScorers.league, league))
      );

    for (const scorer of data["scorers"]) {
      const name = scorer["player"]["name"];
      // insert scorer into player database
      await updatePlayerInfo(name);
      const team = map_team(scorer["team"]["shortName"]);
      //console.log(scorer);
      await db
        .insert(goalScorers)
        .values({
          player: name,
          team: team,
          goals: scorer["goals"],
          league: league,
          season: season,
        })
        .onConflictDoUpdate({
          target: [goalScorers.player, goalScorers.season],
          set: {
            team: team,
            goals: scorer["goals"],
            league: league,
            season: season,
          },
        });
    }

    return;
    {
      success: true;
    }
  } catch (err: any) {
    console.log(`Error updating top goal scorer in ${league}. `, err.message);
    throw new err();
  }
};

// this will get images for the players
export const updatePlayerInfo = async (name: string) => {
  try {
    // check if player already has image
    const existingPlayer = await db.query.players.findFirst({
      where: eq(players.name, name),
    });
    if (existingPlayer) {
      console.log(`Skipping ${name}`);
      return;
    }
    const url = `https://www.thesportsdb.com/api/v1/json/123/searchplayers.php?p=${encodeURIComponent(
      name
    )}`;
    const res = await axios.get(url);
    const player = res.data.player?.[0];
    //console.log(player);
    //console.log(player["strCutout"]);
    await db
      .insert(players)
      .values({
        name: name,
        imageUrl: player["strCutout"],
      })
      .onConflictDoUpdate({
        target: [players.name],
        set: {
          imageUrl: player["strCutout"],
        },
      });
    return { success: true };
  } catch (err: any) {
    console.log(`Error fetching player info for ${name}, `, err);
    throw err;
  }
};

// used to import data from a csv from wikitables
export const importHistoricalGoalScorers = async (
  fileName: string, // PL_2005.csv, move utils/stats folder into services folder before using
  // season: string,
  league: string
) => {
  try {
    const filePath = path.join(__dirname, "stats", fileName);
    if (!fs.existsSync(filePath)) {
      throw new Error(`CSV file not found: ${filePath}`);
    }

    const results: any[] = [];
    await new Promise<void>((resolve, reject) => {
      fs.createReadStream(filePath)
        .pipe(csv())
        .on("data", (row) => {
          const player = row["Player(s)"]?.trim();
          const club = row["Club(s)"]?.trim();
          const goals = Number(row["Goals"]);
          const season = Number(row["Season"]);
          if (player && club && !isNaN(goals) && !isNaN(season)) {
            results.push({ player, club, goals, season });
          }
        })
        .on("end", resolve)
        .on("error", reject);
    });

    for (const { player, club, goals, season } of results) {
      await updatePlayerInfo(player);
      await db
        .insert(goalScorers)
        .values({
          player,
          team: club,
          goals,
          season,
          league,
        })
        .onConflictDoUpdate({
          target: [goalScorers.player, goalScorers.season],
          set: {
            team: club,
            goals: goals,
            league: league,
            season: season,
          },
        });
    }
    console.log(`Imported goal scorers for ${league}`);
    return { success: true };
  } catch (err: any) {
    console.error("Error importing goal scorers:", err);
    throw err;
  }
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
        ODDS_MAP.get(item["home_team"]) ?? item["home_team"]
      );
      const normalizedAway = map_team_name(
        ODDS_MAP.get(item["away_team"]) ?? item["away_team"]
      );

      // Step 2: find corresponding match in DB
      const match = await db.query.upcomingMatches.findFirst({
        where: and(
          eq(upcomingMatches.homeTeam, normalizedHome),
          eq(upcomingMatches.awayTeam, normalizedAway)
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
          h2hMarket["outcomes"].map((o: any) => [o["name"], o["price"]])
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
            `Stored odds for ${normalizedHome}-${normalizedAway} (${bk["title"]})`
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

// adds images to the players table from the goalscorers table for a specific season
export const updateGSImageUrlService = async (season: string) => {
  try {
    const playerList = await db.select().from(players);

    await Promise.all(
      playerList.map((p) =>
        db
          .update(goalScorers)
          .set({ imageUrl: p.imageUrl })
          .where(
            and(eq(goalScorers.player, p.name), eq(goalScorers.season, season))
          )
      )
    );
  } catch (err) {
    console.error(`DB error on updating image URLs:`, err);
  }
};

// updates the squad of a team using team api on api-football, uses team id from map in /utils
export const updateSquadService = async (team: string, id: number) => {
  try {
    const url = `${squads_url}/players/squads?team=${id}`;
    const res = await axios.get(url, { headers: squad_headers });
    const data = res.data;
    // add coach
    await updateCoachService(team, id);
    // add players in squad
    // console.log(data);
    const squadData = data?.response?.[0]?.players ?? [];
    for (const player of squadData) {
      await db
        .insert(players)
        .values({
          name: player["name"],
        })
        .onConflictDoNothing();
      await db
        .insert(squad)
        .values({
          player: player["name"],
          position: player["position"],
          number: player["number"],
          team: team,
        })
        .onConflictDoUpdate({
          target: [squad.player, squad.team],
          set: {
            number: player["number"],
            team: team,
          },
        });
    }
  } catch (err: any) {
    console.log(`Error updating squad: `, err.message);
    throw err;
  }
};

export const updateCoachService = async (team: string, id: number) => {
  try {
    const url = `${squads_url}/coachs?team=${id}`;
    const res = await axios.get(url, { headers: squad_headers });
    const data = res.data;
    //console.log(data);
    for (const coach of data["response"]) {
      let flag = false;
      for (const team of coach["career"]) {
        // console.log(team);
        if (team["end"] === null) {
          if (
            team["team"]["id"] === id &&
            !skip_coaches.includes(coach["name"])
          ) {
            if (coach["name"] === "Andoni Iraola" && team !== "Bournemouth")
              continue;
            if (coach["name"] === "Nuno Espírito Santo" && team !== "West Ham")
              continue;
            flag = true;
            break;
          }
        }
      }
      if (flag === true) {
        console.log(coach["name"]);

        // add coach to players db for foreign key
        await db
          .insert(players)
          .values({
            name: coach["name"],
          })
          .onConflictDoNothing();

        // remove previous coach(s) to insert current coach - delete the ones with current season as this one
        await db
          .delete(squad)
          .where(and(eq(squad.team, team), eq(squad.position, "Coach")));

        // insert coach into db - conflict will handle if the coach was previously on another team
        await db
          .insert(squad)
          .values({
            player: coach["name"],
            position: "Coach",
            number: 0,
            team: team,
          })
          .onConflictDoUpdate({
            target: [squad.player, squad.team],
            set: {
              team: team,
            },
          });
        break;
      }
    }
    console.log(`Updated coach for ${team}.`);
  } catch (err: any) {
    console.log(`Error fetching coach: ${err.message}`);
    throw err;
  }
};
