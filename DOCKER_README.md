# DevMetrics Server - Docker Setup

## Quick Start

### 1. Environment Setup

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your configuration (optional for basic setup)
nano .env
```

### 2. Production Build

```bash
# Build and run with PostgreSQL
docker-compose up --build

# Or run in background
docker-compose up -d --build
```

### 3. Development with Hot Reload

```bash
# Run development environment with file watching
docker-compose -f docker-compose.dev.yml up --build
```

## Available Services

- **Application**: http://localhost:4000
- **Health Check**: http://localhost:4000/api/health
- **PostgreSQL**: localhost:5432 (user: postgres, password: postgres, database: devmetrics)

## Useful Commands

```bash
# Production environment
npm run docker:up          # Start production stack
npm run docker:down        # Stop production stack

# Development environment
npm run docker:up:dev      # Start dev stack with hot reload
npm run docker:down:dev    # Stop dev stack

# Database only
npm run docker:db          # Start only PostgreSQL

# View logs
npm run docker:logs        # View application logs
docker-compose logs postgres  # View database logs

# Database operations
npm run prisma:generate    # Generate Prisma client
npm run prisma:migrate     # Run migrations (development)
npm run prisma:deploy      # Deploy migrations (production)
npm run prisma:studio      # Open Prisma Studio
```

## Database Persistence

- Production data: `postgres_data` volume
- Development data: `postgres_data_dev` volume

To reset the database:

```bash
# Stop containers
docker-compose down

# Remove volumes (WARNING: This deletes all data)
docker-compose down -v

# Or remove specific volume
docker volume rm devmetrics-server_postgres_data
```

## Health Checks

The application includes health checks for:

- Application server (checks /api/health endpoint)
- PostgreSQL database (pg_isready)

Check container health:

```bash
docker-compose ps
```
