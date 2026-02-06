"use client";

import { useState } from "react";
import { RenderCard } from "@/lib/uiUtils";
import { Button } from "@/components/ui/button";
import { ArrowLeftRight } from "lucide-react";
import { Standings } from "@/types/drizzleTypes";
import { motion, AnimatePresence } from "framer-motion";

const HomeAwayRecord = ({
  stats,
  homeTeam,
  awayTeam,
}: {
  stats: Standings[];
  homeTeam: string;
  awayTeam: string;
}) => {
  const [mode, setMode] = useState<"HOME" | "AWAY">("HOME");
  const homeTeamStats = stats.find(
    (s) => s.name === homeTeam && s.type === mode
  );
  const awayTeamStats = stats.find(
    (s) => s.name === awayTeam && s.type === mode
  );

  if (!stats)
    return (
      <p className="text-center italic text-gray-500 dark:text-gray-200 py-8">
        Loading home/away record…
      </p>
    );

  return (
    <section className="p-4 pb-1 bg-gray-100 dark:bg-gray-900 rounded-lg shadow-sm">
      <div className="flex flex-col items-center gap-6 mb-8">
        <Button
          onClick={() => setMode(mode === "HOME" ? "AWAY" : "HOME")}
          size="lg"
          className="gap-2 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white shadow-lg hover:shadow-xl"
        >
          <ArrowLeftRight className="w-5 h-5" />
          {mode === "HOME" ? "Away" : "Home"}
        </Button>

        <h2 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
          {mode === "HOME" ? "Home" : "Away"} Record
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 md:flex-row gap-6 mb-6">
        <AnimatePresence mode="wait">
          {homeTeamStats && (
            <motion.div
              key={`${homeTeam}-${mode}`}
              initial={{ rotateY: 90, opacity: 0 }}
              animate={{ rotateY: 0, opacity: 1 }}
              exit={{ rotateY: -90, opacity: 0 }}
              transition={{
                duration: 0.4,
                ease: "easeInOut",
              }}
              style={{ transformStyle: "preserve-3d" }}
              className="transform-gpu"
            >
              <RenderCard
                teamLabel={homeTeam}
                record={homeTeamStats}
                mode={mode}
              />
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {awayTeamStats && (
            <motion.div
              key={`${awayTeam}-${mode}`}
              initial={{ rotateY: 90, opacity: 0 }}
              animate={{ rotateY: 0, opacity: 1 }}
              exit={{ rotateY: -90, opacity: 0 }}
              transition={{
                duration: 0.4,
                ease: "easeInOut",
              }}
              style={{ transformStyle: "preserve-3d" }}
              className="transform-gpu"
            >
              <RenderCard
                teamLabel={awayTeam}
                record={awayTeamStats}
                mode={mode}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
};

export default HomeAwayRecord;
