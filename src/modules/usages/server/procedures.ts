import { getUsageStaus } from "@/lib/usage";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";

export const usageRouter = createTRPCRouter({
  status: protectedProcedure.query(async () => {
    try {
      const status = await getUsageStaus();
      return status;
    } catch {
      return null;
    }
  }),
});
