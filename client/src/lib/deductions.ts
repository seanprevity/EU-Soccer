import {
  POINT_DEDUCTIONS,
  type PointDeduction,
  type Standing,
} from "@epl/shared";
import type { StandingType } from "@/lib/liveStandings";

function startYear(season: string | number): string {
  return String(season).slice(0, 4);
}

// Upheld deductions for one league and season (empty for almost every season)
export function deductionsFor(
  league: string,
  season: string,
): PointDeduction[] {
  return POINT_DEDUCTIONS.filter(
    (d) => d.league === league && d.season === startYear(season),
  );
}

// compares same way server does
function compareStandings(a: Standing, b: Standing): number {
  if (b.points !== a.points) return b.points - a.points;
  if (b.goalDifference !== a.goalDifference)
    return b.goalDifference - a.goalDifference;
  if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
  return a.name.localeCompare(b.name);
}

// Subtracts the season's deductions from the TOTAL table, re-sorts it, and renumbers positions.
export function applyDeductions<T extends Standing>(
  rows: T[],
  league: string,
  season: string,
  type: StandingType,
): { rows: T[]; deductions: PointDeduction[] } {
  if (type !== "TOTAL") return { rows, deductions: [] };

  const teamsInTable = new Set(rows.map((row) => row.name));
  const deductions = deductionsFor(league, season).filter((d) =>
    teamsInTable.has(d.team),
  );
  if (deductions.length === 0) return { rows, deductions };

  const pointsOff = new Map(deductions.map((d) => [d.team, d.points]));
  const adjusted = rows.map((row) => {
    const off = pointsOff.get(row.name);
    if (off === undefined) return row;
    return { ...row, points: row.points - off };
  });

  adjusted.sort(compareStandings);
  // Teams placed last go to the bottom, keeping their points (Juventus 05-06)
  const placedLast = new Set(
    deductions.filter((d) => d.placedLast).map((d) => d.team),
  );
  const ordered = [
    ...adjusted.filter((row) => !placedLast.has(row.name)),
    ...adjusted.filter((row) => placedLast.has(row.name)),
  ];

  const ranked = ordered.map((row, index) => ({ ...row, position: index + 1 }));
  return { rows: ranked, deductions };
}

// "−9 points (Entered financial administration)" or "placed last (Calciopoli: …)"
export function describeDeduction(d: PointDeduction): string {
  if (d.placedLast) return `placed last (${d.reason})`;
  const unit = d.points === 1 ? "point" : "points";
  return `−${d.points} ${unit} (${d.reason})`;
}
