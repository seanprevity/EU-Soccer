"use client";

import Image from "next/image";
import Link from "next/link";
import { ReactNode, useEffect, useId, useRef, useState } from "react";
import { useDispatch } from "react-redux";
import { SlidersHorizontal, X } from "lucide-react";
import Pager from "@/components/Pager";
import { LiveDot } from "@/components/liveBadges";
import { SegmentedTabs } from "@/components/segmentedTabs";
import { RedCardBadge } from "@/lib/uiUtils";
import {
  cn,
  currentSeason,
  getLogoFile,
  getMatchResult,
  getResultColors,
} from "@/lib/utils";
import { setMatchHistory } from "@/state";
import {
  useGetLiveMatchesQuery,
  useGetMatchFilterOptionsQuery,
  useGetRecentMatchesQuery,
} from "@/state/api";
import { useAppSelector } from "@/state/redux";
import {
  LiveMatch,
  MatchFilterOptions,
  MatchFilters,
  MatchPreview,
} from "@epl/shared";

const CURRENT_SEASON = Number(currentSeason);
const ANY = "any";

type FilterName = keyof MatchFilters;
type GoalsFilter = NonNullable<MatchFilters["goals"]>;

// Always visible; everything else is in the Filters panel
const BAR_FILTERS: FilterName[] = ["season", "opponent", "venue"];

const VENUE_OPTIONS = [
  { key: ANY, label: "All" },
  { key: "home", label: "Home" },
  { key: "away", label: "Away" },
] as const;

const RESULT_OPTIONS = [
  { key: ANY, label: "All" },
  { key: "W", label: "Won" },
  { key: "D", label: "Drew" },
  { key: "L", label: "Lost" },
] as const;

const MARGIN_OPTIONS = [
  { key: ANY, label: "Any" },
  { key: "1", label: "By 1" },
  { key: "2", label: "By 2" },
  { key: "3", label: "By 3+" },
] as const;

const GOALS_LABELS: Record<GoalsFilter, string> = {
  "over2.5": "Over 2.5 goals",
  btts: "Both teams scored",
  cleanSheet: "Clean sheet",
  failedToScore: "Failed to score",
};

const selectClass =
  "cursor-pointer rounded bg-gray-100 px-2 py-1 text-xs font-medium text-gray-800 hover:bg-gray-200 sm:text-sm dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600";

// 2026 -> "2026/27"
export function seasonLabel(startYear: number): string {
  const endYear = String((startYear + 1) % 100).padStart(2, "0");
  return `${startYear}/${endYear}`;
}

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

