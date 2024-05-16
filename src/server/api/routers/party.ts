import { z } from "zod";
import { env } from "~/env";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

export const partyRouter = createTRPCRouter({
  create: publicProcedure
    .input(z.object({ name: z.string().min(3) }))
    .mutation(async ({ ctx, input }) => {
      const party = await ctx.db.party.createWithHash(input);

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
        await ctx.db.party.delete({ where: { id: party.id } });

        throw new Error("Failed to create party");
      }

      return party;
    }),

  getByHash: publicProcedure
    .input(z.object({ hash: z.string() }))
    .query(({ input, ctx }) => {
      const party = ctx.db.party.findUnique({ where: { hash: input.hash } });

      return party;
    }),
});
