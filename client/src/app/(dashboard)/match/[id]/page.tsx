"use client";

import TeamStats from "../teamStats";
import H2H from "../H2H";
import H2HStats from "../h2hstats";
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

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params);
  const { data: match, isLoading: matchLoading } = useGetUpcomingMatchByIdQuery(
    {
      id,
    }
  );
  const { data: h2h, isLoading: h2hLoading } = useGetHead2HeadQuery(
    {
      team1: match?.homeTeam ?? "",
      team2: match?.awayTeam ?? "",
    },
    { skip: !match?.homeTeam || !match?.awayTeam }
  );
  const { data: standings, isLoading: standingsLoading } =
    useGetTeamStandingsQuery(
      {
        team1: match?.homeTeam ?? "",
        team2: match?.awayTeam ?? "",
      },
      { skip: !match?.homeTeam || !match?.awayTeam }
    );

  if (matchLoading || !match || h2hLoading || standingsLoading)
    return (
      <div className="flex justify-center items-center min-h-screen text-gray-600">
        Loading match details…
      </div>
    );

  const hasValidH2H =
    h2h &&
    h2h !== emptyH2H &&
    h2h.last5 &&
    Array.isArray(h2h.last5) &&
    h2h.last5.length > 0;

  return (
    <div className="w-full font-sans">
      <Teams
        homeTeam={match.homeTeam}
        awayTeam={match.awayTeam}
        matchDate={match.matchDate}
      />
      <div className="px-4 sm:px-6 md:px-16 lg:px-24">
        <Odds match={match} matchId={id} />
      </div>

      <TeamStats homeTeam={match.homeTeam} awayTeam={match.awayTeam} />

      <RecentForm
        homeTeam={match.homeTeam}
        awayTeam={match.awayTeam}
        homeForm={
          standings?.find(
            (team) => team.name === match.homeTeam && team.type === "TOTAL"
          )?.form ?? null
        }
        awayForm={
          standings?.find(
            (team) => team.name === match.awayTeam && team.type === "TOTAL"
          )?.form ?? null
        }
      />

      <div className="pt-0 pb-0 px-2 sm:px-4 md:px-8 lg:px-16">
        <HomeAwayRecord
          stats={standings || []}
          homeTeam={match.homeTeam || ""}
          awayTeam={match.awayTeam || ""}
        />
      </div>
      <div className="px-4 sm:px-8 md:px-16 lg:px-24">
        <H2H h2h={h2h || emptyH2H} homeTeam={match.homeTeam || ""} />
        {hasValidH2H && <H2HStats data={h2h} homeTeam={match.homeTeam || ""} />}
      </div>
    </div>
  );
}
