import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { IngestionService } from './ingestion.service';

@Controller('ops')
export class OperationsController {
  constructor(private ingestion: IngestionService, private analytics: AnalyticsService) {}

  @Post('ingestion/run')
  async ingest(@Body() body?: { competitions?: string[] }) {
    const competitions = body?.competitions?.filter(Boolean);
    return { data: await this.ingestion.run(competitions?.length ? competitions : undefined) };
  }

  @Post('backtests/run')
  async backtest(@Body() body: { competition: string; modelVersion: string; from: string; to: string }) {
    if (!body?.competition || !body?.modelVersion || !body?.from || !body?.to) throw new Error('competition, modelVersion, from and to are required');
    const from = new Date(body.from), to = new Date(body.to);
    if (!Number.isFinite(from.getTime()) || !Number.isFinite(to.getTime()) || from >= to) throw new Error('invalid backtest date range');
    return this.analytics.runBacktest({ competition: body.competition, modelVersion: body.modelVersion, from, to });
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

  @Get('fixtures/persisted')
  async persistedFixtures(@Query('competition') _competition?: string) {
    return { note: 'Use the public fixtures endpoint for live data; persisted data is maintained by the ingestion job.' };
  }
}
