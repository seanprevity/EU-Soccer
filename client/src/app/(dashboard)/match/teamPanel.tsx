"use client";

import Image from "next/image";
import { useState, type ReactNode } from "react";
import type { PlayerCount, TeamLineup, TeamPreview } from "@epl/shared";
import { cn, getLogoFile } from "@/lib/utils";
import { lineupChanges } from "@/lib/lineups";
import Pager from "@/components/Pager";

type TeamColor = { bg: string; text: string };

const PAGE_SIZE = 5;

// The squad lists, one tab each
const STAT_TABS = [
  { key: "scorers", label: "Goals" },
  { key: "assisters", label: "Assists" },
  { key: "yellowCards", label: "Yellows" },
  { key: "redCards", label: "Reds" },
] as const;
type StatKey = (typeof STAT_TABS)[number]["key"];

const FORMATIONS_PER_PAGE = 5;

function FormationList({ preview }: { preview: TeamPreview }) {
  const [page, setPage] = useState(0);

  const start = page * FORMATIONS_PER_PAGE;
  const shown = preview.formations.slice(start, start + FORMATIONS_PER_PAGE);

  return (
    <Block title="Formations this season">
      <ul className="space-y-1">
        {shown.map((formation) => (
          <li
            key={formation.name}
            className="flex items-baseline gap-2 text-sm"
          >
            <span className="flex-1 tabular-nums text-gray-800 dark:text-gray-200">
              {formation.name}
            </span>
            <span className="font-semibold tabular-nums text-gray-900 dark:text-white">
              {formation.count} of {preview.lineupMatches}
            </span>
          </li>
        ))}
      </ul>

      {preview.formations.length > FORMATIONS_PER_PAGE && (
        <div className="flex justify-end">
          <Pager
            page={page}
            pageSize={FORMATIONS_PER_PAGE}
            total={preview.formations.length}
            onChange={setPage}
          />
        </div>
      )}
    </Block>
  );
}

function JerseyCircle({
  jersey,
  color,
}: {
  jersey: string | null;
  color: TeamColor;
}) {
  return (
    <span
      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold tabular-nums ring-1 ring-white/70"
      style={{ backgroundColor: color.bg, color: color.text }}
    >
      {jersey ?? "–"}
    </span>
  );
}

function Block({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5 border-t border-gray-100 pt-3 dark:border-gray-700">
      {title && (
        <h4 className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          {title}
        </h4>
      )}
      {children}
    </div>
  );
}

function CardMarker({ className }: { className: string }) {
  return (
    <span
      aria-hidden
      className={`h-3.5 w-2.5 shrink-0 rounded-[2px] ${className}`}
    />
  );
}

// Rank numbers for an already-sorted list: tied players share a rank (1, 2, 2, 4)
function ranksOf(entries: PlayerCount[]): number[] {
  const ranks: number[] = [];
  for (let index = 0; index < entries.length; index++) {
    const tiedWithPrevious =
      index > 0 && entries[index].count === entries[index - 1].count;
    ranks.push(tiedWithPrevious ? ranks[index - 1] : index + 1);
  }
  return ranks;
}

function total(entries: PlayerCount[]): number {
  let sum = 0;
  for (const entry of entries) sum += entry.count;
  return sum;
}

