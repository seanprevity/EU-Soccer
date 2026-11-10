import { NodeSDK } from "@opentelemetry/sdk-node";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { ConsoleSpanExporter } from "@opentelemetry/sdk-trace-base";
import { ExpressLayerType } from "@opentelemetry/instrumentation-express";
import { env } from "../config/env";
import { IncomingMessage } from "node:http";

function isNoiseRequest(request: IncomingMessage): boolean {
  if (request.url === "/health") return true;
  if (request.url === "/metrics") return true;
  return false;
}

// TRACING=otlp on EC2 (send to Alloy), TRACING=console for local testing, unset = off
export function startTracing(serviceName: string) {
  const mode = env.TRACING;
  if (!mode) return;

  let traceExporter;
  if (mode === "console") {
    traceExporter = new ConsoleSpanExporter();
  } else {
    // Alloy on the same machine: local only, no token in the app
    traceExporter = new OTLPTraceExporter({
      url: "http://127.0.0.1:4318/v1/traces",
    });
  }

  const sdk = new NodeSDK({
    serviceName,
    traceExporter,
    instrumentations: [
      getNodeAutoInstrumentations({
        // skip because noisy
        "@opentelemetry/instrumentation-fs": { enabled: false },
        "@opentelemetry/instrumentation-dns": { enabled: false },
        "@opentelemetry/instrumentation-net": { enabled: false },
        "@opentelemetry/instrumentation-router": { enabled: false },
        "@opentelemetry/instrumentation-express": {
          ignoreLayersType: [ExpressLayerType.MIDDLEWARE],
        },
        "@opentelemetry/instrumentation-http": {
          // ignore
          ignoreIncomingRequestHook: isNoiseRequest,
        },
      }),
    ],
  });

  sdk.start();
  console.log(`[tracing] ${serviceName} sending traces (${mode})`);
}
