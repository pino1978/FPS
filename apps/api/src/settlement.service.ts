import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { settlementEligible } from '@fps/domain';
import { FootballProvider, PrismaService } from './services';
import { settleMvpMarket } from './settlement-rules';

@Injectable()
export class SettlementService {
  private readonly log = new Logger(SettlementService.name);
  private running = false;
  private resultCache = new Map<string, any>();
  private providerFetches = 0;

  constructor(private football: FootballProvider, private db: PrismaService) {}

  @Cron('0 */10 * * * *')
  async scheduled() {
    if (this.running) return;
    this.running = true;
    try { await this.run(); } catch (error) { this.log.error(error); } finally { this.running = false; }
  }

  private async verifiedResult(fixtureId: string) {
    if (this.resultCache.has(fixtureId)) return this.resultCache.get(fixtureId);
    const stored = await this.db.fixture.findUnique({ where: { id: fixtureId } });
    if (stored?.resultVerified) {
      const evidence = (stored.resultEvidence as any) || {};
      const consolidated = {
        id: fixtureId,
        status: stored.status,
        home: stored.homeScore,
        away: stored.awayScore,
        scorers: Array.isArray(evidence.scorers) ? evidence.scorers : [],
        version: stored.resultVersion || `stored:${fixtureId}`,
        cancelled: stored.status === 'CANCELLED',
        consolidated: true,
      };
      this.resultCache.set(fixtureId, consolidated);
      return consolidated;
    }

    const result = await this.football.result(fixtureId);
    this.providerFetches++;
    const version = `fd:${fixtureId}:${result.lastUpdated || 'v1'}`;
    const finished = result.status === 'FINISHED' && result.home != null && result.away != null;
    const cancelled = result.status === 'CANCELLED';
    if (!finished && !cancelled) {
      this.resultCache.set(fixtureId, null);
      return null;
    }
    const verified = { ...result, version, cancelled, consolidated: true };
    await this.db.fixture.updateMany({
      where: { id: fixtureId, resultVerified: false },
      data: {
        status: result.status,
        homeScore: result.home,
        awayScore: result.away,
        resultVerified: true,
        verifiedAt: new Date(),
        resultVersion: version,
        resultEvidence: { scorers: result.scorers, providerStatus: result.status, providerLastUpdated: result.lastUpdated || null },
      },
    });
    this.resultCache.set(fixtureId, verified);
    return verified;
  }

  async run() {
    this.resultCache = new Map();
    this.providerFetches = 0;
    const results: any[] = [];
    await this.settleBets(results);
    await this.settleSystems(results);
    await this.settlePredictions(results);
    return { processed: results.length, fixturesFetched: this.providerFetches, fixturesResolved: this.resultCache.size, results };
  }

  private async settleBets(out: any[]) {
    const pending = await this.db.bet.findMany({
      where: { OR: [{ played: true }, { simulated: true }], verificationStatus: 'PENDING', verifiedAt: null },
    });
    for (const bet of pending.filter((b) => settlementEligible(b.eventAt, false, new Date(), settlementMarginMinutes()))) {
      const result = await this.verifiedResult(bet.fixtureId);
      if (!result) { out.push({ type: 'BET', id: bet.id, status: 'WAITING' }); continue; }
      const decision = result.cancelled ? 'VOID' : settleMvpMarket(bet.market, bet.selection, { home: result.home!, away: result.away!, scorers: result.scorers });
      if (decision === 'UNSUPPORTED') { out.push({ type: 'BET', id: bet.id, status: 'UNSUPPORTED' }); continue; }
      const updated = await this.db.bet.updateMany({
        where: { id: bet.id, verificationStatus: 'PENDING', verifiedAt: null },
        data: { status: decision, verificationStatus: 'VERIFIED', verifiedAt: new Date(), resultVersion: result.version },
      });
      if (updated.count === 1) { await this.audit('Bet', bet.id, decision, result); out.push({ type: 'BET', id: bet.id, status: decision }); }
    }
  }

