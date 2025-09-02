import prisma from "../lib/prisma";
import { syncAllUsers } from "../services/sync";

export async function syncJob() {
  console.log("Starting scheduled sync job...");
  try {
    await syncAllUsers();
    console.log("Scheduled sync job completed successfully");
  } catch (error) {
    console.error("Scheduled sync job failed:", error);
  }
}
