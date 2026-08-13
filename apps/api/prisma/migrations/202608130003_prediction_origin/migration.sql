ALTER TABLE "Bet"
  ADD COLUMN "originProbability" DOUBLE PRECISION,
  ADD COLUMN "originConfidence" DOUBLE PRECISION,
  ADD COLUMN "originDataQuality" DOUBLE PRECISION,
  ADD COLUMN "originFairOdds" DOUBLE PRECISION,
  ADD COLUMN "originModelVersion" TEXT,
  ADD COLUMN "originCapturedAt" TIMESTAMP(3);

ALTER TABLE "SystemSelection"
  ADD COLUMN "originProbability" DOUBLE PRECISION,
  ADD COLUMN "originConfidence" DOUBLE PRECISION,
  ADD COLUMN "originDataQuality" DOUBLE PRECISION,
  ADD COLUMN "originFairOdds" DOUBLE PRECISION,
  ADD COLUMN "originModelVersion" TEXT;
