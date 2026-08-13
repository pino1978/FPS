CREATE TABLE "OddsSnapshot" (
    "id" TEXT NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "fixtureId" TEXT NOT NULL,
    "providerFixtureId" TEXT,
    "bookmaker" TEXT NOT NULL,
    "market" TEXT NOT NULL,
    "selection" TEXT NOT NULL,
    "odds" DOUBLE PRECISION NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "providerUpdatedAt" TIMESTAMP(3),
    "source" TEXT NOT NULL,
    CONSTRAINT "OddsSnapshot_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "OddsSnapshot_fingerprint_key" ON "OddsSnapshot"("fingerprint");
CREATE INDEX "OddsSnapshot_fixtureId_market_capturedAt_idx" ON "OddsSnapshot"("fixtureId", "market", "capturedAt");
CREATE INDEX "OddsSnapshot_bookmaker_market_capturedAt_idx" ON "OddsSnapshot"("bookmaker", "market", "capturedAt");
