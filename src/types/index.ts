import { Request, Response, NextFunction } from "express";

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    githubUsername?: string;
  };
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  offset?: number;
}

export interface UserStatsResponse {
  totalRepos: number | null;
  totalStars: number;
  totalForks: number;
  followers: number | null;
  following: number | null;
  commitStats: any[];
  contributionStats: any[];
  languageStats: any[];
  topLanguages: any[];
}

export interface GitHubProfile {
  viewer: {
    id: string;
    login: string;
    name: string;
    avatarUrl: string;
    bio: string;
    company: string;
    location: string;
    websiteUrl: string;
    twitterUsername: string;
    email: string;
    publicRepositories: {
      totalCount: number;
    };
    followers: {
      totalCount: number;
    };
    following: {
      totalCount: number;
    };
    createdAt: string;
    updatedAt: string;
  };
}

export interface GitHubRepository {
  id: string;
  name: string;
  nameWithOwner: string;
  description: string;
  url: string;
  sshUrl: string;
  cloneUrl: string;
  isPrivate: boolean;
  primaryLanguage?: {
    name: string;
  };
  stargazerCount: number;
  forkCount: number;
  watchers: {
    totalCount: number;
  };
  issues: {
    totalCount: number;
  };
  diskUsage: number;
  defaultBranchRef?: {
    name: string;
  };
  createdAt: string;
  updatedAt: string;
  pushedAt?: string;
}

export type AsyncController = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<void>;

export type AsyncMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<void>;

// Re-export leaderboard types
export * from "./leaderboard";
