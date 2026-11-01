"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useGetLiveMatchQuery } from "@/state/api";
import MatchView, { LiveInfo } from "../../postmatch/matchView";
import { LiveMatch, MatchStats } from "@epl/shared";

// The live row has the same stat columns as matchStats; only these names differ
function toMatchStats(live: LiveMatch): MatchStats {
  return {
    ...live,
    id: 0, // no matchStats row
    matchDate: live.kickoff,
    fthg: live.homeScore,
    ftag: live.awayScore,
    ftr: null,
  };
}

function toLiveInfo(live: LiveMatch): LiveInfo {
  const isHalfTime = live.status === "STATUS_HALFTIME";

  // Everything except the first half (and before kickoff) is at or past half time
  const reachedHalfTime =
    live.status !== "STATUS_FIRST_HALF" && live.status !== "STATUS_SCHEDULED";

  let label = `Live · ${live.clock ?? ""}`;
  if (isHalfTime) label = "Half time";
  const minute = parseInt(live.clock ?? "", 10);
  return {
    label,
    isHalfTime,
    reachedHalfTime,
    minute: Number.isFinite(minute) ? minute : null,
  };
}

export default function LiveMatchPage() {
  const { espnId } = useParams<{ espnId: string }>();
  const router = useRouter();

  const { data, isLoading, isError } = useGetLiveMatchQuery(
    { espnId },
    {
      pollingInterval: 30_000,
    },
  );

  // At full time the live row is gone: move to the finished match page
  useEffect(() => {
    if (data?.status === "finished") {
      router.replace(`/postmatch/${data.matchId}`);
    }
  }, [data, router]);

  if (isLoading) return <p className="p-8 text-center">Loading match…</p>;

  if (isError || !data) {
    return (
      <div className="p-8 text-center">
        <p className="mb-2">We couldn&apos;t find that match.</p>
        <Link href="/" className="underline">
          Back to matches
        </Link>
      </div>
    );
  }

  if (data.status === "finished") {
    return (
      <p className="p-8 text-center">Full time. Loading the final stats…</p>
    );
  }

  return (
    <MatchView match={toMatchStats(data.match)} live={toLiveInfo(data.match)} />
  );
}
