import { Request, Response } from "express";
import { ApiResponseUtil, Logger } from "../../utils";
import {
  LeaderboardService,
  LeaderboardQuery,
} from "../../services/leaderboard";

const leaderboardService = new LeaderboardService();

export const getLeaderboardData = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const {
      scope = "country",
      location = "Zimbabwe",
      metric = "overall",
      timeframe = "30d",
      limit = "20",
      offset = "0",
    } = req.query;

    Logger.info(
      `Fetching leaderboard data: ${scope} ${location} ${metric} ${timeframe}`
    );

    const query: LeaderboardQuery = {
      scope: scope as "global" | "country" | "city" | "continent",
      location: scope === "global" ? undefined : (location as string),
      metric: metric as
        | "commits"
        | "pullRequests"
        | "issues"
        | "stars"
        | "overall",
      timeframe: timeframe as "7d" | "30d" | "90d" | "1y",
      limit: parseInt(limit as string, 10),
      offset: parseInt(offset as string, 10),
    };

    const leaderboardData = await leaderboardService.getLeaderboard(query);

    ApiResponseUtil.success(res, leaderboardData);
  } catch (error) {
    Logger.error("Error fetching leaderboard data:", error);
    ApiResponseUtil.internalError(res, "Failed to fetch leaderboard data");
  }
};

export const populateLeaderboardForLocation = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { scope = "country", location, limit = "100" } = req.body;

    if (!location && scope !== "global") {
      ApiResponseUtil.badRequest(
        res,
        "Location is required for non-global scope"
      );
      return;
    }

    Logger.info(`Populating leaderboard for: ${scope} ${location || "global"}`);

    const result = await leaderboardService.populateLeaderboardData(
      scope,
      location,
      parseInt(limit as string, 10)
    );

    if (result.success) {
      ApiResponseUtil.success(
        res,
        result,
        "Leaderboard populated successfully"
      );
    } else {
      ApiResponseUtil.internalError(
        res,
        result.message || "Failed to populate leaderboard"
      );
    }
  } catch (error) {
    Logger.error("Error populating leaderboard:", error);
    ApiResponseUtil.internalError(res, "Failed to populate leaderboard data");
  }
};

export const syncDevelopersData = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    Logger.info("Manual sync of developers data requested");

    await leaderboardService.syncAllDevelopers();

    ApiResponseUtil.success(
      res,
      null,
      "Developers data sync completed successfully"
    );
  } catch (error) {
    Logger.error("Error syncing developers data:", error);
    ApiResponseUtil.internalError(res, "Failed to sync developers data");
  }
};

export const getDeveloperProfile = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { githubHandle } = req.params;

    Logger.info(`Fetching developer profile for: ${githubHandle}`);

    const developer = await leaderboardService.getDeveloperByHandle(
      githubHandle
    );

    if (!developer) {
      ApiResponseUtil.notFound(res, "Developer not found");
      return;
    }

    ApiResponseUtil.success(res, developer);
  } catch (error) {
    Logger.error("Error fetching developer profile:", error);
    ApiResponseUtil.internalError(res, "Failed to fetch developer profile");
  }
};
