import { LeaderboardService } from "../services/leaderboard";
import { Logger } from "../utils";

const leaderboardService = new LeaderboardService();

export async function leaderboardSyncJob() {
  Logger.info("Starting leaderboard sync job...");
  
  try {
    // Sync existing developers first
    await leaderboardService.syncAllDevelopers();
    
    // Popular locations to keep updated
    const popularLocations = [
      { scope: "country", location: "Zimbabwe" },
      { scope: "country", location: "South Africa" },
      { scope: "country", location: "Kenya" },
      { scope: "country", location: "Nigeria" },
      { scope: "country", location: "Ghana" },
      { scope: "global", location: undefined },
    ];

    for (const loc of popularLocations) {
      try {
        Logger.info(`Updating leaderboard for ${loc.scope} ${loc.location || 'global'}`);
        await leaderboardService.populateLeaderboardData(
          loc.scope, 
          loc.location, 
          100 // Limit to 100 developers per location
        );
      } catch (error) {
        Logger.error(`Failed to update ${loc.scope} ${loc.location}:`, error);
      }
    }
    
    Logger.info("Leaderboard sync job completed successfully");
  } catch (error) {
    Logger.error("Leaderboard sync job failed:", error);
  }
}
