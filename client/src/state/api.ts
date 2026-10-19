import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import {
  matchStats,
  upcomingMatches,
  odds,
  simulation,
  HomeAwayStats,
  matchPreview,
} from "@/types/drizzleTypes";
import {
  h2hMatchesResponseSchema,
  type H2HMatchesResponse,
  type ExpectedStanding,
  H2H,
  Standing,
  expectedStandingSchema,
  standingSchema,
  Team,
  teamSchema,
  League,
  leagueSchema,
  TeamStatsPair,
  teamStatsPairSchema,
  TopPlayerEntry,
  TopPlayerCategory,
  SquadPlayerWithImage,
  squadPlayerWithImageSchema,
  topPlayerEntrySchema,
} from "@epl/shared";
import { withToast } from "@/lib/utils";
import { z } from "zod";

export const api = createApi({
  baseQuery: fetchBaseQuery({
    baseUrl: process.env.NEXT_PUBLIC_BASE_API_URL,
  }),
  reducerPath: "api",
  tagTypes: [
    "Standings",
    "matchStats",
    "upcomingMatches",
    "topPlayers",
    "head2Head",
    "odds",
    "teamStats",
    "teams",
    "squad",
    "simulation",
  ],
  endpoints: (build) => ({
    // gets standings for a specific league + season
    getStandings: build.query<Standing[], { league: string; season: string }>({
      query: ({ league, season }) => ({
        url: `/standings`,
        method: "GET",
        params: {
          league,
          season: season.split("/")[0],
        },
      }),
      transformResponse: (raw: unknown) => z.array(standingSchema).parse(raw),
      providesTags: ["Standings"],
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, {
          error: "Failed to get standings.",
        });
      },
    }),

    getRecentTeamStandings: build.query<Standing, { team: string }>({
      query: ({ team }) => ({
        url: `/standings/recent`,
        method: "GET",
        params: { team },
      }),
      transformResponse: (raw: unknown) => standingSchema.parse(raw),
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, {
          error: "Failed to get standings.",
        });
      },
    }),

    getRecentTableStandings: build.query<Standing[], { team: string }>({
      query: ({ team }) => ({
        url: `/standings/table`,
        method: "GET",
        params: { team },
      }),
      transformResponse: (raw: unknown) => z.array(standingSchema).parse(raw),
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, {
          error: "Failed to get standings.",
        });
      },
    }),

    // gets standings for the two teams in a match
    getTeamStandings: build.query<Standing[], { team1: string; team2: string }>(
      {
        query: ({ team1, team2 }) => ({
          url: `/standings/teams`,
          method: "GET",
          params: { team1, team2 },
        }),
        transformResponse: (raw: unknown) => z.array(standingSchema).parse(raw),
        async onQueryStarted(_, { queryFulfilled }) {
          await withToast(queryFulfilled, {
            error: "Failed to fetch team standings.",
          });
        },
      },
    ),

    getTeamsExpectedStandings: build.query<
      ExpectedStanding[],
      { teams: string[] }
    >({
      query: ({ teams }) => ({
        url: "/standings/expected",
        method: "GET",
        params: { teams: teams.join(",") },
      }),
      transformResponse: (raw: unknown) =>
        z.array(expectedStandingSchema).parse(raw),
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, {
          error: "Failed to get expected standings.",
        });
      },
    }),

    // returns teamStats on the season for two teams
    getSeasonTeamStats: build.query<
      TeamStatsPair,
      { team1: string; team2: string }
    >({
      query: ({ team1, team2 }) => ({
        url: `/teamstats/season`,
        method: "GET",
        params: { team1, team2 },
      }),
      transformResponse: (raw: unknown) => teamStatsPairSchema.parse(raw),
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, {
          error: "Failed to fetch season team stats.",
        });
      },
    }),

    // returns stats for two teams based on last 5 matches
    getLast5TeamStats: build.query<
      TeamStatsPair,
      { team1: string; team2: string }
    >({
      query: ({ team1, team2 }) => ({
        url: `/teamstats/last5`,
        method: "GET",
        params: { team1, team2 },
      }),
      transformResponse: (raw: unknown) => teamStatsPairSchema.parse(raw),
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

    getPastMatches: build.query<matchPreview[], void>({
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

    // gets stats for 1 or more matches (used right now for post match page with one id, needs all stats)
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

    // gets last 5 matches in league (not h2h)
    getLast5Matches: build.query<
      { matches: matchPreview[]; total: number },
      { team: string; page?: number }
    >({
      query: ({ team, page = 0 }) => {
        return {
          url: `/matches/last5`,
          method: "GET",
          params: {
            team: team,
            page: page,
          },
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
    getHead2Head: build.query<H2H, { team1: string; team2: string }>({
      query: ({ team1, team2 }) => {
        return {
          url: `/h2h/teams`,
          method: "GET",
          params: {
            team1,
            team2,
          },
        };
      },
      providesTags: ["upcomingMatches"],
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, {
          error: "Failed to get head to head stats.",
        });
      },
    }),

    get5H2HMatches: build.query<
      H2HMatchesResponse,
      { team1: string; team2: string; page: number }
    >({
      query: ({ team1, team2, page = 0 }) => ({
        url: "/h2h/matches",
        method: "GET",
        params: { team1, team2, page },
      }),
      transformResponse: (raw: unknown) => h2hMatchesResponseSchema.parse(raw),
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, {
          error: "Failed to get H2H Matches.",
        });
      },
    }),

    // gets h2h data for each upcoming match - pass in upcomingMatch ids.
    getUpcomingHead2Head: build.query<H2H[], { ids: number[] | undefined }>({
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
    getTeamByName: build.query<Team, { name: string }>({
      query: ({ name }) => ({
        url: `/teams`,
        method: "GET",
        params: { name },
      }),
      transformResponse: (raw: unknown) => teamSchema.parse(raw),
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, {
          error: "Failed to get team by name.",
        });
      },
    }),

    getLeagueByTeam: build.query<League, { name: string }>({
      query: ({ name }) => ({
        url: `/teams/league`,
        method: "GET",
        params: { name },
      }),
      transformResponse: (raw: unknown) => leagueSchema.parse(raw),
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, {
          error: "Failed to get league by team.",
        });
      },
    }),

    // gets recent matches for team history page
    getRecentMatches: build.query<
      { matches: matchPreview[]; total: number },
      { team: string; page: number }
    >({
      query: ({ team, page = 0 }) => {
        return {
          url: `/matches/recent`,
          method: "GET",
          params: {
            team: team,
            page: page,
          },
        };
      },
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, {
          error: "Failed to get recent matches using an end date.",
        });
      },
    }),

    getSquad: build.query<SquadPlayerWithImage[], { team: string }>({
      query: ({ team }) => ({
        url: `/squad`,
        method: "GET",
        params: { team },
      }),
      transformResponse: (raw: unknown) =>
        z.array(squadPlayerWithImageSchema).parse(raw),
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, {
          error: "Failed to get squad.",
        });
      },
    }),

    // gets top players for a specific season, league, and category from db
    getTopPlayers: build.query<
      TopPlayerEntry[],
      { league: string; season: string; category: TopPlayerCategory }
    >({
      query: ({ league, season, category }) => ({
        url: `/squad/top-players`,
        method: "GET",
        params: { league, season: season.split("/")[0], category },
      }),
      transformResponse: (raw: unknown) =>
        z.array(topPlayerEntrySchema).parse(raw),
      providesTags: ["Standings"],
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, {
          error: "Failed to get top players.",
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

    getHomeAwayMatchStats: build.query<
      {
        homeHome: HomeAwayStats[];
        homeAway: HomeAwayStats[];
        awayHome: HomeAwayStats[];
        awayAway: HomeAwayStats[];
      },
      { homeTeam: string; awayTeam: string }
    >({
      query: ({ homeTeam, awayTeam }) => {
        return {
          url: "matches/home-away",
          method: "GET",
          params: {
            homeTeam,
            awayTeam,
          },
        };
      },
    }),
  }),
});

export const {
  useGetStandingsQuery,
  useGetRecentTeamStandingsQuery,
  useGetRecentTableStandingsQuery,
  useGetTopPlayersQuery,
  useGetHead2HeadQuery,
  useGet5H2HMatchesQuery,
  useGetMatchStatsQuery,
  useGetOddsQuery,
  useGetUpcomingMatchesQuery,
  useGetPastMatchesQuery,
  useGetLast5MatchesQuery,
  useGetTeamStandingsQuery,
  useGetSeasonTeamStatsQuery,
  useGetLast5TeamStatsQuery,
  useGetUpcomingHead2HeadQuery,
  useGetUpcomingMatchByIdQuery,
  useGetTeamByNameQuery,
  useGetLeagueByTeamQuery,
  useGetRecentMatchesQuery,
  useGetSquadQuery,
  useGetSimulationQuery,
  useGetTeamsExpectedStandingsQuery,
  useGetHomeAwayMatchStatsQuery,
} = api;

export const { endpoints } = api;
