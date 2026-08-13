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
      },
      include: { snapshots: { include: { settlement: true } } },
      orderBy: { asOf: 'asc' },
    });

    const eligible = runs.filter((run) => run.asOf.getTime() < run.eventAt.getTime() && run.inputSnapshot != null);
    const settled = eligible.flatMap((run) => run.snapshots.filter((s) => s.settlement?.outcome === 'WIN' || s.settlement?.outcome === 'LOSS'));
    const brierScore = settled.length
      ? settled.reduce((sum, s) => sum + Math.pow(s.probability - (s.settlement?.outcome === 'WIN' ? 1 : 0), 2), 0) / settled.length
      : null;
    const hitRate = settled.length ? settled.filter((s) => s.settlement?.outcome === 'WIN').length / settled.length : null;

    return this.db.backtestRun.create({
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
  }

  async listBacktests() {
    return this.db.backtestRun.findMany({ orderBy: { createdAt: 'desc' }, take: 50 });
  }

  async runPaperTrading(input: { bankrollInitial: number }) {
    const bets = await this.db.bet.findMany({
      where: { simulated: true, played: false, verificationStatus: 'VERIFIED', status: { in: ['WIN', 'LOSS', 'VOID'] } },
      orderBy: { createdAt: 'asc' },
    });
    const systemsCount = await this.db.bettingSystem.count({ where: { simulated: true, played: false } });
    const stakeTotal = bets.reduce((sum, bet) => sum + bet.stake, 0);
    const returnsTotal = bets.reduce((sum, bet) => {
      if (bet.status === 'WIN') return sum + bet.stake * (bet.odds ?? 1);
      if (bet.status === 'VOID') return sum + bet.stake;
      return sum;
    }, 0);
    const profit = returnsTotal - stakeTotal;
    const bankrollFinal = input.bankrollInitial + profit;
    const roi = stakeTotal ? profit / stakeTotal : null;
    const decided = bets.filter((bet) => bet.status === 'WIN' || bet.status === 'LOSS');
    const winRate = decided.length ? decided.filter((bet) => bet.status === 'WIN').length / decided.length : null;

    let bankroll = input.bankrollInitial;
    let peak = bankroll;
    let maxDrawdown = 0;
    for (const bet of bets) {
      bankroll -= bet.stake;
      if (bet.status === 'WIN') bankroll += bet.stake * (bet.odds ?? 1);
      if (bet.status === 'VOID') bankroll += bet.stake;
      peak = Math.max(peak, bankroll);
      if (peak > 0) maxDrawdown = Math.max(maxDrawdown, (peak - bankroll) / peak);
    }

    return this.db.paperTradingRun.create({
      data: {
        bankrollInitial: input.bankrollInitial,
        bankrollFinal,
        stakeTotal,
        returnsTotal,
        profit,
        roi,
        yieldValue: roi,
        winRate,
        maxDrawdown,
        betsCount: bets.length,
        systemsCount,
        parameters: { source: 'SIMULATED_ONLY', settlementEngine: 'shared', voidPolicy: 'stake-returned' },
      },
    });
  }

  async listPaperTrading() {
    return this.db.paperTradingRun.findMany({ orderBy: { createdAt: 'desc' }, take: 50 });
  }

  async performance() {
    const snapshots = await this.db.predictionSnapshot.findMany({
      where: { settlement: { is: { outcome: { in: ['WIN', 'LOSS'] } } } },
      include: { settlement: true, run: true },
    });
    const modelSample = snapshots.length;
    const brierScore = modelSample
      ? snapshots.reduce((sum, s) => sum + Math.pow(s.probability - (s.settlement?.outcome === 'WIN' ? 1 : 0), 2), 0) / modelSample
      : null;
    const hitRate = modelSample ? snapshots.filter((s) => s.settlement?.outcome === 'WIN').length / modelSample : null;

    const calibration = Array.from({ length: 10 }, (_, index) => {
      const min = index / 10, max = (index + 1) / 10;
      const bucket = snapshots.filter((s) => s.probability >= min && (index === 9 ? s.probability <= max : s.probability < max));
      return {
        range: `${Math.round(min * 100)}-${Math.round(max * 100)}%`,
        sample: bucket.length,
        predicted: bucket.length ? bucket.reduce((sum, s) => sum + s.probability, 0) / bucket.length : null,
        observed: bucket.length ? bucket.filter((s) => s.settlement?.outcome === 'WIN').length / bucket.length : null,
      };
    });

    const byMarket = Object.values(snapshots.reduce<Record<string, { market:string;sample:number;wins:number;brier:number }>>((acc, s) => {
      const row = acc[s.market] ?? { market: s.market, sample: 0, wins: 0, brier: 0 };
      row.sample += 1;
      if (s.settlement?.outcome === 'WIN') row.wins += 1;
      row.brier += Math.pow(s.probability - (s.settlement?.outcome === 'WIN' ? 1 : 0), 2);
      acc[s.market] = row;
      return acc;
    }, {})).map((row) => ({ market: row.market, sample: row.sample, hitRate: row.sample ? row.wins / row.sample : null, brierScore: row.sample ? row.brier / row.sample : null }));

    const real = await this.db.bet.findMany({
      where: { played: true, simulated: false, verificationStatus: 'VERIFIED', status: { in: ['WIN', 'LOSS', 'VOID'] } },
      orderBy: { playedAt: 'asc' },
    });
    const stake = real.reduce((sum, bet) => sum + bet.stake, 0);
    const returns = real.reduce((sum, bet) => bet.status === 'WIN' ? sum + bet.stake * (bet.odds ?? 1) : bet.status === 'VOID' ? sum + bet.stake : sum, 0);
    const profit = returns - stake;
    const decidedReal = real.filter((bet) => bet.status !== 'VOID');
    const averageOdds = real.filter((bet) => bet.odds != null).length
      ? real.filter((bet) => bet.odds != null).reduce((sum, bet) => sum + (bet.odds ?? 0), 0) / real.filter((bet) => bet.odds != null).length
      : null;
    let pnl = 0, peak = 0, maxDrawdown = 0;
    for (const bet of real) {
      pnl -= bet.stake;
      if (bet.status === 'WIN') pnl += bet.stake * (bet.odds ?? 1);
      if (bet.status === 'VOID') pnl += bet.stake;
      peak = Math.max(peak, pnl);
      maxDrawdown = Math.max(maxDrawdown, peak - pnl);
    }

    return {
      modelPerformance: { sample: modelSample, brierScore, hitRate, calibration, byMarket },
      bettingPerformance: {
        sample: real.length,
        stake,
        returns,
        profit,
        roi: stake ? profit / stake : null,
        yield: stake ? profit / stake : null,
        winRate: decidedReal.length ? decidedReal.filter((bet) => bet.status === 'WIN').length / decidedReal.length : null,
        averageOdds,
        maxDrawdown,
      },
    };
  }
}
