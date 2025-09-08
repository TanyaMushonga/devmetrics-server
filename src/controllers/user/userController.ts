import { Request, Response } from "express";
import prisma from "../../lib/prisma";
import { ApiResponseUtil, Logger, PaginationUtil } from "../../utils";
import { UserStatsResponse } from "../../types";
import { fetchGitHubContributions } from "../../services/github";

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

export const cleanupOldData = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    Logger.info("Manual cleanup of old data requested");

    const { cleanupOldCommits } = await import("../../services/sync");
    const deletedCount = await cleanupOldCommits();

    Logger.sync(
      "MANUAL_CLEANUP",
      "admin",
      `Cleaned up ${deletedCount} old commits`
    );

    ApiResponseUtil.success(
      res,
      { deletedCommits: deletedCount },
      "Old data cleanup completed successfully"
    );
  } catch (error) {
    Logger.error("Error cleaning up old data:", error);
    ApiResponseUtil.internalError(res, "Failed to cleanup old data");
  }
};

export const getUserContributionHeatmap = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { username } = req.params;
    const { year, from, to } = req.query;

    Logger.info(`Fetching contribution heatmap for user: ${username}`);

    // Find user and get their GitHub token
    const user = await prisma.user.findFirst({
      where: { githubUsername: username },
      select: {
        id: true,
        githubUsername: true,
        githubAccessToken: true,
      },
    });

    if (!user) {
      ApiResponseUtil.notFound(res, "User not found");
      return;
    }

    if (!user.githubAccessToken) {
      ApiResponseUtil.badRequest(res, "User GitHub token not available");
      return;
    }

    // Calculate date range
    let fromDate: Date;
    let toDate: Date;

    if (from && to) {
      fromDate = new Date(from as string);
      toDate = new Date(to as string);
    } else if (year) {
      fromDate = new Date(`${year}-01-01T00:00:00Z`);
      toDate = new Date(`${year}-12-31T23:59:59Z`);
    } else {
      // Default to last 365 days
      toDate = new Date();
      fromDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
    }

    // Fetch contribution data from GitHub
    const contributionData = (await fetchGitHubContributions(
      user.githubAccessToken,
      fromDate,
      toDate
    )) as any;

    const heatmapData = {
      username: user.githubUsername,
      year: year || new Date().getFullYear(),
      fromDate: fromDate.toISOString(),
      toDate: toDate.toISOString(),
      totalContributions:
        contributionData.viewer.contributionsCollection.totalContributions,
      contributionStats: {
        totalCommits:
          contributionData.viewer.contributionsCollection
            .totalCommitContributions,
        totalIssues:
          contributionData.viewer.contributionsCollection
            .totalIssueContributions,
        totalPullRequests:
          contributionData.viewer.contributionsCollection
            .totalPullRequestContributions,
        totalReviews:
          contributionData.viewer.contributionsCollection
            .totalPullRequestReviewContributions,
      },
      contributionCalendar:
        contributionData.viewer.contributionsCollection.contributionCalendar,
    };

    ApiResponseUtil.success(res, heatmapData);
  } catch (error) {
    Logger.error("Error fetching contribution heatmap:", error);
    ApiResponseUtil.internalError(res, "Failed to fetch contribution heatmap");
  }
};

export const getUserContributionActivity = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { username } = req.params;
    const { days = "365" } = req.query;

    Logger.info(`Fetching contribution activity for user: ${username}`);

    const user = await prisma.user.findFirst({
      where: { githubUsername: username },
      include: {
        commitStats: {
          orderBy: { date: "desc" },
          take: parseInt(days as string),
        },
        contributionStats: {
          orderBy: { date: "desc" },
          take: parseInt(days as string),
        },
      },
    });

    if (!user) {
      ApiResponseUtil.notFound(res, "User not found");
      return;
    }

    // If user has GitHub token, fetch fresh data
    let liveContributions = null;
    if (user.githubAccessToken) {
      try {
        const toDate = new Date();
        const fromDate = new Date(
          Date.now() - parseInt(days as string) * 24 * 60 * 60 * 1000
        );

        const contributionData = (await fetchGitHubContributions(
          user.githubAccessToken,
          fromDate,
          toDate
        )) as any;

        liveContributions = contributionData.viewer.contributionsCollection;
      } catch (error) {
        Logger.warn("Could not fetch live contribution data:", error);
      }
    }

    const activityData = {
      username: user.githubUsername,
      period: `${days} days`,
      storedData: {
        commitStats: user.commitStats,
        contributionStats: user.contributionStats,
      },
      liveData: liveContributions,
      summary: {
        totalStoredCommits: user.commitStats.reduce(
          (sum: number, stat: any) => sum + stat.commitCount,
          0
        ),
        totalStoredContributions: user.contributionStats.reduce(
          (sum: number, stat: any) => sum + stat.contributionCount,
          0
        ),
        latestCommitDate: user.commitStats[0]?.date,
        latestContributionDate: user.contributionStats[0]?.date,
      },
    };

    ApiResponseUtil.success(res, activityData);
  } catch (error) {
    Logger.error("Error fetching contribution activity:", error);
    ApiResponseUtil.internalError(res, "Failed to fetch contribution activity");
  }
};

