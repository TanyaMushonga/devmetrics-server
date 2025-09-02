import { Response } from "express";
import { ApiResponse } from "../types";

export class ApiResponseUtil {
  static success<T>(
    res: Response,
    data: T,
    message?: string,
    statusCode = 200
  ) {
    const response: ApiResponse<T> = {
      success: true,
      data,
      message,
    };
    return res.status(statusCode).json(response);
  }

  static error(res: Response, error: string, statusCode = 500) {
    const response: ApiResponse = {
      success: false,
      error,
    };
    return res.status(statusCode).json(response);
  }

  static notFound(res: Response, message = "Resource not found") {
    return this.error(res, message, 404);
  }

  static badRequest(res: Response, message = "Bad request") {
    return this.error(res, message, 400);
  }

  static unauthorized(res: Response, message = "Unauthorized") {
    return this.error(res, message, 401);
  }

  static forbidden(res: Response, message = "Forbidden") {
    return this.error(res, message, 403);
  }

  static internalError(res: Response, message = "Internal server error") {
    return this.error(res, message, 500);
  }
}
