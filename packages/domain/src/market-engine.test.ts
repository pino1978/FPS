import { describe, expect, it } from 'vitest';
import { deriveMarkets, expectedGoals, predictFixture, scoreProbabilityMatrix } from './market-engine';

const home = { played: 20, points: 40, goalsFor: 38, goalsAgainst: 18, formIndex: 0.8 };
const away = { played: 20, points: 28, goalsFor: 25, goalsAgainst: 30, formIndex: 0.5 };

describe('market engine', () => {
  it('produces bounded expected goals', () => {
    const lambda = expectedGoals(home, away);
    expect(lambda.home).toBeGreaterThan(0);
    expect(lambda.away).toBeGreaterThan(0);
    expect(lambda.home).toBeLessThanOrEqual(3.8);
  });

  it('score matrix covers essentially all probability mass', () => {
    const matrix = scoreProbabilityMatrix(1.7, 0.9, 10);
    const sum = matrix.cells.reduce((total, cell) => total + cell.probability, 0);
    expect(sum + matrix.residualProbability).toBeCloseTo(1, 10);
    expect(matrix.residualProbability).toBeLessThan(0.001);
  });

  it('1X2 selections are coherent', () => {
    const markets = deriveMarkets(scoreProbabilityMatrix(1.5, 1.1, 10).cells);
    const oneXtwo = markets.filter((m) => m.market === '1X2');
    expect(oneXtwo).toHaveLength(3);
    expect(oneXtwo.reduce((sum, m) => sum + m.probability, 0)).toBeCloseTo(1, 6);
  });

  it('over and under on the same line sum to one', () => {
    const bundle = predictFixture(home, away);
    const line = bundle.markets.filter((m) => m.market === 'OVER_UNDER_2_5');
    expect(line).toHaveLength(2);
    expect(line[0].probability + line[1].probability).toBeCloseTo(1, 6);
  });

  it('exposes all MVP core market families', () => {
    const markets = predictFixture(home, away).markets;
    for (const family of ['1X2', 'DOUBLE_CHANCE', 'DRAW_NO_BET', 'OVER_UNDER_0_5', 'OVER_UNDER_4_5', 'BTTS', 'EXACT_SCORE', 'MULTIGOAL', 'COMBO']) {
      expect(markets.some((m) => m.market === family)).toBe(true);
    }
  });
});
