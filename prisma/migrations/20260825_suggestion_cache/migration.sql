-- CreateTable
CREATE TABLE "SuggestionCache" (
    "id" SERIAL NOT NULL,
    "cacheKey" TEXT NOT NULL,
    "category" TEXT,
    "subTheme" TEXT,
    "songs" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SuggestionCache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SuggestionCache_cacheKey_key" ON "SuggestionCache"("cacheKey");

-- CreateIndex
CREATE INDEX "SuggestionCache_cacheKey_idx" ON "SuggestionCache"("cacheKey");
