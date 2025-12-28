# DevMetrics Server

A TypeScript Express backend server for the DevMetrics application that syncs GitHub data and provides API endpoints for user metrics.

![License](https://img.shields.io/badge/license-MIT-blue.svg)

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
├── routes/               # Express routes
├── middleware/           # Express middleware
├── services/             # Business logic services
├── jobs/                 # Background jobs
├── lib/                  # External libraries configuration
├── types/                # TypeScript type definitions
└── utils/                # Utility functions
```

## Prerequisites

- Node.js 18+
- PostgreSQL database (Managed or Local)
- GitHub Personal Access Token with appropriate scopes

## Environment Variables

Create a `.env` file in the root directory:

```env
# Database (Required)
# Connection string to your PostgreSQL instance (Managed or Local)
DATABASE_URL="postgresql://username:password@host:port/database?schema=public"

# GitHub Configuration (Required)
GITHUB_TOKEN="your_personal_access_token"

# Authentication (Required)
JWT_SECRET="your_jwt_secret_key"

# Application (Optional)
PORT=4000
NODE_ENV=production
LOG_LEVEL=info
```

## Installation

1. Install dependencies:

   ```bash
   npm install
   ```

2. Generate Prisma client:

   ```bash
   npx prisma generate
   ```

3. Run database migrations:

   ```bash
   npx prisma migrate deploy
   ```

4. Start the server:
   ```bash
   npm run dev
   ```

## Docker

You can run the application using Docker Compose. Note that this setup assumes you are connecting to an **external managed database** (defined in your `DATABASE_URL`).

1. Set your environment variables in `.env` (or valid shell environment variables).
2. Run the container:

   ```bash
   docker-compose up --build
   ```

To run in development mode with hot-reloads:

```bash
docker-compose -f docker-compose.dev.yml up --build
```

## API Endpoints

### Health Check

- `GET /health` - Returns server status

### User Endpoints

- `GET /users/:username` - Get user profile with stats
- `GET /users/:username/repos` - Get user's repositories with details
- `GET /users/:username/stats` - Get user's contribution statistics
- `POST /users/:username/sync` - Manually trigger sync for a specific user

## Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct, and the process for submitting pull requests to us.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
