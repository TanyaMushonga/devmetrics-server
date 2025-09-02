import prisma from "../lib/prisma";
import { Logger } from "../utils";
import {
  fetchGitHubProfile,
  fetchGitHubRepos,
  fetchGitHubContributions,
  fetchRepositoryCommits,
  fetchRepositoryPullRequests,
  fetchRepositoryIssues,
  fetchLanguageStats,
} from "./github";

export async function syncUserData(userId: string) {
  Logger.sync("START", userId, "Starting user data sync");

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { repositories: true },
  });

  if (!user || !user.githubAccessToken) {
    Logger.warn(`No user found or no GitHub token for user: ${userId}`);
    return;
  }

  try {
    // Fetch user profile data
    const profile = (await fetchGitHubProfile(user.githubAccessToken)) as any;
    console.log(`Fetched profile for: ${profile.viewer.login}`);

    // Update user profile
    await prisma.user.update({
      where: { id: userId },
      data: {
        name: profile.viewer.name,
        image: profile.viewer.avatarUrl,
        bio: profile.viewer.bio,
        location: profile.viewer.location,
        website: profile.viewer.websiteUrl,
        company: profile.viewer.company,
        twitterUsername: profile.viewer.twitterUsername,
        githubUsername: profile.viewer.login,
        publicRepos: profile.viewer.publicRepositories.totalCount,
        followers: profile.viewer.followers.totalCount,
        following: profile.viewer.following.totalCount,
        updatedAt: new Date(),
      },
    });

    // Fetch and sync repositories
    await syncRepositories(
      user.githubAccessToken,
      userId,
      profile.viewer.login
    );

    // Fetch and sync contributions
    await syncContributions(user.githubAccessToken, userId);

    console.log(`Completed sync for user: ${userId}`);
  } catch (error) {
    console.error(`Error syncing user ${userId}:`, error);
    throw error;
  }
}

async function syncRepositories(
  token: string,
  userId: string,
  username: string
) {
  console.log(`Syncing repositories for user: ${userId}`);

  let hasNextPage = true;
  let cursor: string | undefined;
  let allRepos: any[] = [];

  // Fetch all repositories with pagination
  while (hasNextPage) {
    const repoData = (await fetchGitHubRepos(token, cursor)) as any;
    allRepos = allRepos.concat(repoData.viewer.repositories.nodes);
    hasNextPage = repoData.viewer.repositories.pageInfo.hasNextPage;
    cursor = repoData.viewer.repositories.pageInfo.endCursor;
  }

  console.log(`Found ${allRepos.length} repositories`);

  // Process each repository
  for (const repo of allRepos) {
    try {
      // Upsert repository
      const repository = await prisma.repository.upsert({
        where: { githubId: repo.id },
        update: {
          name: repo.name,
          fullName: repo.nameWithOwner,
          description: repo.description,
          htmlUrl: repo.url,
          cloneUrl: repo.cloneUrl,
          sshUrl: repo.sshUrl,
          private: repo.isPrivate,
          language: repo.primaryLanguage?.name,
          stargazersCount: repo.stargazerCount,
          forksCount: repo.forkCount,
          watchersCount: repo.watchers.totalCount,
          openIssuesCount: repo.issues.totalCount,
          size: repo.diskUsage || 0,
          defaultBranch: repo.defaultBranchRef?.name || "main",
          updatedAt: new Date(repo.updatedAt),
          pushedAt: repo.pushedAt ? new Date(repo.pushedAt) : null,
        },
        create: {
          githubId: repo.id,
          name: repo.name,
          fullName: repo.nameWithOwner,
          description: repo.description,
          htmlUrl: repo.url,
          cloneUrl: repo.cloneUrl,
          sshUrl: repo.sshUrl,
          private: repo.isPrivate,
          language: repo.primaryLanguage?.name,
          stargazersCount: repo.stargazerCount,
          forksCount: repo.forkCount,
          watchersCount: repo.watchers.totalCount,
          openIssuesCount: repo.issues.totalCount,
          size: repo.diskUsage || 0,
          defaultBranch: repo.defaultBranchRef?.name || "main",
          createdAt: new Date(repo.createdAt),
          updatedAt: new Date(repo.updatedAt),
          pushedAt: repo.pushedAt ? new Date(repo.pushedAt) : null,
          userId: userId,
        },
      });

      // Sync commits, PRs, and issues for this repository
      const [owner, repoName] = repo.nameWithOwner.split("/");
      await Promise.all([
        syncRepositoryCommits(token, repository.id, owner, repoName),
        syncRepositoryPullRequests(token, repository.id, owner, repoName),
        syncRepositoryIssues(token, repository.id, owner, repoName),
        syncLanguageStats(token, userId, owner, repoName),
      ]);
    } catch (error) {
      console.error(`Error syncing repository ${repo.nameWithOwner}:`, error);
    }
  }
}

async function syncRepositoryCommits(
  token: string,
  repositoryId: string,
  owner: string,
  repo: string
) {
  try {
    const commitsData = (await fetchRepositoryCommits(
      token,
      owner,
      repo
    )) as any;
    const commits =
      commitsData.repository?.defaultBranchRef?.target?.history?.nodes || [];

    for (const commit of commits) {
      await prisma.commit.upsert({
        where: { sha: commit.oid },
        update: {
          message: commit.message,
          authorName: commit.author.name,
          authorEmail: commit.author.email,
          authorDate: new Date(commit.author.date),
          committerName: commit.committer.name,
          committerEmail: commit.committer.email,
          committerDate: new Date(commit.committer.date),
          additions: commit.additions,
          deletions: commit.deletions,
          changedFiles: commit.changedFiles,
        },
        create: {
          sha: commit.oid,
          message: commit.message,
          authorName: commit.author.name,
          authorEmail: commit.author.email,
          authorDate: new Date(commit.author.date),
          committerName: commit.committer.name,
          committerEmail: commit.committer.email,
          committerDate: new Date(commit.committer.date),
          additions: commit.additions,
          deletions: commit.deletions,
          changedFiles: commit.changedFiles,
          repositoryId: repositoryId,
        },
      });
    }
  } catch (error) {
    console.error(`Error syncing commits for ${owner}/${repo}:`, error);
  }
}