// Goals, assists and cards for the whole squad: one list at a time, five players per page
function SquadStats({
  preview,
  color,
}: {
  preview: TeamPreview;
  color: TeamColor;
}) {
  const [tab, setTab] = useState<StatKey>("scorers");
  const [page, setPage] = useState(0);

  const entries = preview[tab];
  const ranks = ranksOf(entries);
  const start = page * PAGE_SIZE;
  const pageEntries = entries.slice(start, start + PAGE_SIZE);

  let marker: ReactNode = null;
  if (tab === "yellowCards") marker = <CardMarker className="bg-yellow-400" />;
  if (tab === "redCards") marker = <CardMarker className="bg-red-600" />;

  function chooseTab(key: StatKey) {
    setTab(key);
    setPage(0); // each list starts on its first page
  }

  return (
    <Block title="Top players this season">
      <div
        role="tablist"
        className="grid grid-cols-4 gap-1 rounded-md bg-gray-100 p-0.5 dark:bg-gray-900"
      >
        {STAT_TABS.map(({ key, label }) => (
          <button
            key={key}
            role="tab"
            aria-selected={tab === key}
            onClick={() => chooseTab(key)}
            className={cn(
              "cursor-pointer rounded px-1 py-1 text-[11px] font-medium transition-colors",
              tab === key
                ? "bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white"
                : "text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white",
            )}
          >
            {label}{" "}
            <span className="font-semibold tabular-nums">
              {total(preview[key])}
            </span>
          </button>
        ))}
      </div>

      {/* Always five rows tall, so the panel doesn't change size between tabs or pages */}
      <ul className="min-h-[156px] space-y-1">
        {pageEntries.length === 0 && (
          <li className="pt-2 text-sm text-gray-500 dark:text-gray-400">
            None yet
          </li>
        )}
        {pageEntries.map((entry, index) => (
          <li key={entry.name} className="flex h-7 items-center gap-2 text-sm">
            <span className="w-4 shrink-0 text-right text-xs tabular-nums text-gray-400">
              {ranks[start + index]}
            </span>
            <JerseyCircle jersey={entry.jersey} color={color} />
            <span className="min-w-0 flex-1 truncate text-gray-800 dark:text-gray-200">
              {entry.name}
            </span>
            {marker}
            <span className="w-5 shrink-0 text-right font-semibold tabular-nums text-gray-900 dark:text-white">
              {entry.count}
            </span>
          </li>
        ))}
      </ul>

      {entries.length > PAGE_SIZE && (
        <div className="flex justify-end">
          <Pager
            page={page}
            pageSize={PAGE_SIZE}
            total={entries.length}
            onChange={setPage}
          />
        </div>
      )}
    </Block>
  );
}

function StatusBadge({
  preview,
  confirmed,
}: {
  preview: TeamPreview;
  confirmed: boolean;
}) {
  if (confirmed) {
    return (
      <span className="inline-flex w-fit rounded-full bg-green-600/15 px-2.5 py-0.5 text-xs font-semibold text-green-700 dark:text-green-400">
        Confirmed lineup
      </span>
    );
  }
  if (!preview.previous) {
    return (
      <span className="inline-flex w-fit rounded-full bg-gray-500/15 px-2.5 py-0.5 text-xs font-medium text-gray-600 dark:text-gray-300">
        No lineup yet
      </span>
    );
  }

  const { opponent, wasHome, matchDate } = preview.previous;
  const date = new Date(matchDate).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
  return (
    <span className="inline-flex w-fit rounded-full bg-gray-500/15 px-2.5 py-0.5 text-xs font-medium text-gray-600 dark:text-gray-300">
      Last XI · {wasHome ? "vs" : "at"} {opponent} · {date}
    </span>
  );
}

export default function TeamPanel({
  preview,
  confirmed,
  color,
}: {
  preview: TeamPreview;
  confirmed: TeamLineup | null;
  color: TeamColor;
}) {
  const shownLineup = confirmed ?? preview.previous?.lineup ?? null;

  let changes = null;
  if (confirmed && preview.previous)
    changes = lineupChanges(preview.previous.lineup, confirmed);

  return (
    <aside className="space-y-3 rounded-lg bg-white p-4 shadow-sm dark:bg-gray-800">
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <Image
            src={`/${getLogoFile(preview.team)}`}
            alt=""
            width={40}
            height={40}
            className="h-10 w-10 shrink-0 object-contain"
          />
          <div className="min-w-0">
            <h3 className="truncate font-semibold text-gray-900 dark:text-white">
              {preview.team}
            </h3>
            {shownLineup?.formation && (
              <p className="text-xs tabular-nums text-gray-500 dark:text-gray-400">
                {shownLineup.formation}
              </p>
            )}
          </div>
        </div>
        <StatusBadge preview={preview} confirmed={confirmed !== null} />
      </div>

      {changes && (
        <Block title="Changes from last match">
          {changes.cameIn.length === 0 ? (
            <p className="text-sm text-gray-700 dark:text-gray-300">
              Unchanged XI
            </p>
          ) : (
            <div className="space-y-1 text-sm">
              <p className="font-semibold text-gray-900 dark:text-white">
                {changes.cameIn.length} change
                {changes.cameIn.length === 1 ? "" : "s"}
              </p>
              <p className="text-green-700 dark:text-green-400">
                In: {changes.cameIn.join(", ")}
              </p>
              <p className="text-red-700 dark:text-red-400">
                Out: {changes.droppedOut.join(", ")}
              </p>
            </div>
          )}
        </Block>
      )}

      {preview.formations.length > 0 && <FormationList preview={preview} />}

      <SquadStats preview={preview} color={color} />
    </aside>
  );
}
