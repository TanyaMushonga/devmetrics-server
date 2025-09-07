export interface LeaderboardEntry {
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
    followers: number;
  };
}

export interface LeaderboardData {
  leaderboard: LeaderboardEntry[];
  metadata: {
    total: number;
    scope: string;
    location?: string;
    metric: string;
    timeframe: string;
    lastUpdated: Date;
  };
}

export interface DeveloperProfile {
  id: string;
  githubHandle: string;
  githubId: string;
  name?: string;
  avatarUrl?: string;
  bio?: string;
  company?: string;
  location?: string;
  country?: string;
  city?: string;
  continent?: string;
  website?: string;
  twitterHandle?: string;
  totalCommits: number;
  totalPullRequests: number;
  totalIssues: number;
  totalStars: number;
  totalReviews: number;
  totalRepos: number;
  followers: number;
  following: number;
  score: number;
  lastFetched: Date;
  createdAt: Date;
  repositories?: Array<{
    id: string;
    name: string;
    fullName: string;
    description?: string;
    language?: string;
    stargazersCount: number;
    forksCount: number;
  }>;
  leaderboardEntries?: Array<{
    scope: string;
    location?: string;
    timeframe: string;
    metric: string;
    rank: number;
    score: number;
  }>;
}
