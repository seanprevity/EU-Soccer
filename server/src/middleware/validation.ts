import type { NextFunction, Request, Response } from "express";
import { z } from "zod";

// The parts of a request a route can validate.
export type RequestSchemas = {
  params?: z.ZodType;
  query?: z.ZodType;
  body?: z.ZodType;
};

type Part = keyof RequestSchemas;
const PARTS: readonly Part[] = ["params", "query", "body"];

// The parsed type of one part, or `unknown` when the route has no schema for it.
type Output<S> = S extends z.ZodType ? z.output<S> : unknown;

/**
 * The shape validate() leaves on res.locals, typed from the route's schemas.
 * Use it as the second type argument of Response in a controller:
 *   res: Response<TeamResponse, Validated<typeof getTeamSchemas>>
 */
export type Validated<S extends RequestSchemas> = {
  validated: {
    params: Output<S["params"]>;
    query: Output<S["query"]>;
    body: Output<S["body"]>;
  };
};

type Issue = { location: Part; path: string; message: string };

// validates schemas
export function validate(schemas: RequestSchemas) {
  return (req: Request, res: Response, next: NextFunction) => {
    const validated: Record<Part, unknown> = {
      params: req.params,
      query: req.query,
      body: req.body,
    };
    const issues: Issue[] = [];

    for (const part of PARTS) {
      const schema = schemas[part];
      if (!schema) continue;

      const result = schema.safeParse(req[part]);
      if (result.success) {
        validated[part] = result.data;
      } else {
        for (const issue of result.error.issues) {
          // String() because a path can contain symbols, which join() can't convert
          issues.push({
            location: part,
            path: issue.path.map(String).join("."),
            message: issue.message,
          });
        }
      }
    }

    if (issues.length > 0) {
      res.status(400).json({ error: "Invalid request", issues });
      return;
    }

    res.locals.validated = validated;
    next();
  };
}
