import { describe, expect, it } from 'vitest';
import { settleMvpMarket } from './settlement-rules';

describe('settleMvpMarket', () => {
  const score = { home: 2, away: 1, scorers: ['Mario Rossi', 'Luca Bianchi'] };

  it('settles result families', () => {
    expect(settleMvpMarket('1X2', '1', score)).toBe('WIN');
    expect(settleMvpMarket('DOUBLE_CHANCE', '1X', score)).toBe('WIN');
    expect(settleMvpMarket('DRAW_NO_BET', '1 DNB', score)).toBe('WIN');
  });

  it('voids draw no bet on draws', () => {
    expect(settleMvpMarket('DRAW_NO_BET', '1 DNB', { home: 1, away: 1 })).toBe('VOID');
  });

  it('settles goals markets', () => {
    expect(settleMvpMarket('BTTS', 'GOAL', score)).toBe('WIN');
    expect(settleMvpMarket('OVER_UNDER_2_5', 'OVER 2.5', score)).toBe('WIN');
    expect(settleMvpMarket('HOME_GOALS_1_5', 'HOME OVER 1.5', score)).toBe('WIN');
    expect(settleMvpMarket('AWAY_GOALS_1_5', 'AWAY UNDER 1.5', score)).toBe('WIN');
  });

  it('settles exact score, multigoal and combos', () => {
    expect(settleMvpMarket('EXACT_SCORE', '2-1', score)).toBe('WIN');
    expect(settleMvpMarket('MULTIGOAL', '2-4 GOALS', score)).toBe('WIN');
    expect(settleMvpMarket('COMBO', '1 + OVER 1.5', score)).toBe('WIN');
    expect(settleMvpMarket('COMBO', '1 + GOAL', score)).toBe('WIN');
  });

  it('settles anytime scorer from verified scorer evidence', () => {
    expect(settleMvpMarket('ANYTIME_SCORER', 'Mario Rossi', score)).toBe('WIN');
    expect(settleMvpMarket('ANYTIME_SCORER', 'Altro Giocatore', score)).toBe('LOSS');
    expect(settleMvpMarket('ANYTIME_SCORER', 'Mario Rossi', { home: 2, away: 1 })).toBe('UNSUPPORTED');
  });
});
