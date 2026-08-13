import { Injectable } from '@nestjs/common';
import { PrismaService } from './services';

@Injectable()
export class AnalyticsService {
  constructor(private db: PrismaService) {}

  async runBacktest(input: { competition: string; modelVersion: string; from: Date; to: Date }) {
    const fixtures = await this.db.fixture.findMany({
      where: { competition: input.competition, utcDate: { gte: input.from, lte: input.to } },
      select: { id: true },
    });
    const fixtureIds = fixtures.map((x) => x.id);
    const runs = await this.db.predictionRun.findMany({
      where: {
        fixtureId: { in: fixtureIds },
        modelVersion: input.modelVersion,
        eventAt: { gte: input.from, lte: input.to },
        inputSnapshot: { not: undefined },
      },
      include: { snapshots: true },
      orderBy: { asOf: 'asc' },
    });

    // Hard anti-leakage gate: only predictions created before kickoff and with immutable input snapshots.
    const eligible = runs.filter((run) => run.asOf.getTime() < run.eventAt.getTime() && run.inputSnapshot != null);
    const settled = eligible.flatMap((run) => run.snapshots.filter((s) => s.outcome === 'WIN' || s.outcome === 'LOSS'));
    const brierScore = settled.length
      ? settled.reduce((sum, s) => sum + Math.pow(s.probability - (s.outcome === 'WIN' ? 1 : 0), 2), 0) / settled.length
      : null;
    const hitRate = settled.length ? settled.filter((s) => s.outcome === 'WIN').length / settled.length : null;

    const saved = await this.db.backtestRun.create({
      data: {
        competition: input.competition,
        modelVersion: input.modelVersion,
        fromDate: input.from,
        toDate: input.to,
        sample: settled.length,
        brierScore,
        hitRate,
        parameters: {
          methodology: 'walk-forward-immutable-prediction-replay',
          antiLeakage: 'asOf < eventAt AND inputSnapshot != null',
          eligiblePredictionRuns: eligible.length,
        },
      },
    });
    return saved;
  }

  async listBacktests() {
    return this.db.backtestRun.findMany({ orderBy: { createdAt: 'desc' }, take: 50 });
  }

  async runPaperTrading(input: { bankrollInitial: number }) {
    const bets = await this.db.bet.findMany({
      where: { simulated: true, played: false, status: { in: ['WIN', 'LOSS'] } },
      orderBy: { createdAt: 'asc' },
    });
    const stakeTotal = bets.reduce((sum, bet) => sum + bet.stake, 0);
    const returnsTotal = bets.reduce((sum, bet) => sum + (bet.status === 'WIN' ? bet.stake * (bet.odds ?? 1) : 0), 0);
    const profit = returnsTotal - stakeTotal;
    const bankrollFinal = input.bankrollInitial + profit;
    const roi = stakeTotal ? profit / stakeTotal : null;
    return this.db.paperTradingRun.create({
      data: {
        bankrollInitial: input.bankrollInitial,
        bankrollFinal,
        stakeTotal,
        returnsTotal,
        profit,
        roi,
        betsCount: bets.length,
        parameters: { source: 'SIMULATED_ONLY', settlementEngine: 'shared' },
      },
    });
  }

  async listPaperTrading() {
    return this.db.paperTradingRun.findMany({ orderBy: { createdAt: 'desc' }, take: 50 });
  }
}
