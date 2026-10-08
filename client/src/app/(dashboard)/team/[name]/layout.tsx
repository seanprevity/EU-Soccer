import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ name: string }>;
}): Promise<Metadata> {
  const { name } = await params;
  const team = decodeURIComponent(name).replace(/_/g, " ");
  return {
    title: team,
    description: `${team}: results, squad, and league table`,
  };
}

export default function TeamLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
