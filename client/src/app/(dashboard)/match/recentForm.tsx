"use client";

import MatchHistory from "@/components/matchHistory";
import { getLogoFile } from "@/lib/utils";
import Image from "next/image";
import Link from "next/link";

const teamHref = (team: string) => `/team/${team.split(" ").join("_")}`;

function TeamColumn({ team, side }: { team: string; side: "home" | "away" }) {
  return (
    <div className="w-full self-stretch px-2 md:max-w-xl md:flex-1">
      <div className="mb-4 flex flex-col items-center">
        <Image
          src={`/${getLogoFile(team)}`}
          alt={`${team} Logo`}
          width={40}
          height={40}
          className="mb-2 h-10 w-10"
        />
        <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200">
          <Link
            href={teamHref(team)}
            className="no-underline transition-opacity hover:opacity-60"
          >
            {team}
          </Link>
        </h3>
      </div>
      <div className="mb-6">
        <MatchHistory team={team} stateKey={`preview-${side}`} />
      </div>
    </div>
  );
}

const RecentForm = ({
  homeTeam,
  awayTeam,
}: {
  homeTeam: string;
  awayTeam: string;
}) => (
  <div className="w-full pt-2">
    <h2 className="text-center text-2xl font-bold text-gray-800 dark:text-gray-100 mb-4 md:mb-0 mt-6">
      Match History
    </h2>
    <div className="flex flex-col md:flex-row w-full items-start justify-center gap-6 md:gap-8">
      <TeamColumn team={homeTeam} side="home" />
      <TeamColumn team={awayTeam} side="away" />
    </div>
  </div>
);

export default RecentForm;
