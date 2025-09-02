import { Router } from "express";
import {
  getUserProfile,
  getUserRepositories,
  getUserStats,
  syncUserData,
  getUserSyncStatus,
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

// POST /users/:username/sync - Manual sync trigger (with stricter rate limiting)
router.post("/:username/sync", syncRateLimit, syncUserData);

// GET /users/:username/status - Get user sync status
router.get("/:username/status", getUserSyncStatus);

export default router;
