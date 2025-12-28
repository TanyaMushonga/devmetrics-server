import { gql, request } from "graphql-request";

const GITHUB_API_URL = "https://api.github.com/graphql";

// Search for developers by location using GitHub GraphQL API
export async function searchDevelopersByLocation(
  token: string,
  location: string,
  first = 20,
  after?: string
): Promise<any> {
  const query = `location:"${location}" repos:>5 followers:>10`;

  const gqlQuery = `
    query SearchDevelopers($query: String!, $after: String, $first: Int!) {
      search(query: $query, type: USER, first: $first, after: $after) {
        pageInfo {
          hasNextPage
          endCursor
        }
        userCount
        nodes {
          ... on User {
            id
            login
            name
            bio
            company
            location
            email
            websiteUrl
            twitterUsername
            avatarUrl
            followers {
              totalCount
            }
            following {
              totalCount
            }
            repositories(first: 5, privacy: PUBLIC, orderBy: {field: STARGAZERS, direction: DESC}) {
              totalCount
              nodes {
                id
                name
                stargazerCount
                forkCount
                primaryLanguage {
                  name
                }
                pushedAt
              }
            }
            contributionsCollection {
              totalCommitContributions
              totalPullRequestContributions
              totalIssueContributions
              totalRepositoryContributions
            }
          }
        }
      }
    }
  `;

  try {
    return await request(
      GITHUB_API_URL,
      gqlQuery,
      {
        query,
        first,
        after,
      },
      {
        Authorization: `Bearer ${token}`,
      }
    );
  } catch (error: any) {
    if (error.response?.status === 502 || error.response?.status === 504) {
      throw new Error(
        `GitHub API temporarily unavailable (${error.response.status}). Please try again later.`
      );
    }
    if (error.response?.status === 403) {
      throw new Error(
        "GitHub API rate limit exceeded. Please wait before retrying."
      );
    }
    if (
      error.response?.errors?.some(
        (err: any) => err.type === "RESOURCE_LIMITS_EXCEEDED"
      )
    ) {
      throw new Error(
        "GitHub API resource limits exceeded. Query too complex."
      );
    }
    throw error;
  }
}

// Get detailed developer information
export async function getDeveloperDetails(token: string, username: string) {
  const query = gql`
    query GetDeveloper($username: String!) {
      user(login: $username) {
        id
        login
        name
        bio
        company
        location
        email
        websiteUrl
        twitterUsername
        avatarUrl
        followers {
          totalCount
        }
        following {
          totalCount
        }
        repositories(first: 100, privacy: PUBLIC, orderBy: {field: UPDATED_AT, direction: DESC}) {
          totalCount
          nodes {
            id
            name
            nameWithOwner
            description
            url
            stargazerCount
            forkCount
            primaryLanguage {
              name
            }
            createdAt
            updatedAt
            pushedAt
            isPrivate
            defaultBranchRef {
              target {
                ... on Commit {
                  history(first: 100, since: "${new Date(
                    Date.now() - 6 * 30 * 24 * 60 * 60 * 1000
                  ).toISOString()}") {
                    totalCount
                    nodes {
                      oid
                      message
                      author {
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
            pullRequests(first: 50, states: [OPEN, CLOSED, MERGED]) {
              totalCount
              nodes {
                id
                number
                title
                state
                createdAt
                updatedAt
                closedAt
                mergedAt
                additions
                deletions
                changedFiles
              }
            }
            issues(first: 50, states: [OPEN, CLOSED]) {
              totalCount
              nodes {
                id
                number
                title
                state
                createdAt
                updatedAt
                closedAt
              }
            }
          }
        }
        contributionsCollection {
          totalCommitContributions
          totalPullRequestContributions
          totalIssueContributions
          totalRepositoryContributions
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
    { username },
    {
      Authorization: `Bearer ${token}`,
    }
  );
}

// Search developers globally with various filters
export async function searchDevelopersGlobally(
  token: string,
  options: { limit?: number; cursor?: string } = {}
): Promise<any> {
  const { limit = 20, cursor } = options;
  const query = "repos:>10 followers:>50";

  const gqlQuery = `
    query SearchDevelopers($query: String!, $after: String, $first: Int!) {
      search(query: $query, type: USER, first: $first, after: $after) {
        pageInfo {
          hasNextPage
          endCursor
        }
        userCount
        nodes {
          ... on User {
            id
            login
            name
            bio
            company
            location
            email
            websiteUrl
            twitterUsername
            avatarUrl
            followers {
              totalCount
            }
            following {
              totalCount
            }
            repositories(first: 5, privacy: PUBLIC, orderBy: {field: STARGAZERS, direction: DESC}) {
              totalCount
              nodes {
                id
                name
                stargazerCount
                forkCount
                primaryLanguage {
                  name
                }
                pushedAt
              }
            }
            contributionsCollection {
              totalCommitContributions
              totalPullRequestContributions
              totalIssueContributions
              totalRepositoryContributions
            }
          }
        }
      }
    }
  `;

  try {
    return await request(
      GITHUB_API_URL,
      gqlQuery,
      {
        query,
        first: limit,
        after: cursor,
      },
      {
        Authorization: `Bearer ${token}`,
      }
    );
  } catch (error: any) {
    if (error.response?.status === 502 || error.response?.status === 504) {
      throw new Error(
        `GitHub API temporarily unavailable (${error.response.status}). Please try again later.`
      );
    }
    if (error.response?.status === 403) {
      throw new Error(
        "GitHub API rate limit exceeded. Please wait before retrying."
      );
    }
    if (
      error.response?.errors?.some(
        (err: any) => err.type === "RESOURCE_LIMITS_EXCEEDED"
      )
    ) {
      throw new Error(
        "GitHub API resource limits exceeded. Query too complex."
      );
    }
    throw error;
  }
}
