-- AlterTable
ALTER TABLE "Party" ADD COLUMN     "idleMessages" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- CreateTable
CREATE TABLE "IdleMessage" (
    "id" SERIAL NOT NULL,
    "hostName" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IdleMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "IdleMessage_hostName_idx" ON "IdleMessage"("hostName");
