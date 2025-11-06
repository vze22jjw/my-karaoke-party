import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { getErrorMessage } from "~/utils/string";
import { sqids } from "~/server/utils/sqids";
import { TRPCError } from "@trpc/server"; 

export const partyRouter = createTRPCRouter({
  create: publicProcedure
    .input(z.object({ 
      name: z.string().min(1),
      singerName: z.string().min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        const existingParty = await ctx.db.party.findFirst({
          where: {
            name: input.name,
          },
        });

        if (existingParty) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: `A party named "${input.name}" already exists. Please choose another name.`,
          });
        }

        const party = await ctx.db.party.create({
          data: {
            name: input.name,
            hash: "temp", // Temporary hash
          },
        });

        const hash = sqids.encode([party.id]);
        
        const updatedParty = await ctx.db.party.update({
          where: { id: party.id },
          data: { hash },
        });

        // --- THIS IS THE FIX ---
        // Register the creator as a participant with the "Host" role
        await ctx.db.partyParticipant.create({
          data: {
            partyId: party.id,
            name: input.singerName, 
            role: "Host", // <-- Set the role to Host
          },
        });
        // --- END THE FIX ---

        return updatedParty;
      } catch (error) {
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
