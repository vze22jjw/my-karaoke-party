-- CreateTable
CREATE TABLE "Video" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "artist" TEXT NOT NULL,
    "song" TEXT NOT NULL,
    "coverUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "duration" TEXT NOT NULL,

    CONSTRAINT "Video_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Party" (
    "id" SERIAL NOT NULL,
    "hash" TEXT,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "orderByFairness" BOOLEAN NOT NULL DEFAULT true,
    "disablePlayback" BOOLEAN NOT NULL DEFAULT false,
    "currentSongId" TEXT,
    "currentSongStartedAt" TIMESTAMP(3),
    "currentSongRemainingDuration" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "idleMessages" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "themeSuggestions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "spotifyPlaylistId" TEXT,

    CONSTRAINT "Party_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartyParticipant" (
    "id" SERIAL NOT NULL,
    "partyId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "role" TEXT NOT NULL DEFAULT 'Guest',
    "applauseCount" INTEGER NOT NULL DEFAULT 0,
    "avatar" TEXT,

    CONSTRAINT "PartyParticipant_pkey" PRIMARY KEY ("id")
);

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
    "randomBreaker" DOUBLE PRECISION,
    "spotifyId" TEXT,

    CONSTRAINT "PlaylistItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IdleMessage" (
    "id" SERIAL NOT NULL,
    "hostName" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IdleMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Party_hash_key" ON "Party"("hash");

-- CreateIndex
CREATE INDEX "Party_hash_idx" ON "Party"("hash");

-- CreateIndex
CREATE INDEX "Party_lastActivityAt_idx" ON "Party"("lastActivityAt");

-- CreateIndex
CREATE INDEX "Party_status_idx" ON "Party"("status");

-- CreateIndex
CREATE INDEX "PartyParticipant_partyId_idx" ON "PartyParticipant"("partyId");

-- CreateIndex
CREATE UNIQUE INDEX "PartyParticipant_partyId_name_key" ON "PartyParticipant"("partyId", "name");

-- CreateIndex
CREATE INDEX "PlaylistItem_partyId_idx" ON "PlaylistItem"("partyId");

-- CreateIndex
CREATE INDEX "PlaylistItem_playedAt_idx" ON "PlaylistItem"("playedAt");

-- CreateIndex
CREATE INDEX "IdleMessage_hostName_idx" ON "IdleMessage"("hostName");

-- AddForeignKey
ALTER TABLE "PartyParticipant" ADD CONSTRAINT "PartyParticipant_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "Party"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlaylistItem" ADD CONSTRAINT "PlaylistItem_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "Party"("id") ON DELETE CASCADE ON UPDATE CASCADE;
