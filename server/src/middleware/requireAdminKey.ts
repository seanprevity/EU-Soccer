import { NextFunction, Request, Response } from "express";
import { env } from "../config/env";

export const requireAdminKey = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const key = req.header("x-admin-key");
  if (!env.ADMIN_KEY || key !== env.ADMIN_KEY) {
    res.status(404).end();
    return;
  }
  next();
};