async function syncRepositoryPullRequests(
  token: string,
  repositoryId: string,
  owner: string,
  repo: string
) {
  try {
    const prData = (await fetchRepositoryPullRequests(
      token,
      owner,
      repo
    )) as any;
    const pullRequests = prData.repository?.pullRequests?.nodes || [];

    for (const pr of pullRequests) {
      await prisma.pullRequest.upsert({
        where: { githubId: pr.id },
        update: {
          number: pr.number,
          title: pr.title,
          state: pr.state,
          body: pr.body,
          updatedAt: new Date(pr.updatedAt),
          closedAt: pr.closedAt ? new Date(pr.closedAt) : null,
          mergedAt: pr.mergedAt ? new Date(pr.mergedAt) : null,
          additions: pr.additions,
          deletions: pr.deletions,
          changedFiles: pr.changedFiles,
        },
        create: {
          githubId: pr.id,
          number: pr.number,
          title: pr.title,
          state: pr.state,
          body: pr.body,
          createdAt: new Date(pr.createdAt),
          updatedAt: new Date(pr.updatedAt),
          closedAt: pr.closedAt ? new Date(pr.closedAt) : null,
          mergedAt: pr.mergedAt ? new Date(pr.mergedAt) : null,
          additions: pr.additions,
          deletions: pr.deletions,
          changedFiles: pr.changedFiles,
          repositoryId: repositoryId,
        },
      });
    }
  } catch (error) {
    console.error(`Error syncing pull requests for ${owner}/${repo}:`, error);
  }
}

async function syncRepositoryIssues(
  token: string,
  repositoryId: string,
  owner: string,
  repo: string
) {
  try {
    const issuesData = (await fetchRepositoryIssues(token, owner, repo)) as any;
    const issues = issuesData.repository?.issues?.nodes || [];

    for (const issue of issues) {
      await prisma.issue.upsert({
        where: { githubId: issue.id },
        update: {
          number: issue.number,
          title: issue.title,
          state: issue.state,
          body: issue.body,
          updatedAt: new Date(issue.updatedAt),
          closedAt: issue.closedAt ? new Date(issue.closedAt) : null,
        },
        create: {
          githubId: issue.id,
          number: issue.number,
          title: issue.title,
          state: issue.state,
          body: issue.body,
          createdAt: new Date(issue.createdAt),
          updatedAt: new Date(issue.updatedAt),
          closedAt: issue.closedAt ? new Date(issue.closedAt) : null,
          repositoryId: repositoryId,
        },
      });
    }
  } catch (error) {
    console.error(`Error syncing issues for ${owner}/${repo}:`, error);
  }
}

async function syncLanguageStats(
  token: string,
  userId: string,
  owner: string,
  repo: string
) {
  try {
    const langData = (await fetchLanguageStats(token, owner, repo)) as any;
    const languages = langData.repository?.languages?.edges || [];
    const totalSize = langData.repository?.languages?.totalSize || 0;

    // Delete existing language stats for this user
    await prisma.languageStat.deleteMany({ where: { userId } });

    // Create new language stats
    const languageStats = languages.map((lang: any) => ({
      userId,
      language: lang.node.name,
      bytes: lang.size,
      percentage: totalSize > 0 ? (lang.size / totalSize) * 100 : 0,
    }));

    if (languageStats.length > 0) {
      await prisma.languageStat.createMany({ data: languageStats });
    }
  } catch (error) {
    console.error(`Error syncing language stats for ${owner}/${repo}:`, error);
  }
}

async function syncContributions(token: string, userId: string) {
  try {
    const contributionsData = (await fetchGitHubContributions(token)) as any;
    const contributions = contributionsData.viewer.contributionsCollection;

    // Process contribution calendar data
    const contributionDays = contributions.contributionCalendar.weeks.flatMap(
      (week: any) => week.contributionDays
    );

    for (const day of contributionDays) {
      if (day.contributionCount > 0) {
        await prisma.contributionStat.upsert({
          where: {
            userId_date: {
              userId,
              date: new Date(day.date),
            },
          },
          update: {
            contributionCount: day.contributionCount,
          },
          create: {
            userId,
            date: new Date(day.date),
            contributionCount: day.contributionCount,
          },
        });
      }
    }

    console.log(`Synced contributions for user: ${userId}`);
  } catch (error) {
    console.error(`Error syncing contributions for user ${userId}:`, error);
  }
}

export async function syncAllUsers() {
  console.log("Starting sync for all users...");

  const users = await prisma.user.findMany({
    where: {
      githubAccessToken: { not: null },
    },
    select: { id: true, githubUsername: true },
  });

  console.log(`Found ${users.length} users with GitHub tokens`);

  for (const user of users) {
    try {
      await syncUserData(user.id);
      console.log(`✓ Synced user: ${user.githubUsername || user.id}`);
    } catch (error) {
      console.error(
        `✗ Failed to sync user: ${user.githubUsername || user.id}`,
        error
      );
    }
  }

  console.log("Completed sync for all users");
}
