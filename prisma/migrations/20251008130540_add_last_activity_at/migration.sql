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
