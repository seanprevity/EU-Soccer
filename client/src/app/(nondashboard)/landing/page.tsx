"use client";

import { setPriority } from "@/state";
import React from "react";
import Table from "./table";
import { useAppSelector } from "@/state/redux";
import { useDispatch } from "react-redux";
import Matches from "./matches";
import { SegmentedTabs } from "@/components/segmentedTabs";

const Landing = () => {
  const dispatch = useDispatch();
  const priority = useAppSelector((state) => state.global.priority);

  return (
    <div className="flex justify-center items-start min-h-screen bg-gray-100 dark:bg-gray-950/30 dark:text-gray-100 p-4 md:p-8 overflow-x-hidden">
      <div className="w-full max-w-[1400px] flex flex-col gap-6">
        {/* View toggle */}
        <div className="mb-1 flex justify-center">
          <SegmentedTabs
            ariaLabel="Home view"
            className="mb-1"
            options={[
              { key: "upcoming", label: "Upcoming Matches" },
              { key: "table", label: "Table Statistics" },
            ]}
            value={priority}
            onChange={(next) => dispatch(setPriority(next))}
          />
        </div>

        <div className="flex flex-col lg:flex-row gap-4 w-full transition-all duration-500">
          {/* Upcoming Section */}
          <div
            className={`relative w-full transition-all duration-500 ${
              priority === "upcoming"
                ? "lg:w-[560px] lg:max-w-[560px] xl:w-[610px] xl:max-w-[610px]"
                : "lg:w-[370px] lg:max-w-[370px] xl:w-[400px] xl:max-w-[400px]"
            }`}
          >
            {/* On large screens: fill the row's height, set by the table, without affecting it */}
            <div className="lg:absolute lg:inset-0">
              <Matches />
            </div>
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
