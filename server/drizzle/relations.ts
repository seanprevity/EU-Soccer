import { relations } from "drizzle-orm/relations";
import { upcomingMatches, odds, teams, leagues, matchStats, standings, goalScorers, players, squad, head2Head } from "./schema";

export const oddsRelations = relations(odds, ({one}) => ({
	upcomingMatch: one(upcomingMatches, {
		fields: [odds.match],
		references: [upcomingMatches.id]
	}),
}));

export const upcomingMatchesRelations = relations(upcomingMatches, ({one, many}) => ({
	odds: many(odds),
	team_awayTeam: one(teams, {
		fields: [upcomingMatches.awayTeam],
		references: [teams.teamName],
		relationName: "upcomingMatches_awayTeam_teams_teamName"
	}),
	team_homeTeam: one(teams, {
		fields: [upcomingMatches.homeTeam],
		references: [teams.teamName],
		relationName: "upcomingMatches_homeTeam_teams_teamName"
	}),
	league: one(leagues, {
		fields: [upcomingMatches.league],
		references: [leagues.name]
	}),
}));

export const teamsRelations = relations(teams, ({many}) => ({
	upcomingMatches_awayTeam: many(upcomingMatches, {
		relationName: "upcomingMatches_awayTeam_teams_teamName"
	}),
	upcomingMatches_homeTeam: many(upcomingMatches, {
		relationName: "upcomingMatches_homeTeam_teams_teamName"
	}),
	matchStats_awayTeam: many(matchStats, {
		relationName: "matchStats_awayTeam_teams_teamName"
	}),
	matchStats_homeTeam: many(matchStats, {
		relationName: "matchStats_homeTeam_teams_teamName"
	}),
	standings: many(standings),
	goalScorers: many(goalScorers),
	squads: many(squad),
	head2Heads_team1: many(head2Head, {
		relationName: "head2Head_team1_teams_teamName"
	}),
	head2Heads_team2: many(head2Head, {
		relationName: "head2Head_team2_teams_teamName"
	}),
}));

export const leaguesRelations = relations(leagues, ({many}) => ({
	upcomingMatches: many(upcomingMatches),
	matchStats: many(matchStats),
	standings: many(standings),
	goalScorers: many(goalScorers),
}));

export const matchStatsRelations = relations(matchStats, ({one}) => ({
	team_awayTeam: one(teams, {
		fields: [matchStats.awayTeam],
		references: [teams.teamName],
		relationName: "matchStats_awayTeam_teams_teamName"
	}),
	team_homeTeam: one(teams, {
		fields: [matchStats.homeTeam],
		references: [teams.teamName],
		relationName: "matchStats_homeTeam_teams_teamName"
	}),
	league: one(leagues, {
		fields: [matchStats.league],
		references: [leagues.name]
	}),
}));

export const standingsRelations = relations(standings, ({one}) => ({
	league: one(leagues, {
		fields: [standings.league],
		references: [leagues.name]
	}),
	team: one(teams, {
		fields: [standings.name],
		references: [teams.teamName]
	}),
}));

export const goalScorersRelations = relations(goalScorers, ({one}) => ({
	league: one(leagues, {
		fields: [goalScorers.league],
		references: [leagues.name]
	}),
	player: one(players, {
		fields: [goalScorers.player],
		references: [players.name]
	}),
	team: one(teams, {
		fields: [goalScorers.team],
		references: [teams.teamName]
	}),
}));

export const playersRelations = relations(players, ({many}) => ({
	goalScorers: many(goalScorers),
	squads: many(squad),
}));

export const squadRelations = relations(squad, ({one}) => ({
	player: one(players, {
		fields: [squad.player],
		references: [players.name]
	}),
	team: one(teams, {
		fields: [squad.team],
		references: [teams.teamName]
	}),
}));

export const head2HeadRelations = relations(head2Head, ({one}) => ({
	team_team1: one(teams, {
		fields: [head2Head.team1],
		references: [teams.teamName],
		relationName: "head2Head_team1_teams_teamName"
	}),
	team_team2: one(teams, {
		fields: [head2Head.team2],
		references: [teams.teamName],
		relationName: "head2Head_team2_teams_teamName"
	}),
}));