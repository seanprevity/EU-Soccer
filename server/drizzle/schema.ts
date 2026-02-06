import { pgTable, foreignKey, unique, pgPolicy, text, numeric, timestamp, bigint, serial, integer, primaryKey } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const odds = pgTable("odds", {
	bookmaker: text().notNull(),
	marketType: text("market_type").default('h2h').notNull(),
	oddsHome: numeric("odds_home"),
	oddsDraw: numeric("odds_draw"),
	oddsAway: numeric("odds_away"),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	match: bigint({ mode: "number" }),
}, (table) => [
	foreignKey({
			columns: [table.match],
			foreignColumns: [upcomingMatches.id],
			name: "odds_match_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	unique("odds_bookmaker_match_unique").on(table.bookmaker, table.match),
	pgPolicy("Allow public read", { as: "permissive", for: "select", to: ["public"], using: sql`true` }),
	pgPolicy("Service role full write", { as: "permissive", for: "all", to: ["public"] }),
]);

export const teams = pgTable("teams", {
	id: serial().primaryKey().notNull(),
	teamName: text("team_name").notNull(),
}, (table) => [
	unique("teams_team_name_key1").on(table.teamName),
	pgPolicy("Allow public read", { as: "permissive", for: "select", to: ["public"], using: sql`true` }),
	pgPolicy("Service role full write", { as: "permissive", for: "all", to: ["public"] }),
]);

export const leagues = pgTable("leagues", {
	name: text().primaryKey().notNull(),
	country: text(),
}, (table) => [
	unique("leagues_name_key").on(table.name),
	pgPolicy("Allow public read", { as: "permissive", for: "select", to: ["public"], using: sql`true` }),
	pgPolicy("Service role full write", { as: "permissive", for: "all", to: ["public"] }),
]);

export const players = pgTable("players", {
	name: text().primaryKey().notNull(),
	imageUrl: text("image_url"),
}, (table) => [
	pgPolicy("Service role full write", { as: "permissive", for: "all", to: ["public"], using: sql`(auth.role() = 'service_role'::text)`, withCheck: sql`(auth.role() = 'service_role'::text)`  }),
	pgPolicy("Allow public read", { as: "permissive", for: "select", to: ["public"] }),
]);

export const upcomingMatches = pgTable("upcomingMatches", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).primaryKey().generatedByDefaultAsIdentity({ name: "upcoming_matches_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	matchDate: text("MatchDate").notNull(),
	homeTeam: text("HomeTeam").notNull(),
	awayTeam: text("AwayTeam").notNull(),
	league: text("League").notNull(),
}, (table) => [
	foreignKey({
			columns: [table.awayTeam],
			foreignColumns: [teams.teamName],
			name: "upcoming_matches_AwayTeam_fkey"
		}).onUpdate("cascade"),
	foreignKey({
			columns: [table.homeTeam],
			foreignColumns: [teams.teamName],
			name: "upcoming_matches_HomeTeam_fkey"
		}).onUpdate("cascade"),
	foreignKey({
			columns: [table.league],
			foreignColumns: [leagues.name],
			name: "upcoming_matches_League_fkey"
		}).onUpdate("cascade"),
	unique("upcoming_match_unique_idx").on(table.matchDate, table.homeTeam, table.awayTeam),
	pgPolicy("Allow public read", { as: "permissive", for: "select", to: ["public"], using: sql`true` }),
	pgPolicy("Service role full write", { as: "permissive", for: "all", to: ["public"] }),
]);

export const matchStats = pgTable("matchStats", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).primaryKey().generatedByDefaultAsIdentity({ name: "match_stats_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	homeTeam: text("HomeTeam").notNull(),
	awayTeam: text("AwayTeam").notNull(),
	matchDate: text("MatchDate"),
	ftr: text("FTR"),
	hs: integer("HS"),
	as: integer("AS"),
	hst: integer("HST"),
	ast: integer("AST"),
	hc: integer("HC"),
	ac: integer("AC"),
	fthg: integer("FTHG"),
	ftag: integer("FTAG"),
	hy: integer("HY"),
	ay: integer("AY"),
	hr: integer("HR"),
	ar: integer("AR"),
	hf: integer("HF"),
	af: integer("AF"),
	league: text("League").notNull(),
}, (table) => [
	foreignKey({
			columns: [table.awayTeam],
			foreignColumns: [teams.teamName],
			name: "match_stats_AwayTeam_fkey"
		}).onUpdate("cascade"),
	foreignKey({
			columns: [table.homeTeam],
			foreignColumns: [teams.teamName],
			name: "match_stats_HomeTeam_fkey"
		}).onUpdate("cascade"),
	foreignKey({
			columns: [table.league],
			foreignColumns: [leagues.name],
			name: "match_stats_League_fkey"
		}).onUpdate("cascade"),
	pgPolicy("Allow public read", { as: "permissive", for: "select", to: ["public"], using: sql`true` }),
	pgPolicy("Service role full write", { as: "permissive", for: "all", to: ["public"] }),
]);

export const standings = pgTable("standings", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).primaryKey().generatedByDefaultAsIdentity({ name: "standings_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	league: text().notNull(),
	name: text().notNull(),
	season: text().notNull(),
	position: integer().notNull(),
	played: integer().notNull(),
	won: integer().notNull(),
	draw: integer().notNull(),
	lost: integer().notNull(),
	goalsAgainst: integer().notNull(),
	goalsFor: integer().notNull(),
	goalDifference: integer().notNull(),
	points: integer().notNull(),
	form: text(),
	recentGf: integer(),
	recentGa: integer(),
	type: text().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.league],
			foreignColumns: [leagues.name],
			name: "standings_league_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.name],
			foreignColumns: [teams.teamName],
			name: "standings_name_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	unique("standings_name_season_type_unique").on(table.name, table.season, table.type),
	pgPolicy("Allow public read", { as: "permissive", for: "select", to: ["public"], using: sql`true` }),
	pgPolicy("Service role full write", { as: "permissive", for: "all", to: ["public"] }),
]);

export const goalScorers = pgTable("goalScorers", {
	player: text().notNull(),
	goals: integer().notNull(),
	season: text().notNull(),
	team: text().notNull(),
	league: text(),
	imageUrl: text(),
}, (table) => [
	foreignKey({
			columns: [table.league],
			foreignColumns: [leagues.name],
			name: "goalScorers_league_fkey"
		}).onUpdate("cascade"),
	foreignKey({
			columns: [table.player],
			foreignColumns: [players.name],
			name: "goalScorers_player_fkey"
		}).onUpdate("cascade"),
	foreignKey({
			columns: [table.team],
			foreignColumns: [teams.teamName],
			name: "goalScorers_team_fkey"
		}).onUpdate("cascade"),
	unique("goalscorers_name_season_unique").on(table.player, table.season),
	pgPolicy("Service role full write", { as: "permissive", for: "all", to: ["public"], using: sql`(auth.role() = 'service_role'::text)`, withCheck: sql`(auth.role() = 'service_role'::text)`  }),
	pgPolicy("Allow public read", { as: "permissive", for: "select", to: ["public"] }),
]);

export const squad = pgTable("squad", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).primaryKey().generatedByDefaultAsIdentity({ name: "squad_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	player: text(),
	position: text(),
	number: integer(),
	team: text(),
}, (table) => [
	foreignKey({
			columns: [table.player],
			foreignColumns: [players.name],
			name: "squad_player_fkey"
		}).onUpdate("cascade"),
	foreignKey({
			columns: [table.team],
			foreignColumns: [teams.teamName],
			name: "squad_team_fkey"
		}).onUpdate("cascade"),
	unique("squad_team_player_unique").on(table.player, table.team),
	pgPolicy("Allow public read", { as: "permissive", for: "select", to: ["public"], using: sql`true` }),
	pgPolicy("Service role full write", { as: "permissive", for: "all", to: ["public"] }),
]);

export const head2Head = pgTable("head2head", {
	team1: text().notNull(),
	team2: text().notNull(),
	mp: integer("MP").default(0),
	team1Wins: integer("team1_wins").default(0),
	team2Wins: integer("team2_wins").default(0),
	draws: integer().default(0),
	last5: integer().array().default(sql`Array[]::Integer[]`).notNull(), // [RAY]
}, (table) => [
	foreignKey({
			columns: [table.team1],
			foreignColumns: [teams.teamName],
			name: "head2head_team1_fkey"
		}),
	foreignKey({
			columns: [table.team2],
			foreignColumns: [teams.teamName],
			name: "head2head_team2_fkey"
		}),
	primaryKey({ columns: [table.team1, table.team2], name: "head_to_head_pkey"}),
	unique("unique_teams").on(table.team1, table.team2),
	pgPolicy("Allow public read", { as: "permissive", for: "select", to: ["public"], using: sql`true` }),
	pgPolicy("Service role full write", { as: "permissive", for: "all", to: ["public"] }),
]);
