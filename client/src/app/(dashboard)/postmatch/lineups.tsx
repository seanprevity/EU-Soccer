"use client";

import Image from "next/image";
import { ReactNode, useEffect, useRef, useState } from "react";
import {
  LineupPlayer,
  matchStats,
  MatchEvent,
  TeamLineup,
} from "@/types/drizzleTypes";
import { cn, formationLayout, getLogoFile } from "@/lib/utils";
import { ArrowBadge, EventIcon, formatMinute, SubStack } from "@/lib/uiUtils";
import { edgeFor, matchColors } from "@/lib/array";

type Side = "home" | "away";
type CardKind = "yellow" | "red" | "second_yellow";
type PlayerMarks = { goals: number; ownGoals: number; card: CardKind | null };

const LABEL_FONT_PX = 10;
const LABEL_PADDING_PX = 8; // px-1 on each side
const LABEL_GAP_PX = 4; // minimum space kept between two neighbouring names

function NumberCircle({
  player,
  size = "md",
  children,
  isPitch,
  color,
}: {
  player: LineupPlayer;
  size?: "sm" | "md";
  children?: ReactNode;
  isPitch?: boolean;
  color?: { bg: string; text: string };
}) {
  return (
    <span
      className={cn(
        "relative flex shrink-0 items-center justify-center rounded-full font-bold tabular-nums",
        size === "md"
          ? "h-8 w-8 text-sm ring-2 ring-white/80"
          : "h-7 w-7 text-xs",
        color
          ? "ring-1 ring-white"
          : cn("text-white", isPitch ? "bg-gray-600/30" : "bg-gray-600"),
      )}
      style={
        color ? { backgroundColor: color.bg, color: color.text } : undefined
      }
    >
      {player.jersey ?? "–"}
      {children}
    </span>
  );
}

const CARD_SEVERITY: Record<CardKind, number> = {
  yellow: 1,
  red: 2,
  second_yellow: 3,
};

const marksByPlayer = (events: MatchEvent[] | null) => {
  const marks = new Map<string, PlayerMarks>(); // key: "home|Player Name"
  const get = (e: MatchEvent) => {
    const key = `${e.side}|${e.player}`;
    if (!marks.has(key)) marks.set(key, { goals: 0, ownGoals: 0, card: null });
    return marks.get(key)!;
  };

  for (const e of events ?? []) {
    if (!e.player || !e.side) continue;
    if (e.kind === "goal" || e.kind === "penalty") get(e).goals++;
    if (e.kind === "yellow" || e.kind === "red" || e.kind === "second_yellow") {
      const m = get(e);
      if (!m.card || CARD_SEVERITY[e.kind] > CARD_SEVERITY[m.card])
        m.card = e.kind;
    }
  }

  for (const e of events ?? []) {
    if (e.kind !== "own_goal" || !e.player || !e.side) continue;
    const scorerSide = e.side === "home" ? "away" : "home";
    const key = `${scorerSide}|${e.player}`;
    if (!marks.has(key)) marks.set(key, { goals: 0, ownGoals: 0, card: null });
    marks.get(key)!.ownGoals++;
  }

  return marks;
};

function PlayerBadges({
  marks,
  subbedIn = false,
  subbedOff = false,
}: {
  marks: PlayerMarks | undefined;
  subbedIn?: boolean;
  subbedOff?: boolean;
}) {
  const scored = marks?.goals
    ? { kind: "goal" as const, count: marks.goals }
    : marks?.ownGoals
      ? { kind: "own_goal" as const, count: marks.ownGoals }
      : null;

  return (
    <>
      {scored && (
        <span className="absolute -left-1 -top-1">
          <EventIcon kind={scored.kind} size={14} />
          {scored.count > 1 && (
            <span className="absolute -left-1.5 -top-1.5 flex h-3 min-w-3 items-center justify-center rounded-full bg-red-600 px-0.5 text-[8px] font-bold leading-none text-white">
              {scored.count}
            </span>
          )}
        </span>
      )}
      {marks?.card && (
        <span className="absolute -right-1 -top-1">
          <EventIcon kind={marks.card} size={13} />
        </span>
      )}
      {subbedOff ? (
        <ArrowBadge direction="down" corner="bottom-right" size={14} />
      ) : (
        subbedIn && (
          <ArrowBadge direction="up" corner="bottom-right" size={14} />
        )
      )}
    </>
  );
}

let measureCtx: CanvasRenderingContext2D | null = null;
const textWidth = (text: string, fontFamily: string) => {
  measureCtx ??= document.createElement("canvas").getContext("2d");
  if (!measureCtx) return text.length * LABEL_FONT_PX * 0.6;
  measureCtx.font = `${LABEL_FONT_PX}px ${fontFamily}`;
  return measureCtx.measureText(text).width;
};

