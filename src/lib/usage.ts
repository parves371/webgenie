import { RateLimiterPrisma } from "rate-limiter-flexible";
import { prisma } from "./db";
import { auth } from "@clerk/nextjs/server";

const FREE_POINTS = 5;
const FREE_DURATION = 30 * 24 * 60 * 60; // 30 days in seconds
const GENERATION_COST = 1; // Cost per generation
const PRO_Points = 100; // Points for pro plan
export async function getUsageTraker() {
  const { has } = await auth();
  const hasProAccess = has({ plan: "pro" });
  const usageTraker = new RateLimiterPrisma({
    storeClient: prisma,
    tableName: "Usage",
    points: hasProAccess ? PRO_Points : FREE_POINTS,
    duration: FREE_DURATION,
  });

  return usageTraker;
}

export async function consumeCredits() {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Unauthorized");
  }
  const usageTraker = await getUsageTraker();
  const result = await usageTraker.consume(userId, GENERATION_COST);
  return result;
}

export async function getUsageStaus() {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Unauthorized");
  }
  const usageTracker = await getUsageTraker();
  const result = await usageTracker.get(userId);
  return result;
}
