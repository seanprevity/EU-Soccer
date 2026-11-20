import {
  trace,
  SpanStatusCode,
  type Attributes,
  type Span,
} from "@opentelemetry/api";

type DbOperation = "SELECT" | "INSERT" | "UPDATE" | "DELETE";

const tracer = trace.getTracer("epl");

/**
 * Runs `work` inside a span named `name`. Any spans created inside
 * (database calls, ESPN requests) become its children.
 * Does nothing extra when tracing is off.
 */
export async function withSpan<T>(
  name: string,
  attributes: Attributes,
  work: (span: Span) => PromiseLike<T>,
): Promise<T> {
  return tracer.startActiveSpan(name, { attributes }, async (span) => {
    try {
      const result = await work(span);
      return result;
    } catch (error) {
      if (error instanceof Error) {
        span.recordException(error);
        span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
      } else {
        span.setStatus({ code: SpanStatusCode.ERROR });
      }
      throw error;
    } finally {
      span.end();
    }
  });
}

// Describes postgresql select queries on a table (almost entire backend is selects)
export function withDbSpan<T>(
  table: string,
  work: (span: Span) => PromiseLike<T>,
  operation: DbOperation = "SELECT",
): Promise<T> {
  const attributes: Attributes = {
    "db.system.name": "postgresql",
    "db.operation.name": "SELECT",
    "db.collection.name": table,
  };
  return withSpan(`db.${operation.toLowerCase()} ${table}`, attributes, work);
}