function usePitchMetrics() {
  const ref = useRef<HTMLDivElement>(null);
  const [metrics, setMetrics] = useState({
    width: 0,
    fontFamily: "sans-serif",
  });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fontFamily = getComputedStyle(el).fontFamily;
    const update = () =>
      setMetrics({ width: el.getBoundingClientRect().width, fontFamily });
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return { ref, ...metrics };
}

type Placed = { player: LineupPlayer; side: Side; x: number; y: number };

// Widest a label can be without reaching a teammate's label on the same line or the pitch edge
const availableWidth = (me: Placed, all: Placed[], pitchWidth: number) => {
  const neighbours = all.filter(
    (o) => o !== me && o.side === me.side && Math.abs(o.y - me.y) < 0.5,
  );
  const toNeighbour = neighbours.length
    ? Math.min(...neighbours.map((o) => Math.abs(o.x - me.x)))
    : Infinity;
  const toEdge = Math.min(me.x, 100 - me.x) * 2;
  return (Math.min(toNeighbour, toEdge) / 100) * pitchWidth - LABEL_GAP_PX;
};

const chooseLabel = (
  player: LineupPlayer,
  maxWidth: number,
  fontFamily: string,
  measured: boolean,
) => {
  const full = player.name;
  const short = player.shortName ?? player.name;
  if (!measured) return short;
  if (textWidth(full, fontFamily) + LABEL_PADDING_PX <= maxWidth) return full;
  return short;
};

const placeOnHalf = (lineup: TeamLineup, side: Side): Placed[] | null =>
  formationLayout(lineup)?.map(({ player, x, y }) =>
    side === "home"
      ? { player, side, x, y: 50 + y / 2 }
      : { player, side, x: 100 - x, y: 50 - y / 2 },
  ) ?? null;

