import "dotenv/config";
import { isRunning, sleepUntilStopped, stopOnSignals } from "./lifecycle";
import {
  runFullUpdate,
  runQuickUpdate,
  StepResult,
} from "../modules/management/management.pipeline";
import client from "../lib/db";
import {
  startMetrics,
  updateLastSuccess,
  updateRunDuration,
  updateStepFailures,
} from "../lib/metrics";

function utcDay(date: Date): string {
  return date.toISOString().slice(0, 10); // "2026-10-31"
}

// Times a run and, if no step failed, moves the heartbeat forward
async function runAndRecord(
  kind: "quick" | "full",
  run: () => Promise<StepResult[]>,
) {
  const stopTimer = updateRunDuration.startTimer({ kind });
  try {
    const results = await run();
    const failed = results.filter((r) => r.status === "failed").length;
    updateStepFailures.inc({ kind }, failed);
    if (failed === 0) updateLastSuccess.setToCurrentTime({ kind });
  } finally {
    stopTimer();
  }
}

async function main() {
  startMetrics("update");

  stopOnSignals();

  const now = new Date();
  let lastDayUpdated: string | null =
    now.getUTCHours() >= 6 ? utcDay(now) : null;

  while (isRunning()) {
    const checkTime = new Date();
    const today = utcDay(checkTime);
    const updateDue = checkTime.getUTCHours() >= 6 && lastDayUpdated !== today;
    try {
      if (updateDue) {
        console.log("[update] running full update");
        await runAndRecord("full", runFullUpdate);
        lastDayUpdated = today;
      } else {
        console.log("[update] running quick update");
        await runAndRecord("quick", runQuickUpdate);
      }
    } catch (error) {
      console.error("[update] update crashed:", error);
    }
    if (!isRunning()) break;
    console.log(`[update] next update in 3h`);
    await sleepUntilStopped(10_800_000);
  }

  console.log("[update] stopped");
  await client.end({ timeout: 5 });
}

main().catch((error) => {
  console.error("[update] crashed", error);
  process.exit(1);
});