export const getUserContributionStreak = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { username } = req.params;

    Logger.info(`Fetching contribution streak for user: ${username}`);

    const user = await prisma.user.findFirst({
      where: { githubUsername: username },
      select: {
        id: true,
        githubUsername: true,
        githubAccessToken: true,
      },
    });

    if (!user) {
      ApiResponseUtil.notFound(res, "User not found");
      return;
    }

    if (!user.githubAccessToken) {
      // Try to get streak from stored data
      const contributionStats = await prisma.contributionStat.findMany({
        where: { userId: user.id },
        orderBy: { date: "desc" },
        take: 365,
      });

      const streakData = calculateStreakFromStoredData(contributionStats);

      ApiResponseUtil.success(res, {
        username: user.githubUsername,
        dataSource: "stored",
        ...streakData,
      });
      return;
    }

    // Fetch fresh contribution data for streak calculation
    const toDate = new Date();
    const fromDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);

    const contributionData = (await fetchGitHubContributions(
      user.githubAccessToken,
      fromDate,
      toDate
    )) as any;

    const streakData = calculateStreakFromGitHubData(
      contributionData.viewer.contributionsCollection.contributionCalendar
    );

    ApiResponseUtil.success(res, {
      username: user.githubUsername,
      dataSource: "github",
      totalContributions:
        contributionData.viewer.contributionsCollection.totalContributions,
      ...streakData,
    });
  } catch (error) {
    Logger.error("Error fetching contribution streak:", error);
    ApiResponseUtil.internalError(res, "Failed to fetch contribution streak");
  }
};

// Helper function to calculate streak from stored data
function calculateStreakFromStoredData(contributionStats: any[]) {
  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 0;

  // Sort by date ascending for streak calculation
  const sortedStats = contributionStats.sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  for (let i = 0; i < sortedStats.length; i++) {
    if (sortedStats[i].contributionCount > 0) {
      tempStreak++;
      longestStreak = Math.max(longestStreak, tempStreak);

      // Check if this is part of current streak (recent days)
      const daysDiff = Math.floor(
        (new Date().getTime() - new Date(sortedStats[i].date).getTime()) /
          (1000 * 60 * 60 * 24)
      );
      if (daysDiff <= 1) {
        currentStreak = tempStreak;
      }
    } else {
      tempStreak = 0;
    }
  }

  return {
    currentStreak,
    longestStreak,
    totalDaysWithContributions: sortedStats.filter(
      (stat) => stat.contributionCount > 0
    ).length,
  };
}

// Helper function to calculate streak from GitHub contribution calendar
function calculateStreakFromGitHubData(contributionCalendar: any) {
  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 0;
  let totalDaysWithContributions = 0;

  // Flatten the weeks into days and reverse for streak calculation
  const days = contributionCalendar.weeks
    .flatMap((week: any) => week.contributionDays)
    .reverse(); // Start from most recent

  for (let i = 0; i < days.length; i++) {
    if (days[i].contributionCount > 0) {
      totalDaysWithContributions++;

      if (i === 0) {
        // Current day
        currentStreak = 1;
        tempStreak = 1;
      } else {
        // Check if consecutive
        const currentDate = new Date(days[i].date);
        const previousDate = new Date(days[i - 1].date);
        const daysDiff = Math.floor(
          (previousDate.getTime() - currentDate.getTime()) /
            (1000 * 60 * 60 * 24)
        );

        if (daysDiff === 1) {
          tempStreak++;
          if (i < currentStreak + 1) {
            currentStreak = tempStreak;
          }
        } else {
          tempStreak = 1;
        }
      }

      longestStreak = Math.max(longestStreak, tempStreak);
    } else {
      if (i < currentStreak) {
        currentStreak = 0;
      }
      tempStreak = 0;
    }
  }

  return {
    currentStreak,
    longestStreak,
    totalDaysWithContributions,
    contributionCalendar,
  };
}
