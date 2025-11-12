-- AlterTable
ALTER TABLE "Party" ADD COLUMN     "themeSuggestions" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];