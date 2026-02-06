import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import {
  Standings,
  matchStats,
  upcomingMatches,
  goalScorers,
  head2Head,
  odds,
  teamStats,
  teams,
  leagues,
  squad,
  simulation,
} from "@/types/drizzleTypes";
import { withToast } from "@/lib/utils";

export const api = createApi({
  baseQuery: fetchBaseQuery({
    baseUrl: process.env.NEXT_PUBLIC_BASE_API_URL,
  }),
  reducerPath: "api",
  tagTypes: [
    "Standings",
    "matchStats",
    "upcomingMatches",
    "goalScorers",
    "head2Head",
    "odds",
    "teamStats",
    "teams",
    "squad",
    "simulation",
  ],
  endpoints: (build) => ({
    // gets standings for a specific league + season
    getStandings: build.query<Standings[], { league: string; season: string }>({
      query: ({ league, season }) => {
        const leagueParams = league.split(" ").join("_");
        const seasonParams = season.split("/"); // splits 2010/11 to get 2010 only, handles 2025 as well
        return {
          url: `/standings?league=${leagueParams}&season=${seasonParams[0]}`,
          method: "GET",
        };
      },
      providesTags: ["Standings"],
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, {
          error: "Failed to get standings.",
        });
      },
    }),

    getRecentTeamStandings: build.query<Standings, { team: string }>({
      query: ({ team }) => {
        const normalizedTeam = team.split(" ").join("_");
        return {
          url: `/standings/recent?team=${normalizedTeam}`,
          method: "GET",
        };
      },
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, {
          error: "Failed to get standings.",
        });
      },
    }),

    getRecentTableStandings: build.query<Standings[], { team: string }>({
      query: ({ team }) => {
        const normalizedTeam = team.split(" ").join("_");
        return {
          url: `/standings/table?team=${normalizedTeam}`,
          method: "GET",
        };
      },
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, {
          error: "Failed to get standings.",
        });
      },
    }),

    // gets top goal scorers for a specific season + league from db
    getGoalScorers: build.query<
      goalScorers[],
      { league: string; season: string }
    >({
      query: ({ league, season }) => {
        const leagueParam = league.split(" ").join("_");
        const seasonParams = season.split("/");
        return {
          url: `/standings/goal-scorers?league=${leagueParam}&season=${seasonParams[0]}`,
          method: "GET",
        };
      },
      providesTags: ["Standings"],
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, {
          error: "Failed to get top goal scorers.",
        });
      },
    }),

    // gets standings for the two teams in a match
    getTeamStandings: build.query<
      Standings[],
      { team1: string; team2: string }
    >({
      query: ({ team1, team2 }) => {
        const team1Params = team1.split(" ").join("_");
        const team2Params = team2.split(" ").join("_");
        return {
          url: `/standings/teams?team1=${team1Params}&team2=${team2Params}`,
          method: "GET",
        };
      },
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, {
          error: "Failed to fetch team standings.",
        });
      },
    }),

    // returns teamStats on the season for two teams
    getSeasonTeamStats: build.query<
      teamStats[],
      { team1: string; team2: string }
    >({
      query: ({ team1, team2 }) => {
        const team1Params = team1.split(" ").join("_");
        const team2Params = team2.split(" ").join("_");
        return {
          url: `/teamstats/season?team1=${team1Params}&team2=${team2Params}`,
          method: "GET",
        };
      },
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, {
          error: "Failed to fetch season team stats.",
        });
      },
    }),

    // returns stats for two teams based on last 5 matches
    getLast5TeamStats: build.query<
      teamStats[],
      { team1: string; team2: string }
    >({
      query: ({ team1, team2 }) => {
        const team1Params = team1.split(" ").join("_");
        const team2Params = team2.split(" ").join("_");
        return {
          url: `/teamstats/last5?team1=${team1Params}&team2=${team2Params}`,
          method: "GET",
        };
      },
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, {
          error: "Failed to fetch last 5 team stats.",
        });
      },
    }),

    // gets upcoming matches in db for next 10 days
    getUpcomingMatches: build.query<upcomingMatches[], void>({
      query: () => ({
        url: `/matches/upcoming`,
        method: "GET",
      }),
      providesTags: ["upcomingMatches"],
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, {
          error: "Failed to fetch upcoming matches.",
        });
      },
    }),

    getPastMatches: build.query<matchStats[], void>({
      query: () => ({
        url: `/matches/past`,
        method: "GET",
      }),
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, {
          error: "Failed to fetch past matches.",
        });
      },
    }),

    // gets stats for 1 or more matches
    getMatchStats: build.query<matchStats[], { ids: number[] | number }>({
      query: ({ ids }) => {
        const idParam = Array.isArray(ids) ? ids.join(",") : ids.toString();
        return {
          url: `/matches/stats?ids=${idParam}`,
          method: "GET",
        };
      },
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, {
          error: "Failed to get match stats.",
        });
      },
    }),

    // gets match stats for a team, fetches all matches a team has played in current season
    getTeamMatchStats: build.query<matchStats[], { team: string }>({
      query: ({ team }) => {
        const teamParams = team.split(" ").join("_"); // Man United -> Man_United
        return {
          url: `/matches/teams?team=${teamParams}`,
          method: "GET",
        };
      },
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, {
          error: "Failed to fetch a team's match stats.",
        });
      },
    }),

    // gets last 5 matches in league (not h2h)
    getLast5Matches: build.query<matchStats[], { team: string }>({
      query: ({ team }) => {
        const teamParams = team.split(" ").join("_");
        return {
          url: `/matches/last5?team=${teamParams}`,
          method: "GET",
        };
      },
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, {
          error: "Failed to fetch last 5 matches.",
        });
      },
    }),

    // gets odds for a specific match
    getOdds: build.query<odds[], { id: string }>({
      query: ({ id }) => ({
        url: `/matches/odds/${id}`,
        method: "GET",
      }),
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, {
          error: "Failed to get odds.",
        });
      },
    }),

    // pulls h2h data from db
    getHead2Head: build.query<head2Head, { team1: string; team2: string }>({
      query: ({ team1, team2 }) => {
        const team1Param = team1.split(" ").join("_");
        const team2Param = team2.split(" ").join("_");
        return {
          url: `/h2h/teams?team1=${team1Param}&team2=${team2Param}`,
          method: "GET",
        };
      },
      providesTags: ["upcomingMatches"],
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, {
          error: "Failed to get head to head stats.",
        });
      },
    }),

    // gets h2h data for each upcoming match - pass in upcomingMatch ids.
    getUpcomingHead2Head: build.query<
      head2Head[],
      { ids: number[] | undefined }
    >({
      query: ({ ids }) => {
        const idParams = ids?.join(",");
        return {
          url: `/h2h/upcoming?ids=${idParams}`,
          method: "GET",
        };
      },
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, {
          error: "Failed to get head to head stats for upcoming matches.",
        });
      },
    }),

    // get's an upcomingMatch by Id
    getUpcomingMatchById: build.query<upcomingMatches, { id: string }>({
      query: ({ id }) => ({
        url: `/matches/upcoming/${id}`,
        method: "GET",
      }),
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, {
          error: "Failed to get upcoming match by id.",
        });
      },
    }),

    // returns team, basically just the name, used for future fetches
    getTeamByName: build.query<teams, { name: string }>({
      query: ({ name }) => ({
        url: `/teams?team=${name}`,
        method: "GET",
      }),
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, {
          error: "Failed to get team by name.",
        });
      },
    }),

    getLeagueByTeam: build.query<leagues, { team: string }>({
      query: ({ team }) => {
        const normalizedTeam = team.split(" ").join("_");
        return {
          url: `/teams/league?team=${normalizedTeam}`,
          method: "GET",
        };
      },
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, {
          error: "Failed to get league by team.",
        });
      },
    }),

    getRecentMatches: build.query<
      matchStats[],
      { team: string; endDate: string }
    >({
      query: ({ team, endDate }) => {
        const normalizedTeam = team.split(" ").join("_");
        return {
          url: `/matches/recent?team=${normalizedTeam}&endDate=${endDate}`,
          method: "GET",
        };
      },
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, {
          error: "Failed to get recent matches using an end date.",
        });
      },
    }),

    getSquad: build.query<squad[], { team: string }>({
      query: ({ team }) => {
        const normalizedTeam = team.split(" ").join("_");
        return {
          url: `/squad?team=${normalizedTeam}`,
          method: "GET",
        };
      },
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, {
          error: "Failed to get squad.",
        });
      },
    }),

    getSimulation: build.query<
      simulation,
      { homeTeam: string; awayTeam: string }
    >({
      query: ({ homeTeam, awayTeam }) => {
        const normalizedHomeTeam = homeTeam.split(" ").join("_");
        const normalizedAwayTeam = awayTeam.split(" ").join("_");
        return {
          url: `/matches/simulation?homeTeam=${normalizedHomeTeam}&awayTeam=${normalizedAwayTeam}`,
          method: "GET",
        };
      },
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, {
          error: "Failed to get simulation.",
        });
      },
    }),
  }),
});

export const {
  useGetStandingsQuery,
  useGetRecentTeamStandingsQuery,
  useGetRecentTableStandingsQuery,
  useGetGoalScorersQuery,
  useGetHead2HeadQuery,
  useGetMatchStatsQuery,
  useGetOddsQuery,
  useGetUpcomingMatchesQuery,
  useGetPastMatchesQuery,
  useGetLast5MatchesQuery,
  useGetTeamStandingsQuery,
  useGetSeasonTeamStatsQuery,
  useGetLast5TeamStatsQuery,
  useGetTeamMatchStatsQuery,
  useGetUpcomingHead2HeadQuery,
  useGetUpcomingMatchByIdQuery,
  useGetTeamByNameQuery,
  useGetLeagueByTeamQuery,
  useGetRecentMatchesQuery,
  useGetSquadQuery,
  useGetSimulationQuery,
} = api;

export const { endpoints } = api;
