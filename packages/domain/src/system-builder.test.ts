import { describe, expect, it } from 'vitest';
import { buildSystemWithFixed, suggestAssistedSystem } from './system-builder';

const selections = Array.from({ length: 6 }, (_, i) => ({
  id: `p${i + 1}`,
  fixtureId: `f${i + 1}`,
  market: '1X2',
  selection: '1',
  probability: 0.68,
  confidence: 0.78,
  dataQuality: 0.82,
}));

describe('system-builder', () => {
  it('builds 20 triples from six selections', () => {
    const result = buildSystemWithFixed(selections, 3, 1);
    expect(result.status).toBe('OK');
    if (result.status === 'OK') expect(result.combinations).toHaveLength(20);
  });

  it('includes fixed selections in every combination', () => {
    const result = buildSystemWithFixed(selections, 3, 1, ['p1']);
    expect(result.status).toBe('OK');
    if (result.status === 'OK') {
      expect(result.combinations).toHaveLength(10);
      expect(result.combinations.every((combo) => combo.some((pick) => pick.id === 'p1'))).toBe(true);
    }
  });

  it('builds an assisted system within budget and explains coverage', () => {
    const result = suggestAssistedSystem({ selections, minCorrect: 3, budget: 20, profile: 'BALANCED' });
    expect(result.status).toBe('OK');
    if (result.status === 'OK') {
      expect(result.k).toBe(3);
      expect(result.combinations).toHaveLength(20);
      expect(result.cost).toBeLessThanOrEqual(20);
      expect(result.coverage.guarantee).toContain('non una garanzia');
    }
  });

  it('does not lower quality thresholds to fill an assisted system', () => {
    const weak = selections.map((pick) => ({ ...pick, confidence: 0.2, dataQuality: 0.2 }));
    expect(suggestAssistedSystem({ selections: weak, minCorrect: 3, budget: 20, profile: 'BALANCED' }).status).toBe('NO_BET');
  });
});
