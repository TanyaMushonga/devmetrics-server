import { Router } from "express";
import {
  getLeaderboardData,
  populateLeaderboardForLocation,
  syncDevelopersData,
  getDeveloperProfile,
} from "../controllers/leaderboard";
import {
  generalRateLimit,
  syncRateLimit,
} from "../middleware";

const router = Router();

// Apply general rate limiting to all routes
router.use(generalRateLimit);

// GET /leaderboard - Get leaderboard data
// Query params: scope, location, metric, timeframe, limit, offset
router.get("/", getLeaderboardData);

// POST /leaderboard/populate - Populate leaderboard for a location
// Body: { scope, location, limit }
router.post("/populate", syncRateLimit, populateLeaderboardForLocation);

// POST /leaderboard/sync - Sync all developers data
router.post("/sync", syncRateLimit, syncDevelopersData);

// GET /leaderboard/developer/:githubHandle - Get developer profile
router.get("/developer/:githubHandle", getDeveloperProfile);

export default router;
