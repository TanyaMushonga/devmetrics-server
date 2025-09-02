import { Request, Response } from "express";
import { ApiResponseUtil } from "../../utils";

export const getHealth = async (req: Request, res: Response): Promise<void> => {
  try {
    ApiResponseUtil.success(res, {
      status: "ok",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || "development",
    });
  } catch (error) {
    ApiResponseUtil.internalError(res, "Health check failed");
  }
};
