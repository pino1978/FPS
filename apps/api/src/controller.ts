import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { buildSystem, optimizeSystem, predictMarkets, settlementEligible, Selection } from '@fps/domain';
import { FootballProvider, PrismaService } from './services';
import { SettlementService } from './settlement.service';

type SavedSelectionInput = {
  clientKey: string;
  fixtureId: string;
  market: string;
  selection: string;
  eventAt: string;
  odds?: number;
};

type SavedCombinationInput = {
  selectionKeys: string[];
  stake: number;
};

@Controller()
export class AppController {
  constructor(
    private football: FootballProvider,
    private db: PrismaService,
    private settlement: SettlementService,
  ) {}

  @Get('health')
  health() {
    return { status: 'ok', service: 'fps-api', time: new Date().toISOString() };
  }

  @Get('fixtures')
  async fixtures(@Query('competition') competition = 'SA', @Query('date') date?: string) {
    return { source: 'football-data.org', data: await this.football.fixtures(competition, date) };
  }

  @Get('predictions')
  async predictions(
    @Query('competition') competition = 'SA',
    @Query('date') date?: string,
    @Query('persist') persist = 'false',
  ) {
    const [fixtures, standings] = await Promise.all([
      this.football.fixtures(competition, date),
      this.football.standings(competition),
    ]);
    const map = new Map(standings.map((x) => [x.teamId, x]));
    const data = fixtures.map((fixture) => {
      const home = map.get(fixture.home.id);
      const away = map.get(fixture.away.id);
      const markets = home && away
        ? predictMarkets(home, away)
        : [{ market: 'MODEL', selection: 'NO_BET', probability: 0, confidence: 0, dataQuality: 0, status: 'NO_BET' as const, reason: 'Statistiche mancanti' }];
      return { fixture, markets };
    });

    if (persist === 'true') {
      for (const row of data) {
        await this.db.predictionRun.create({
          data: {
            fixtureId: row.fixture.id,
            modelVersion: 'poisson-bootstrap-v1',
            source: 'football-data.org',
            eventAt: new Date(row.fixture.utcDate),
            snapshots: {
              create: row.markets.map((m) => ({
                market: m.market,
                selection: m.selection,
                probability: m.probability,
                confidence: m.confidence,
                dataQuality: m.dataQuality,
                status: m.status,
              })),
            },
          },
        });
      }
    }
    return { source: 'football-data.org', modelVersion: 'poisson-bootstrap-v1', data };
  }

  @Post('systems/build')
  systems(@Body() body: { selections: Selection[]; k: number; stake: number; budget?: number }) {
    const result = buildSystem(body.selections, body.k, body.stake);
    return {
      ...result,
      budget: body.budget ?? null,
      withinBudget: body.budget == null || result.cost <= body.budget,
      stake: body.stake,
    };
  }

  @Post('systems/optimize')
  optimize(@Body() body: { selections: Selection[]; budget: number; profile?: 'PRUDENT' | 'BALANCED' | 'AGGRESSIVE' }) {
    return optimizeSystem(body.selections, body.budget, body.profile || 'BALANCED');
  }

  @Post('systems/save')
  async saveSystem(@Body() body: {
    mode: string;
    profile?: string;
    budget: number;
    totalCost: number;
    played: boolean;
    selections: SavedSelectionInput[];
    combinations: SavedCombinationInput[];
  }) {
    return this.db.$transaction(async (tx) => {
      const system = await tx.bettingSystem.create({
        data: {
          mode: body.mode,
          profile: body.profile,
          budget: body.budget,
          totalCost: body.totalCost,
          played: body.played,
        },
      });

      const selectionIdByKey = new Map<string, string>();
      for (const selection of body.selections) {
        const saved = await tx.systemSelection.create({
          data: {
            systemId: system.id,
            clientKey: selection.clientKey,
            fixtureId: selection.fixtureId,
            market: selection.market,
            selection: selection.selection,
            eventAt: new Date(selection.eventAt),
            odds: selection.odds,
          },
        });
        selectionIdByKey.set(selection.clientKey, saved.id);
      }

      for (const combination of body.combinations) {
        const ids = combination.selectionKeys.map((key) => selectionIdByKey.get(key));
        if (ids.some((id) => !id)) throw new Error('Combination contains unknown selection');
        await tx.systemCombination.create({
          data: {
            systemId: system.id,
            stake: combination.stake,
            items: { create: ids.map((selectionId) => ({ selectionId: selectionId! })) },
          },
        });
      }

      await tx.auditEvent.create({
        data: {
          entityType: 'BettingSystem',
          entityId: system.id,
          action: body.played ? 'REAL_SYSTEM_RECORDED' : 'SYSTEM_SAVED',
          payload: { combinationCount: body.combinations.length, totalCost: body.totalCost },
        },
      });

      return tx.bettingSystem.findUniqueOrThrow({
        where: { id: system.id },
        include: { selections: true, combinations: { include: { items: true } } },
      });
    });
  }

  @Get('systems')
  async savedSystems() {
    return this.db.bettingSystem.findMany({
      include: { selections: true, combinations: { include: { items: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Post('bets')
  async createBet(@Body() body: {
    fixtureId: string;
    market: string;
    selection: string;
    stake: number;
    odds?: number;
    played: boolean;
    eventAt: string;
  }) {
    const bet = await this.db.bet.create({ data: { ...body, eventAt: new Date(body.eventAt) } });
    await this.db.auditEvent.create({
      data: { entityType: 'Bet', entityId: bet.id, action: body.played ? 'REAL_BET_RECORDED' : 'PREDICTION_SAVED' },
    });
    return bet;
  }

  @Get('bets')
  async bets(@Query('played') played?: string) {
    return this.db.bet.findMany({
      where: played === undefined ? {} : { played: played === 'true' },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Get('metrics')
  async metrics() {
    const snapshots = await this.db.predictionSnapshot.findMany({ where: { outcome: { in: ['WIN', 'LOSS'] } } });
    const brier = snapshots.length
      ? snapshots.reduce((sum, p) => sum + Math.pow(p.probability - (p.outcome === 'WIN' ? 1 : 0), 2), 0) / snapshots.length
      : null;
    const hit = snapshots.length ? snapshots.filter((p) => p.outcome === 'WIN').length / snapshots.length : null;

    const realBets = await this.db.bet.findMany({ where: { played: true, status: { in: ['WIN', 'LOSS'] } } });
    const stake = realBets.reduce((sum, bet) => sum + bet.stake, 0);
    const returns = realBets.reduce((sum, bet) => sum + (bet.status === 'WIN' ? bet.stake * (bet.odds ?? 1) : 0), 0);
    const systems = await this.db.bettingSystem.groupBy({ by: ['status'], where: { played: true }, _count: { _all: true } });

    return {
      modelPerformance: { sample: snapshots.length, brierScore: brier, hitRate: hit },
      bettingPerformance: { sample: realBets.length, stake, returns, profit: returns - stake, roi: stake ? (returns - stake) / stake : null },
      systemPerformance: systems,
    };
  }

  @Post('settlement/eligible')
  async eligible() {
    const pending = await this.db.bet.findMany({ where: { played: true, status: 'PENDING' } });
    return pending
      .filter((bet) => settlementEligible(bet.eventAt, !!bet.verifiedAt))
      .map((bet) => ({ id: bet.id, fixtureId: bet.fixtureId, eventAt: bet.eventAt }));
  }

  @Post('settlement/run')
  async settle() {
    return this.settlement.run();
  }
}
