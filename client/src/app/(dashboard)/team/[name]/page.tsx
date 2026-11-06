"use client";

import { useRouter } from "next/navigation";
import React from "react";
import { useGetLeagueByTeamQuery, useGetTeamByNameQuery } from "@/state/api";
import History from "../history";
import TeamTable from "../teamTable";
import Squad from "../squad";
import Header from "../header";
import { useDispatch } from "react-redux";
import { useAppSelector } from "@/state/redux";
import { setTab } from "@/state";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { SegmentedTabs } from "@/components/segmentedTabs";

export default function Page({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  const router = useRouter();
  const { name } = React.use(params);
  const dispatch = useDispatch();
  const tab = useAppSelector((state) => state.global.tab);
  // use teamId to return team name then get stats? or just use id?
  const { data: team, isLoading: teamLoading } = useGetTeamByNameQuery({
    name: name.split("_").join(" "),
  });
  const { data: league, isLoading: leagueLoading } = useGetLeagueByTeamQuery({
    name: name.split("_").join(" "),
  });

  if (teamLoading || leagueLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen text-gray-600 dark:bg-gray-900">
        Loading Team...
      </div>
    );
  }

  return (
    <div className="dark:bg-gray-900">
      <Button
        variant="ghost"
        size="sm"
        onClick={() =>
          window.history.length > 1 ? router.back() : router.push("/")
        }
        className="absolute top-4 left-4 z-20 text-sm sm:text-base font-medium cursor-pointer 
                   dark:text-gray-100 dark:hover:bg-gray-700 flex items-center gap-1"
      >
        <ArrowLeft className="size-4" />
        Back
      </Button>

      <div className="w-full flex justify-center px-4">
        <div className="max-w-5xl w-full">
          <Header team={name.split("_").join(" ")} league={league} />
        </div>
      </div>

      <SegmentedTabs
        ariaLabel="Team sections"
        className="mb-4 mt-2"
        options={[
          { key: "History", label: "Matches" },
          { key: "Table", label: "Table" },
          { key: "Squad", label: "Squad" },
        ]}
        value={tab}
        variant="underline"
        onChange={(next) => dispatch(setTab(next))}
      />

      {/* --- Tab Content --- */}
      <div className="w-full max-w-5xl mx-auto">
        {tab === "History" && team && <History team={team.teamName} />}
        {tab === "Table" && team && league && (
          <TeamTable teamName={team.teamName} league={league.name} />
        )}
        {tab === "Squad" && team && league && <Squad team={team.teamName} />}
      </div>
    </div>
  );
}
