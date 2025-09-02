import { prisma as dbPrisma } from "@tanyamushonga/devmetrics-db";
import { withAccelerate } from "@prisma/extension-accelerate";

const globalForPrisma = global as unknown as {
  prisma: typeof dbPrisma;
};

const prisma = globalForPrisma.prisma || dbPrisma.$extends(withAccelerate());

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;
