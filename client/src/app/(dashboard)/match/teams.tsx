"use client";

import { getLogoFile } from "@/lib/utils";
import { renderForm } from "@/lib/uiUtils";
import Image from "next/image";
import { useRouter } from "next/navigation";
import React from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

const teamHref = (team: string) => `/team/${team.split(" ").join("_")}`;

function TeamBlock({ team, form }: { team: string; form: string | null }) {
  return (
    <div className="flex min-w-0 flex-col items-center gap-2 text-center">
      <Link
        href={teamHref(team)}
        className="flex flex-col items-center gap-2 no-underline transition-opacity hover:opacity-60"
      >
        <div className="flex h-12 w-12 items-center justify-center sm:h-16 sm:w-16">
          <Image
            src={`/${getLogoFile(team)}`}
            alt={`${team} logo`}
            width={64}
            height={64}
            className="max-h-full max-w-full object-contain"
          />
        </div>
        <h2 className="break-words text-lg font-bold text-black sm:text-xl md:text-2xl dark:text-gray-200">
          {team}
        </h2>
      </Link>
      {form && (
        <div className="flex justify-center gap-[2px]">{renderForm(form)}</div>
      )}
    </div>
  );
}

const Teams = ({
  homeTeam,
  awayTeam,
  matchDate,
  homeForm,
  awayForm,
  matchweek,
}: {
  homeTeam: string;
  awayTeam: string;
  matchDate: string;
  homeForm: string | null;
  awayForm: string | null;
  matchweek: number | null;
}) => {
  const router = useRouter();
  const goBack = () => {
    if (window.history.length > 1) router.back();
    else router.push("/");
  };

  return (
    <div className="mx-auto w-full">
      <Button
        variant="ghost"
        size="sm"
        onClick={goBack}
        className="ml-6 mt-4 cursor-pointer text-base font-medium dark:text-gray-100 dark:hover:bg-gray-700"
      >
        <ArrowLeft className="size-4" />
        Back
      </Button>

      {/* Teams: logo, name and form for each side */}
      <div className="mx-auto my-4 grid max-w-3xl grid-cols-[1fr_auto_1fr] items-start gap-3 px-4 sm:my-6 sm:gap-6">
        <TeamBlock team={homeTeam} form={homeForm} />
        <span className="mt-4 shrink-0 text-sm font-bold text-gray-500 sm:mt-5 sm:text-lg md:text-xl dark:text-gray-400">
          VS
        </span>
        <TeamBlock team={awayTeam} form={awayForm} />
      </div>

      <div className="mb-8 flex flex-col items-center gap-2">
        {matchweek != null && (
          <span className="rounded-full bg-[#38003c] px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white dark:bg-gray-700 dark:text-gray-200">
            Matchweek {matchweek}
          </span>
        )}
        <p className="text-center text-gray-600 dark:text-gray-400">
          {new Date(matchDate).toLocaleString("en-GB", {
            timeZone: "UTC",
            weekday: "short",
            day: "numeric",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}{" "}
          (GMT)
        </p>
      </div>
    </div>
  );
};

export default Teams;
