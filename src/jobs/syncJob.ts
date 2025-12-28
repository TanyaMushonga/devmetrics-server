import prisma from "../lib/prisma";
import { syncAllUsers, cleanupOldCommits } from "../services/sync";
import { leaderboardSyncJob } from "./leaderboardSyncJob";

export async function syncJob() {
  console.log("Starting scheduled sync job...");
  try {
    // First sync all users
    await syncAllUsers();

    // Then cleanup old commits to save infrastructure costs
    await cleanupOldCommits();

    // Finally sync leaderboard data
    await leaderboardSyncJob();

    console.log("Scheduled sync job completed successfully");
  } catch (error) {
    console.error("Scheduled sync job failed:", error);
  }
}
