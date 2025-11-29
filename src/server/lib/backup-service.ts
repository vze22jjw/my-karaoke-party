/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { db } from "~/server/db";
import type { Party, PartyParticipant, PlaylistItem, IdleMessage } from "@prisma/client";

// Define a structure for the backup file
export type PartyBackup = {
  party: Party;
  participants: Omit<PartyParticipant, "id" | "partyId">[];
  playlistItems: Omit<PlaylistItem, "id" | "partyId">[];
  idleMessages: Omit<IdleMessage, "id">[];
};

export type BackupFile = {
    version: number;
    createdAt: string;
    data: PartyBackup[];
};

export const backupService = {
  /**
   * Export all parties or a single party.
   */
  async exportParties(partyHash?: string): Promise<BackupFile> {
    const where = partyHash ? { hash: partyHash } : {};
    
    const parties = await db.party.findMany({
      where,
      include: {
        participants: true,
        playlistItems: true,
      },
    });

    const backupData: PartyBackup[] = [];

    for (const p of parties) {
        const host = p.participants.find(part => part.role === "Host");
        let idleMessages: Omit<IdleMessage, "id">[] = [];
        
        if (host) {
            const msgs = await db.idleMessage.findMany({
                where: { hostName: host.name }
            });
            idleMessages = msgs.map(({ id: _, ...rest }) => rest);
        }

        backupData.push({
            party: p,
            participants: p.participants.map(({ id: _, partyId: __, ...rest }) => rest),
            playlistItems: p.playlistItems.map(({ id: _, partyId: __, ...rest }) => rest),
            idleMessages
        });
    }

    return {
        version: 1,
        createdAt: new Date().toISOString(),
        data: backupData
    };
  },

  /**
   * Import parties from JSON.
   */
  async importParties(backup: BackupFile) {
    const results = { success: 0, skipped: 0, errors: 0 };
    
    if (!backup.data || !Array.isArray(backup.data)) {
        throw new Error("Invalid backup format");
    }

    for (const item of backup.data) {
      try {
        if (item.party.hash) {
          const existing = await db.party.findUnique({ where: { hash: item.party.hash } });
          if (existing) {
            console.log(`[Backup] Skipping existing party: ${item.party.hash}`);
            results.skipped++;
            continue;
          }
        }

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { id: _oldId, ...rawPartyData } = item.party;

        // Explicitly construct the object
        const partyData = {
            hash: rawPartyData.hash,
            name: rawPartyData.name,
            createdAt: rawPartyData.createdAt,
            lastActivityAt: rawPartyData.lastActivityAt,
            orderByFairness: rawPartyData.orderByFairness,
            disablePlayback: rawPartyData.disablePlayback,
            isManualSortActive: rawPartyData.isManualSortActive,
            currentSongId: rawPartyData.currentSongId,
            currentSongStartedAt: rawPartyData.currentSongStartedAt,
            currentSongRemainingDuration: rawPartyData.currentSongRemainingDuration,
            status: rawPartyData.status,
            idleMessages: rawPartyData.idleMessages,
            themeSuggestions: rawPartyData.themeSuggestions,
            spotifyPlaylistId: rawPartyData.spotifyPlaylistId,
            // FIX: Cast to 'any' to safely access property that might not exist on the type in older backups
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            spotifyLink: (rawPartyData as any).spotifyLink ?? null, 
        };

        await db.$transaction(async (tx) => {
            await tx.party.create({
                data: {
                    ...partyData,
                    participants: {
                        create: item.participants.map(p => ({
                            name: p.name,
                            joinedAt: p.joinedAt,
                            role: p.role,
                            applauseCount: p.applauseCount,
                            avatar: p.avatar
                        }))
                    },
                    playlistItems: {
                        create: item.playlistItems.map(p => ({
                            videoId: p.videoId,
                            title: p.title,
                            artist: p.artist,
                            song: p.song,
                            coverUrl: p.coverUrl,
                            duration: p.duration,
                            singerName: p.singerName,
                            addedAt: p.addedAt,
                            playedAt: p.playedAt,
                            orderIndex: p.orderIndex,
                            randomBreaker: p.randomBreaker,
                            spotifyId: p.spotifyId,
                            isPriority: p.isPriority,
                            isManual: p.isManual
                        }))
                    }
                }
            });

            if (item.idleMessages && item.idleMessages.length > 0) {
                for (const msg of item.idleMessages) {
                    const existingMsg = await tx.idleMessage.findFirst({
                        where: { hostName: msg.hostName, message: msg.message }
                    });
                    if (!existingMsg) {
                        await tx.idleMessage.create({ 
                            data: {
                                hostName: msg.hostName,
                                message: msg.message,
                                createdAt: msg.createdAt
                            } 
                        });
                    }
                }
            }
        });

        results.success++;
      } catch (error) {
        console.error(`[Backup] Failed to import party ${item.party.name}:`, error);
        results.errors++;
      }
    }
    return results;
  },
};
