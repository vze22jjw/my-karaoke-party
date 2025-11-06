/*
  Warnings:

  - Added the required column `role` to the `PartyParticipant` table.

*/
-- AlterTable
ALTER TABLE "PartyParticipant" ADD COLUMN     "role" TEXT NOT NULL DEFAULT 'Guest';