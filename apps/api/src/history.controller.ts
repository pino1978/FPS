import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { PrismaService } from './services';

@Controller('v2/history')
export class HistoryController {
  constructor(private db: PrismaService) {}

  @Post('bets')
  async createBet(@Body() body: {
    fixtureId: string;
    competition?: string;
    market: string;
    selection: string;
    stake: number;
    odds?: number;
    bookmaker?: string;
    notes?: string;
    played?: boolean;
    simulated?: boolean;
    playedAt?: string;
    eventAt: string;
  }) {
    assertText(body?.fixtureId, 'fixtureId');
    assertText(body?.market, 'market');
    assertText(body?.selection, 'selection');
    const stake = positive(body?.stake, 'stake');
    const odds = body.odds == null ? undefined : minNumber(body.odds, 1.01, 'odds');
    const eventAt = validDate(body.eventAt, 'eventAt');
    const played = body.played === true, simulated = body.simulated === true;
    if (played && simulated) throw new Error('A bet cannot be both real and simulated');
    const playedAt = body.playedAt ? validDate(body.playedAt, 'playedAt') : played ? new Date() : undefined;
    const origin = await this.findOrigin(body.fixtureId, body.market, body.selection, eventAt);
    const bet = await this.db.bet.create({
      data: {
        fixtureId: body.fixtureId,
        competition: clean(body.competition),
        market: body.market,
        selection: body.selection,
        stake,
        odds,
        bookmaker: clean(body.bookmaker),
        notes: clean(body.notes),
        played,
        simulated,
        playedAt,
        eventAt,
        ...originData(origin),
      },
    });
    await this.db.auditEvent.create({
      data: {
        entityType: 'Bet',
        entityId: bet.id,
        action: played ? 'REAL_BET_RECORDED' : simulated ? 'PAPER_BET_RECORDED' : 'BET_SAVED',
        payload: { originSnapshotId: origin?.id ?? null },
      },
    });
    return presentBet(bet);
  }

  @Post('bets/:id/execution')
  async updateBetExecution(@Param('id') id: string, @Body() body: {
    mode: 'NOT_PLAYED' | 'PLAYED' | 'SIMULATED';
    bookmaker?: string;
    odds?: number;
    stake?: number;
    playedAt?: string;
    notes?: string;
  }) {
    assertText(id, 'id');
    if (!['NOT_PLAYED', 'PLAYED', 'SIMULATED'].includes(body?.mode)) throw new Error('Invalid execution mode');
    const played = body.mode === 'PLAYED', simulated = body.mode === 'SIMULATED';
    const updated = await this.db.bet.update({
      where: { id },
      data: {
        played,
        simulated,
        bookmaker: clean(body.bookmaker),
        odds: body.odds == null ? undefined : minNumber(body.odds, 1.01, 'odds'),
        stake: body.stake == null ? undefined : positive(body.stake, 'stake'),
        playedAt: played ? (body.playedAt ? validDate(body.playedAt, 'playedAt') : new Date()) : null,
        notes: clean(body.notes),
      },
    });
    await this.db.auditEvent.create({ data: { entityType: 'Bet', entityId: id, action: `EXECUTION_${body.mode}` } });
    return presentBet(updated);
  }

