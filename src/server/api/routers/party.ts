import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { getErrorMessage } from "~/utils/string";
import { db } from "~/server/db";
import { sqids } from "~/server/utils/sqids";
import { TRPCError } from "@trpc/server"; // Import TRPCError

export const partyRouter = createTRPCRouter({
  create: publicProcedure
    .input(z.object({ 
      name: z.string().min(1),
      singerName: z.string().min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        // --- THIS IS THE FIX ---
        // Check for ANY party with the same name that currently exists.
        // The auto-cleanup cron will handle deleting old parties.
        const existingParty = await ctx.db.party.findFirst({
          where: {
            name: input.name,
            // (No time filter)
          },
        });

        if (existingParty) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: `A party named "${input.name}" already exists. Please choose another name.`,
          });
        }
        // --- END THE FIX ---

        const party = await ctx.db.party.create({
          data: {
            name: input.name,
            hash: "temp", // Temporary hash
          },
        });

        // Use the imported sqids instance to encode the ID
        const hash = sqids.encode([party.id]);
        
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
        // Re-throw tRPC errors, wrap others
        if (error instanceof TRPCError) {
          throw error;
        }
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
