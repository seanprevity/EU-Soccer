"use client";

import MatchHistory from "@/components/matchHistory";

const History = ({ team }: { team: string }) => (
  <div className="mx-auto w-full max-w-xl px-4 py-2">
    <MatchHistory team={team} stateKey="team" />
  </div>
);

export default History;
