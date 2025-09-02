import { Request, Response, NextFunction } from "express";
import { validateUsername } from "../utils/validation";
import { ApiResponseUtil } from "../utils";

export const validateUsernameParam = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { username } = req.params;

  if (!username) {
    return ApiResponseUtil.badRequest(res, "Username is required");
  }

  if (!validateUsername(username)) {
    return ApiResponseUtil.badRequest(res, "Invalid username format");
  }

  next();
};
