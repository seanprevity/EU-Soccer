import { and, eq, asc, desc, sql, getTableColumns } from "drizzle-orm";
import {
  players,
  squad,
  TopPlayerCategory,
  topPlayers,
} from "../../drizzle/schema";
import { db } from "../lib/db";

export const getSquadService = (team: string) =>
  db
    .select({ ...getTableColumns(squad), imageUrl: players.imageUrl })
    .from(squad)
    .leftJoin(players, eq(players.name, squad.player))
    .where(eq(squad.team, team));

export const getTopPlayersService = async (
  league: string,
  season: string,
  category: TopPlayerCategory,
) => {
  return await db
    .select({
      player: topPlayers.player,
      team: topPlayers.team,
      value: topPlayers.value,
      appearances: topPlayers.appearances,
      imageUrl: sql<
        string | null
      >`coalesce(${players.imageUrl}, ${topPlayers.imageUrl})`,
    })
    .from(topPlayers)
    .leftJoin(players, eq(players.name, topPlayers.player))
    .where(
      and(
        eq(topPlayers.league, league),
        eq(topPlayers.season, season),
        eq(topPlayers.category, category),
      ),
    )
    .orderBy(
      desc(topPlayers.value),
      asc(topPlayers.appearances),
      asc(topPlayers.player),
    )
    .limit(10);
};
