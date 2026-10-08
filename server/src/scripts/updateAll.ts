import "dotenv/config";
import { runFullUpdate } from "../controllers/managementController";

runFullUpdate()
  .then((results) => {
    const failed = results.filter((r) => r.status === "failed");
    process.exit(failed.length ? 1 : 0);
  })
  .catch((err) => {
    console.error("Full update crashed:", err);
    process.exit(1);
  });
