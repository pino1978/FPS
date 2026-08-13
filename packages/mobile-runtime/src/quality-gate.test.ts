import { describe, expect, it } from 'vitest';
import { qualityEnvelope } from './index';

const team = (played:number) => ({ teamId:'t', played, points:played*1.5, goalsFor:played*1.3, goalsAgainst:played*1.1, formIndex:0.5, home:{played,points:played*1.5,goalsFor:played*1.3,goalsAgainst:played*1.1}, away:{played,points:played*1.5,goalsFor:played*1.3,goalsAgainst:played*1.1} });

describe('quality gate', () => {
  it('rejects insufficient history', () => {
    const result = qualityEnvelope(team(0), team(0), [0.34,0.33,0.33]);
    expect(result.active).toBe(false);
    expect(result.reason).toContain('Storico insufficiente');
  });

  it('keeps probability input separate from quality', () => {
    const result = qualityEnvelope(team(10), team(10), [0.45,0.30,0.25]);
    expect(result.dataQuality).toBeGreaterThan(0.65);
    expect(result.confidence).toBeGreaterThan(0.60);
  });
});
