import prisma from "../lib/prisma";
import { Logger } from "../utils";
import {
  searchDevelopersByLocation,
  getDeveloperDetails,
  searchDevelopersGlobally,
} from "./github-search";
import { DeveloperScoringEngine, DeveloperMetrics } from "./scoring-engine";

export interface LeaderboardQuery {
  scope: "global" | "country" | "city" | "continent";
  location?: string;
  metric: "commits" | "pullRequests" | "issues" | "stars" | "overall";
  timeframe: "7d" | "30d" | "90d" | "1y";
  limit?: number;
  offset?: number;
}

export interface LeaderboardResponse {
  leaderboard: Array<{
    rank: number;
    score: number;
    developer: {
      id: string;
      githubHandle: string;
      name?: string;
      avatarUrl?: string;
      location?: string;
      company?: string;
      totalCommits: number;
      totalPullRequests: number;
      totalIssues: number;
      totalStars: number;
      totalReviews: number;
      totalRepos: number;
      followers: number;
    };
    activityTrend: number[];
    topRepositories: Array<{
      name: string;
      stars: number;
      language: string;
    }>;
    lastUpdated: string;
  }>;
  metadata: {
    total: number;
    scope: string;
    location?: string;
    metric: string;
    timeframe: string;
    lastUpdated: string;
  };
}

export class LeaderboardService {
  private scoringEngine: DeveloperScoringEngine;

  constructor() {
    this.scoringEngine = new DeveloperScoringEngine();
  }

  // Get leaderboard data from database
  async getLeaderboard(query: LeaderboardQuery): Promise<LeaderboardResponse> {
    const {
      scope,
      location,
      metric,
      timeframe,
      limit = 20,
      offset = 0,
    } = query;

    try {
      Logger.info(
        `Fetching leaderboard: ${scope} ${
          location || "global"
        } ${metric} ${timeframe}`
      );

      // First check if we have recent data for this query
      const existingEntries = await prisma.leaderboardEntry.findMany({
        where: {
          scope,
          location: scope === "global" ? null : location,
          metric,
          timeframe,
          snapshotDate: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
          },
        },
        include: {
          developer: true,
        },
        orderBy: {
          rank: "asc",
        },
        take: limit,
        skip: offset,
      });

      if (existingEntries.length > 0) {
        Logger.info(
          `Found ${existingEntries.length} cached leaderboard entries`
        );

        const total = await prisma.leaderboardEntry.count({
          where: {
            scope,
            location: scope === "global" ? null : location,
            metric,
            timeframe,
            snapshotDate: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
            },
          },
        });

        return {
          leaderboard: existingEntries.map((entry) => ({
            rank: entry.rank,
            score: entry.score,
            developer: {
              id: entry.developer.id,
              githubHandle: entry.developer.githubHandle,
              name: entry.developer.name || undefined,
              avatarUrl: entry.developer.avatarUrl || undefined,
              location: entry.developer.location || undefined,
              company: entry.developer.company || undefined,
              totalCommits: entry.developer.totalCommits,
              totalPullRequests: entry.developer.totalPullRequests,
              totalIssues: entry.developer.totalIssues,
              totalStars: entry.developer.totalStars,
              totalReviews: entry.developer.totalReviews || 0,
              totalRepos: entry.developer.totalRepos || 0,
              followers: entry.developer.followers,
            },
            activityTrend: this.generateActivityTrend(entry.developer),
            topRepositories: this.getTopRepositories(entry.developer),
            lastUpdated: entry.snapshotDate.toISOString(),
          })),
          metadata: {
            total,
            scope,
            location: scope === "global" ? undefined : location,
            metric,
            timeframe,
            lastUpdated: (
              existingEntries[0]?.snapshotDate || new Date()
            ).toISOString(),
          },
        };
      }

      // If no recent data, trigger population for this location
      Logger.info(
        `No recent data found, triggering population for ${scope} ${
          location || "global"
        }`
      );
      await this.populateLeaderboardData(scope, location, 100);

