import { Request, Response } from "express";
import prisma from "../../lib/prisma";
import { ApiResponseUtil, Logger, PaginationUtil } from "../../utils";
import { UserStatsResponse } from "../../types";

export const getUserProfile = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { username } = req.params;

    Logger.info(`Fetching user profile for: ${username}`);

    const user = await prisma.user.findFirst({
      where: { githubUsername: username },
      include: {
        repositories: true,
        commitStats: true,
        languageStats: true,
        contributionStats: true,
      },
    });

    if (!user) {
      ApiResponseUtil.notFound(res, "User not found");
      return;
    }

    // Remove sensitive data
    const { githubAccessToken, tokenExpiresAt, ...safeUser } = user as any;

    ApiResponseUtil.success(res, safeUser);
  } catch (error) {
    Logger.error("Error fetching user profile:", error);
    ApiResponseUtil.internalError(res, "Failed to fetch user profile");
  }
};

export const getUserRepositories = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { username } = req.params;
    const pagination = PaginationUtil.getPaginationParams(req.query);

    Logger.info(`Fetching repositories for user: ${username}`);

    const [repos, totalCount] = await Promise.all([
      prisma.repository.findMany({
        where: { user: { githubUsername: username } },
        include: {
          commits: {
            take: 10,
            orderBy: { authorDate: "desc" },
          },
          pullRequests: {
            take: 10,
            orderBy: { updatedAt: "desc" },
          },
          issues: {
            take: 10,
            orderBy: { updatedAt: "desc" },
          },
        },
        take: pagination.limit,
        skip: pagination.offset,
        orderBy: { updatedAt: "desc" },
      }),
      prisma.repository.count({
        where: { user: { githubUsername: username } },
      }),
    ]);

    const paginationMeta = PaginationUtil.getPaginationMeta(
      totalCount,
      pagination.page!,
      pagination.limit!
    );

    ApiResponseUtil.success(res, {
      repositories: repos,
      pagination: paginationMeta,
    });
  } catch (error) {
    Logger.error("Error fetching user repositories:", error);
    ApiResponseUtil.internalError(res, "Failed to fetch repositories");
  }
};

export const getUserStats = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { username } = req.params;

    Logger.info(`Fetching stats for user: ${username}`);

    const user = await prisma.user.findFirst({
      where: { githubUsername: username },
      include: {
        commitStats: {
          orderBy: { date: "desc" },
          take: 365,
        },
        contributionStats: {
          orderBy: { date: "desc" },
          take: 365,
        },
        languageStats: {
          orderBy: { percentage: "desc" },
        },
        repositories: {
          select: {
            stargazersCount: true,
            forksCount: true,
            language: true,
          },
        },
      },
    });

    if (!user) {
      ApiResponseUtil.notFound(res, "User not found");
      return;
    }

    const stats: UserStatsResponse = {
      totalRepos: user.publicRepos,
      totalStars: (user as any).repositories.reduce(
        (sum: number, repo: any) => sum + repo.stargazersCount,
        0
      ),
      totalForks: (user as any).repositories.reduce(
        (sum: number, repo: any) => sum + repo.forksCount,
        0
      ),
      followers: user.followers,
      following: user.following,
      commitStats: (user as any).commitStats,
      contributionStats: (user as any).contributionStats,
      languageStats: (user as any).languageStats,
      topLanguages: (user as any).languageStats.slice(0, 10),
    };

    ApiResponseUtil.success(res, stats);
  } catch (error) {
    Logger.error("Error fetching user stats:", error);
    ApiResponseUtil.internalError(res, "Failed to fetch user statistics");
  }
};

export const syncUserData = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { username } = req.params;

    Logger.info(`Manual sync requested for user: ${username}`);

    const user = await prisma.user.findFirst({
      where: { githubUsername: username },
    });

    if (!user) {
      ApiResponseUtil.notFound(res, "User not found");
      return;
    }

    if (!(user as any).githubAccessToken) {
      ApiResponseUtil.badRequest(res, "No GitHub token found for this user");
      return;
    }

    // Import syncUserData here to avoid circular dependencies
    const { syncUserData: performSync } = await import("../../services/sync");
    await performSync(user.id);

    Logger.sync("MANUAL_TRIGGER", user.id, `Triggered by API for ${username}`);

    ApiResponseUtil.success(res, null, "User data sync completed successfully");
  } catch (error) {
    Logger.error("Error syncing user data:", error);
    ApiResponseUtil.internalError(res, "Failed to sync user data");
  }
};

export const getUserSyncStatus = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { username } = req.params;
    Logger.info(`Fetching sync status for user: ${username}`);

    const user = await prisma.user.findFirst({
      where: { githubUsername: username },
      select: {
        id: true,
        githubUsername: true,
        lastSyncedAt: true,
        updatedAt: true,
        githubAccessToken: true,
      },
    });

    if (!user) {
      ApiResponseUtil.notFound(res, "User not found");
      return;
    }

    ApiResponseUtil.success(res, {
      username: user.githubUsername,
      lastSyncedAt: user.lastSyncedAt,
      updatedAt: user.updatedAt,
      hasToken: !!user.githubAccessToken,
    });
  } catch (error) {
    Logger.error("Error fetching user sync status:", error);
    ApiResponseUtil.internalError(res, "Failed to fetch user sync status");
  }
};
