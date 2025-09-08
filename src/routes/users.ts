import { Router } from "express";
import {
  getUserProfile,
  getUserRepositories,
  getUserStats,
  syncUserData,
  getUserSyncStatus,
  cleanupOldData,
  getUserContributionHeatmap,
  getUserContributionActivity,
  getUserContributionStreak,
} from "../controllers/user";
import {
  validateUsernameParam,
  generalRateLimit,
  syncRateLimit,
} from "../middleware";

const router = Router();

// Apply general rate limiting to all routes
router.use(generalRateLimit);

// Apply username validation to all routes with :username parameter
router.param("username", validateUsernameParam);

// GET /users/:username - Get user profile
router.get("/:username", getUserProfile);

// GET /users/:username/repos - Get user repositories
router.get("/:username/repos", getUserRepositories);

// GET /users/:username/stats - Get user statistics
router.get("/:username/stats", getUserStats);

// GET /users/:username/heatmap - Get user contribution heatmap data
router.get("/:username/heatmap", getUserContributionHeatmap);

// GET /users/:username/activity - Get user contribution activity
router.get("/:username/activity", getUserContributionActivity);

// GET /users/:username/streak - Get user contribution streak
router.get("/:username/streak", getUserContributionStreak);

// POST /users/:username/sync - Manual sync trigger (with stricter rate limiting)
router.post("/:username/sync", syncRateLimit, syncUserData);

// GET /users/:username/status - Get user sync status
router.get("/:username/status", getUserSyncStatus);

// POST /cleanup - Manual cleanup of old data (admin endpoint)
router.post("/cleanup", syncRateLimit, cleanupOldData);

export default router;
