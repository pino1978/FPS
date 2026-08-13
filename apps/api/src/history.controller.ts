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
      },
    });
    await this.db.auditEvent.create({
      data: { entityType: 'Bet', entityId: bet.id, action: played ? 'REAL_BET_RECORDED' : simulated ? 'PAPER_BET_RECORDED' : 'BET_SAVED' },
    });
    return withPayout(bet);
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
    return withPayout(updated);
  }

  @Get('bets')
  async bets(
    @Query('mode') mode?: 'NOT_PLAYED' | 'PLAYED' | 'SIMULATED',
    @Query('status') status?: string,
    @Query('competition') competition?: string,
    @Query('market') market?: string,
    @Query('bookmaker') bookmaker?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const dateFilter = dateRange(from, to);
    const bets = await this.db.bet.findMany({
      where: {
        ...(mode === 'PLAYED' ? { played: true, simulated: false } : mode === 'SIMULATED' ? { simulated: true, played: false } : mode === 'NOT_PLAYED' ? { played: false, simulated: false } : {}),
        ...(status ? { status } : {}),
        ...(competition ? { competition } : {}),
        ...(market ? { market } : {}),
        ...(bookmaker ? { bookmaker } : {}),
        ...(dateFilter ? { createdAt: dateFilter } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });
    return bets.map(withPayout);
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
    return updated;
  }

  @Get('systems')
  async systems(
    @Query('mode') mode?: 'NOT_PLAYED' | 'PLAYED' | 'SIMULATED',
    @Query('status') status?: string,
    @Query('bookmaker') bookmaker?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const dateFilter = dateRange(from, to);
    return this.db.bettingSystem.findMany({
      where: {
        ...(mode === 'PLAYED' ? { played: true, simulated: false } : mode === 'SIMULATED' ? { simulated: true, played: false } : mode === 'NOT_PLAYED' ? { played: false, simulated: false } : {}),
        ...(status ? { status } : {}),
        ...(bookmaker ? { bookmaker } : {}),
        ...(dateFilter ? { createdAt: dateFilter } : {}),
      },
      include: { selections: true, combinations: { include: { items: true } } },
      orderBy: { createdAt: 'desc' },
      take: 250,
    });
  }
}

function withPayout<T extends { status: string; stake: number; odds: number | null }>(bet: T) {
  const payout = bet.status === 'WIN' && bet.odds ? bet.stake * bet.odds : bet.status === 'LOSS' ? 0 : bet.status === 'VOID' ? bet.stake : null;
  return { ...bet, payout: payout == null ? null : Number(payout.toFixed(2)) };
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
