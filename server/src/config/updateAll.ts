import { runFullUpdate } from "../modules/management/management.pipeline";

runFullUpdate()
  .then((results) => {
    const failed = results.filter((r) => r.status === "failed");
    process.exit(failed.length ? 1 : 0);
  })
  .catch((err: unknown) => {
    console.error("Full update crashed:", err);
    process.exit(1);
  });
