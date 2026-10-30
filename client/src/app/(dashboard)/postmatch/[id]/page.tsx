"use client";

import { useParams } from "next/navigation";
import { useGetMatchStatsQuery } from "@/state/api";
import MatchView from "../matchView";

export default function PostMatchPage() {
  const { id } = useParams<{ id: string }>();
  const matchId = Number(id);
  const validId = Number.isInteger(matchId) && matchId > 0;

  const { data, isLoading, isError } = useGetMatchStatsQuery(
    { ids: matchId },
    { skip: !validId },
  );
  const match = data?.[0];

  if (!validId)
    return <p className="p-8 text-center">This match link isn&apos;t valid.</p>;
  if (isLoading) return <p className="p-8 text-center">Loading match…</p>;
  if (isError || !match)
    return <p className="p-8 text-center">Match not found.</p>;

  return <MatchView match={match} />;
}
