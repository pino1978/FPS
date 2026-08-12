import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { settleMarket, settlementEligible } from '@fps/domain';
import { FootballProvider, PrismaService } from './services';

@Injectable()
export class SettlementService {
  private readonly log = new Logger(SettlementService.name);
  private running = false;

  constructor(private football: FootballProvider, private db: PrismaService) {}

  @Cron('0 */10 * * * *')
  async scheduled() {
    if (this.running) return;
    this.running = true;
    try {
      await this.run();
    } catch (error) {
      this.log.error(error);
    } finally {
      this.running = false;
    }
  }

  private async verifiedResult(fixtureId: string) {
    const result = await this.football.result(fixtureId);
    if (result.status !== 'FINISHED' || result.home == null || result.away == null) return null;
    return { ...result, version: `fd:${fixtureId}:${result.lastUpdated || 'v1'}` };
  }

  async run() {
    const results: any[] = [];
    await this.settleBets(results);
    await this.settleSystems(results);
    await this.settlePredictions(results);
    return { processed: results.length, results };
  }

  private async settleBets(out: any[]) {
    const pending = await this.db.bet.findMany({ where: { played: true, status: 'PENDING', verifiedAt: null } });
    for (const bet of pending.filter((b) => settlementEligible(b.eventAt, false))) {
      const result = await this.verifiedResult(bet.fixtureId);
      if (!result) {
        out.push({ type: 'BET', id: bet.id, status: 'WAITING' });
        continue;
      }
      const decision = settleMarket(bet.market, bet.selection, { home: result.home!, away: result.away! });
      if (decision === 'UNSUPPORTED') {
        out.push({ type: 'BET', id: bet.id, status: 'UNSUPPORTED' });
        continue;
      }
      const updated = await this.db.bet.updateMany({
        where: { id: bet.id, status: 'PENDING', verifiedAt: null },
        data: { status: decision, verifiedAt: new Date(), resultVersion: result.version },
      });
      if (updated.count === 1) {
        await this.audit('Bet', bet.id, decision, result);
        out.push({ type: 'BET', id: bet.id, status: decision });
      }
    }
  }

  private async settleSystems(out: any[]) {
    const selections = await this.db.systemSelection.findMany({
      where: { status: 'PENDING', verifiedAt: null, system: { played: true } },
    });

    for (const pick of selections.filter((s) => settlementEligible(s.eventAt, false))) {
      const result = await this.verifiedResult(pick.fixtureId);
      if (!result) {
        out.push({ type: 'SYSTEM_SELECTION', id: pick.id, status: 'WAITING' });
        continue;
      }
      const decision = settleMarket(pick.market, pick.selection, { home: result.home!, away: result.away! });
      if (decision === 'UNSUPPORTED') {
        out.push({ type: 'SYSTEM_SELECTION', id: pick.id, status: 'UNSUPPORTED' });
        continue;
      }
      const updated = await this.db.systemSelection.updateMany({
        where: { id: pick.id, status: 'PENDING', verifiedAt: null },
        data: { status: decision, verifiedAt: new Date(), resultVersion: result.version },
      });
      if (updated.count === 1) {
        await this.audit('SystemSelection', pick.id, decision, result);
        out.push({ type: 'SYSTEM_SELECTION', id: pick.id, status: decision });
      }
    }

    const combinations = await this.db.systemCombination.findMany({
      where: { status: 'PENDING', system: { played: true } },
      include: { items: { include: { selection: true } } },
    });

    for (const combination of combinations) {
      if (!combination.items.length || combination.items.some((item) => item.selection.status === 'PENDING')) continue;
      if (combination.items.some((item) => item.selection.status === 'UNSUPPORTED')) continue;
      const status = combination.items.every((item) => item.selection.status === 'WIN') ? 'WIN' : 'LOSS';
      const updated = await this.db.systemCombination.updateMany({
        where: { id: combination.id, status: 'PENDING' },
        data: { status },
      });
      if (updated.count === 1) out.push({ type: 'SYSTEM_COMBINATION', id: combination.id, status });
    }

    const systems = await this.db.bettingSystem.findMany({
      where: { played: true, status: 'PENDING' },
      include: { combinations: true },
    });

    for (const system of systems) {
      if (!system.combinations.length || system.combinations.some((combination) => combination.status === 'PENDING')) continue;
      const wins = system.combinations.filter((combination) => combination.status === 'WIN').length;
      const losses = system.combinations.filter((combination) => combination.status === 'LOSS').length;
      const status = wins > 0 && losses > 0 ? 'PARTIAL' : wins > 0 ? 'WIN' : 'LOSS';
      const updated = await this.db.bettingSystem.updateMany({
        where: { id: system.id, status: 'PENDING' },
        data: { status },
      });
      if (updated.count === 1) {
        await this.db.auditEvent.create({
          data: { entityType: 'BettingSystem', entityId: system.id, action: 'SETTLED', payload: { status, wins, losses } },
        });
        out.push({ type: 'SYSTEM', id: system.id, status, winningCombinations: wins });
      }
    }
  }

  private async settlePredictions(out: any[]) {
    const runs = await this.db.predictionRun.findMany({
      where: { eventAt: { lte: new Date(Date.now() - 150 * 60000) }, snapshots: { some: { outcome: null } } },
      include: { snapshots: true },
    });
    for (const run of runs) {
      const result = await this.verifiedResult(run.fixtureId);
      if (!result) continue;
      for (const prediction of run.snapshots.filter((x) => x.outcome === null)) {
        if (prediction.status === 'NO_BET') {
          await this.db.predictionSnapshot.updateMany({
            where: { id: prediction.id, outcome: null },
            data: { outcome: 'NO_BET', settledAt: new Date(), resultVersion: result.version },
          });
          continue;
        }
        const decision = settleMarket(prediction.market, prediction.selection, { home: result.home!, away: result.away! });
        if (decision === 'UNSUPPORTED') continue;
        const updated = await this.db.predictionSnapshot.updateMany({
          where: { id: prediction.id, outcome: null },
          data: { outcome: decision, settledAt: new Date(), resultVersion: result.version },
        });
        if (updated.count === 1) out.push({ type: 'PREDICTION', id: prediction.id, status: decision });
      }
    }
  }

  private async audit(entityType: string, entityId: string, decision: string, result: any) {
    await this.db.auditEvent.create({
      data: {
        entityType,
        entityId,
        action: 'SETTLED',
        payload: { decision, score: { home: result.home, away: result.away }, resultVersion: result.version },
      },
    });
  }
}
