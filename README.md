# DevMetrics Server

A TypeScript Express backend server for the DevMetrics application that syncs GitHub data and provides API endpoints for user metrics.

## Features

- **GitHub API Integration**: Fetches comprehensive user data from GitHub GraphQL API
- **Automated Sync**: Scheduled cron job runs every 6 hours to sync all users' data
- **Database Storage**: Stores user profiles, repositories, commits, pull requests, issues, and statistics
- **REST API**: Provides endpoints for accessing cached GitHub data
- **Prisma ORM**: Uses Prisma with PostgreSQL for type-safe database operations

## Project Structure

```
src/
├── index.ts              # Main Express application entry point
├── controllers/          # MVC Controllers
│   ├── health/
│   │   ├── healthController.ts    # Health check controller
│   │   └── index.ts
│   ├── user/
│   │   ├── userController.ts      # User management controller
│   │   └── index.ts
│   └── index.ts          # Controller exports
├── routes/               # Express routes (thin layer)
│   ├── health.ts         # Health check routes
│   └── users.ts          # User-related routes
├── middleware/           # Express middleware
│   ├── errorHandler.ts   # Global error handling
│   ├── requestLogger.ts  # Request logging
│   ├── validation.ts     # Input validation
│   ├── rateLimit.ts      # Rate limiting
│   └── index.ts          # Middleware exports
├── services/             # Business logic services
│   ├── github.ts         # GitHub GraphQL API service
│   └── sync.ts           # Data synchronization logic
├── jobs/                 # Background jobs
│   └── syncJob.ts        # Scheduled cron job for syncing
├── lib/                  # External libraries configuration
│   └── prisma.ts         # Prisma client configuration
├── types/                # TypeScript type definitions
│   └── index.ts          # Shared types and interfaces
└── utils/                # Utility functions
    ├── apiResponse.ts    # Standardized API responses
    ├── pagination.ts     # Pagination helpers
    ├── logger.ts         # Logging utility
    ├── validation.ts     # Validation helpers
    └── index.ts          # Utility exports
```

## Prerequisites

- Node.js 18+
- PostgreSQL database
- GitHub Personal Access Token with appropriate scopes

## Installation

1. Install dependencies:

```bash
npm install
```

2. Set up environment variables in `.env`:

```env
PORT=4000
DATABASE_URL="postgresql://username:password@localhost:5432/devmetrics?schema=public"
GITHUB_API_URL=https://api.github.com/graphql
```

3. Generate Prisma client:

```bash
npx prisma generate
```

4. Run database migrations (if needed):

```bash
npx prisma db push
```

## Development

Start the development server:

```bash
npm run dev
```

The server will start on `http://localhost:4000`

## API Endpoints

### Health Check

- `GET /health` - Returns server status

### User Endpoints

- `GET /users/:username` - Get user profile with stats
- `GET /users/:username/repos` - Get user's repositories with details
- `GET /users/:username/stats` - Get user's contribution statistics
- `POST /users/:username/sync` - Manually trigger sync for a specific user

## Data Synchronization

The server automatically syncs GitHub data every 6 hours for all users with valid GitHub access tokens. The sync process:

1. Fetches user profile information
2. Retrieves all repositories with pagination
3. Gets commits, pull requests, and issues for each repository
4. Collects language statistics
5. Updates contribution calendar data
6. Stores everything in the database

### Manual Sync

You can trigger a manual sync for a specific user:

```bash
curl -X POST http://localhost:4000/users/{username}/sync
```

## GitHub Token Setup

Users need GitHub Personal Access Tokens stored in the database with the following scopes:

- `read:user` - Access to user profile
- `public_repo` - Access to public repositories
- `repo` - Access to private repositories (if needed)

## Database Schema

The application uses the following main models:

- `User` - User profiles and GitHub tokens
- `Repository` - Repository information
- `Commit` - Individual commits
- `PullRequest` - Pull request data
- `Issue` - Repository issues
- `CommitStat` - Daily commit statistics
- `ContributionStat` - Daily contribution counts
- `LanguageStat` - Programming language usage

## Production Deployment

1. Build the application:

```bash
npm run build
```

2. Start the production server:

```bash
npm start
```

## Monitoring

- Check logs for sync operations and errors
- Monitor the `/health` endpoint for server status
- Database queries are logged in development mode

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

[Add your license information here]