function Pitch({
  match,
  marks,
}: {
  match: matchStats;
  marks: Map<string, PlayerMarks>;
}) {
  const lineups = match.lineups!;
  const { ref, width, fontFamily } = usePitchMetrics();

  const away = placeOnHalf(lineups.away, "away");
  const home = placeOnHalf(lineups.home, "home");
  const placed = [...(away ?? []), ...(home ?? [])];

  return (
    <div
      ref={ref}
      className="relative mx-auto aspect-[679/1027] w-full max-w-md overflow-hidden rounded-lg bg-green-700 bg-cover bg-center"
      style={{ backgroundImage: "url(/pitch.svg)" }}
    >
      <Image
        src={`/${getLogoFile(match.awayTeam)}`}
        alt=""
        aria-hidden
        width={320}
        height={320}
        className="pointer-events-none absolute left-[-20%] top-[5%] h-[46%] w-[46%] object-contain opacity-15"
      />
      <Image
        src={`/${getLogoFile(match.homeTeam)}`}
        alt=""
        aria-hidden
        width={320}
        height={320}
        className="pointer-events-none absolute bottom-[5%] right-[-20%] h-[46%] w-[46%] object-contain opacity-15"
      />

      {/* Formations: away top-right (logo below), home bottom-left (logo above) */}
      {lineups.away.formation && (
        <div className="absolute right-2 top-2 flex flex-col items-center gap-1">
          <span className="rounded bg-black/40 px-1.5 py-0.5 text-[11px] tabular-nums text-white">
            {lineups.away.formation}
          </span>
          <Image
            src={`/${getLogoFile(match.awayTeam)}`}
            alt={`${match.awayTeam} logo`}
            title={match.awayTeam}
            width={32}
            height={32}
            className="h-8 w-8 object-contain drop-shadow"
          />
        </div>
      )}
      {lineups.home.formation && (
        <div className="absolute bottom-2 left-2 flex flex-col items-center gap-1">
          <Image
            src={`/${getLogoFile(match.homeTeam)}`}
            alt={`${match.homeTeam} logo`}
            title={match.homeTeam}
            width={32}
            height={32}
            className="h-8 w-8 object-contain drop-shadow"
          />
          <span className="rounded bg-black/40 px-1.5 py-0.5 text-[11px] tabular-nums text-white">
            {lineups.home.formation}
          </span>
        </div>
      )}

      {!away && (
        <p className="absolute inset-x-0 top-[22%] px-4 text-center text-xs text-white/80">
          {match.awayTeam}&apos;s formation couldn&apos;t be drawn.
        </p>
      )}
      {!home && (
        <p className="absolute inset-x-0 top-[72%] px-4 text-center text-xs text-white/80">
          {match.homeTeam}&apos;s formation couldn&apos;t be drawn.
        </p>
      )}

      {placed.map((p) => {
        const maxWidth = availableWidth(p, placed, width);
        const label = chooseLabel(p.player, maxWidth, fontFamily, width > 0);
        return (
          <div
            key={`${p.side}-${p.player.espnId || p.player.name}`}
            className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center"
            style={{ left: `${p.x}%`, top: `${p.y}%` }}
          >
            <NumberCircle player={p.player} isPitch={true}>
              <PlayerBadges
                marks={marks.get(`${p.side}|${p.player.name}`)}
                subbedOff={p.player.subbedOut}
              />
            </NumberCircle>
            <span
              title={p.player.name}
              className="mt-1 truncate whitespace-nowrap rounded bg-black/45 px-1 leading-tight text-white"
              style={{
                fontSize: LABEL_FONT_PX,
                maxWidth: width ? Math.max(maxWidth, 24) : 64,
              }}
            >
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function SubColumn({ subs }: { subs: MatchEvent[] }) {
  return (
    <div className="min-w-0">
      {subs.length ? (
        <ol className="divide-y divide-gray-100 dark:divide-gray-800">
          {subs.map((s, i) => (
            <li key={i} className="flex items-center gap-2 py-2">
              <span className="w-8 shrink-0 text-xs tabular-nums text-gray-500 dark:text-gray-400">
                {formatMinute(s)}
              </span>
              <EventIcon kind="sub" size={22} />
              <SubStack on={s.player} off={s.playerOut} />
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-xs text-gray-500 dark:text-gray-400">
          No substitutions made.
        </p>
      )}
    </div>
  );
}

function BenchColumn({
  side,
  lineup,
  subMinutes,
  marks,
  color,
}: {
  side: Side;
  lineup: TeamLineup;
  subMinutes: Map<string, string>;
  marks: Map<string, PlayerMarks>;
  color: { bg: string; text: string };
}) {
  const bench = lineup.players.filter((p) => !p.starter);
  return (
    <div className="min-w-0">
      <ul className="space-y-4.5">
        {bench.map((p) => (
          <li key={p.espnId || p.name} className="flex items-center gap-2.5">
            <NumberCircle player={p} size="sm" color={color}>
              <PlayerBadges
                marks={marks.get(`${side}|${p.name}`)}
                subbedIn={p.subbedIn}
                subbedOff={p.subbedOut}
              />
            </NumberCircle>
            <span
              className={cn(
                "min-w-0 flex-1 truncate text-sm",
                p.subbedIn
                  ? "text-gray-900 dark:text-white"
                  : "text-gray-500 dark:text-gray-400",
              )}
            >
              {p.name}
            </span>
            {p.subbedIn ? (
              <span className="shrink-0 text-xs tabular-nums text-green-700 dark:text-green-400">
                Sub {subMinutes.get(p.name) ?? ""}
              </span>
            ) : (
              <span className="shrink-0 text-xs text-gray-400">Bench</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Lineups({ match }: { match: matchStats }) {
  if (!match.lineups)
    return (
      <p className="text-center text-sm text-gray-500 dark:text-gray-400">
        Lineups aren&apos;t available for this match.
      </p>
    );

  const subs = (match.events ?? []).filter((e) => e.kind === "sub");
  const subMinutes = new Map(
    subs.filter((s) => s.player).map((s) => [s.player!, formatMinute(s)]),
  );
  const marks = marksByPlayer(match.events);
  const colors = matchColors(match.homeTeam, match.awayTeam);

  return (
    <div className="space-y-6">
      <Pitch match={match} marks={marks} />

      <div className="space-y-6 rounded-lg bg-white p-4 dark:bg-gray-900">
        <section aria-label="Substitutions" className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
            Substitutions
          </h3>
          <div className="grid gap-6 sm:grid-cols-2">
            <SubColumn subs={subs.filter((s) => s.side === "home")} />
            <SubColumn subs={subs.filter((s) => s.side === "away")} />
          </div>
        </section>

        <section aria-label="Bench" className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
            Bench
          </h3>
          <div className="grid gap-14 sm:grid-cols-2">
            <BenchColumn
              side="home"
              lineup={match.lineups.home}
              subMinutes={subMinutes}
              marks={marks}
              color={colors.home}
            />
            <BenchColumn
              side="away"
              lineup={match.lineups.away}
              subMinutes={subMinutes}
              marks={marks}
              color={colors.away}
            />
          </div>
        </section>
      </div>
    </div>
  );
}
