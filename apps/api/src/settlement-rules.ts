export type SettlementDecision = 'WIN' | 'LOSS' | 'VOID' | 'UNSUPPORTED';
export type SettlementContext = { home: number; away: number; scorers?: string[] };

const norm = (value: string) => value.toUpperCase().trim();
const person = (value: string) => value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');

export function settleMvpMarket(market: string, selection: string, ctx: SettlementContext): SettlementDecision {
  const s = norm(selection);
  const total = ctx.home + ctx.away;
  const outcome = ctx.home > ctx.away ? '1' : ctx.home < ctx.away ? '2' : 'X';

  if (market === '1X2') return s === outcome ? 'WIN' : 'LOSS';

  if (market === 'DOUBLE_CHANCE') {
    if (s === '1X') return outcome === '1' || outcome === 'X' ? 'WIN' : 'LOSS';
    if (s === 'X2') return outcome === 'X' || outcome === '2' ? 'WIN' : 'LOSS';
    if (s === '12') return outcome === '1' || outcome === '2' ? 'WIN' : 'LOSS';
    return 'UNSUPPORTED';
  }

  if (market === 'DRAW_NO_BET') {
    if (outcome === 'X') return 'VOID';
    if (s.startsWith('1')) return outcome === '1' ? 'WIN' : 'LOSS';
    if (s.startsWith('2')) return outcome === '2' ? 'WIN' : 'LOSS';
    return 'UNSUPPORTED';
  }

  if (market === 'BTTS') {
    const yes = ctx.home > 0 && ctx.away > 0;
    if (s === 'GOAL') return yes ? 'WIN' : 'LOSS';
    if (s === 'NO GOAL') return yes ? 'LOSS' : 'WIN';
    return 'UNSUPPORTED';
  }

  const ou = s.match(/(OVER|UNDER)\s*(\d+(?:\.\d+)?)/);
  if (ou && market.startsWith('OVER_UNDER_')) {
    const line = Number(ou[2]);
    return ou[1] === 'OVER' ? (total > line ? 'WIN' : 'LOSS') : (total < line ? 'WIN' : 'LOSS');
  }

  if (ou && market.startsWith('HOME_GOALS_')) {
    const line = Number(ou[2]);
    return ou[1] === 'OVER' ? (ctx.home > line ? 'WIN' : 'LOSS') : (ctx.home < line ? 'WIN' : 'LOSS');
  }

  if (ou && market.startsWith('AWAY_GOALS_')) {
    const line = Number(ou[2]);
    return ou[1] === 'OVER' ? (ctx.away > line ? 'WIN' : 'LOSS') : (ctx.away < line ? 'WIN' : 'LOSS');
  }

  if (market === 'EXACT_SCORE') return s === `${ctx.home}-${ctx.away}` ? 'WIN' : 'LOSS';

  if (market === 'MULTIGOAL') {
    const range = s.match(/(\d+)\s*-\s*(\d+)/);
    if (!range) return 'UNSUPPORTED';
    const min = Number(range[1]), max = Number(range[2]);
    return total >= min && total <= max ? 'WIN' : 'LOSS';
  }

  if (market === 'COMBO') {
    if (s === '1 + OVER 1.5') return outcome === '1' && total > 1.5 ? 'WIN' : 'LOSS';
    if (s === '2 + OVER 1.5') return outcome === '2' && total > 1.5 ? 'WIN' : 'LOSS';
    if (s === '1 + GOAL') return outcome === '1' && ctx.home > 0 && ctx.away > 0 ? 'WIN' : 'LOSS';
    if (s === '2 + GOAL') return outcome === '2' && ctx.home > 0 && ctx.away > 0 ? 'WIN' : 'LOSS';
    return 'UNSUPPORTED';
  }

  if (market === 'ANYTIME_SCORER') {
    if (!ctx.scorers) return 'UNSUPPORTED';
    const target = person(selection);
    return ctx.scorers.some((name) => person(name) === target) ? 'WIN' : 'LOSS';
  }

  return 'UNSUPPORTED';
}
