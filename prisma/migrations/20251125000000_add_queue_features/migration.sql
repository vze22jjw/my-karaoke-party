-- AlterTable
ALTER TABLE "Party" ADD COLUMN     "isManualSortActive" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "PlaylistItem" ADD COLUMN     "isPriority" BOOLEAN NOT NULL DEFAULT false;
