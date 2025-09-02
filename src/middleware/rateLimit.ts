import { Request, Response, NextFunction } from "express";
import { ApiResponseUtil } from "../utils";

// Simple in-memory rate limiting (for production, use Redis)
const requestCounts = new Map<string, { count: number; resetTime: number }>();

const createRateLimit = (windowMs: number, max: number) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || req.connection.remoteAddress || "unknown";
    const now = Date.now();

    const clientData = requestCounts.get(ip);

    if (!clientData || now > clientData.resetTime) {
      requestCounts.set(ip, { count: 1, resetTime: now + windowMs });
      return next();
    }

    if (clientData.count >= max) {
      return ApiResponseUtil.error(res, "Rate limit exceeded", 429);
    }

    clientData.count++;
    next();
  };
};

export const generalRateLimit = createRateLimit(15 * 60 * 1000, 100); // 15 minutes, 100 requests
export const syncRateLimit = createRateLimit(60 * 60 * 1000, 5); // 1 hour, 5 requests
