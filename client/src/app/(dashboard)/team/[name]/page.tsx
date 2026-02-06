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
    name,
  });
  const { data: league, isLoading: leagueLoading } = useGetLeagueByTeamQuery({
    team: name,
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
        onClick={() => router.push("/")}
        className="absolute top-4 left-4 z-20 text-sm sm:text-base font-medium cursor-pointer 
                   dark:text-gray-100 dark:hover:bg-gray-700 flex items-center gap-1"
      >
        <ArrowLeft className="size-4" />
        Home
      </Button>

      <div className="w-full flex justify-center px-4">
        <div className="max-w-5xl w-full">
          <Header team={name.split("_").join(" ")} league={league} />
        </div>
      </div>

      {/* --- Tabs Bar --- */}
      <div className="w-full flex justify-center mb-1">
        <div className="flex justify-center items-center dark:bg-gray-900 rounded-xl px-1 py-0.5">
          {["History", "Table", "Squad"].map((t, idx) => (
            <React.Fragment key={t}>
              <button
                onClick={() => dispatch(setTab(t as typeof tab))}
                className={`px-3 sm:px-5 py-1.5 sm:py-2.5 text-xs sm:text-sm md:text-base font-semibold transition-all duration-300 w-[125px] sm:w-[130px] md:w-[150px] text-center rounded-lg shadow-sm cursor-pointer ${
                  tab === t
                    ? "bg-[#38003c] text-white dark:bg-gray-600 dark:text-white scale-102 ring-1 ring-[#38003c]/20 dark:ring-gray-500/30"
                    : "text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-700"
                }`}
              >
                {t === "History"
                  ? "Matches"
                  : t === "Table"
                  ? "Table"
                  : "Squad"}
              </button>

              {/* Divider */}
              {idx < 2 && (
                <span className="text-gray-300 dark:text-gray-600 mx-4 select-none text-2xl font-light">
                  |
                </span>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

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
