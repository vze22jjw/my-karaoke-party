import { z } from "zod";
import { createTRPCRouter, publicProcedure, protectedProcedure } from "~/server/api/trpc";
import { getErrorMessage } from "~/utils/string";
import { customAlphabet } from "nanoid";
import { TRPCError } from "@trpc/server";
import { cookies } from "next/headers";
import { env } from "~/env";

const generatePartyCode = customAlphabet("ABCDEFGHJKLMNPQRSTUVWXYZ0123456789", 4);

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

        let hash = generatePartyCode();
        let isUnique = false;
        let attempts = 0;

        while (!isUnique && attempts < 10) {
            const existing = await ctx.db.party.findUnique({ where: { hash } });
            if (!existing) {
                isUnique = true;
            } else {
                hash = generatePartyCode();
                attempts++;
            }
        }

        if (!isUnique) {
            throw new Error("Failed to generate a unique party code. Please try again.");
        }

        const party = await ctx.db.party.create({
          data: {
            name: input.name,
            status: "OPEN",
            hash: hash,
          },
        });

        await ctx.db.partyParticipant.create({
          data: {
            partyId: party.id,
            name: input.singerName, 
            role: "Host", 
          },
        });

        return party;
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

  getAll: protectedProcedure
    .query(async ({ ctx }) => {
      return ctx.db.party.findMany({
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          hash: true,
          name: true,
          status: true,
          createdAt: true,
          lastActivityAt: true,
          _count: {
            select: {
              participants: true,
              playlistItems: true,
            }
          }
        }
      });
    }),

  updateSpotifyPlaylist: publicProcedure
    .input(z.object({ 
      hash: z.string(), 
      playlistId: z.string().optional(),
      externalLink: z.string().optional(), 
    }))
    .mutation(async ({ ctx, input }) => {
      let finalId = input.playlistId?.trim() ?? null;
      if (finalId) {
        const match = finalId.match(/(?::|list\/)([a-zA-Z0-9]+)/);
        if (match?.[1]) {
          finalId = match[1];
        }
      }
      
      const finalLink = input.externalLink?.trim() ?? null;

      await ctx.db.party.update({
        where: { hash: input.hash },
        data: {
          spotifyPlaylistId: finalId,
          spotifyLink: finalLink, 
          lastActivityAt: new Date(),
        },
      });
      return { success: true, newId: finalId, newLink: finalLink };
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
    }),

  delete: protectedProcedure
    .input(z.object({ hash: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const token = cookies().get("admin_token")?.value;
      if (token !== env.ADMIN_TOKEN) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Unauthorized" });
      }

      await ctx.db.party.delete({
        where: { hash: input.hash },
      });

      return { success: true };
    }),
});
