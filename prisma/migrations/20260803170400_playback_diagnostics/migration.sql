-- AlterTable
ALTER TABLE "Party" ADD COLUMN     "currentSongErrorCode" TEXT,
ADD COLUMN     "currentSongOpenedOnYouTube" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "maxConcurrentProbes" INTEGER NOT NULL DEFAULT 3;

-- AlterTable
ALTER TABLE "PlaylistItem" ADD COLUMN     "errorCode" TEXT,
ADD COLUMN     "playedStatus" TEXT;
