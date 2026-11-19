import { NextFunction, Request, Response } from "express";
import {
  trace,
  isSpanContextValid,
  TraceFlags,
  type Span,
} from "@opentelemetry/api";
import type { LabelValues } from "@prometheus-io/client";
import { httpRequestDuration } from "../lib/metrics";

// The route pattern, so every match id counts as one route
function routeOf(req: Request): string {
  if (!req.route?.path) return "unmatched"; // 404 errors
  const path = `${req.baseUrl}${req.route.path}`;
  if (path.length > 1 && path.endsWith("/")) return path.slice(0, -1);
  return path;
}

// The trace id of this request, only if it's a real trace that is being sent to Tempo
function traceIdOf(span: Span | undefined): string | undefined {
  if (!span) return undefined; // tracing is off

  const context = span.spanContext();
  if (!isSpanContextValid(context)) return undefined;

  const sampled =
    (context.traceFlags & TraceFlags.SAMPLED) === TraceFlags.SAMPLED;
  if (!sampled) return undefined;

  return context.traceId;
}

// Times every request and records it once, when it finishes or when the client gives up
export function recordRequestMetrics(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const startedAt = process.hrtime.bigint();
  // Read now: this middleware runs inside the request's HTTP span
  const traceId = traceIdOf(trace.getActiveSpan());
  let recorded = false;

  function record(statusCode: string) {
    if (recorded) return;
    recorded = true;

    const seconds = Number(process.hrtime.bigint() - startedAt) / 1e9;
    const labels = {
      method: req.method,
      route: routeOf(req),
      status_code: statusCode,
    };

    if (traceId) {
      // The library types exemplar labels as the metric's own labels (method/route/status_code),
      // but exemplars use their own label set
      const exemplarLabels = { trace_id: traceId } as LabelValues<string>;
      httpRequestDuration.observe({
        labels,
        value: seconds,
        exemplarLabels,
      });
    } else {
      httpRequestDuration.observe({ labels, value: seconds });
    }
  }

  res.on("finish", () => record(String(res.statusCode)));
  // The connection closed before a response was sent
  res.on("close", () => {
    if (!res.writableFinished) record("aborted");
  });

  next();
}
