import { describe, expect, it } from 'vitest';
import { PredictionController } from './prediction.controller';
import { FootballProvider } from './services';

const live = process.env.LIVE_PROVIDER_SMOKE === '1';

(live ? describe : describe.skip)('live Serie A end-to-end smoke', () => {
  it('crosses provider adapter, normalization, API controller and prediction market engine', async () => {
    const controller = new PredictionController(new FootballProvider(), {} as any);
    const result = await controller.predictions('SA', undefined, 'false');

    expect(result.source).toContain('football-data.org');
    expect(result.data.length).toBeGreaterThan(0);

    const modeled = result.data.find((row: any) => row.markets?.some((market: any) => market.market === '1X2'));
    expect(modeled).toBeTruthy();
    expect(modeled?.fixture.home.name).toBeTruthy();
    expect(modeled?.fixture.away.name).toBeTruthy();

    const oneXtwo = modeled!.markets.filter((market: any) => market.market === '1X2');
    expect(oneXtwo).toHaveLength(3);
    expect(oneXtwo.reduce((sum: number, market: any) => sum + market.probability, 0)).toBeCloseTo(1, 5);
    expect(modeled!.markets.some((market: any) => market.market === 'BTTS')).toBe(true);
    expect(modeled!.markets.some((market: any) => market.market === 'OVER_UNDER_2_5')).toBe(true);
    expect(modeled!.markets.every((market: any) => Number.isFinite(market.confidence) && Number.isFinite(market.dataQuality))).toBe(true);
  }, 30_000);
});
