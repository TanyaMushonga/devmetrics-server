import { request, gql } from "graphql-request";

const GITHUB_API_URL =
  process.env.GITHUB_API_URL || "https://api.github.com/graphql";

export async function fetchGitHubProfile(token: string) {
  const query = gql`
    query {
      viewer {
        id
        login
        name
        avatarUrl
        bio
        company
        location
        websiteUrl
        twitterUsername
        email
        repositories(privacy: PUBLIC) {
          totalCount
        }
        followers {
          totalCount
        }
        following {
          totalCount
        }
        createdAt
        updatedAt
      }
    }
  `;
  return request(
    GITHUB_API_URL,
    query,
    {},
    {
      Authorization: `Bearer ${token}`,
    }
  );
}

export async function fetchGitHubRepos(token: string, cursor?: string) {
  const query = gql`
    query ($cursor: String) {
      viewer {
        repositories(
          first: 100
          after: $cursor
          orderBy: { field: UPDATED_AT, direction: DESC }
        ) {
          pageInfo {
            hasNextPage
            endCursor
          }
          nodes {
            id
            name
            nameWithOwner
            description
            url
            sshUrl
            isPrivate
            primaryLanguage {
              name
            }
            stargazerCount
            forkCount
            watchers {
              totalCount
            }
            issues(states: OPEN) {
              totalCount
            }
            diskUsage
            defaultBranchRef {
              name
            }
            createdAt
            updatedAt
            pushedAt
          }
        }
      }
    }
  `;
  return request(
    GITHUB_API_URL,
    query,
    { cursor },
    {
      Authorization: `Bearer ${token}`,
    }
  );
}

export async function fetchGitHubContributions(
  token: string,
  from?: Date,
  to?: Date
) {
  const fromDate = from
    ? from.toISOString()
    : new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString();
  const toDate = to ? to.toISOString() : new Date().toISOString();

  const query = gql`
    query ($from: DateTime!, $to: DateTime!) {
      viewer {
        contributionsCollection(from: $from, to: $to) {
          totalCommitContributions
          totalIssueContributions
          totalPullRequestContributions
          totalPullRequestReviewContributions
          contributionCalendar {
            totalContributions
            weeks {
              contributionDays {
                contributionCount
                date
              }
            }
          }
        }
      }
    }
  `;
  return request(
    GITHUB_API_URL,
    query,
    { from: fromDate, to: toDate },
    {
      Authorization: `Bearer ${token}`,
    }
  );
}

export async function fetchRepositoryCommits(
  token: string,
  owner: string,
  repo: string,
  since?: Date
) {
  const sinceDate = since
    ? since.toISOString()
    : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const query = gql`
    query ($owner: String!, $repo: String!, $since: GitTimestamp) {
      repository(owner: $owner, name: $repo) {
        defaultBranchRef {
          target {
            ... on Commit {
              history(first: 100, since: $since) {
                pageInfo {
                  hasNextPage
                  endCursor
                }
                nodes {
                  oid
                  message
                  author {
                    name
                    email
                    date
                  }
                  committer {
                    name
                    email
                    date
                  }
                  additions
                  deletions
                  changedFiles
                }
              }
            }
          }
        }
      }
    }
  `;
  return request(
    GITHUB_API_URL,
    query,
    { owner, repo, since: sinceDate },
    {
      Authorization: `Bearer ${token}`,
    }
  );
}

export async function fetchRepositoryPullRequests(
  token: string,
  owner: string,
  repo: string
) {
  const query = gql`
    query ($owner: String!, $repo: String!) {
      repository(owner: $owner, name: $repo) {
        pullRequests(
          first: 100
          orderBy: { field: UPDATED_AT, direction: DESC }
        ) {
          pageInfo {
            hasNextPage
            endCursor
          }
          nodes {
            id
            number
            title
            state
            body
            createdAt
            updatedAt
            closedAt
            mergedAt
            additions
            deletions
            changedFiles
          }
        }
      }
    }
  `;
  return request(
    GITHUB_API_URL,
    query,
    { owner, repo },
    {
      Authorization: `Bearer ${token}`,
    }
  );
}

export async function fetchRepositoryIssues(
  token: string,
  owner: string,
  repo: string
) {
  const query = gql`
    query ($owner: String!, $repo: String!) {
      repository(owner: $owner, name: $repo) {
        issues(first: 100, orderBy: { field: UPDATED_AT, direction: DESC }) {
          pageInfo {
            hasNextPage
            endCursor
          }
          nodes {
            id
            number
            title
            state
            body
            createdAt
            updatedAt
            closedAt
          }
        }
      }
    }
  `;
  return request(
    GITHUB_API_URL,
    query,
    { owner, repo },
    {
      Authorization: `Bearer ${token}`,
    }
  );
}

export async function fetchLanguageStats(
  token: string,
  owner: string,
  repo: string
) {
  const query = gql`
    query ($owner: String!, $repo: String!) {
      repository(owner: $owner, name: $repo) {
        languages(first: 100) {
          edges {
            size
            node {
              name
            }
          }
          totalSize
        }
      }
    }
  `;
  return request(
    GITHUB_API_URL,
    query,
    { owner, repo },
    {
      Authorization: `Bearer ${token}`,
    }
  );
}
