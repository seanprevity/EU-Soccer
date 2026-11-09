import http from "node:http";
import client from "@prometheus-io/client";

export type ServiceName = "api" | "live" | "update";

// ports for the workers and API
const METRICS_PORTS: Record<ServiceName, number> = {
  api: 9464,
  live: 9465,
  update: 9466,
};

export const registry = new client.Registry();

// How long each API request takes. Its _count also gives the request rate and, by status, the error rate
export const httpRequestDuration = new client.Histogram({
  name: "http_request_duration_seconds",
  help: "API request duration in seconds, by route and status",
  labelNames: ["method", "route", "status_code"] as const,
  // mostly 100–250 ms
  buckets: [0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [registry],
});

// Call once at startup: labels every metric with the process it came from,
// adds Node's built-in metrics, starts /metrics
export function startMetrics(service: ServiceName) {
  registry.setDefaultLabels({ service });
  client.collectDefaultMetrics({ register: registry });

  const server = http.createServer(async (req, res) => {
    if (req.url !== "/metrics") {
      res.statusCode = 404;
      res.end();
      return;
    }
    res.setHeader("Content-Type", registry.contentType);
    res.end(await registry.metrics());
  });

  // 127.0.0.1 only: reachable from this machine (Alloy), never from outside
  const port = METRICS_PORTS[service];
  server.listen(port, "127.0.0.1", () => {
    console.log(`[metrics] serving on http://127.0.0.1:${port}/metrics`);
  });

  // allows worker to end
  server.unref();
  return server;
}

// Live worker

// How long one pass over all leagues takes. Should stay well under the 30 s polling gap
export const liveTickDuration = new client.Histogram({
  name: "live_tick_duration_seconds",
  help: "Duration of one live worker tick",
  buckets: [0.5, 1, 2, 5, 10, 20, 30, 60],
  registers: [registry],
});

export const liveMatchCount = new client.Gauge({
  name: "live_matches",
  help: "Matches currently being played",
  registers: [registry],
});

// Heartbeat: if this stops moving, the live worker is stuck or dead
export const liveLastTick = new client.Gauge({
  name: "live_last_tick_timestamp_seconds",
  help: "When the live worker last finished a tick",
  registers: [registry],
});

// ESPN

export const espnRequests = new client.Counter({
  name: "espn_requests_total",
  help: "Requests to ESPN, by endpoint and outcome",
  labelNames: ["endpoint", "outcome"] as const,
  registers: [registry],
});

// "scoreboard", "summary" or "core"
export function recordEspnRequest(url: string, outcome: "ok" | "error") {
  let endpoint = "other";
  if (url.includes("sports.core.api")) endpoint = "core";
  else if (url.includes("/scoreboard")) endpoint = "scoreboard";
  else if (url.includes("/summary")) endpoint = "summary";
  espnRequests.inc({ endpoint, outcome });
}

// Update worker

export const updateRunDuration = new client.Histogram({
  name: "update_run_duration_seconds",
  help: "Duration of an update run",
  labelNames: ["kind"] as const, // quick or full update
  buckets: [30, 60, 120, 300, 600, 1200, 1800],
  registers: [registry],
});

export const updateStepFailures = new client.Counter({
  name: "update_step_failures_total",
  help: "Pipeline steps that failed",
  labelNames: ["kind"] as const,
  registers: [registry],
});

// Heartbeat: the time of the last run with no failed steps
export const updateLastSuccess = new client.Gauge({
  name: "update_last_success_timestamp_seconds",
  help: "When an update run last finished with no failed steps",
  labelNames: ["kind"] as const,
  registers: [registry],
});