// "2 Nov 2026"
function formatMatchDate(isoDate: string | null): string {
  if (!isoDate) return "N/A";
  const date = new Date(isoDate);
  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

type Side = {
  team: string;
  score: number | null;
  reds: number | null | undefined;
  ahead: boolean;
};

function TeamLine({ team, reds, ahead }: Side) {
  return (
    <div
      className={cn(
        "flex items-center gap-2",
        ahead
          ? "font-bold text-green-600 dark:text-green-500"
          : "text-gray-700 dark:text-gray-200",
      )}
    >
      <div className="relative">
        <Image
          src={`/${getLogoFile(team)}`}
          alt={`${team} logo`}
          width={28}
          height={28}
          className="h-5 w-5 object-contain sm:h-6 sm:w-6"
        />
        <RedCardBadge count={reds} />
      </div>
      <span className="text-xs sm:text-sm">{team}</span>
    </div>
  );
}

function Score({ score, ahead }: Side) {
  return (
    <span
      className={cn(
        "text-lg font-bold tabular-nums sm:text-xl",
        ahead
          ? "text-green-600 dark:text-green-500"
          : "text-gray-700 dark:text-gray-300",
      )}
    >
      {score}
    </span>
  );
}

function Card({
  href,
  colors,
  label,
  home,
  away,
}: {
  href: string;
  colors: { gradient: string; rectangle: string };
  label: ReactNode; // the date, or the live minute
  home: Side;
  away: Side;
}) {
  return (
    <li className="overflow-hidden rounded-md bg-white shadow-sm dark:bg-gray-800">
      <Link
        href={href}
        className={cn(
          "relative flex w-full items-center gap-3 rounded-md p-2 text-left no-underline transition hover:bg-gray-100 sm:p-3 dark:hover:bg-gray-700",
          colors.gradient,
        )}
      >
        <div
          className={cn(
            "absolute left-0 top-1/2 z-10 h-[55%] w-1 -translate-y-1/2 rounded-r",
            colors.rectangle,
          )}
        />

        {/* Fixed width, so the team names line up from card to card */}
        <div className="w-18 shrink-0 whitespace-nowrap text-xs font-medium text-gray-500 dark:text-gray-400">
          {label}
        </div>

        <div className="flex flex-1 items-center justify-between border-l border-gray-300 pl-3 dark:border-gray-600">
          <div className="flex flex-1 flex-col gap-1.5">
            <TeamLine {...home} />
            <TeamLine {...away} />
          </div>
          <div className="ml-4 flex flex-col items-end gap-1.5">
            <Score {...home} />
            <Score {...away} />
          </div>
        </div>
      </Link>
    </li>
  );
}

function MatchCard({ match, team }: { match: MatchPreview; team: string }) {
  const homeGoals = match.fthg ?? 0;
  const awayGoals = match.ftag ?? 0;

  return (
    <Card
      href={`/postmatch/${match.id}`}
      colors={getResultColors(getMatchResult(match, team))}
      label={formatMatchDate(match.matchDate)}
      home={{
        team: match.homeTeam,
        score: match.fthg,
        reds: match.hr,
        ahead: homeGoals > awayGoals,
      }}
      away={{
        team: match.awayTeam,
        score: match.ftag,
        reds: match.ar,
        ahead: awayGoals > homeGoals,
      }}
    />
  );
}

function LiveMatchCard({ match }: { match: LiveMatch }) {
  let minute = match.clock ?? "Live";
  if (match.status === "STATUS_HALFTIME") minute = "HT";

  return (
    <Card
      href={`/live/${match.espnId}`}
      colors={getResultColors("live")}
      label={
        <span className="flex items-center gap-1.5 font-semibold text-orange-600 dark:text-orange-400">
          <LiveDot />
          {minute}
        </span>
      }
      home={{
        team: match.homeTeam,
        score: match.homeScore,
        reds: match.hr,
        ahead: match.homeScore > match.awayScore,
      }}
      away={{
        team: match.awayTeam,
        score: match.awayScore,
        reds: match.ar,
        ahead: match.awayScore > match.homeScore,
      }}
    />
  );
}

// Filters that can't be combined clear each other, so the list can't end up impossible
function withRules(changes: Partial<MatchFilters>): Partial<MatchFilters> {
  const next = { ...changes };

  // An exact scoreline already decides the result
  if (changes.scoreline !== undefined) {
    next.result = undefined;
    next.margin = undefined;
  }

  if ("result" in changes) {
    if (changes.result !== undefined) next.scoreline = undefined;
    // A margin only means something for a win or a loss
    if (changes.result === undefined || changes.result === "D")
      next.margin = undefined;
  }

  return next;
}

// A live match has no final result, so only the season, venue and opponent filters can include it
function liveMatchFits(
  match: LiveMatch,
  team: string,
  filters: MatchFilters,
): boolean {
  if (filters.season !== undefined && filters.season !== CURRENT_SEASON)
    return false;
  if (filters.venue === "home" && match.homeTeam !== team) return false;
  if (filters.venue === "away" && match.awayTeam !== team) return false;

  if (filters.opponent) {
    const opponent = match.homeTeam === team ? match.awayTeam : match.homeTeam;
    if (opponent !== filters.opponent) return false;
  }

  if (filters.result || filters.scoreline || filters.goals || filters.comeback)
    return false;
  return true;
}

type Chip = { id: string; label: string; clear: Partial<MatchFilters> };

function resultLabel(result: "W" | "D" | "L", margin?: number): string {
  if (result === "D") return "Drew";
  const verb = result === "W" ? "Won" : "Lost";
  if (margin === undefined) return verb;
  if (margin >= 3) return `${verb} by 3+`;
  return `${verb} by ${margin}`;
}

function activeChips(filters: MatchFilters): Chip[] {
  const chips: Chip[] = [];

  if (filters.season !== undefined) {
    chips.push({
      id: "season",
      label: seasonLabel(filters.season),
      clear: { season: undefined },
    });
  }
  if (filters.opponent) {
    chips.push({
      id: "opponent",
      label: `vs ${filters.opponent}`,
      clear: { opponent: undefined },
    });
  }
  if (filters.venue) {
    const label = filters.venue === "home" ? "Home" : "Away";
    chips.push({ id: "venue", label, clear: { venue: undefined } });
  }
  if (filters.result) {
    chips.push({
      id: "result",
      label: resultLabel(filters.result, filters.margin),
      clear: { result: undefined, margin: undefined },
    });
  }
  if (filters.scoreline) {
    chips.push({
      id: "scoreline",
      label: filters.scoreline,
      clear: { scoreline: undefined },
    });
  }
  if (filters.goals) {
    chips.push({
      id: "goals",
      label: GOALS_LABELS[filters.goals],
      clear: { goals: undefined },
    });
  }

  return chips;
}

function ChipList({
  chips,
  onClear,
}: {
  chips: Chip[];
  onClear: (changes: Partial<MatchFilters>) => void;
}) {
  if (chips.length === 0) return null;

  // Every chip's "clear" combined, for Clear all
  const clearAll: Partial<MatchFilters> = {};
  for (const chip of chips) Object.assign(clearAll, chip.clear);

  return (
    <div className="mb-3 flex flex-wrap items-center gap-1.5">
      {chips.map((chip) => (
        <button
          key={chip.id}
          type="button"
          onClick={() => onClear(chip.clear)}
          aria-label={`Remove filter: ${chip.label}`}
          className="inline-flex cursor-pointer items-center gap-1 rounded-full bg-gray-200 py-0.5 pl-2.5 pr-1.5 text-xs font-medium text-gray-800 transition-colors hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
        >
          {chip.label}
          <X className="size-3" aria-hidden />
        </button>
      ))}
      {chips.length > 1 && (
        <button
          type="button"
          onClick={() => onClear(clearAll)}
          className="cursor-pointer px-1.5 text-xs text-gray-500 underline-offset-2 hover:underline dark:text-gray-400"
        >
          Clear all
        </button>
      )}
    </div>
  );
}

// Type to search the teams they've played; picking one sets the filter, clearing the box removes it
function OpponentPicker({
  value,
  opponents,
  onChange,
}: {
  value: string | undefined;
  opponents: MatchFilterOptions["opponents"];
  onChange: (opponent: string | undefined) => void;
}) {
  const listId = useId(); // unique per list, since the preview page shows two
  const [text, setText] = useState(value ?? "");
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);

  const query = text.trim().toLowerCase();
  let shown = opponents;
  if (query !== "") {
    shown = opponents.filter((opponent) =>
      opponent.team.toLowerCase().startsWith(query),
    );
  }

  function choose(team: string) {
    setText(team);
    setOpen(false);
    onChange(team);
  }

  function handleInput(next: string) {
    setText(next);
    setOpen(true);
    setHighlighted(0);
    if (next === "") onChange(undefined);
  }

  // Move the highlight and keep it in view inside the scrolling list
  function moveHighlight(step: 1 | -1) {
    if (shown.length === 0) return;
    const next = Math.min(Math.max(highlighted + step, 0), shown.length - 1);
    setHighlighted(next);
    requestAnimationFrame(() => {
      document
        .getElementById(`${listId}-${next}`)
        ?.scrollIntoView({ block: "nearest" });
    });
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!open) setOpen(true);
      else moveHighlight(1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      moveHighlight(-1);
    } else if (event.key === "Enter" && open && shown[highlighted]) {
      event.preventDefault();
      choose(shown[highlighted].team);
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  }

  // Leaving the box without picking puts back whatever the filter is
  function handleBlur() {
    setOpen(false);
    setText(value ?? "");
  }

  return (
    <div className="relative">
      <input
        type="search"
        role="combobox"
        aria-label="Opponent"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={
          open && shown[highlighted] ? `${listId}-${highlighted}` : undefined
        }
        value={text}
        placeholder="Any opponent"
        onChange={(event) => handleInput(event.target.value)}
        onFocus={() => setOpen(true)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className="w-40 rounded bg-gray-100 px-2 py-1 text-xs text-gray-800 placeholder:text-gray-500 sm:text-sm dark:bg-gray-700 dark:text-gray-200 dark:placeholder:text-gray-400"
      />

      {open && (
        <ul
          id={listId}
          role="listbox"
          className="absolute left-0 z-40 mt-1 max-h-64 w-56 overflow-y-auto rounded-md border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-800"
        >
          {shown.length === 0 && (
            <li className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400">
              No teams match.
            </li>
          )}

          {shown.map((opponent, index) => (
            <li
              key={opponent.team}
              id={`${listId}-${index}`}
              role="option"
              aria-selected={index === highlighted}
              onMouseDown={(event) => {
                event.preventDefault();
                choose(opponent.team);
              }}
              onMouseEnter={() => setHighlighted(index)}
              className={cn(
                "flex cursor-pointer items-center justify-between gap-3 px-3 py-1.5 text-sm",
                index === highlighted
                  ? "bg-gray-100 text-gray-900 dark:bg-gray-700 dark:text-white"
                  : "text-gray-700 dark:text-gray-200",
              )}
            >
              <span className="flex min-w-0 items-center gap-2">
                <Image
                  src={`/${getLogoFile(opponent.team)}`}
                  alt=""
                  width={16}
                  height={16}
                  className="size-4 shrink-0 object-contain"
                />
                <span className="truncate">{opponent.team}</span>
              </span>
              <span className="shrink-0 text-xs tabular-nums text-gray-400">
                {opponent.count}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function FilterRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="w-20 shrink-0 text-xs font-medium text-gray-500 dark:text-gray-400">
        {label}
      </span>
      {children}
    </div>
  );
}

function FilterPanel({
  show,
  filters,
  options,
  onChange,
}: {
  show: FilterName[];
  filters: MatchFilters;
  options: MatchFilterOptions | undefined;
  onChange: (changes: Partial<MatchFilters>) => void;
}) {
  const showMargin =
    show.includes("result") &&
    (filters.result === "W" || filters.result === "L");

  return (
    <div className="mb-3 space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800/60">
      {show.includes("result") && (
        <FilterRow label="Result">
          <SegmentedTabs
            ariaLabel="Result"
            size="sm"
            className="mx-0"
            options={RESULT_OPTIONS}
            value={filters.result ?? ANY}
            onChange={(key) =>
              onChange({ result: key === ANY ? undefined : key })
            }
          />
          {showMargin && (
            <SegmentedTabs
              ariaLabel="Margin"
              size="sm"
              className="mx-0"
              options={MARGIN_OPTIONS}
              value={
                filters.margin === undefined
                  ? ANY
                  : String(Math.min(filters.margin, 3))
              }
              onChange={(key) =>
                onChange({ margin: key === ANY ? undefined : Number(key) })
              }
            />
          )}
        </FilterRow>
      )}

      {show.includes("scoreline") && (
        <FilterRow label="Scoreline">
          <select
            aria-label="Exact scoreline"
            value={filters.scoreline ?? ANY}
            onChange={(event) => {
              const value = event.target.value;
              onChange({ scoreline: value === ANY ? undefined : value });
            }}
            className={selectClass}
          >
            <option value={ANY}>Any score</option>
            {(options?.scorelines ?? []).map((line) => {
              const value = `${line.goalsFor}-${line.goalsAgainst}`;
              return (
                <option key={value} value={value}>
                  {value} ({line.count})
                </option>
              );
            })}
          </select>
        </FilterRow>
      )}

      {show.includes("goals") && (
        <FilterRow label="Goals">
          <select
            aria-label="Goals"
            value={filters.goals ?? ANY}
            onChange={(event) => {
              const value = event.target.value;
              onChange({
                goals: value === ANY ? undefined : (value as GoalsFilter),
              });
            }}
            className={selectClass}
          >
            <option value={ANY}>Any</option>
            {Object.entries(GOALS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </FilterRow>
      )}
    </div>
  );
}

type MatchHistoryProps = {
  team: string;
  stateKey: string; // keeps each list's filters and page separate, e.g. "team" or "preview-home"
  pageSize?: number;
  showLive?: boolean;
  filters?: FilterName[]; // which filters to offer here
};

export default function MatchHistory({
  team,
  stateKey,
  pageSize = 5,
  showLive = true,
  filters: shownFilters = [
    "season",
    "opponent",
    "venue",
    "result",
    "scoreline",
    "goals",
  ],
}: MatchHistoryProps) {
  const dispatch = useDispatch();
  const key = `${stateKey}:${team}`;
  const stored = useAppSelector((state) => state.global.matchHistory?.[key]);
  const filters = stored?.filters ?? {};
  const page = stored?.page ?? 0;
  const [panelOpen, setPanelOpen] = useState(false);

  const { data: options } = useGetMatchFilterOptionsQuery({ team });

  function changeFilters(changes: Partial<MatchFilters>) {
    dispatch(setMatchHistory({ key, filters: withRules(changes) }));
  }

  function changePage(next: number) {
    dispatch(setMatchHistory({ key, page: next }));
  }

  // This team's match, if it's being played right now and fits the filters
  const { data: liveMatches } = useGetLiveMatchesQuery(undefined, {
    pollingInterval: 30_000,
    skip: !showLive,
  });
  const liveMatch = liveMatches?.find(
    (match) => match.homeTeam === team || match.awayTeam === team,
  );
  const showLiveCard =
    liveMatch !== undefined && liveMatchFits(liveMatch, team, filters);

  // A live match takes the first slot on page 1, so every finished match moves down one
  const liveCount = showLiveCard ? 1 : 0;
  let offset = page * pageSize - liveCount;
  let limit = pageSize;
  if (page === 0) {
    offset = 0;
    limit = pageSize - liveCount;
  }

  const { data, isLoading, isFetching, refetch } = useGetRecentMatchesQuery({
    team,
    offset,
    limit,
    ...filters,
  });

  // When the live match ends, fetch again so it shows up as a normal result
  const liveId = liveMatch?.espnId ?? null;
  const previousLiveId = useRef<string | null>(null);
  useEffect(() => {
    const matchJustEnded = previousLiveId.current !== null && liveId === null;
    if (matchJustEnded) refetch();
    previousLiveId.current = liveId;
  }, [liveId, refetch]);

  const matches = data?.matches ?? [];
  const total = (data?.total ?? 0) + liveCount;
  const chips = activeChips(filters);

  // The panel holds every offered filter that isn't in the bar
  const panelFilters = shownFilters.filter(
    (name) => !BAR_FILTERS.includes(name),
  );
  const activeInPanel = chips.filter((chip) =>
    panelFilters.includes(chip.id as FilterName),
  ).length;

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        {shownFilters.includes("season") && (
          <select
            aria-label="Season"
            value={filters.season === undefined ? ANY : String(filters.season)}
            onChange={(event) => {
              const value = event.target.value;
              changeFilters({
                season: value === ANY ? undefined : Number(value),
              });
            }}
            className={selectClass}
          >
            <option value={ANY}>All seasons</option>
            {(options?.seasons ?? []).map((startYear) => (
              <option key={startYear} value={startYear}>
                {seasonLabel(startYear)}
              </option>
            ))}
          </select>
        )}

        {shownFilters.includes("opponent") && (
          <OpponentPicker
            // Remount when the filter changes elsewhere (a chip, Clear all), so the box shows it
            key={filters.opponent ?? ""}
            value={filters.opponent}
            opponents={options?.opponents ?? []}
            onChange={(opponent) => changeFilters({ opponent })}
          />
        )}

        {shownFilters.includes("venue") && (
          <SegmentedTabs
            ariaLabel="Home or away"
            size="sm"
            className="mx-0"
            options={VENUE_OPTIONS}
            value={filters.venue ?? ANY}
            onChange={(key) =>
              changeFilters({ venue: key === ANY ? undefined : key })
            }
          />
        )}

        {panelFilters.length > 0 && (
          <button
            type="button"
            onClick={() => setPanelOpen((open) => !open)}
            aria-expanded={panelOpen}
            className={cn(selectClass, "inline-flex items-center gap-1.5")}
          >
            <SlidersHorizontal className="size-3.5" aria-hidden />
            Filters
            {activeInPanel > 0 && (
              <span className="rounded-full bg-gray-900 px-1.5 text-[10px] font-bold text-white dark:bg-white dark:text-gray-900">
                {activeInPanel}
              </span>
            )}
          </button>
        )}
      </div>

      <div className="mb-2 flex justify-start">
        <Pager
          page={page}
          pageSize={pageSize}
          total={total}
          disabled={isFetching}
          onChange={changePage}
        />
      </div>

      {panelOpen && (
        <FilterPanel
          show={panelFilters}
          filters={filters}
          options={options}
          onChange={changeFilters}
        />
      )}

      <ChipList chips={chips} onClear={changeFilters} />

      {isLoading && (
        <p className="py-6 text-center text-sm text-gray-500 dark:text-gray-400">
          Loading matches…
        </p>
      )}

      {!isLoading && total === 0 && (
        <p className="py-6 text-center text-sm text-gray-500 dark:text-gray-400">
          {chips.length > 0
            ? "No matches fit these filters."
            : "No matches yet."}
        </p>
      )}

      {!isLoading && total > 0 && (
        <ul
          className={cn(
            "space-y-3 transition-opacity sm:space-y-4",
            isFetching && "opacity-50",
          )}
        >
          {page === 0 && showLiveCard && liveMatch && (
            <LiveMatchCard match={liveMatch} />
          )}
          {matches.map((match) => (
            <MatchCard key={match.id} match={match} team={team} />
          ))}
        </ul>
      )}
    </div>
  );
}
