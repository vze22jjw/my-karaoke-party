-- Migration: 20240516082445_initial_migration
-- CreateTable
CREATE TABLE "Post" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Post_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Video" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "artist" TEXT NOT NULL,
    "song" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Video_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Party" (
    "id" SERIAL NOT NULL,
    "hash" TEXT,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Party_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VideosOnParties" (
    "partyId" INTEGER NOT NULL,
    "videoId" TEXT NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "playedAt" TIMESTAMP(3),

    CONSTRAINT "VideosOnParties_pkey" PRIMARY KEY ("partyId","videoId")
);

-- CreateIndex
CREATE INDEX "Post_name_idx" ON "Post"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Party_hash_key" ON "Party"("hash");

-- CreateIndex
CREATE INDEX "Party_hash_idx" ON "Party"("hash");

-- AddForeignKey
ALTER TABLE "VideosOnParties" ADD CONSTRAINT "VideosOnParties_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "Video"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideosOnParties" ADD CONSTRAINT "VideosOnParties_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "Party"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Migration: 20240516193337_drop_videos_on_parties_table
/*
  Warnings:

  - You are about to drop the `VideosOnParties` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "VideosOnParties" DROP CONSTRAINT "VideosOnParties_partyId_fkey";

-- DropForeignKey
ALTER TABLE "VideosOnParties" DROP CONSTRAINT "VideosOnParties_videoId_fkey";

-- DropTable
DROP TABLE "VideosOnParties";

-- Migration: 20240516194012_remove_post_table
/*
  Warnings:

  - You are about to drop the `Post` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "Post";

-- Migration: 20240523155129_add_cover_url_in_video
/*
  Warnings:

  - Added the required column `coverUrl` to the `Video` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Video" ADD COLUMN     "coverUrl" TEXT NOT NULL;

-- Migration: 20240524200010_add_video_duration
/*
  Warnings:

  - Added the required column `duration` to the `Video` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Video" ADD COLUMN     "duration" TEXT NOT NULL;

-- Migration: 20251008130540_add_last_activity_at
-- AlterTable
ALTER TABLE "Party" ADD COLUMN     "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "PlaylistItem" (
    "id" SERIAL NOT NULL,
    "partyId" INTEGER NOT NULL,
    "videoId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "artist" TEXT,
    "song" TEXT,
    "coverUrl" TEXT NOT NULL,
    "duration" TEXT,
    "singerName" TEXT NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "playedAt" TIMESTAMP(3),
    "orderIndex" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PlaylistItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PlaylistItem_partyId_idx" ON "PlaylistItem"("partyId");

-- CreateIndex
CREATE INDEX "PlaylistItem_playedAt_idx" ON "PlaylistItem"("playedAt");

-- CreateIndex
CREATE INDEX "Party_lastActivityAt_idx" ON "Party"("lastActivityAt");

-- AddForeignKey
ALTER TABLE "PlaylistItem" ADD CONSTRAINT "PlaylistItem_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "Party"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Migration: 20251008182000_add_party_participants
-- CreateTable
CREATE TABLE "PartyParticipant" (
    "id" SERIAL NOT NULL,
    "partyId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PartyParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PartyParticipant_partyId_idx" ON "PartyParticipant"("partyId");

-- CreateIndex
CREATE UNIQUE INDEX "PartyParticipant_partyId_name_key" ON "PartyParticipant"("partyId", "name");

-- AddForeignKey
ALTER TABLE "PartyParticipant" ADD CONSTRAINT "PartyParticipant_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "Party"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Migration: 20251031021543_add_random_breaker_to_playlist
-- AlterTable
ALTER TABLE "PlaylistItem" ADD COLUMN     "randomBreaker" DOUBLE PRECISION;

-- Migration: 20251102020202_add_party_sort_order
-- AlterTable
ALTER TABLE "Party" ADD COLUMN     "orderByFairness" BOOLEAN NOT NULL DEFAULT true;

-- Migration: 20251105204500_add_disable_playback
-- AlterTable
ALTER TABLE "Party" ADD COLUMN     "disablePlayback" BOOLEAN NOT NULL DEFAULT false;

-- Migration: 20251106132615_add-participant-roles
/*
  Warnings:

  - Added the required column `role` to the `PartyParticipant` table.

*/
-- AlterTable
ALTER TABLE "PartyParticipant" ADD COLUMN     "role" TEXT NOT NULL DEFAULT 'Guest';

/*
  Warnings:

  - Table altered to add persistent timer columns to Party table.
*/
-- AlterTable
ALTER TABLE "Party" ADD COLUMN     "currentSongId" TEXT;
ALTER TABLE "Party" ADD COLUMN     "currentSongStartedAt" TIMESTAMP(3);
ALTER TABLE "Party" ADD COLUMN     "currentSongRemainingDuration" INTEGER;
