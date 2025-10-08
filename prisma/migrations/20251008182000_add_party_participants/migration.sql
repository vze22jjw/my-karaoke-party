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
