import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { TRPCError } from "@trpc/server";

const MAX_IDLE_MESSAGES = 20;

export const idleMessageRouter = createTRPCRouter({
  /**
   * Get all idle messages for a specific host.
   */
  getByHost: publicProcedure
    .input(z.object({ hostName: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      return ctx.db.idleMessage.findMany({
        where: { hostName: input.hostName },
        orderBy: { createdAt: "asc" },
      });
    }),

  /**
   * Add a new idle message to a host's library.
   * Enforces a limit of 20 messages.
   */
  add: publicProcedure
    .input(z.object({ hostName: z.string().min(1), message: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      // Check count first
      const count = await ctx.db.idleMessage.count({
        where: { hostName: input.hostName },
      });

      if (count >= MAX_IDLE_MESSAGES) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: `You have reached the maximum of ${MAX_IDLE_MESSAGES} saved messages. Please delete one to add another.`,
        });
      }

      return ctx.db.idleMessage.create({
        data: {
          hostName: input.hostName,
          message: input.message,
        },
      });
    }),

  /**
   * Delete an idle message by its ID.
   */
  delete: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.idleMessage.delete({
        where: { id: input.id },
      });
    }),
});