import { log } from "next-axiom";
import { z } from "zod";
import { env } from "~/env";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

export const partyRouter = createTRPCRouter({
  create: publicProcedure
    .input(z.object({ name: z.string().min(3) }))
    .mutation(async ({ ctx, input }) => {
      log.info("Creating party", { name: input.name });

      const party = await ctx.db.party.createWithHash(input);

      // Try to initialize PartyKit room, but don't fail if it's not available (dev mode)
      try {
        const res = await fetch(
          `${env.NEXT_PUBLIC_PARTYKIT_URL}/party/${party.hash}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
          },
        );

        if (!res.ok) {
          log.warn("PartyKit not available - running in local mode without real-time features", {
            status: res.status,
            statusText: res.statusText
          });
        } else {
          log.info("PartyKit room created successfully");
        }
      } catch (error) {
        log.warn("PartyKit not available - running in local mode without real-time features", {
          error: error instanceof Error ? error.message : String(error)
        });
      }

      log.info("Party created", { party });
      return party;
    }),

  getByHash: publicProcedure
    .input(z.object({ hash: z.string() }))
    .query(({ input, ctx }) => {
      const party = ctx.db.party.findUnique({ where: { hash: input.hash } });

      return party;
    }),
});
