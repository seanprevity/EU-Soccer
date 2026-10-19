import type { Response } from "express";
import type { ApiError } from "@epl/shared";
import { logSummary, type StepResult } from "./management.pipeline";

// A management job as reported by GET /management/status.
export type Job = {
  name: string;
  leagues: string[];
  status: "running" | "ok" | "failed";
  startedAt: string;
  finishedAt: string | null;
  results: StepResult[];
  error?: string;
};

export type JobStarted = {
  job: string;
  leagues: string[];
  startedAt: string;
  status: string;
};
export type JobStatus = { running: Job | null; last: Job | null };

let running: Job | null = null;
let last: Job | null = null;

export const jobStatus = (): JobStatus => ({ running, last });

export const startJob = (
  res: Response<JobStarted | ApiError>,
  name: string,
  leagues: string[],
  work: (results: StepResult[]) => Promise<unknown>,
): void => {
  if (running) {
    res
      .status(409)
      .json({
        error: `"${running.name}" is already running (started ${running.startedAt})`,
      });
    return;
  }

  const job: Job = {
    name,
    leagues,
    status: "running",
    startedAt: new Date().toISOString(),
    finishedAt: null,
    results: [],
  };
  running = job;
  res
    .status(202)
    .json({
      job: name,
      leagues,
      startedAt: job.startedAt,
      status: "/management/status",
    });

  const started = Date.now();
  void (async () => {
    try {
      await work(job.results);
      job.status = job.results.some((r) => r.status !== "ok") ? "failed" : "ok";
    } catch (err) {
      console.error(`${name} crashed:`, err);
      job.status = "failed";
      job.error = err instanceof Error ? err.message : String(err);
    } finally {
      job.finishedAt = new Date().toISOString();
      if (name !== "Full update") logSummary(name, job.results, started); // runFullUpdate logs its own
      last = job;
      running = null;
    }
  })();
};