  private async settleSystems(out: any[]) {
    const selections = await this.db.systemSelection.findMany({
      where: { verificationStatus: 'PENDING', verifiedAt: null, system: { OR: [{ played: true }, { simulated: true }] } },
    });
    for (const pick of selections.filter((s) => settlementEligible(s.eventAt, false, new Date(), settlementMarginMinutes()))) {
      const result = await this.verifiedResult(pick.fixtureId);
      if (!result) { out.push({ type: 'SYSTEM_SELECTION', id: pick.id, status: 'WAITING' }); continue; }
      const decision = result.cancelled ? 'VOID' : settleMvpMarket(pick.market, pick.selection, { home: result.home!, away: result.away!, scorers: result.scorers });
      if (decision === 'UNSUPPORTED') { out.push({ type: 'SYSTEM_SELECTION', id: pick.id, status: 'UNSUPPORTED' }); continue; }
      const updated = await this.db.systemSelection.updateMany({
        where: { id: pick.id, verificationStatus: 'PENDING', verifiedAt: null },
        data: { status: decision, verificationStatus: 'VERIFIED', verifiedAt: new Date(), resultVersion: result.version },
      });
      if (updated.count === 1) { await this.audit('SystemSelection', pick.id, decision, result); out.push({ type: 'SYSTEM_SELECTION', id: pick.id, status: decision }); }
    }

    const combinations = await this.db.systemCombination.findMany({
      where: { status: 'PENDING', system: { OR: [{ played: true }, { simulated: true }] } },
      include: { items: { include: { selection: true } } },
    });
    for (const combination of combinations) {
      const states = combination.items.map((item) => item.selection.status);
      const verified = combination.items.every((item) => item.selection.verificationStatus === 'VERIFIED');
      if (!states.length || !verified) continue;
      const status = states.some((state) => state === 'LOSS') ? 'LOSS' : states.every((state) => state === 'VOID') ? 'VOID' : 'WIN';
      const updated = await this.db.systemCombination.updateMany({ where: { id: combination.id, status: 'PENDING' }, data: { status } });
      if (updated.count === 1) out.push({ type: 'SYSTEM_COMBINATION', id: combination.id, status });
    }

    const systems = await this.db.bettingSystem.findMany({
      where: { OR: [{ played: true }, { simulated: true }], verificationStatus: 'PENDING' },
      include: { combinations: true, selections: true },
    });
    for (const system of systems) {
      if (!system.combinations.length || system.combinations.some((combination) => combination.status === 'PENDING')) continue;
      if (system.selections.some((selection) => selection.verificationStatus !== 'VERIFIED')) continue;
      const wins = system.combinations.filter((combination) => combination.status === 'WIN').length;
      const losses = system.combinations.filter((combination) => combination.status === 'LOSS').length;
      const voids = system.combinations.filter((combination) => combination.status === 'VOID').length;
      const status = wins > 0 && losses > 0 ? 'PARTIAL' : wins > 0 ? 'WIN' : losses > 0 ? 'LOSS' : 'VOID';
      const updated = await this.db.bettingSystem.updateMany({
        where: { id: system.id, verificationStatus: 'PENDING' },
        data: { status, verificationStatus: 'VERIFIED' },
      });
      if (updated.count === 1) {
        await this.db.auditEvent.create({ data: { entityType: 'BettingSystem', entityId: system.id, action: 'SETTLED', payload: { status, wins, losses, voids } } });
        out.push({ type: 'SYSTEM', id: system.id, status, winningCombinations: wins });
      }
    }
  }

  private async settlePredictions(out: any[]) {
    const cutoff = new Date(Date.now() - settlementMarginMinutes() * 60_000);
    const runs = await this.db.predictionRun.findMany({
      where: { eventAt: { lte: cutoff }, snapshots: { some: { settlement: null } } },
      include: { snapshots: { include: { settlement: true } } },
    });
    for (const run of runs) {
      const result = await this.verifiedResult(run.fixtureId);
      if (!result) continue;
      for (const prediction of run.snapshots.filter((x) => x.settlement === null)) {
        const outcome = prediction.status === 'NO_BET'
          ? 'NO_BET'
          : result.cancelled
            ? 'VOID'
            : settleMvpMarket(prediction.market, prediction.selection, { home: result.home!, away: result.away!, scorers: result.scorers });
        if (outcome === 'UNSUPPORTED') continue;
        try {
          await this.db.predictionSettlement.create({
            data: {
              snapshotId: prediction.id,
              outcome,
              resultVersion: result.version,
              evidence: { score: { home: result.home, away: result.away }, scorers: result.scorers, providerStatus: result.status },
            },
          });
          out.push({ type: 'PREDICTION', id: prediction.id, status: outcome });
        } catch (error: any) {
          if (error?.code !== 'P2002') throw error;
        }
      }
    }
  }

  private async audit(entityType: string, entityId: string, decision: string, result: any) {
    await this.db.auditEvent.create({ data: { entityType, entityId, action: 'SETTLED', payload: { decision, score: { home: result.home, away: result.away }, scorers: result.scorers, providerStatus: result.status, resultVersion: result.version } } });
  }
}

function settlementMarginMinutes(){const raw=Number(process.env.SETTLEMENT_MARGIN_MINUTES||150);return Number.isFinite(raw)&&raw>=0?raw:150;}
