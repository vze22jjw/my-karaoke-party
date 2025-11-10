-- AlterTable
ALTER TABLE "Party" ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'OPEN';

-- CreateIndex
CREATE INDEX "Party_status_idx" ON "Party"("status");