      // Fetch again after population
      return this.getLeaderboard(query);
    } catch (error) {
      Logger.error("Error fetching leaderboard:", error);
      throw error;
    }
  }

  // Populate leaderboard data by fetching from GitHub
  async populateLeaderboardData(
    scope: string,
    location?: string,
    limit: number = 100
  ): Promise<{ success: boolean; developersAdded: number; message?: string }> {
    try {
      Logger.info(
        `Starting leaderboard population: ${scope} ${
          location || "global"
        } (limit: ${limit})`
      );

      // Get GitHub token (you'll need to configure this)
      const githubToken =
        process.env.GITHUB_TOKEN || process.env.GITHUB_ACCESS_TOKEN;
      if (!githubToken) {
        throw new Error("GitHub token not configured");
      }

      let allDevelopers: any[] = [];
      let hasNextPage = true;
      let cursor: string | undefined;
      let pageCount = 0;
      const maxPages = 10; // Limit to prevent infinite loops

      // Fetch ALL developers from the location first
      while (hasNextPage && pageCount < maxPages) {
        let retryCount = 0;
        const maxRetries = 3;
        let pageSuccess = false;

        while (retryCount < maxRetries && !pageSuccess) {
          try {
            let response: any;

            if (scope === "global") {
              response = await searchDevelopersGlobally(githubToken, {
                limit: 20,
                cursor,
              });
            } else if (location) {
              response = await searchDevelopersByLocation(
                githubToken,
                location,
                20,
                cursor
              );
            } else {
              throw new Error("Location required for non-global scope");
            }

            const developers = response.search?.nodes || [];
            allDevelopers = allDevelopers.concat(developers);

            hasNextPage = response.search?.pageInfo?.hasNextPage || false;
            cursor = response.search?.pageInfo?.endCursor;
            pageCount++;
            pageSuccess = true;

            Logger.info(
              `Fetched page ${pageCount}: ${developers.length} developers (total: ${allDevelopers.length})`
            );

            // Add delay to avoid rate limiting
            await new Promise((resolve) => setTimeout(resolve, 2000));
          } catch (pageError: any) {
            retryCount++;
            Logger.error(
              `Error fetching page ${
                pageCount + 1
              } (attempt ${retryCount}/${maxRetries}):`,
              pageError.message || pageError
            );

            if (retryCount >= maxRetries) {
              Logger.warn(
                `Max retries reached for page ${
                  pageCount + 1
                }. Stopping pagination.`
              );
              hasNextPage = false;
              break;
            }

            // Exponential backoff
            const delay = Math.pow(2, retryCount) * 1000;
            Logger.info(`Retrying in ${delay}ms...`);
            await new Promise((resolve) => setTimeout(resolve, delay));
          }
        }

        if (!pageSuccess) {
          Logger.warn(
            `Failed to fetch page ${
              pageCount + 1
            } after ${maxRetries} attempts. Continuing with available data.`
          );
          break;
        }
      }

      if (pageCount >= maxPages) {
        Logger.warn(
          `Reached maximum page limit (${maxPages}). Some developers may not be included.`
        );
      }

      Logger.info(
        `Fetched total of ${allDevelopers.length} developers from GitHub`
      );

      if (allDevelopers.length === 0) {
        Logger.warn(`No developers found for ${scope} ${location || "global"}`);
        return {
          success: false,
          developersAdded: 0,
          message: `No developers found for ${scope} ${location || "global"}`,
        };
      }

      // Score all developers and sort by score
      const scoredDevelopers = await this.scoreAndSortDevelopers(allDevelopers);

      // Only keep the top N developers (based on limit parameter)
      const topDevelopers = scoredDevelopers.slice(0, limit);

      Logger.info(
        `Storing top ${topDevelopers.length} developers out of ${allDevelopers.length} total`
      );

      let developersAdded = 0;
      const metrics: Array<
        "commits" | "pullRequests" | "issues" | "stars" | "overall"
      > = ["commits", "pullRequests", "issues", "stars", "overall"];
      const timeframes: Array<"7d" | "30d" | "90d" | "1y"> = [
        "7d",
        "30d",
        "90d",
        "1y",
      ];

      // Clear existing leaderboard entries for this location to ensure fresh data
      await this.clearExistingLeaderboardEntries(scope, location);

      for (const scoredDev of topDevelopers) {
        try {
          // Save or update developer
          const developer = await this.saveDeveloper(
            scoredDev.developer,
            scope,
            location
          );
          if (developer) {
            developersAdded++;

            // Create leaderboard entries using the pre-calculated metrics
            for (const metric of metrics) {
              for (const timeframe of timeframes) {
                const score = this.scoringEngine.calculateMetricScore(
                  scoredDev.metrics,
                  metric
                );

                await prisma.leaderboardEntry.create({
                  data: {
                    developerId: developer.id,
                    scope,
                    location: scope === "global" ? null : location,
                    timeframe,
                    metric,
                    score,
                    rank: 0, // Will be updated in ranking step
                    snapshotDate: new Date(),
                  },
                });
              }
            }
          }
        } catch (devError) {
          Logger.error(
            `Error processing developer ${scoredDev.developer.login}:`,
            devError
          );
        }
      }

      // Update rankings for all combinations
      for (const metric of metrics) {
        for (const timeframe of timeframes) {
          await this.updateRankings(scope, location, metric, timeframe);
        }
      }

      Logger.info(
        `Successfully populated ${developersAdded} top developers for ${scope} ${
          location || "global"
        } out of ${allDevelopers.length} total found`
      );

      return {
        success: true,
        developersAdded,
        message: `Successfully populated top ${developersAdded} developers out of ${allDevelopers.length} total found`,
      };
    } catch (error) {
      Logger.error("Error populating leaderboard data:", error);
      return {
        success: false,
        developersAdded: 0,
        message: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // Save developer to database
  private async saveDeveloper(
    githubUser: any,
    scope: string,
    location?: string
  ) {
    try {
      // Extract location data
      const userLocation = this.extractLocationData(
        githubUser.location,
        scope,
        location
      );

      // Calculate total stars from repositories
      const totalStars =
        githubUser.repositories?.nodes?.reduce(
          (sum: number, repo: any) => sum + (repo.stargazerCount || 0),
          0
        ) || 0;

      // Calculate estimated reviews (based on pull requests - this is an approximation)
      const totalReviews = Math.floor(
        (githubUser.contributionsCollection?.totalPullRequestContributions ||
          0) * 0.8
      );

      const developer = await prisma.developer.upsert({
        where: {
          githubHandle: githubUser.login,
        },
        update: {
          name: githubUser.name,
          avatarUrl: githubUser.avatarUrl,
          bio: githubUser.bio,
          company: githubUser.company,
          location: githubUser.location,
          country: userLocation.country,
          city: userLocation.city,
          continent: userLocation.continent,
          website: githubUser.websiteUrl,
          twitterHandle: githubUser.twitterUsername,
          totalCommits:
            githubUser.contributionsCollection?.totalCommitContributions || 0,
          totalPullRequests:
            githubUser.contributionsCollection?.totalPullRequestContributions ||
            0,
          totalIssues:
            githubUser.contributionsCollection?.totalIssueContributions || 0,
          totalStars,
          totalReviews,
          totalRepos: githubUser.repositories?.totalCount || 0,
          followers: githubUser.followers?.totalCount || 0,
          following: githubUser.following?.totalCount || 0,
          lastFetched: new Date(),
        },
        create: {
          githubHandle: githubUser.login,
          githubId: githubUser.id,
          name: githubUser.name,
          avatarUrl: githubUser.avatarUrl,
          bio: githubUser.bio,
          company: githubUser.company,
          location: githubUser.location,
          country: userLocation.country,
          city: userLocation.city,
          continent: userLocation.continent,
          website: githubUser.websiteUrl,
          twitterHandle: githubUser.twitterUsername,
          totalCommits:
            githubUser.contributionsCollection?.totalCommitContributions || 0,
          totalPullRequests:
            githubUser.contributionsCollection?.totalPullRequestContributions ||
            0,
          totalIssues:
            githubUser.contributionsCollection?.totalIssueContributions || 0,
          totalStars,
          totalReviews,
          totalRepos: githubUser.repositories?.totalCount || 0,
          followers: githubUser.followers?.totalCount || 0,
          following: githubUser.following?.totalCount || 0,
        },
      });

      return developer;
    } catch (error) {
      Logger.error(`Error saving developer ${githubUser.login}:`, error);
      return null;
    }
  }

  // Extract and normalize location data
  private extractLocationData(
    location: string,
    scope: string,
    filterLocation?: string
  ) {
    // This is a simplified version - you might want to use a proper geocoding service
    let country = null;
    let city = null;
    let continent = null;

    if (location) {
      const locationLower = location.toLowerCase();

      // Simple country detection (expand this as needed)
      if (locationLower.includes("zimbabwe")) {
        country = "Zimbabwe";
        continent = "Africa";
      } else if (locationLower.includes("south africa")) {
        country = "South Africa";
        continent = "Africa";
      } else if (locationLower.includes("kenya")) {
        country = "Kenya";
        continent = "Africa";
      } else if (locationLower.includes("nigeria")) {
        country = "Nigeria";
        continent = "Africa";
      } else if (locationLower.includes("ghana")) {
        country = "Ghana";
        continent = "Africa";
      }

      // Extract city if available
      const parts = location.split(",");
      if (parts.length > 1) {
        city = parts[0].trim();
      }
    }

    return { country, city, continent };
  }

  // Update rankings for a specific metric/timeframe combination
  private async updateRankings(
    scope: string,
    location: string | undefined,
    metric: string,
    timeframe: string
  ) {
    try {
      // Get all entries for this combination, ordered by score descending
      const entries = await prisma.leaderboardEntry.findMany({
        where: {
          scope,
          location: scope === "global" ? null : location,
          metric,
          timeframe,
          snapshotDate: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
          },
        },
        orderBy: {
          score: "desc",
        },
      });

      // Update rankings
      for (let i = 0; i < entries.length; i++) {
        await prisma.leaderboardEntry.update({
          where: {
            id: entries[i].id,
          },
          data: {
            rank: i + 1,
          },
        });
      }

      Logger.info(
        `Updated rankings for ${scope} ${
          location || "global"
        } ${metric} ${timeframe}: ${entries.length} entries`
      );
    } catch (error) {
      Logger.error(
        `Error updating rankings for ${scope} ${location} ${metric} ${timeframe}:`,
        error
      );
    }
  }

  // Sync all existing developer data
  async syncAllDevelopers(): Promise<void> {
    try {
      Logger.info("Starting sync of all developers");

      const developers = await prisma.developer.findMany({
        where: {
          lastFetched: {
            lt: new Date(Date.now() - 24 * 60 * 60 * 1000), // Older than 24 hours
          },
        },
        take: 50, // Limit to avoid rate limits
      });

      const githubToken =
        process.env.GITHUB_TOKEN || process.env.GITHUB_ACCESS_TOKEN;
      if (!githubToken) {
        Logger.error("GitHub token not configured for sync");
        return;
      }

      for (const developer of developers) {
        try {
          const details = (await getDeveloperDetails(
            githubToken,
            developer.githubHandle
          )) as any;
          if (details.user) {
            await this.saveDeveloper(details.user, "global");
          }
        } catch (error) {
          Logger.error(
            `Error syncing developer ${developer.githubHandle}:`,
            error
          );
        }
      }

      Logger.info(`Synced ${developers.length} developers`);
    } catch (error) {
      Logger.error("Error syncing all developers:", error);
    }
  }

  // Get developer by GitHub handle
  async getDeveloperByHandle(githubHandle: string) {
    try {
      const developer = await prisma.developer.findUnique({
        where: {
          githubHandle,
        },
        include: {
          repositories: {
            take: 10,
            orderBy: {
              stargazersCount: "desc",
            },
          },
          leaderboardEntries: {
            where: {
              snapshotDate: {
                gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
              },
            },
            orderBy: {
              rank: "asc",
            },
          },
        },
      });

      return developer;
    } catch (error) {
      Logger.error(`Error fetching developer ${githubHandle}:`, error);
      return null;
    }
  }

  // Score and sort developers by their overall score
  private async scoreAndSortDevelopers(developers: any[]): Promise<
    Array<{
      developer: any;
      metrics: DeveloperMetrics;
      score: number;
    }>
  > {
    const scoredDevelopers = [];

    for (const dev of developers) {
      try {
        // Calculate total stars from repositories
        const totalStars =
          dev.repositories?.nodes?.reduce(
            (sum: number, repo: any) => sum + (repo.stargazerCount || 0),
            0
          ) || 0;

        const metrics: DeveloperMetrics = {
          totalCommits:
            dev.contributionsCollection?.totalCommitContributions || 0,
          totalPullRequests:
            dev.contributionsCollection?.totalPullRequestContributions || 0,
          totalIssues:
            dev.contributionsCollection?.totalIssueContributions || 0,
          totalStars,
          totalRepos: dev.repositories?.totalCount || 0,
          followers: dev.followers?.totalCount || 0,
          following: dev.following?.totalCount || 0,
        };

        const score = this.scoringEngine.calculateScore(metrics);

        scoredDevelopers.push({
          developer: dev,
          metrics,
          score,
        });
      } catch (error) {
        Logger.error(`Error scoring developer ${dev.login}:`, error);
      }
    }

    // Sort by score in descending order
    return scoredDevelopers.sort((a, b) => b.score - a.score);
  }

  // Clear existing leaderboard entries for a location to ensure fresh data
  private async clearExistingLeaderboardEntries(
    scope: string,
    location?: string
  ) {
    try {
      const deleted = await prisma.leaderboardEntry.deleteMany({
        where: {
          scope,
          location: scope === "global" ? null : location,
          snapshotDate: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
          },
        },
      });

      Logger.info(
        `Cleared ${deleted.count} existing leaderboard entries for ${scope} ${
          location || "global"
        }`
      );
    } catch (error) {
      Logger.error(
        `Error clearing existing entries for ${scope} ${location}:`,
        error
      );
    }
  }

  // Generate activity trend data for the last 30 days
  private generateActivityTrend(developer: any): number[] {
    // Generate mock activity trend for now
    // In a real implementation, you'd fetch actual daily activity data
    const trend = [];
    for (let i = 0; i < 30; i++) {
      // Generate a pseudo-random activity score based on developer metrics
      const baseActivity = Math.floor((developer.totalCommits || 0) / 30);
      const variance = Math.floor(Math.random() * 10);
      trend.push(Math.max(0, baseActivity + variance));
    }
    return trend;
  }

  // Get top repositories for a developer
  private getTopRepositories(
    developer: any
  ): Array<{ name: string; stars: number; language: string }> {
    // For now, return mock data based on developer stats
    // In a real implementation, you'd fetch actual repository data
    const languages = [
      "TypeScript",
      "JavaScript",
      "Python",
      "Java",
      "Go",
      "Rust",
      "C++",
    ];
    const repos = [];

    // Generate 2-3 top repositories
    const repoCount = Math.min(
      3,
      Math.max(1, Math.floor((developer.totalStars || 0) / 100))
    );
    const starsPerRepo = Math.floor((developer.totalStars || 0) / repoCount);

    for (let i = 0; i < repoCount; i++) {
      repos.push({
        name: `${developer.githubHandle}-project-${i + 1}`,
        stars: starsPerRepo + Math.floor(Math.random() * 50),
        language: languages[Math.floor(Math.random() * languages.length)],
      });
    }

    return repos.sort((a, b) => b.stars - a.stars);
  }
}
