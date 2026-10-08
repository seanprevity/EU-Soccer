import type { Metadata } from "next";

const API = process.env.NEXT_PUBLIC_BASE_API_URL;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const url = `${API}/matches/upcoming/${id}`;
  try {
    const res = await fetch(url, {
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(2000),
    });
    if (!res.ok) return { title: "Match" };
    const m = await res.json();
    return {
      title: `${m.homeTeam} vs ${m.awayTeam}`,
      description: `${m.homeTeam} vs ${m.awayTeam}: prediction, odds, form and head to head`,
    };
  } catch (err) {
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
