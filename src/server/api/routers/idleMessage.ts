import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { TRPCError } from "@trpc/server";

const MAX_MESSAGES_PER_HOST = 20;

export const idleMessageRouter = createTRPCRouter({

  getAll: publicProcedure
    .query(async ({ ctx }) => {
      return ctx.db.idleMessage.findMany({
        orderBy: { createdAt: "desc" },
      });
    }),

  /**
   * Add a new idle message to the shared library.
   * Enforces a limit of 20 messages PER HOST (Author).
   */
  add: publicProcedure
    .input(z.object({ hostName: z.string().min(1), message: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const count = await ctx.db.idleMessage.count({
        where: { hostName: input.hostName },
      });

      if (count >= MAX_MESSAGES_PER_HOST) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: `You have reached your limit of ${MAX_MESSAGES_PER_HOST} messages. Delete some of yours to add new ones.`,
        });
      }

      return ctx.db.idleMessage.create({
        data: {
          hostName: input.hostName,
          message: input.message,
        },
      });
    }),

  delete: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.idleMessage.delete({
        where: { id: input.id },
      });
    }),
});
