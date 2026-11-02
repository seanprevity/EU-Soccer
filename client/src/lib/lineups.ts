import type { TeamLineup } from "@epl/shared";

export type LineupChanges = { cameIn: string[]; droppedOut: string[] };

// Who's in today's starting XI that wasn't in the previous one, and the reverse.
// Players are matched by ESPN id, falling back to name.
export function lineupChanges(
  previous: TeamLineup,
  current: TeamLineup,
): LineupChanges {
  function startersOf(lineup: TeamLineup): Map<string, string> {
    const starters = new Map<string, string>();
    for (const player of lineup.players) {
      if (player.starter)
        starters.set(player.espnId || player.name, player.name);
    }
    return starters;
  }

  const before = startersOf(previous);
  const after = startersOf(current);

  const cameIn: string[] = [];
  for (const [key, name] of after) {
    if (!before.has(key)) cameIn.push(name);
  }

  const droppedOut: string[] = [];
  for (const [key, name] of before) {
    if (!after.has(key)) droppedOut.push(name);
  }

  return { cameIn, droppedOut };
}
