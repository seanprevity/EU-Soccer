"use client";

import Image from "next/image";
import { useGetRecentTeamStandingsQuery } from "@/state/api";
import { getCountryFile, getLeagueFile, getLogoFile } from "@/lib/utils";
import { leagues } from "@/types/drizzleTypes";
import { useDispatch } from "react-redux";
import { useAppSelector } from "@/state/redux";
import { setTab } from "@/state";

const Header = ({
  team,
  league,
}: {
  team: string;
  league: leagues | undefined;
}) => {
  const dispatch = useDispatch();
  const tab = useAppSelector((state) => state.global.tab);
  // this will have the one team's spot in the standings
  const { data: standing, isLoading: isStandingsLoading } =
    useGetRecentTeamStandingsQuery({ team });

  if (!league || isStandingsLoading) {
    return (
      <div className="flex justify-center items-center h-[130px] bg-gray-100 dark:bg-gray-900 rounded-md">
        <p className="text-gray-600 dark:text-gray-300 animate-pulse">
          Loading Team Data...
        </p>
      </div>
    );
  }

  return (
    <header className="flex flex-col sm:flex-row justify-center sm:justify-between items-center gap-6 sm:gap-8 bg-white dark:bg-gray-900 px-6 sm:px-10 py-6 shadow-sm">
      {/* Team logo + info */}
      <div className="flex items-center gap-3 sm:gap-5">
        <div className="relative w-[55px] h-[55px] sm:w-[70px] sm:h-[70px] md:w-[80px] md:h-[80px] lg:w-[90px] lg:h-[90px] drop-shadow-md">
          <Image
            src={`/${getLogoFile(team)}`}
            alt={`${team} logo`}
            fill
            className="object-contain rounded-md"
            sizes="90px"
          />
        </div>
        <div className="text-center sm:text-left">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-100 tracking-tight text-center sm:text-left">
            {team}
          </h1>
          {league && (
            <div className="flex items-center justify-center sm:justify-start gap-2 mt-2">
              <div className="relative w-5 h-5 sm:w-6 sm:h-6">
                <Image
                  src={`${getLeagueFile(league.name)}`}
                  alt={`${league.name} flag`}
                  fill
                  className="object-contain rounded-lg"
                />
              </div>
              <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-300">
                {league.name} - {league.country}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Clickable mini standings card */}
      <button
        onClick={() => (tab !== "Table" ? dispatch(setTab("Table")) : null)}
        className="group w-full max-w-sm bg-gray-700 border border-gray-600 rounded-xl overflow-hidden shadow-md transition-all duration-200 hover:shadow-purple-500/20 hover:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer"
      >
        <table className="w-full text-xs sm:text-sm text-gray-200">
          <thead className="bg-gray-800 text-gray-100">
            <tr>
              <th className="py-1 px-2 text-center font-semibold">P</th>
              <th className="py-1 px-2 text-left font-semibold">Club</th>
              <th className="py-1 px-1 text-center font-semibold">MP</th>
              <th className="py-1 px-1 text-center font-semibold">W</th>
              <th className="py-1 px-1 text-center font-semibold">D</th>
              <th className="py-1 px-1 text-center font-semibold">L</th>
            </tr>
          </thead>

          <tbody>
            <tr className="group-hover:bg-purple-800/30 transition-colors">
              <td className="py-1 px-2 text-center font-medium text-white">
                {standing?.position ?? "-"}
              </td>

              <td className="py-1 px-2 text-left">
                <div className="flex items-center gap-2">
                  <div className="relative w-[18px] h-[18px] sm:w-[20px] sm:h-[20px] flex-shrink-0">
                    <Image
                      src={`/${getLogoFile(standing?.name ?? "")}`}
                      alt={`${standing?.name} logo`}
                      fill
                      className="object-contain"
                    />
                  </div>
                  <span className="truncate text-xs md:text-sm max-w-[170px] sm:max-w-[65px] md:max-w-[170px]">
                    {standing?.name}
                  </span>
                </div>
              </td>

              <td className="py-1 px-1 text-center">{standing?.played}</td>
              <td className="py-1 px-1 text-center">{standing?.won}</td>
              <td className="py-1 px-1 text-center">{standing?.draw}</td>
              <td className="py-1 px-1 text-center">{standing?.lost}</td>
            </tr>
          </tbody>
        </table>
      </button>

      {/* Country Logo */}
      <div className="relative w-[65px] h-[65px] sm:w-[80px] sm:h-[80px] drop-shadow-md">
        <Image
          src={`${getCountryFile(league?.country ?? "")}`}
          alt={`${league?.country || "League"} logo`}
          fill
          className="object-contain"
          sizes="80px"
        />
      </div>
    </header>
  );
};

export default Header;
