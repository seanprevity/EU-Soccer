import type { ErrorRequestHandler, RequestHandler } from "express";
import type { ApiError } from "@epl/shared";

/** Any request that matched no route: a JSON 404 instead of Express's HTML page. */
export const notFound: RequestHandler = (req, res) => {
  const body: ApiError = { error: `No route for ${req.method} ${req.path}` };
  res.status(404).json(body);
};

/**
 * Client errors that are safe to show (bad JSON, body too large) keep their status and message.
 * Everything else is logged in full and answered with a generic 500, so database errors and
 * stack traces never reach the browser.
 */
export const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  // The response already started streaming: Express has to close the connection itself
  if (res.headersSent) {
    next(err);
    return;
  }

  // Errors from express.json() and friends carry a status and say whether the message is safe to show
  const status: unknown = err?.status ?? err?.statusCode;
  if (
    typeof status === "number" &&
    status >= 400 &&
    status < 500 &&
    err.expose
  ) {
    const body: ApiError = { error: err.message };
    res.status(status).json(body);
    return;
  }

  console.error(`${req.method} ${req.originalUrl} failed:`, err);
  const body: ApiError = {
    error: "Something went wrong. Try again in a moment.",
  };
  res.status(500).json(body);
};