  @Get('bets')
  async bets(
    @Query('mode') mode?: 'NOT_PLAYED' | 'PLAYED' | 'SIMULATED',
    @Query('status') status?: string,
    @Query('competition') competition?: string,
    @Query('team') team?: string,
    @Query('market') market?: string,
    @Query('bookmaker') bookmaker?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const dateFilter = dateRange(from, to);
    const fixtureIds = team ? await this.fixtureIds({ team }) : undefined;
    if (team && !fixtureIds?.length) return [];
    const bets = await this.db.bet.findMany({
      where: {
        ...(mode === 'PLAYED' ? { played: true, simulated: false } : mode === 'SIMULATED' ? { simulated: true, played: false } : mode === 'NOT_PLAYED' ? { played: false, simulated: false } : {}),
        ...(status ? { status } : {}),
        ...(competition ? { competition } : {}),
        ...(fixtureIds ? { fixtureId: { in: fixtureIds } } : {}),
        ...(market ? { market } : {}),
        ...(bookmaker ? { bookmaker } : {}),
        ...(dateFilter ? { createdAt: dateFilter } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });
    return bets.map(presentBet);
  }

  @Get('predictions')
  async predictions(
    @Query('competition') competition?: string,
    @Query('team') team?: string,
    @Query('market') market?: string,
    @Query('outcome') outcome?: string,
    @Query('modelVersion') modelVersion?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const fixtureIds = competition || team ? await this.fixtureIds({ competition, team }) : undefined;
    if ((competition || team) && !fixtureIds?.length) return [];
    const snapshots = await this.db.predictionSnapshot.findMany({
      where: {
        ...(market ? { market } : {}),
        ...(outcome ? { settlement: { is: { outcome } } } : {}),
        run: {
          ...(fixtureIds ? { fixtureId: { in: fixtureIds } } : {}),
          ...(modelVersion ? { modelVersion } : {}),
          ...(dateRange(from, to) ? { asOf: dateRange(from, to) } : {}),
        },
      },
      include: { run: true, settlement: true },
      orderBy: { createdAt: 'desc' },
      take: 1000,
    });
    const fixtureMap = await this.fixtureMap([...new Set(snapshots.map((x) => x.run.fixtureId))]);
    return snapshots.map((snapshot) => ({
      id: snapshot.id,
      fixtureId: snapshot.run.fixtureId,
      fixture: fixtureMap.get(snapshot.run.fixtureId) ?? null,
      market: snapshot.market,
      selection: snapshot.selection,
      probability: snapshot.probability,
      confidence: snapshot.confidence,
      dataQuality: snapshot.dataQuality,
      fairOdds: snapshot.fairOdds,
      valueStatus: snapshot.valueStatus,
      offeredOdds: snapshot.offeredOdds,
      expectedValue: snapshot.expectedValue,
      status: snapshot.status,
      reason: snapshot.reason,
      modelVersion: snapshot.run.modelVersion,
      capturedAt: snapshot.createdAt,
      eventAt: snapshot.run.eventAt,
      outcome: snapshot.settlement?.outcome ?? null,
      settledAt: snapshot.settlement?.settledAt ?? null,
    }));
  }

  @Post('systems/:id/execution')
  async updateSystemExecution(@Param('id') id: string, @Body() body: {
    mode: 'NOT_PLAYED' | 'PLAYED' | 'SIMULATED';
    bookmaker?: string;
    playedAt?: string;
    notes?: string;
  }) {
    assertText(id, 'id');
    if (!['NOT_PLAYED', 'PLAYED', 'SIMULATED'].includes(body?.mode)) throw new Error('Invalid execution mode');
    const played = body.mode === 'PLAYED', simulated = body.mode === 'SIMULATED';
    const updated = await this.db.bettingSystem.update({
      where: { id },
      data: {
        played,
        simulated,
        bookmaker: clean(body.bookmaker),
        playedAt: played ? (body.playedAt ? validDate(body.playedAt, 'playedAt') : new Date()) : null,
        notes: clean(body.notes),
      },
      include: { selections: true, combinations: { include: { items: true } } },
    });
    await this.db.auditEvent.create({ data: { entityType: 'BettingSystem', entityId: id, action: `EXECUTION_${body.mode}` } });
    return presentSystem(updated);
  }

  @Get('systems')
  async systems(
    @Query('mode') mode?: 'NOT_PLAYED' | 'PLAYED' | 'SIMULATED',
    @Query('status') status?: string,
    @Query('competition') competition?: string,
    @Query('team') team?: string,
    @Query('market') market?: string,
    @Query('bookmaker') bookmaker?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const dateFilter = dateRange(from, to);
    const fixtureIds = team ? await this.fixtureIds({ team }) : undefined;
    if (team && !fixtureIds?.length) return [];
    const systems = await this.db.bettingSystem.findMany({
      where: {
        ...(mode === 'PLAYED' ? { played: true, simulated: false } : mode === 'SIMULATED' ? { simulated: true, played: false } : mode === 'NOT_PLAYED' ? { played: false, simulated: false } : {}),
        ...(status ? { status } : {}),
        ...(bookmaker ? { bookmaker } : {}),
        ...(dateFilter ? { createdAt: dateFilter } : {}),
        ...((competition || fixtureIds || market) ? {
          selections: { some: {
            ...(competition ? { competition } : {}),
            ...(fixtureIds ? { fixtureId: { in: fixtureIds } } : {}),
            ...(market ? { market } : {}),
          } },
        } : {}),
      },
      include: { selections: true, combinations: { include: { items: true } } },
      orderBy: { createdAt: 'desc' },
      take: 250,
    });
    return systems.map(presentSystem);
  }

  private async findOrigin(fixtureId: string, market: string, selection: string, eventAt: Date) {
    return this.db.predictionSnapshot.findFirst({
      where: { fixtureId: undefined, market, selection, run: { fixtureId, asOf: { lt: eventAt } } },
      include: { run: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  private async fixtureIds(input: { competition?: string; team?: string }) {
    const fixtures = await this.db.fixture.findMany({
      where: {
        ...(input.competition ? { competition: input.competition } : {}),
        ...(input.team ? { OR: [
          { homeTeam: { contains: input.team, mode: 'insensitive' } },
          { awayTeam: { contains: input.team, mode: 'insensitive' } },
        ] } : {}),
      },
      select: { id: true },
      take: 5000,
    });
    return fixtures.map((x) => x.id);
  }

  private async fixtureMap(ids: string[]) {
    if (!ids.length) return new Map<string, any>();
    const rows = await this.db.fixture.findMany({ where: { id: { in: ids } } });
    return new Map(rows.map((x) => [x.id, x]));
  }
}

function originData(origin: any) {
  return origin ? {
    originProbability: origin.probability,
    originConfidence: origin.confidence,
    originDataQuality: origin.dataQuality,
    originFairOdds: origin.fairOdds,
    originModelVersion: origin.run.modelVersion,
    originCapturedAt: origin.createdAt,
  } : {};
}
function originalPrediction(x: any) {
  return x.originModelVersion ? {
    probability: x.originProbability,
    confidence: x.originConfidence,
    dataQuality: x.originDataQuality,
    fairOdds: x.originFairOdds,
    modelVersion: x.originModelVersion,
    capturedAt: x.originCapturedAt ?? null,
  } : null;
}
function presentBet<T extends { status: string; stake: number; odds: number | null }>(bet: T) {
  const payout = bet.status === 'WIN' && bet.odds ? bet.stake * bet.odds : bet.status === 'LOSS' ? 0 : bet.status === 'VOID' ? bet.stake : null;
  return { ...bet, payout: payout == null ? null : Number(payout.toFixed(2)), originalPrediction: originalPrediction(bet) };
}
function presentSystem(system: any) {
  return { ...system, selections: (system.selections ?? []).map((x: any) => ({ ...x, originalPrediction: originalPrediction(x) })) };
}
function clean(value?: string) { const v = value?.trim(); return v ? v.slice(0, 500) : undefined; }
function assertText(value: unknown, field: string) { if (typeof value !== 'string' || !value.trim()) throw new Error(`${field} is required`); }
function positive(value: unknown, field: string) { const n = Number(value); if (!Number.isFinite(n) || n <= 0) throw new Error(`${field} must be > 0`); return n; }
function minNumber(value: unknown, min: number, field: string) { const n = Number(value); if (!Number.isFinite(n) || n < min) throw new Error(`${field} must be >= ${min}`); return n; }
function validDate(value: unknown, field: string) { const d = new Date(String(value)); if (!Number.isFinite(d.getTime())) throw new Error(`${field} is invalid`); return d; }
function dateRange(from?: string, to?: string) {
  if (!from && !to) return undefined;
  return { ...(from ? { gte: validDate(from, 'from') } : {}), ...(to ? { lte: validDate(to, 'to') } : {}) };
}
