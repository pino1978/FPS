import { Controller, Get, Query } from '@nestjs/common';
import { MODEL_CONFIG_VERSION, MODEL_VERSION, predictFixture, StructuredMarket } from '@fps/domain';
import { FootballProvider, PrismaService, Standing } from './services';

type PresentedMarket = StructuredMarket & {
  confidence: number;
  dataQuality: number;
  status: 'ACTIVE' | 'NO_BET';
  reason?: string;
};

@Controller('v2')
export class PredictionController {
  constructor(private football: FootballProvider, private db: PrismaService) {}

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
    const byTeam = new Map(standings.map((x) => [x.teamId, x]));

    const data = fixtures.map((fixture) => {
      const home = byTeam.get(fixture.home.id);
      const away = byTeam.get(fixture.away.id);
      if (!home || !away) {
        return {
          fixture,
          expectedGoalsHome: null,
          expectedGoalsAway: null,
          residualProbability: null,
          markets: [{ market: 'MODEL', selection: 'NO_BET', probability: 0, confidence: 0, dataQuality: 0, fairOdds: null, status: 'NO_BET' as const, reason: 'Statistiche mancanti' }],
          inputs: null,
        };
      }
      const bundle = predictFixture(home, away);
      const oneXtwo = bundle.markets.filter((m: StructuredMarket) => m.market === '1X2').map((m: StructuredMarket) => m.probability);
      const envelope = qualityEnvelope(home, away, oneXtwo);
      const markets: PresentedMarket[] = bundle.markets.map((market: StructuredMarket) => ({
        ...market,
        confidence: envelope.confidence,
        dataQuality: envelope.dataQuality,
        status: envelope.active ? 'ACTIVE' : 'NO_BET',
        reason: envelope.active ? undefined : 'Confidence/Data Quality sotto soglia',
      }));
      return {
        fixture,
        expectedGoalsHome: bundle.expectedGoalsHome,
        expectedGoalsAway: bundle.expectedGoalsAway,
        residualProbability: bundle.residualProbability,
        inputs: { home, away },
        markets,
      };
    });

    if (persist === 'true') {
      for (const row of data) {
        const cutoff = new Date(Date.now() - 5 * 60_000);
        const existing = await this.db.predictionRun.findFirst({
          where: { fixtureId: row.fixture.id, modelVersion: MODEL_VERSION, asOf: { gte: cutoff } },
        });
        if (existing) continue;
        await this.db.predictionRun.create({
          data: {
            fixtureId: row.fixture.id,
            modelVersion: MODEL_VERSION,
            source: 'football-data.org',
            eventAt: new Date(row.fixture.utcDate),
            inputSnapshot: row.inputs ? {
              competition,
              capturedAt: new Date().toISOString(),
              modelConfigVersion: MODEL_CONFIG_VERSION,
              home: row.inputs.home,
              away: row.inputs.away,
              expectedGoalsHome: row.expectedGoalsHome,
              expectedGoalsAway: row.expectedGoalsAway,
              residualProbability: row.residualProbability,
            } : undefined,
            snapshots: {
              create: row.markets.map((m) => ({
                market: m.market,
                selection: m.selection,
                probability: m.probability,
                confidence: m.confidence,
                dataQuality: m.dataQuality,
                fairOdds: m.fairOdds,
                valueStatus: 'UNAVAILABLE',
                status: m.status,
              })),
            },
          },
        });
      }
    }

    return { source: 'football-data.org', modelVersion: MODEL_VERSION, modelConfigVersion: MODEL_CONFIG_VERSION, data };
  }
}

function qualityEnvelope(home: Standing, away: Standing, oneXtwo: number[]) {
  const minGames = Math.min(home.played, away.played);
  const formCoverage = home.formIndex == null || away.formIndex == null ? 0.9 : 1;
  const dataQuality = Math.max(0, Math.min(1, (minGames / 10) * formCoverage));
  const sorted = [...oneXtwo].sort((a, b) => b - a);
  const separation = sorted.length > 1 ? sorted[0] - sorted[1] : 0;
  const confidence = Math.max(0, Math.min(1, 0.45 + 0.35 * dataQuality + 0.20 * Math.min(1, separation * 3)));
  return { dataQuality, confidence, active: minGames >= 3 && dataQuality >= 0.60 && confidence >= 0.60 };
}
