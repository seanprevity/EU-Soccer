"use client";

import { setPriority } from "@/state";
import React from "react";
import Table from "./table";
import { useAppSelector } from "@/state/redux";
import { useDispatch } from "react-redux";
import Matches from "./matches";

const Landing = () => {
  const dispatch = useDispatch();
  const priority = useAppSelector((state) => state.global.priority);

  return (
    <div className="flex justify-center items-start min-h-screen bg-gray-100 dark:bg-gray-900 dark:text-gray-100 p-4 md:p-8 overflow-x-hidden">
      <div className="w-full max-w-[1400px] flex flex-col gap-6">
        {/* --- Toggle Button --- */}
        <div className="flex justify-center gap-4 mb-1">
          <button
            className={`px-4 py-2 rounded-md font-semibold transition-colors cursor-pointer ${
              priority === "upcoming"
                ? "bg-gray-700 text-white shadow-md dark:bg-purple-900 dark:hover:bg-purple-800"
                : "bg-white text-gray-700 hover:bg-gray-500 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
            }`}
            onClick={() => dispatch(setPriority("upcoming"))}
          >
            Upcoming Matches
          </button>
          <button
            className={`px-4 py-2 rounded-md font-semibold transition-colors cursor-pointer ${
              priority === "table"
                ? "bg-[#38003c] text-white shadow-md dark:bg-purple-900 dark:hover:bg-purple-800"
                : "bg-white text-gray-700 hover:bg-gray-100 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
            }`}
            onClick={() => dispatch(setPriority("table"))}
          >
            Table Statistics
          </button>
        </div>

        <div className="flex flex-col lg:flex-row gap-4 w-full transition-all duration-500">
          {/* Upcoming Section */}
          <div
            className={`w-full transition-all duration-500 ${
              priority === "upcoming"
                ? "lg:w-[560px] lg:max-w-[560px]"
                : "lg:w-[370px] lg:max-w-[370px]"
            }`}
          >
            <Matches />
          </div>

          {/* Table Section */}
          <div className={`flex-1 w-full min-w-0 transition-all duration-500`}>
            <Table />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Landing;
