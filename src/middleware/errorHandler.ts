import { Request, Response, NextFunction } from "express";
import { ApiResponseUtil, Logger } from "../utils";

export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  Logger.error("Unhandled error:", error);

  if (error.name === "ValidationError") {
    return ApiResponseUtil.badRequest(res, error.message);
  }

  if (error.name === "UnauthorizedError") {
    return ApiResponseUtil.unauthorized(res, "Invalid token");
  }

  if (error.name === "CastError") {
    return ApiResponseUtil.badRequest(res, "Invalid ID format");
  }

  return ApiResponseUtil.internalError(res, "Something went wrong");
};
