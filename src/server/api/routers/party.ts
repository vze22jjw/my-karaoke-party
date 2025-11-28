import { z } from "zod";
import { createTRPCRouter, publicProcedure, protectedProcedure } from "~/server/api/trpc";
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
            status: "OPEN",
            hash: "temp",
          },
        });

        const hash = sqids.encode([party.id]);
        
        const updatedParty = await ctx.db.party.update({
          where: { id: party.id },
          data: { hash },
        });

        await ctx.db.partyParticipant.create({
          data: {
            partyId: party.id,
            name: input.singerName, 
            role: "Host", 
          },
        });

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

  getHostName: publicProcedure
    .input(z.object({ hash: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const party = await ctx.db.party.findUnique({
        where: { hash: input.hash },
        select: { id: true },
      });
      
      if (!party) return null;

      const host = await ctx.db.partyParticipant.findFirst({
        where: { 
          partyId: party.id, 
          role: "Host" 
        },
        select: { name: true },
      });

      return host?.name ?? "Host";
    }),

  updateSpotifyPlaylist: publicProcedure
    .input(z.object({ 
      hash: z.string(), 
      playlistId: z.string().optional()
    }))
    .mutation(async ({ ctx, input }) => {
      let finalId = input.playlistId?.trim() ?? null;
      if (finalId) {
        const match = finalId.match(/(?::|list\/)([a-zA-Z0-9]+)/);
        if (match?.[1]) {
          finalId = match[1];
        }
      }

      await ctx.db.party.update({
        where: { hash: input.hash },
        data: {
          spotifyPlaylistId: finalId,
          lastActivityAt: new Date(),
        },
      });
      return { success: true, newId: finalId };
    }),

  toggleStatus: protectedProcedure
    .input(z.object({ 
      hash: z.string(), 
      status: z.string() 
    }))
    .mutation(async ({ ctx, input }) => {
      const party = await ctx.db.party.update({
        where: { hash: input.hash },
        data: { 
          status: input.status,
          lastActivityAt: new Date(),
          ...(input.status === "OPEN" ? {
             currentSongStartedAt: null,
             currentSongRemainingDuration: null
          } : {})
        },
      });
      
      return party;
    }),
    
  settings: protectedProcedure
    .input(z.object({
        hash: z.string(),
        useQueueRules: z.boolean().optional(),
        disablePlayback: z.boolean().optional(),
        maxSearchResults: z.number().optional(),
        themeSuggestions: z.array(z.string()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
        await ctx.db.party.update({
            where: { hash: input.hash },
            data: {
                orderByFairness: input.useQueueRules,
                disablePlayback: input.disablePlayback,
                themeSuggestions: input.themeSuggestions
            }
        });
        return { success: true };
    })
});
