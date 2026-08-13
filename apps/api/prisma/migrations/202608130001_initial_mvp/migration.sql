-- Football Prediction System MVP baseline
-- PostgreSQL / Prisma schema baseline

CREATE TABLE "Fixture" (
    "id" TEXT NOT NULL,
    "competition" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "utcDate" TIMESTAMP(3) NOT NULL,
    "homeTeamId" TEXT NOT NULL,
    "homeTeam" TEXT NOT NULL,
    "awayTeamId" TEXT NOT NULL,
    "awayTeam" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Fixture_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TeamSnapshot" (
    "id" TEXT NOT NULL,
    "competition" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "played" INTEGER NOT NULL,
    "points" INTEGER NOT NULL,
    "goalsFor" INTEGER NOT NULL,
    "goalsAgainst" INTEGER NOT NULL,
    "formIndex" DOUBLE PRECISION,
    "source" TEXT NOT NULL,
    CONSTRAINT "TeamSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PredictionRun" (
    "id" TEXT NOT NULL,
    "fixtureId" TEXT NOT NULL,
    "modelVersion" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "asOf" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "eventAt" TIMESTAMP(3) NOT NULL,
    "inputSnapshot" JSONB,
    CONSTRAINT "PredictionRun_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PredictionSnapshot" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "market" TEXT NOT NULL,
    "selection" TEXT NOT NULL,
    "probability" DOUBLE PRECISION NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "dataQuality" DOUBLE PRECISION NOT NULL,
    "fairOdds" DOUBLE PRECISION,
    "valueStatus" TEXT NOT NULL DEFAULT 'UNAVAILABLE',
    "offeredOdds" DOUBLE PRECISION,
    "expectedValue" DOUBLE PRECISION,
    "status" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "outcome" TEXT,
    "settledAt" TIMESTAMP(3),
    "resultVersion" TEXT,
    CONSTRAINT "PredictionSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PredictionSettlement" (
    "id" TEXT NOT NULL,
    "snapshotId" TEXT NOT NULL,
    "outcome" TEXT NOT NULL,
    "settledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resultVersion" TEXT NOT NULL,
    "evidence" JSONB,
    CONSTRAINT "PredictionSettlement_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Bet" (
    "id" TEXT NOT NULL,
    "fixtureId" TEXT NOT NULL,
    "competition" TEXT,
    "market" TEXT NOT NULL,
    "selection" TEXT NOT NULL,
    "stake" DOUBLE PRECISION NOT NULL,
    "odds" DOUBLE PRECISION,
    "bookmaker" TEXT,
    "notes" TEXT,
    "played" BOOLEAN NOT NULL DEFAULT false,
    "simulated" BOOLEAN NOT NULL DEFAULT false,
    "playedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "verificationStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "eventAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verifiedAt" TIMESTAMP(3),
    "resultVersion" TEXT,
    CONSTRAINT "Bet_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BettingSystem" (
    "id" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "profile" TEXT,
    "budget" DOUBLE PRECISION NOT NULL,
    "totalCost" DOUBLE PRECISION NOT NULL,
    "bookmaker" TEXT,
    "notes" TEXT,
    "played" BOOLEAN NOT NULL DEFAULT false,
    "simulated" BOOLEAN NOT NULL DEFAULT false,
    "playedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "verificationStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BettingSystem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SystemSelection" (
    "id" TEXT NOT NULL,
    "systemId" TEXT NOT NULL,
    "clientKey" TEXT NOT NULL,
    "fixtureId" TEXT NOT NULL,
    "competition" TEXT,
    "market" TEXT NOT NULL,
    "selection" TEXT NOT NULL,
    "eventAt" TIMESTAMP(3) NOT NULL,
    "odds" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "verificationStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "verifiedAt" TIMESTAMP(3),
    "resultVersion" TEXT,
    CONSTRAINT "SystemSelection_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SystemCombination" (
    "id" TEXT NOT NULL,
    "systemId" TEXT NOT NULL,
    "stake" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SystemCombination_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CombinationItem" (
    "id" TEXT NOT NULL,
    "combinationId" TEXT NOT NULL,
    "selectionId" TEXT NOT NULL,
    CONSTRAINT "CombinationItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BacktestRun" (
    "id" TEXT NOT NULL,
    "competition" TEXT NOT NULL,
    "modelVersion" TEXT NOT NULL,
    "fromDate" TIMESTAMP(3) NOT NULL,
    "toDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'COMPLETED',
    "sample" INTEGER NOT NULL,
    "brierScore" DOUBLE PRECISION,
    "hitRate" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "parameters" JSONB,
    CONSTRAINT "BacktestRun_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PaperTradingRun" (
    "id" TEXT NOT NULL,
    "bankrollInitial" DOUBLE PRECISION NOT NULL,
    "bankrollFinal" DOUBLE PRECISION NOT NULL,
    "stakeTotal" DOUBLE PRECISION NOT NULL,
    "returnsTotal" DOUBLE PRECISION NOT NULL,
    "profit" DOUBLE PRECISION NOT NULL,
    "roi" DOUBLE PRECISION,
    "yieldValue" DOUBLE PRECISION,
    "winRate" DOUBLE PRECISION,
    "maxDrawdown" DOUBLE PRECISION,
    "betsCount" INTEGER NOT NULL,
    "systemsCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "parameters" JSONB,
    CONSTRAINT "PaperTradingRun_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AuditEvent" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Fixture_competition_utcDate_idx" ON "Fixture"("competition", "utcDate");
CREATE INDEX "Fixture_status_utcDate_idx" ON "Fixture"("status", "utcDate");
CREATE INDEX "TeamSnapshot_competition_teamId_capturedAt_idx" ON "TeamSnapshot"("competition", "teamId", "capturedAt");
CREATE INDEX "PredictionRun_fixtureId_eventAt_idx" ON "PredictionRun"("fixtureId", "eventAt");
CREATE INDEX "PredictionRun_modelVersion_asOf_idx" ON "PredictionRun"("modelVersion", "asOf");
CREATE INDEX "PredictionSnapshot_status_createdAt_idx" ON "PredictionSnapshot"("status", "createdAt");
CREATE INDEX "PredictionSnapshot_market_createdAt_idx" ON "PredictionSnapshot"("market", "createdAt");
CREATE UNIQUE INDEX "PredictionSettlement_snapshotId_key" ON "PredictionSettlement"("snapshotId");
CREATE INDEX "PredictionSettlement_outcome_settledAt_idx" ON "PredictionSettlement"("outcome", "settledAt");
CREATE INDEX "Bet_played_verificationStatus_eventAt_idx" ON "Bet"("played", "verificationStatus", "eventAt");
CREATE INDEX "Bet_simulated_verificationStatus_eventAt_idx" ON "Bet"("simulated", "verificationStatus", "eventAt");
CREATE INDEX "Bet_competition_market_createdAt_idx" ON "Bet"("competition", "market", "createdAt");
CREATE UNIQUE INDEX "SystemSelection_systemId_clientKey_key" ON "SystemSelection"("systemId", "clientKey");
CREATE INDEX "SystemSelection_verificationStatus_eventAt_idx" ON "SystemSelection"("verificationStatus", "eventAt");
CREATE INDEX "SystemCombination_systemId_status_idx" ON "SystemCombination"("systemId", "status");
CREATE UNIQUE INDEX "CombinationItem_combinationId_selectionId_key" ON "CombinationItem"("combinationId", "selectionId");
CREATE INDEX "BacktestRun_competition_modelVersion_createdAt_idx" ON "BacktestRun"("competition", "modelVersion", "createdAt");
CREATE INDEX "AuditEvent_entityType_entityId_createdAt_idx" ON "AuditEvent"("entityType", "entityId", "createdAt");

ALTER TABLE "PredictionSnapshot" ADD CONSTRAINT "PredictionSnapshot_runId_fkey" FOREIGN KEY ("runId") REFERENCES "PredictionRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PredictionSettlement" ADD CONSTRAINT "PredictionSettlement_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "PredictionSnapshot"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SystemSelection" ADD CONSTRAINT "SystemSelection_systemId_fkey" FOREIGN KEY ("systemId") REFERENCES "BettingSystem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SystemCombination" ADD CONSTRAINT "SystemCombination_systemId_fkey" FOREIGN KEY ("systemId") REFERENCES "BettingSystem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CombinationItem" ADD CONSTRAINT "CombinationItem_combinationId_fkey" FOREIGN KEY ("combinationId") REFERENCES "SystemCombination"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CombinationItem" ADD CONSTRAINT "CombinationItem_selectionId_fkey" FOREIGN KEY ("selectionId") REFERENCES "SystemSelection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
