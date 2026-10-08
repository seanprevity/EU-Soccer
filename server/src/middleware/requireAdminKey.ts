import { NextFunction, Request, Response } from "express";

export const requireAdminKey = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const key = req.header("x-admin-key");
  if (!process.env.ADMIN_KEY || key !== process.env.ADMIN_KEY) {
    res.status(404).end();
    return;
  }
  next();
};
