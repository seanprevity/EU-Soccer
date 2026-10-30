import { cn } from "@/lib/utils";
import { LiveResult } from "@/lib/liveStandings";

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
        "rounded px-1 text-[10px] font-semibold tabular-nums",
        RESULT_STYLE[live.result],
      )}
      title={`Live vs ${live.opponent}`}
    >
      {live.score}
    </span>
  );
}
