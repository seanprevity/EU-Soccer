import { cn } from "@/lib/utils";
import { LiveResult } from "@/lib/liveStandings";

/** Static orange dot marking something that's being played right now. */
export function LiveDot({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-block h-2 w-2 shrink-0 rounded-full bg-orange-500 ring-2 ring-orange-500/30",
        className,
      )}
    />
  );
}

export function Movement({ value }: { value: number }) {
  if (value === 0) return null;

  const up = value > 0;
  return (
    <span
      className={cn(
        "text-[10px] font-semibold tabular-nums",
        up
          ? "text-green-600 dark:text-green-400"
          : "text-red-600 dark:text-red-400",
      )}
      title={`${up ? "Up" : "Down"} ${Math.abs(value)} if it stays like this`}
    >
      {up ? "▲" : "▼"}
      {Math.abs(value)}
    </span>
  );
}

const RESULT_STYLE: Record<LiveResult["result"], string> = {
  W: "bg-green-600/15 text-green-700 dark:text-green-400",
  D: "bg-gray-500/15 text-gray-600 dark:text-gray-300",
  L: "bg-red-600/15 text-red-700 dark:text-red-400",
};

export function LiveScore({ live }: { live: LiveResult }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded px-1 text-[10px] font-semibold tabular-nums",
        RESULT_STYLE[live.result],
      )}
      title={`Live vs ${live.opponent}`}
    >
      <LiveDot className="h-1.5 w-1.5 ring-1" />
      {live.score}
    </span>
  );
}
