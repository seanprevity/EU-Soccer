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
        {/* View toggle */}
        <div className="mb-1 flex justify-center">
          <div className="inline-flex rounded-lg bg-gray-200 p-1 dark:bg-gray-800">
            {(
              [
                ["upcoming", "Upcoming Matches"],
                ["table", "Table Statistics"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                aria-pressed={priority === key}
                onClick={() => dispatch(setPriority(key))}
                className={`cursor-pointer rounded-md px-4 py-2 text-sm font-semibold transition-colors sm:px-5 ${
                  priority === key
                    ? "bg-white text-gray-900 shadow-sm dark:bg-purple-900 dark:text-white"
                    : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-4 w-full transition-all duration-500">
          {/* Upcoming Section */}
          <div
            className={`w-full transition-all duration-500 ${
              priority === "upcoming"
                ? "lg:w-[560px] lg:max-w-[560px] xl:w-[610px] xl:max-w-[610px]"
                : "lg:w-[370px] lg:max-w-[370px] xl:w-[400px] xl:max-w-[400px]"
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
