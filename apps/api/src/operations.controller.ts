import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { IngestionService } from './ingestion.service';
import { PrismaService } from './services';

@Controller('ops')
export class OperationsController {
  constructor(private ingestion: IngestionService, private analytics: AnalyticsService, private db: PrismaService) {}

  @Post('ingestion/run')
  async ingest(@Body() body?: { competitions?: string[] }) {
    const competitions = body?.competitions?.filter(Boolean);
    return { data: await this.ingestion.run(competitions?.length ? competitions : undefined) };
  }

  @Post('backtests/run')
  async backtest(@Body() body: { competition: string; season?: string; modelVersion: string; from: string; to: string }) {
    if (!body?.competition || !body?.modelVersion || !body?.from || !body?.to) throw new Error('competition, modelVersion, from and to are required');
    const from = new Date(body.from), to = new Date(body.to);
    if (!Number.isFinite(from.getTime()) || !Number.isFinite(to.getTime()) || from >= to) throw new Error('invalid backtest date range');
    const season = body.season?.trim();
    if (season && !/^\d{4}(?:[-/]\d{4})?$/.test(season)) throw new Error('season must be YYYY or YYYY-YYYY');
    return this.analytics.runBacktest({ competition: body.competition, season, modelVersion: body.modelVersion, from, to });
  }

  @Get('backtests')
  async backtests() { return this.analytics.listBacktests(); }

  @Post('paper-trading/run')
  async paper(@Body() body: { bankrollInitial: number }) {
    const bankrollInitial = Number(body?.bankrollInitial);
    if (!Number.isFinite(bankrollInitial) || bankrollInitial <= 0) throw new Error('bankrollInitial must be > 0');
    return this.analytics.runPaperTrading({ bankrollInitial });
  }

  @Get('paper-trading')
  async paperRuns() { return this.analytics.listPaperTrading(); }

  @Get('performance')
  async performance() { return this.analytics.performance(); }

  @Get('fixtures/persisted')
  async persistedFixtures(@Query('competition') competition?: string) {
    return this.db.fixture.findMany({
      where: competition ? { competition } : {},
      orderBy: { utcDate: 'asc' },
      take: 250,
    });
  }
}
