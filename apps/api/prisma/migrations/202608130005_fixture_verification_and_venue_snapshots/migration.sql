ALTER TABLE "Fixture"
  ADD COLUMN "homeScore" INTEGER,
  ADD COLUMN "awayScore" INTEGER,
  ADD COLUMN "resultVerified" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "verifiedAt" TIMESTAMP(3),
  ADD COLUMN "resultVersion" TEXT,
  ADD COLUMN "resultEvidence" JSONB;

CREATE INDEX "Fixture_resultVerified_utcDate_idx" ON "Fixture"("resultVerified", "utcDate");

ALTER TABLE "TeamSnapshot"
  ADD COLUMN "homePlayed" INTEGER,
  ADD COLUMN "homePoints" INTEGER,
  ADD COLUMN "homeGoalsFor" INTEGER,
  ADD COLUMN "homeGoalsAgainst" INTEGER,
  ADD COLUMN "awayPlayed" INTEGER,
  ADD COLUMN "awayPoints" INTEGER,
  ADD COLUMN "awayGoalsFor" INTEGER,
  ADD COLUMN "awayGoalsAgainst" INTEGER;
