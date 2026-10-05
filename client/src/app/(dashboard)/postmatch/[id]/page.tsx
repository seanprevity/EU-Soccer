"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { useGetMatchStatsQuery } from "@/state/api";
import { cn, getLogoFile } from "@/lib/utils";
import { EventIcon, formatMinute } from "@/lib/uiUtils";
import { MatchEvent, matchStats } from "@/types/drizzleTypes";
import Stats from "../stats";
import Timeline from "../timeline";
import Lineups from "../lineups";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import MatchTable from "../matchTable";

type Tab = "timeline" | "table" | "stats" | "lineups";

const teamHref = (team: string) => `/team/${team.split(" ").join("_")}`;

type Side = "home" | "away";
type EventLine = { key: string; player: string; minutes: string[] };

// One line per scorer, their goals in order: "Kane 12', 45' (PEN.), 78'"
const goalLines = (events: MatchEvent[], side: Side): EventLine[] => {
  const lines = new Map<string, EventLine>();
  for (const e of events) {
    if (e.side !== side) continue;
    if (e.kind !== "goal" && e.kind !== "penalty" && e.kind !== "own_goal")
      continue;
    const player = e.player ?? "Unknown";
    const key = `${player}|${e.kind === "own_goal" ? "og" : "g"}`;
    const tag =
      e.kind === "penalty" ? " (PEN.)" : e.kind === "own_goal" ? " (OG)" : "";
    if (!lines.has(key)) lines.set(key, { key, player, minutes: [] });
    lines.get(key)!.minutes.push(`${formatMinute(e)}${tag}`);
  }
  return [...lines.values()];
};

const redCardLines = (events: MatchEvent[], side: Side): EventLine[] =>
  events
    .filter(
      (e) =>
        e.side === side && (e.kind === "red" || e.kind === "second_yellow"),
    )
    .map((e, i) => ({
      key: `${e.player}-${i}`,
      player: e.player ?? "Unknown",
      minutes: [formatMinute(e)],
    }));

function EventColumn({
  lines,
  align,
}: {
  lines: EventLine[];
  align: "left" | "right";
}) {
  return (
    <ul
      className={cn(
        "min-w-0 space-y-0.5",
        align === "right" ? "text-right" : "text-left",
      )}
    >
      {lines.map((l) => (
        <li key={l.key} className="break-words">
          {l.player}{" "}
          <span className="tabular-nums text-gray-500 dark:text-gray-400">
            {l.minutes.join(", ")}
          </span>
        </li>
      ))}
    </ul>
  );
}

function EventRow({
  icon,
  home,
  away,
}: {
  icon: MatchEvent["kind"];
  home: EventLine[];
  away: EventLine[];
}) {
  if (!home.length && !away.length) return null;
  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-4 text-xs text-gray-700 sm:text-sm dark:text-gray-300">
      <EventColumn lines={home} align="right" />
      <span className="mt-0.5">
        <EventIcon kind={icon} size={16} />
      </span>
      <EventColumn lines={away} align="left" />
    </div>
  );
}

function Header({ match }: { match: matchStats }) {
  const team = (name: string) => (
    <Link
      href={teamHref(name)}
      className="flex min-w-0 flex-col items-center gap-2 text-center transition-opacity hover:opacity-60"
    >
      <Image
        src={`/${getLogoFile(name)}`}
        alt=""
        width={64}
        height={64}
        className="h-16 w-16 object-contain"
      />
      <span className="w-full truncate text-sm font-semibold text-gray-900 sm:text-base dark:text-white">
        {name}
      </span>
    </Link>
  );

  const events = match.events ?? [];

  return (
    <header className="space-y-4">
      <div className="flex flex-wrap justify-center gap-x-3 text-sm text-gray-500 dark:text-gray-400">
        <span>{match.league}</span>
        {match.matchDate && (
          <time dateTime={match.matchDate}>
            {new Date(match.matchDate).toLocaleDateString("en-US", {
              weekday: "short",
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </time>
        )}
      </div>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
        {team(match.homeTeam)}
        <div className="text-center">
          <p className="text-4xl font-bold tabular-nums text-gray-900 sm:text-5xl dark:text-white">
            {match.fthg ?? "–"}
            <span className="mx-2 text-gray-400">–</span>
            {match.ftag ?? "–"}
          </p>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Full-time
          </p>
        </div>
        {team(match.awayTeam)}
      </div>
      <div className="space-y-3">
        <EventRow
          icon="goal"
          home={goalLines(events, "home")}
          away={goalLines(events, "away")}
        />
        <EventRow
          icon="red"
          home={redCardLines(events, "home")}
          away={redCardLines(events, "away")}
        />
      </div>
    </header>
  );
}

function Tabs({
  active,
  available,
  onChange,
}: {
  active: Tab;
  available: Record<Tab, boolean>;
  onChange: (tab: Tab) => void;
}) {
  const tabs: { key: Tab; label: string }[] = [
    { key: "timeline", label: "Timeline" },
    { key: "stats", label: "Stats" },
    { key: "table", label: "Table" },
    { key: "lineups", label: "Lineups" },
  ];
  return (
    <div
      role="tablist"
      className="mx-auto flex w-fit rounded-lg bg-gray-200 p-1 dark:bg-gray-800"
    >
      {tabs.map(({ key, label }) => (
        <button
          key={key}
          role="tab"
          aria-selected={active === key}
          disabled={!available[key]}
          title={available[key] ? undefined : "Not available for this match"}
          onClick={() => onChange(key)}
          className={cn(
            "rounded-md px-4 py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40",
            active === key
              ? "bg-white text-gray-900 shadow-sm dark:bg-gray-950 dark:text-white"
              : "text-gray-600 enabled:hover:text-gray-900 dark:text-gray-400 dark:enabled:hover:text-white hover:cursor-pointer ",
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

export default function PostMatchPage() {
  const router = useRouter();
  const goBack = () => {
    if (window.history.length > 1) router.back();
    else router.push("/");
  };
  const { id } = useParams<{ id: string }>();
  const matchId = Number(id);
  const validId = Number.isInteger(matchId) && matchId > 0;

  const { data, isLoading, isError } = useGetMatchStatsQuery(
    { ids: matchId },
    { skip: !validId },
  );
  const [tab, setTab] = useState<Tab | null>(null);

  const match = data?.[0];

  if (!validId)
    return <p className="p-8 text-center">This match link isn't valid.</p>;
  if (isLoading) return <p className="p-8 text-center">Loading match…</p>;
  if (isError || !match)
    return <p className="p-8 text-center">Match not found.</p>;

  const available: Record<Tab, boolean> = {
    timeline: Boolean(match.events?.length),
    table: true,
    stats: true,
    lineups: Boolean(match.lineups),
  };
  // Default to timeline, otherwise stats
  const active: Tab =
    tab && available[tab] ? tab : available.timeline ? "timeline" : "stats";

  return (
    <>
      <div className="px-4 pt-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={goBack}
          className="cursor-pointer text-base font-medium dark:text-gray-100 dark:hover:bg-gray-700"
        >
          <ArrowLeft className="size-4" />
          Back
        </Button>
      </div>
      <main className="mx-auto max-w-3xl space-y-6 p-4">
        <Header match={match} />
        <Tabs active={active} available={available} onChange={setTab} />
        <div role="tabpanel">
          {active === "timeline" && (
            <Timeline match={match} onShowStats={() => setTab("stats")} />
          )}
          {active === "stats" && <Stats match={match} />}
          {active === "table" && <MatchTable match={match} />}
          {active === "lineups" && <Lineups match={match} />}
        </div>
      </main>
    </>
  );
}
