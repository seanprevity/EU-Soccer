import { NextFunction, Request, Response } from "express";
import { httpRequestDuration } from "../lib/metrics";

// The route pattern, so every match id counts as one route
function routeOf(req: Request): string {
  if (!req.route?.path) return "unmatched"; // 404 errors
  const path = `${req.baseUrl}${req.route.path}`;
  if (path.length > 1 && path.endsWith("/")) return path.slice(0, -1);
  return path;
}

// Times every request and records it once, when it finishes or when the client gives up
export function recordRequestMetrics(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const stopTimer = httpRequestDuration.startTimer();
  let recorded = false;

  function record(statusCode: string) {
    if (recorded) return;
    recorded = true;
    stopTimer({
      method: req.method,
      route: routeOf(req),
      status_code: statusCode,
    });
  }

  res.on("finish", () => record(String(res.statusCode)));
  // The connection closed before a response was sent: the "- - ms - -" requests from the pool hang
  res.on("close", () => {
    if (!res.writableFinished) record("aborted");
  });

  next();
}
