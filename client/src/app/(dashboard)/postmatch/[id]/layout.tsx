import type { Metadata } from "next";

const API = process.env.NEXT_PUBLIC_BASE_API_URL;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const url = `${API}/matches/stats?ids=${id}`;
  try {
    const res = await fetch(url, {
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(2000),
    });
    const data = await res.json();
    const m = Array.isArray(data) ? data[0] : data;
    if (!m) return { title: "Match" };
    return {
      title: `${m.homeTeam} ${m.fthg}–${m.ftag} ${m.awayTeam}`,
      description: `${m.homeTeam} ${m.fthg}–${m.ftag} ${m.awayTeam}: timeline, stats and lineups`,
    };
  } catch (err) {
    console.log("[match metadata] failed", url, err);
    return { title: "Match" };
  }
}

export default function MatchLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
