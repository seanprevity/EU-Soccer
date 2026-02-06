"use client";

import { getLogoFile } from "@/lib/utils";
import Image from "next/image";
import { useRouter } from "next/navigation";
import React from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

const Teams = ({
  homeTeam,
  awayTeam,
  matchDate,
}: {
  homeTeam: string;
  awayTeam: string;
  matchDate: string;
}) => {
  const router = useRouter();
  return (
    <div className="w-full mx-auto">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => router.push("/")}
        className="mt-4 ml-6 text-base font-medium cursor-pointer dark:text-gray-100 dark:hover:bg-gray-700"
      >
        <ArrowLeft className="size-4" />
        Back
      </Button>
      {/* Match title with logos */}
      <div className="flex items-center justify-center gap-2 sm:gap-3 my-4 sm:my-6 flex-wrap md:flex-nowrap">
        <div className="flex items-center gap-2 sm:gap-3 md:gap-4">
          <div className="w-[35px] sm:w-[65px] h-[35px] sm:h-[65px] flex items-center justify-center">
            <Image
              src={`/${getLogoFile(homeTeam)}`}
              alt={`${homeTeam} logo`}
              width={60}
              height={60}
              className="max-w-full max-h-full"
            />
          </div>
          <Link
            href={`/team/${homeTeam.split(" ").join("_")}`}
            className="no-underline flex items-center gap-2 hover:opacity-60 transition-opacity"
          >
            <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-black dark:text-gray-200">
              {homeTeam}
            </h2>
          </Link>

          <span className="text-sm sm:text-lg md:text-xl font-bold text-gray-500 dark:text-gray-400 shrink-0">
            VS
          </span>
          <Link
            href={`/team/${awayTeam.split(" ").join("_")}`}
            className="no-underline flex items-center gap-2 hover:opacity-60 transition-opacity"
          >
            <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-black dark:text-gray-200">
              {awayTeam}
            </h2>
          </Link>
          <div className="w-[35px] sm:w-[55px] md:w-[65px] h-[35px] sm:h-[55px] md:h-[65px] flex items-center justify-center">
            <Image
              src={`/${getLogoFile(awayTeam!)}`}
              alt={`${awayTeam} logo`}
              width={60}
              height={60}
              className="max-w-full max-h-full"
            />
          </div>
        </div>
      </div>

      <p className="text-center text-gray-600 dark:text-gray-400 mb-8">
        Date: {new Date(matchDate).toLocaleString()} (GMT)
      </p>
    </div>
  );
};

export default Teams;
