"use client";

import TeamStats from "../teamStats";
import HomeAwayRecord from "../homeAwayRecord";
import Odds from "../odds";
import { emptyH2H } from "@/lib/utils";
import {
  useGetHead2HeadQuery,
  useGetTeamStandingsQuery,
  useGetUpcomingMatchByIdQuery,
} from "@/state/api";
import React from "react";
import Teams from "../teams";
import RecentForm from "../recentForm";
import Head2Head from "../Head2Head";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params);
  const { data: match, isLoading: matchLoading } = useGetUpcomingMatchByIdQuery(
    {
      id,
    },
  );
  const { data: h2h, isLoading: h2hLoading } = useGetHead2HeadQuery(
    {
      team1: match?.homeTeam ?? "",
      team2: match?.awayTeam ?? "",
    },
    { skip: !match?.homeTeam || !match?.awayTeam },
  );
  const { data: standings, isLoading: standingsLoading } =
    useGetTeamStandingsQuery(
      {
        team1: match?.homeTeam ?? "",
        team2: match?.awayTeam ?? "",
      },
      { skip: !match?.homeTeam || !match?.awayTeam },
    );

  if (matchLoading || !match || h2hLoading || standingsLoading)
    return (
      <div className="flex justify-center items-center min-h-screen text-gray-600">
        Loading match details…
      </div>
    );

  const homeStanding = standings?.find(
    (t) => t.name === match.homeTeam && t.type === "TOTAL",
  );
  const awayStanding = standings?.find(
    (t) => t.name === match.awayTeam && t.type === "TOTAL",
  );

  const matchweek =
    homeStanding && awayStanding
      ? Math.max(homeStanding.played, awayStanding.played) + 1
      : null;

  return (
    <div className="w-full font-sans">
      <Teams
        homeTeam={match.homeTeam}
        awayTeam={match.awayTeam}
        matchDate={match.matchDate}
        homeForm={homeStanding?.form ?? null}
        awayForm={awayStanding?.form ?? null}
        matchweek={matchweek}
      />
      <div className="px-4 sm:px-6 md:px-16 lg:px-24">
        <Odds match={match} matchId={id} />
      </div>

      <TeamStats homeTeam={match.homeTeam} awayTeam={match.awayTeam} />

      <RecentForm homeTeam={match.homeTeam} awayTeam={match.awayTeam} />

      <div className="pt-0 pb-0 px-2 sm:px-4 md:px-8 lg:px-16">
        <HomeAwayRecord
          stats={standings || []}
          homeTeam={match.homeTeam || ""}
          awayTeam={match.awayTeam || ""}
        />
      </div>
      <div className="px-4 sm:px-8 md:px-16 lg:px-24">
        <Head2Head h2h={h2h || emptyH2H} homeTeam={match.homeTeam || ""} />
      </div>
    </div>
  );
}
