import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import cron from "node-cron";
import healthRouter from "./routes/health";
import usersRouter from "./routes/users";
import leaderboardRouter from "./routes/leaderboard";
import { syncJob } from "./jobs/syncJob";
import { leaderboardSyncJob } from "./jobs/leaderboardSyncJob";
import { errorHandler, requestLogger } from "./middleware";
import { Logger } from "./utils";

// Load environment variables
dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(requestLogger);

// Routes
app.use("/api/health", healthRouter);
app.use("/api/users", usersRouter);
app.use("/api/leaderboard", leaderboardRouter);

// Error handling middleware (must be last)
app.use(errorHandler);

// Schedule sync job every 6 hours
cron.schedule("0 */6 * * *", syncJob);

// Schedule leaderboard sync job daily at 2 AM
cron.schedule("0 2 * * *", leaderboardSyncJob);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  Logger.info(`DevMetrics server running on port ${PORT}`, {
    environment: process.env.NODE_ENV || "development",
    port: PORT,
  });
});
