import type { HalfStats, MatchStats } from "@epl/shared";

export type StatsPeriod = "total" | "first" | "second";

// Stats that are counts, second half is total - first half
const COUNT_KEYS = [
  "hs",
  "as",
  "hst",
  "ast",
  "hc",
  "ac",
  "hf",
  "af",
  "hy",
  "ay",
  "hr",
  "ar",
  "hbs",
  "abs",
  "hsv",
  "asv",
] as const;
const ALL_KEYS = [...COUNT_KEYS, "hxg", "axg", "hposs", "aposs"] as const;

function round(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function subtract(total: number | null, first: number | null): number | null {
  if (total == null || first == null) return null;
  return Math.max(0, total - first); // never negative, even if ESPN revises a number
}

/**
 * If a team had 60% overall and 50% in the first half, then over equal halves:
 *   60 × 90 = 50 × 45 + second × 45  →  second = 70%
 * `secondHalfMinutes` lets a live match use the minutes played so far.
 */
export function estimateSecondHalfPossession(
  totalPct: number | null,
  firstPct: number | null,
  secondHalfMinutes = 45,
  firstHalfMinutes = 45,
): number | null {
  if (totalPct == null || firstPct == null || secondHalfMinutes <= 0)
    return null;

  const allMinutes = firstHalfMinutes + secondHalfMinutes;
  const estimate =
    (totalPct * allMinutes - firstPct * firstHalfMinutes) / secondHalfMinutes;
  return round(Math.min(100, Math.max(0, estimate)), 1);
}

export function totalsOf(match: MatchStats): HalfStats {
  const totals = {} as HalfStats;
  for (const key of ALL_KEYS) totals[key] = match[key] ?? null;
  return totals;
}

export function secondHalfStats(
  total: HalfStats,
  first: HalfStats,
  secondHalfMinutes = 45,
): HalfStats {
  const second = {} as HalfStats;
  for (const key of COUNT_KEYS) second[key] = subtract(total[key], first[key]);

  const hxg = subtract(total.hxg, first.hxg);
  const axg = subtract(total.axg, first.axg);
  second.hxg = hxg == null ? null : round(hxg, 2);
  second.axg = axg == null ? null : round(axg, 2);

  // Estimate the home side; the away side is the rest, so the two always add up to 100
  second.hposs = estimateSecondHalfPossession(
    total.hposs,
    first.hposs,
    secondHalfMinutes,
  );
  second.aposs = second.hposs == null ? null : round(100 - second.hposs, 1);

  return second;
}

/** The match with its stat columns replaced by one half's, so the Stats tab can show it unchanged. */
export function statsForPeriod(
  match: MatchStats,
  period: StatsPeriod,
  secondHalfMinutes = 45,
): MatchStats {
  if (period === "total" || !match.firstHalf) return match;
  if (period === "first") return { ...match, ...match.firstHalf };
  return {
    ...match,
    ...secondHalfStats(totalsOf(match), match.firstHalf, secondHalfMinutes),
  };
}
