import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { getErrorMessage } from "~/utils/string";
import { db } from "~/server/db";
// --- THIS IS THE FIX ---
// Import the sqids instance, not a function named generateHash
import { sqids } from "~/server/utils/sqids";
// --- END THE FIX ---

export const partyRouter = createTRPCRouter({
  create: publicProcedure
    .input(z.object({ 
      name: z.string().min(1),
      singerName: z.string().min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        const party = await ctx.db.party.create({
          data: {
            name: input.name,
            hash: "temp", // Temporary hash
          },
        });

        // --- THIS IS THE FIX ---
        // Use the imported sqids instance to encode the ID
        const hash = sqids.encode([party.id]);
        // --- END THE FIX ---
        
        const updatedParty = await ctx.db.party.update({
          where: { id: party.id },
          data: { hash },
        });

        // Register the creator as a participant using the `name` field
        await ctx.db.partyParticipant.create({
          data: {
            partyId: party.id,
            name: input.singerName, // The input is `singerName`, but the DB field is `name`
          },
        });

        return updatedParty;
      } catch (error) {
        console.error(getErrorMessage(error));
        throw new Error(getErrorMessage(error));
      }
    }),
    
  getByHash: publicProcedure
    .input(z.object({ hash: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      try {
        const party = await ctx.db.party.findUnique({
          where: { hash: input.hash },
        });
        return party;
      } catch (error) {
        console.error(getErrorMessage(error));
        throw new Error(getErrorMessage(error));
      }
    }),
});
