import { Request, Response, NextFunction } from "express";
import { Logger } from "../utils";

export const requestLogger = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const start = Date.now();
  const { method, url, ip } = req;

  res.on("finish", () => {
    const duration = Date.now() - start;
    const { statusCode } = res;

    Logger.info(`${method} ${url}`, {
      statusCode,
      duration: `${duration}ms`,
      ip: ip || req.connection.remoteAddress,
      userAgent: req.get("User-Agent"),
    });
  });

  next();
};
