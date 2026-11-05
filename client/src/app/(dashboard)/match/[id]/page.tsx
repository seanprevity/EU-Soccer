"use client";

import React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import TeamStats from "../teamStats";
import HomeAwayRecord from "../homeAwayRecord";
import Odds from "../odds";
import Teams from "../teams";
import RecentForm from "../recentForm";
import Head2Head from "../Head2Head";
import UpcomingLineups from "../upcomingLineups";
import { cn, emptyH2H } from "@/lib/utils";
import {
  useGetHead2HeadQuery,
  useGetTeamStandingsQuery,
  useGetUpcomingLineupsQuery,
  useGetUpcomingMatchByIdQuery,
} from "@/state/api";

const TABS = [
  { key: "preview", label: "Preview" },
  { key: "lineups", label: "Lineups" },
  { key: "stats", label: "Stats" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

const LINEUPS_POLL_MS = 5 * 60 * 1000;
const NARROW = "mx-auto w-full max-w-6xl px-4 sm:px-6";

function isTabKey(value: string | null): value is TabKey {
  return TABS.some((tab) => tab.key === value);
}

function ConfirmedDot() {
  return (
    <span className="relative flex size-2" title="Confirmed lineups">
      <span className="absolute inline-flex size-full animate-ping rounded-full bg-green-400 opacity-60 motion-reduce:hidden" />
      <span className="relative inline-flex size-2 rounded-full bg-green-500" />
      <span className="sr-only">(confirmed)</span>
    </span>
  );
}

function MatchTabs({
  active,
  onSelect,
  withDot = [],
}: {
  active: TabKey;
  onSelect: (tab: TabKey) => void;
  withDot?: TabKey[];
}) {
  return (
    <div
      role="tablist"
      aria-label="Match sections"
      className="mx-auto my-6 flex w-fit gap-1 rounded-xl bg-gray-100 p-1 dark:bg-gray-800"
    >
      {TABS.map((tab) => {
        const selected = tab.key === active;
        const showDot = withDot.includes(tab.key);
        return (
          <button
            key={tab.key}
            role="tab"
            aria-selected={selected}
            onClick={() => onSelect(tab.key)}
            className={cn(
              "inline-flex cursor-pointer items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors duration-150 sm:px-6",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-500",
              selected
                ? "bg-[#38003c] text-white shadow-md dark:bg-gray-900"
                : "text-gray-600 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-700",
            )}
          >
            {tab.label}
            {showDot && <ConfirmedDot />}
          </button>
        );
      })}
    </div>
  );
}

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params);
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const tabParam = searchParams.get("tab");
  const activeTab: TabKey = isTabKey(tabParam) ? tabParam : "preview";

  function selectTab(tab: TabKey) {
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.set("tab", tab);
    router.replace(`${pathname}?${nextParams.toString()}`, { scroll: false });
  }

  const { data: match, isLoading: matchLoading } = useGetUpcomingMatchByIdQuery(
    { id },
  );
  const bothTeamsKnown = Boolean(match?.homeTeam && match?.awayTeam);
  const { data: h2h, isLoading: h2hLoading } = useGetHead2HeadQuery(
    { team1: match?.homeTeam ?? "", team2: match?.awayTeam ?? "" },
    { skip: !bothTeamsKnown },
  );
  const { data: standings, isLoading: standingsLoading } =
    useGetTeamStandingsQuery(
      { team1: match?.homeTeam ?? "", team2: match?.awayTeam ?? "" },
      { skip: !bothTeamsKnown },
    );
  const { data: lineups } = useGetUpcomingLineupsQuery(match?.id ?? 0, {
    skip: !match,
    pollingInterval: LINEUPS_POLL_MS,
  });
  const lineupsConfirmed = Boolean(lineups?.confirmed);

  if (matchLoading || !match || h2hLoading || standingsLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-gray-600">
        Loading match details…
      </div>
    );
  }

  const homeStanding = standings?.find(
    (t) => t.name === match.homeTeam && t.type === "TOTAL",
  );
  const awayStanding = standings?.find(
    (t) => t.name === match.awayTeam && t.type === "TOTAL",
  );

  let matchweek: number | null = null;
  if (homeStanding && awayStanding) {
    matchweek = Math.max(homeStanding.played, awayStanding.played) + 1;
  }

  return (
    <div className="w-full pb-6 font-sans">
      <Teams
        homeTeam={match.homeTeam}
        awayTeam={match.awayTeam}
        matchDate={match.matchDate}
        homeForm={homeStanding?.form ?? null}
        awayForm={awayStanding?.form ?? null}
        matchweek={matchweek}
      />

      <MatchTabs
        active={activeTab}
        onSelect={selectTab}
        withDot={lineupsConfirmed ? ["lineups"] : []}
      />

      {activeTab === "preview" && (
        <div className="flex flex-col">
          <div className="px-4 sm:px-6 md:px-16 lg:px-24">
            <Odds match={match} matchId={id} />
          </div>
          <RecentForm homeTeam={match.homeTeam} awayTeam={match.awayTeam} />
          <div className="px-4 sm:px-8 md:px-16 lg:px-24">
            <Head2Head h2h={h2h ?? emptyH2H} homeTeam={match.homeTeam} />
          </div>
        </div>
      )}

      {activeTab === "lineups" && (
        <UpcomingLineups
          matchId={match.id}
          homeTeam={match.homeTeam}
          awayTeam={match.awayTeam}
        />
      )}

      {activeTab === "stats" && (
        <div className="flex flex-col">
          <TeamStats homeTeam={match.homeTeam} awayTeam={match.awayTeam} />
          <div className="px-2 sm:px-4 md:px-8 lg:px-16">
            <HomeAwayRecord
              stats={standings ?? []}
              homeTeam={match.homeTeam}
              awayTeam={match.awayTeam}
            />
          </div>
        </div>
      )}
    </div>
  );
}
