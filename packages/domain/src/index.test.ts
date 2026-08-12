import { describe, expect, it } from 'vitest';
import {
  buildSystem,
  correlation,
  evaluateValue,
  optimizeSystem,
  parseForm,
  predictMarkets,
  settleMarket,
  settlementEligible,
} from './index';

describe('domain', () => {
  it('blocks incompatible picks', () => {
    const result = buildSystem([
      { id: 'a', fixtureId: '1', market: 'BTTS', selection: 'GOAL' },
      { id: 'b', fixtureId: '1', market: 'BTTS', selection: 'NO GOAL' },
    ], 2, 1);
    expect(result.status).toBe('INCOMPATIBLE');
  });

  it('blocks exclusive 1X2 outcomes', () => {
    const result = buildSystem([
      { id: 'a', fixtureId: '1', market: '1X2', selection: '1' },
      { id: 'b', fixtureId: '1', market: '1X2', selection: 'X' },
    ], 2, 1);
    expect(result.status).toBe('INCOMPATIBLE');
  });

  it('creates 20 triples from six', () => {
    const selections = Array.from({ length: 6 }, (_, i) => ({ id: String(i), fixtureId: String(i), market: '1X2', selection: '1' }));
    expect(buildSystem(selections, 3, 1).combinations).toHaveLength(20);
  });

  it('parses recent form reproducibly', () => {
    expect(parseForm('WDLWW')).toBeCloseTo(0.7, 6);
    expect(parseForm(undefined)).toBeUndefined();
  });

  it('returns no bet on weak data', () => {
    expect(predictMarkets(
      { played: 1, points: 1, goalsFor: 1, goalsAgainst: 1 },
      { played: 1, points: 1, goalsFor: 1, goalsAgainst: 1 },
    )[0].status).toBe('NO_BET');
  });

  it('keeps Value unavailable without offered odds', () => {
    const value = evaluateValue(0.6);
    expect(value.status).toBe('UNAVAILABLE');
    expect(value.expectedValue).toBeNull();
  });

  it('computes Value only with a valid offered price', () => {
    const value = evaluateValue(0.6, 1.9);
    expect(value.status).toBe('AVAILABLE');
    expect(value.expectedValue).toBeCloseTo(0.14, 6);
  });

  it('keeps correlation distinct from incompatibility', () => {
    const a = { id: 'a', fixtureId: '1', market: 'BTTS', selection: 'GOAL' };
    const b = { id: 'b', fixtureId: '1', market: 'OVER_UNDER_2_5', selection: 'OVER 2.5' };
    expect(correlation(a, b).level).toBe('HIGH');
    expect(buildSystem([a, b], 2, 1).status).toBe('OK');
  });

  it('prudent optimizer excludes highly correlated pairs', () => {
    const selections = [
      { id: 'a', fixtureId: '1', market: 'BTTS', selection: 'GOAL', probability: 0.75, confidence: 0.8, dataQuality: 0.8 },
      { id: 'b', fixtureId: '1', market: 'OVER_UNDER_2_5', selection: 'OVER 2.5', probability: 0.72, confidence: 0.8, dataQuality: 0.8 },
      { id: 'c', fixtureId: '2', market: '1X2', selection: '1', probability: 0.71, confidence: 0.8, dataQuality: 0.8 },
    ];
    const result = optimizeSystem(selections, 20, 'PRUDENT');
    expect(result.status).toBe('OK');
    if (result.status === 'OK') expect(result.maxCorrelation).toBeLessThan(0.7);
  });

  it('optimizes within budget', () => {
    const selections = Array.from({ length: 6 }, (_, i) => ({ id: String(i), fixtureId: String(i), market: '1X2', selection: '1', probability: 0.7, confidence: 0.8, dataQuality: 0.8 }));
    const result = optimizeSystem(selections, 20, 'BALANCED');
    expect(result.status).toBe('OK');
    if (result.status === 'OK') expect(result.cost).toBeLessThanOrEqual(20);
  });

  it('settles supported markets', () => {
    expect(settleMarket('1X2', '1', { home: 2, away: 0 })).toBe('WIN');
    expect(settleMarket('BTTS', 'NO GOAL', { home: 2, away: 0 })).toBe('WIN');
    expect(settleMarket('OVER_UNDER_2_5', 'OVER 2.5', { home: 2, away: 1 })).toBe('WIN');
  });

  it('does not reprocess verified events', () => {
    expect(settlementEligible(new Date(0), true, new Date())).toBe(false);
  });
});
