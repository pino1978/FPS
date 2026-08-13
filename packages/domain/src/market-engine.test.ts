import { describe, expect, it } from 'vitest';
import { deriveMarkets, expectedGoals, predictFixture, scoreProbabilityMatrix, teamStrength } from './market-engine';

const home = { played: 20, points: 40, goalsFor: 38, goalsAgainst: 18, formIndex: 0.8, home:{played:10,points:25,goalsFor:24,goalsAgainst:7}, away:{played:10,points:15,goalsFor:14,goalsAgainst:11} };
const away = { played: 20, points: 28, goalsFor: 25, goalsAgainst: 30, formIndex: 0.5, home:{played:10,points:19,goalsFor:16,goalsAgainst:12}, away:{played:10,points:9,goalsFor:9,goalsAgainst:18} };

describe('market engine', () => {
  it('produces bounded expected goals', () => {
    const lambda = expectedGoals(home, away);
    expect(lambda.home).toBeGreaterThan(0);
    expect(lambda.away).toBeGreaterThan(0);
    expect(lambda.home).toBeLessThanOrEqual(3.8);
  });

  it('uses venue split instead of treating total-only data as equivalent', () => {
    const withVenue = expectedGoals(home, away);
    const withoutVenue = expectedGoals({...home,home:undefined,away:undefined},{...away,home:undefined,away:undefined});
    expect(withVenue.home).not.toBeCloseTo(withoutVenue.home, 6);
    expect(withVenue.away).not.toBeCloseTo(withoutVenue.away, 6);
  });

  it('availability loss reduces only the affected team expected goals', () => {
    const baseline = expectedGoals(home, away);
    const affected = expectedGoals(home, away, undefined, {homeAvailabilityLoss:0.8,awayAvailabilityLoss:0});
    expect(affected.home).toBeLessThan(baseline.home);
    expect(affected.away).toBeCloseTo(baseline.away, 10);
  });

  it('team strength is deterministic, bounded and availability-aware', () => {
    const baseline = teamStrength(home, away);
    const affected = teamStrength(home, away, {homeAvailabilityLoss:0.75});
    expect(baseline.home).toBeGreaterThanOrEqual(0);
    expect(baseline.home).toBeLessThanOrEqual(1);
    expect(affected.home).toBeLessThan(baseline.home);
    expect(affected.away).toBeCloseTo(baseline.away, 10);
    expect(affected.configVersion).toContain('v3');
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

  it('exposes all score-derived SRS core market families', () => {
    const markets = predictFixture(home, away).markets;
    for (const family of ['1X2', 'DOUBLE_CHANCE', 'DRAW_NO_BET', 'OVER_UNDER_0_5', 'OVER_UNDER_4_5', 'BTTS', 'HOME_GOALS_0_5', 'AWAY_GOALS_0_5', 'EXACT_SCORE', 'MULTIGOAL', 'CLEAN_SHEET', 'WIN_TO_NIL', 'WIN_MARGIN', 'GOALS_PARITY', 'COMBO']) {
      expect(markets.some((m) => m.market === family)).toBe(true);
    }
  });

  it('keeps complementary score-derived market probabilities coherent', () => {
    const markets=predictFixture(home,away).markets;
    const parity=markets.filter(m=>m.market==='GOALS_PARITY');
    expect(parity.reduce((s,m)=>s+m.probability,0)).toBeCloseTo(1,6);
    const margin=markets.filter(m=>m.market==='WIN_MARGIN');
    expect(margin.reduce((s,m)=>s+m.probability,0)).toBeCloseTo(1,6);
  });
});
