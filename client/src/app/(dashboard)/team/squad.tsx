"use client";

import { Card, CardContent } from "@/components/ui/card";
import { useGetSquadQuery } from "@/state/api";
import { useMemo } from "react";

const positionOrder = [
  "Coach",
  "Goalkeeper",
  "Defender",
  "Midfielder",
  "Attacker",
];

const Squad = ({ team }: { team: string }) => {
  const {
    data: squad,
    isLoading: isSquadLoading,
    isError,
  } = useGetSquadQuery({
    team: team,
  });

  // Group by position with custom ordering
  const grouped = useMemo(() => {
    if (!squad?.length) return [];

    const groups = squad.reduce<Record<string, typeof squad>>((acc, player) => {
      const key = player.position || "Unknown";
      if (!acc[key]) acc[key] = [];
      acc[key].push(player);
      return acc;
    }, {});
    return positionOrder
      .filter((pos) => groups[pos])
      .map((pos) => ({ position: pos, players: groups[pos] }));
  }, [squad]);

  if (isSquadLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[72.4vh] w-full bg-background dark:bg-gray-900">
        <p className="text-center text-sm text-muted-foreground dark:text-gray-400">
          Loading Squad...
        </p>
      </div>
    );
  }

  if (!squad?.length || isError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[72.4vh] w-full bg-background dark:bg-gray-900">
        <p className="text-center text-sm text-muted-foreground dark:text-gray-400 px-4">
          No squad available for this team. The team might not currently be in
          one of the top 5 leagues.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 bg-background dark:bg-gray-900 p-4">
      {grouped.map(({ position, players }) => (
        <div key={position} className="space-y-3">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-bold dark:text-white tracking-tight">
                  {position !== "Coach" ? position + "s" : position}
                </h2>
              </div>
              <span className="text-sm font-medium text-muted-foreground dark:text-gray-300 dark:bg-gray-700 bg-muted px-3 py-1 rounded-full">
                {players.length}
              </span>
            </div>
            <div className="h-px bg-border dark:bg-gray-700" />
          </div>

          <div className="space-y-2">
            {players.map((player) => (
              <Card
                key={player.player}
                className="border border-border dark:border-gray-700 bg-card dark:bg-gray-800 hover:bg-accent dark:hover:bg-gray-750 transition-colors shadow-sm"
              >
                <CardContent className="pl-4">
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 flex items-center justify-center rounded-full bg-primary dark:bg-blue-600 text-primary-foreground dark:text-white text-[0.8rem] font-bold shrink-0">
                      {position === "Coach" ? "C" : player.number}
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col">
                      <span className="text-base font-medium text-foreground dark:text-gray-100">
                        {player.player}
                      </span>
                      <span className="text-[0.85rem] text-muted-foreground tracking-wider">
                        {position}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default Squad;
