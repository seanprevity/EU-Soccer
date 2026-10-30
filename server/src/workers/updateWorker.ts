import "dotenv/config";
import { isRunning, sleepUntilStopped, stopOnSignals } from "./lifecycle";
import {
  runFullUpdate,
  runQuickUpdate,
} from "../modules/management/management.pipeline";
import client from "../lib/db";

function utcDay(date: Date): string {
  return date.toISOString().slice(0, 10); // "2026-10-31"
}

async function main() {
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
        await runFullUpdate();
        lastDayUpdated = today;
      } else {
        console.log("[update] running quick update");
        await runQuickUpdate();
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
