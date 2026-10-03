import Image from "next/image";
import { matchPreview } from "@/types/drizzleTypes";
import { getLogoFile } from "@/lib/utils";
import { useRouter } from "next/navigation";

export function PastMatchesList({ matches }: { matches: matchPreview[] }) {
  const router = useRouter();

  if (!matches || matches.length === 0) {
    return (
      <p className="text-center text-gray-500 dark:text-gray-300 py-6">
        No past matches for this date.
      </p>
    );
  }

  return (
    <ul className="mb-6 space-y-3 sm:space-y-4">
      {matches.map((m) => {
        const colors = {
          gradient: "bg-gray-100 dark:bg-gray-700",
          rectangle: "bg-gray-400 dark:bg-gray-500",
        };

        return (
          <li
            key={m.id}
            className="bg-white dark:bg-gray-800 rounded-md shadow-sm overflow-hidden"
          >
            <button
              onClick={() => router.push(`/postmatch/${m.id}`)}
              className={`relative w-full flex items-center p-2 sm:p-3
                ${colors.gradient}
                hover:bg-gray-200 dark:hover:bg-gray-600
                cursor-pointer transition text-left gap-3`}
            >
              {/* Left indicator */}
              <div
                className={`absolute left-0 top-1/2 -translate-y-1/2 w-3 h-[55%]
                ${colors.rectangle} rounded-r-md -translate-x-1/2`}
              />

              {/* Date */}
              <div className="text-gray-500 dark:text-gray-400 text-xs font-medium whitespace-nowrap">
                {m.matchDate
                  ? new Date(m.matchDate).toLocaleDateString("en-US", {
                      year: "2-digit",
                      month: "2-digit",
                      day: "2-digit",
                    })
                  : "N/A"}
              </div>

              <div className="text-gray-400 dark:text-gray-500 text-sm">|</div>

              {/* Teams + score */}
              <div className="flex items-center justify-between w-full">
                <div className="flex flex-col gap-1.5 flex-1">
                  {/* Home */}
                  <div className="flex items-center gap-2 text-gray-800 dark:text-gray-200">
                    <Image
                      src={`/${getLogoFile(m.homeTeam)}`}
                      alt={m.homeTeam}
                      width={22}
                      height={22}
                    />
                    <span className="text-xs sm:text-sm">{m.homeTeam}</span>
                  </div>

                  {/* Away */}
                  <div className="flex items-center gap-2 text-gray-800 dark:text-gray-200">
                    <Image
                      src={`/${getLogoFile(m.awayTeam)}`}
                      alt={m.awayTeam}
                      width={22}
                      height={22}
                    />
                    <span className="text-xs sm:text-sm">{m.awayTeam}</span>
                  </div>
                </div>

                {/* Scores */}
                <div className="flex flex-col gap-1.5 items-end ml-4">
                  <span className="text-lg sm:text-xl font-bold text-gray-700 dark:text-gray-300">
                    {m.fthg}
                  </span>
                  <span className="text-lg sm:text-xl font-bold text-gray-700 dark:text-gray-300">
                    {m.ftag}
                  </span>
                </div>
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
