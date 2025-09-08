// Scoring engine for developers based on various metrics
export interface DeveloperMetrics {
  totalCommits: number;
  totalPullRequests: number;
  totalIssues: number;
  totalStars: number;
  totalRepos: number;
  followers: number;
  following: number;
  contributionsLast6Months?: number;
  languageDiversity?: number;
  repoQuality?: number;
}

export interface NormalizedMetrics {
  commits: number;
  pullRequests: number;
  issues: number;
  stars: number;
  repos: number;
  followers: number;
  following: number;
  languageDiversity: number;
  repoQuality: number;
  activity: number;
}

export interface ScoringWeights {
  commits: number;
  pullRequests: number;
  issues: number;
  stars: number;
  repos: number;
  followers: number;
  following: number;
  languageDiversity: number;
  repoQuality: number;
  activity: number;
}

// Default scoring weights
export const DEFAULT_WEIGHTS: ScoringWeights = {
  commits: 0.25,
  pullRequests: 0.2,
  issues: 0.1,
  stars: 0.2,
  repos: 0.08,
  followers: 0.07,
  following: 0.02,
  languageDiversity: 0.03,
  repoQuality: 0.03,
  activity: 0.02,
};

export class DeveloperScoringEngine {
  private weights: ScoringWeights;

  constructor(weights: ScoringWeights = DEFAULT_WEIGHTS) {
    this.weights = weights;
  }

  // Calculate overall score for a developer
  calculateScore(metrics: DeveloperMetrics): number {
    const normalizedMetrics = this.normalizeMetrics(metrics);

    let score = 0;
    score += normalizedMetrics.commits * this.weights.commits;
    score += normalizedMetrics.pullRequests * this.weights.pullRequests;
    score += normalizedMetrics.issues * this.weights.issues;
    score += normalizedMetrics.stars * this.weights.stars;
    score += normalizedMetrics.repos * this.weights.repos;
    score += normalizedMetrics.followers * this.weights.followers;
    score += normalizedMetrics.following * this.weights.following;
    score +=
      normalizedMetrics.languageDiversity * this.weights.languageDiversity;
    score += normalizedMetrics.repoQuality * this.weights.repoQuality;
    score += normalizedMetrics.activity * this.weights.activity;

    return Math.round(score * 100) / 100; // Round to 2 decimal places
  }

  // Calculate metric-specific scores
  calculateMetricScore(metrics: DeveloperMetrics, metric: string): number {
    const normalizedMetrics = this.normalizeMetrics(metrics);

    switch (metric) {
      case "commits":
        return normalizedMetrics.commits * 100;
      case "pullRequests":
        return normalizedMetrics.pullRequests * 100;
      case "issues":
        return normalizedMetrics.issues * 100;
      case "stars":
        return normalizedMetrics.stars * 100;
      case "overall":
        return this.calculateScore(metrics);
      default:
        return this.calculateScore(metrics);
    }
  }

  // Normalize metrics to 0-1 scale using logarithmic scaling for better distribution
  private normalizeMetrics(metrics: DeveloperMetrics): NormalizedMetrics {
    return {
      commits: this.logNormalize(metrics.totalCommits, 1, 10000),
      pullRequests: this.logNormalize(metrics.totalPullRequests, 1, 5000),
      issues: this.logNormalize(metrics.totalIssues, 1, 2000),
      stars: this.logNormalize(metrics.totalStars, 1, 50000),
      repos: this.logNormalize(metrics.totalRepos, 1, 500),
      followers: this.logNormalize(metrics.followers, 1, 100000),
      following: this.logNormalize(metrics.following, 1, 1000),
      languageDiversity: metrics.languageDiversity || 0,
      repoQuality: metrics.repoQuality || 0,
      activity: metrics.contributionsLast6Months
        ? this.logNormalize(metrics.contributionsLast6Months, 1, 2000)
        : 0,
    };
  }

  // Logarithmic normalization function
  private logNormalize(value: number, min: number, max: number): number {
    if (value <= 0) return 0;
    if (value >= max) return 1;

    const logValue = Math.log(value + 1);
    const logMin = Math.log(min + 1);
    const logMax = Math.log(max + 1);

    return (logValue - logMin) / (logMax - logMin);
  }

  // Calculate language diversity score
  static calculateLanguageDiversity(
    languages: Array<{ name: string; count: number }>
  ): number {
    if (languages.length <= 1) return 0;

    const total = languages.reduce((sum, lang) => sum + lang.count, 0);
    if (total === 0) return 0;

    // Calculate Shannon diversity index
    let diversity = 0;
    for (const lang of languages) {
      const proportion = lang.count / total;
      if (proportion > 0) {
        diversity -= proportion * Math.log2(proportion);
      }
    }

    // Normalize to 0-1 scale (max diversity for 10 languages)
    const maxDiversity = Math.log2(Math.min(10, languages.length));
    return maxDiversity > 0 ? diversity / maxDiversity : 0;
  }

  // Calculate repository quality score
  static calculateRepoQuality(
    repos: Array<{
      stargazerCount: number;
      forkCount: number;
      hasDescription: boolean;
      hasReadme: boolean;
      isArchived: boolean;
    }>
  ): number {
    if (repos.length === 0) return 0;

    let qualityScore = 0;
    let totalRepos = repos.length;

    for (const repo of repos) {
      let repoScore = 0;

      // Stars contribution (0-0.4)
      repoScore += Math.min(0.4, repo.stargazerCount * 0.01);

      // Forks contribution (0-0.2)
      repoScore += Math.min(0.2, repo.forkCount * 0.02);

      // Documentation score (0-0.4)
      if (repo.hasDescription) repoScore += 0.2;
      if (repo.hasReadme) repoScore += 0.2;

      // Penalty for archived repos
      if (repo.isArchived) repoScore *= 0.5;

      qualityScore += Math.min(1, repoScore);
    }

    return qualityScore / totalRepos;
  }
}
