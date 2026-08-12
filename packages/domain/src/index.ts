export type TeamMetrics = {
  played: number;
  points: number;
  goalsFor: number;
  goalsAgainst: number;
  formIndex?: number;
};

export type ValueAssessment = {
  status: 'AVAILABLE' | 'UNAVAILABLE';
  fairOdds: number | null;
  offeredOdds: number | null;
  edge: number | null;
  expectedValue: number | null;
};

export type MarketPrediction = {
  market: string;
  selection: string;
  probability: number;
  confidence: number;
  dataQuality: number;
  status: 'ACTIVE' | 'NO_BET';
  reason?: string;
  fairOdds: number | null;
};

export type Selection = {
  id: string;
  fixtureId: string;
  market: string;
  selection: string;
  odds?: number;
  probability?: number;
  confidence?: number;
  dataQuality?: number;
};

export type Compatibility = 'COMPATIBLE' | 'INCOMPATIBLE';
export type Correlation = {
  score: number;
  level: 'LOW' | 'MEDIUM' | 'HIGH';
  rulesetVersion: string;
  reason: string;
};
export type Score = { home: number; away: number };

export const MODEL_VERSION = 'poisson-form-v2';
export const CORRELATION_RULESET_VERSION = 'correlation-v1';

const clamp = (n: number, min = 0, max = 1) => Math.max(min, Math.min(max, n));
const fact = (n: number): number => (n <= 1 ? 1 : n * fact(n - 1));
const poisson = (k: number, lambda: number) => Math.exp(-lambda) * Math.pow(lambda, k) / fact(k);

export function evaluateValue(probability: number, offeredOdds?: number): ValueAssessment {
  const fairOdds = probability > 0 ? 1 / probability : null;
  if (!offeredOdds || offeredOdds <= 1 || !fairOdds) {
    return { status: 'UNAVAILABLE', fairOdds, offeredOdds: offeredOdds ?? null, edge: null, expectedValue: null };
  }
  return {
    status: 'AVAILABLE',
    fairOdds,
    offeredOdds,
    edge: offeredOdds - fairOdds,
    expectedValue: probability * offeredOdds - 1,
  };
}

export function parseForm(form?: string | null): number | undefined {
  if (!form) return undefined;
  const tokens = form.toUpperCase().match(/[WDL]/g);
  if (!tokens?.length) return undefined;
  return tokens.reduce((sum, token) => sum + (token === 'W' ? 1 : token === 'D' ? 0.5 : 0), 0) / tokens.length;
}

export function predictMarkets(home: TeamMetrics, away: TeamMetrics): MarketPrediction[] {
  const minGames = Math.min(home.played, away.played);
  const formCoverage = home.formIndex == null || away.formIndex == null ? 0.9 : 1;
  const dataQuality = clamp((minGames / 10) * formCoverage);

  if (minGames < 3) {
    return [{
      market: 'MODEL', selection: 'NO_BET', probability: 0, confidence: 0.35,
      dataQuality, status: 'NO_BET', reason: 'Campione insufficiente', fairOdds: null,
    }];
  }

  const homeGoalsFor = home.goalsFor / home.played;
  const homeGoalsAgainst = home.goalsAgainst / home.played;
  const awayGoalsFor = away.goalsFor / away.played;
  const awayGoalsAgainst = away.goalsAgainst / away.played;
  const homeFormFactor = home.formIndex == null ? 1 : 0.9 + 0.2 * home.formIndex;
  const awayFormFactor = away.formIndex == null ? 1 : 0.9 + 0.2 * away.formIndex;
  const homeAdvantage = 1.08;
  const lambdaHome = clamp(((homeGoalsFor + awayGoalsAgainst) / 2) * homeAdvantage * homeFormFactor, 0.15, 3.8);
  const lambdaAway = clamp(((awayGoalsFor + homeGoalsAgainst) / 2) * awayFormFactor, 0.15, 3.8);

  let pHome = 0, pDraw = 0, pAway = 0, pOver15 = 0, pOver25 = 0, pOver35 = 0, pBtts = 0;
  for (let h = 0; h <= 8; h++) {
    for (let a = 0; a <= 8; a++) {
      const p = poisson(h, lambdaHome) * poisson(a, lambdaAway);
      if (h > a) pHome += p; else if (h === a) pDraw += p; else pAway += p;
      if (h + a >= 2) pOver15 += p;
      if (h + a >= 3) pOver25 += p;
      if (h + a >= 4) pOver35 += p;
      if (h > 0 && a > 0) pBtts += p;
    }
  }

  const confidence = clamp(0.45 + 0.35 * dataQuality + 0.2 * Math.min(1, Math.abs(pHome - pAway)));
  const active = confidence >= 0.60 && dataQuality >= 0.60;
  const market = (name: string, selection: string, probability: number): MarketPrediction => ({
    market: name,
    selection,
    probability: clamp(probability),
    confidence,
    dataQuality,
    status: active ? 'ACTIVE' : 'NO_BET',
    reason: active ? undefined : 'Confidence/Data Quality sotto soglia',
    fairOdds: probability > 0 ? 1 / probability : null,
  });

  const outcomes = [['1', pHome], ['X', pDraw], ['2', pAway]] as const;
  const best = outcomes.reduce((left, right) => (right[1] > left[1] ? right : left));
  return [
    market('1X2', best[0], best[1]),
    market('OVER_UNDER_1_5', pOver15 >= 0.5 ? 'OVER 1.5' : 'UNDER 1.5', pOver15 >= 0.5 ? pOver15 : 1 - pOver15),
    market('OVER_UNDER_2_5', pOver25 >= 0.5 ? 'OVER 2.5' : 'UNDER 2.5', pOver25 >= 0.5 ? pOver25 : 1 - pOver25),
    market('OVER_UNDER_3_5', pOver35 >= 0.5 ? 'OVER 3.5' : 'UNDER 3.5', pOver35 >= 0.5 ? pOver35 : 1 - pOver35),
    market('BTTS', pBtts >= 0.5 ? 'GOAL' : 'NO GOAL', pBtts >= 0.5 ? pBtts : 1 - pBtts),
  ];
}

const exclusiveMarkets = new Set(['1X2', 'BTTS', 'DRAW_NO_BET']);
export function compatibility(a: Selection, b: Selection): Compatibility {
  if (a.fixtureId !== b.fixtureId) return 'COMPATIBLE';
  const x = a.selection.toUpperCase(), y = b.selection.toUpperCase();
  if (a.market === b.market && exclusiveMarkets.has(a.market) && x !== y) return 'INCOMPATIBLE';
  if ((x === 'GOAL' && y === 'NO GOAL') || (y === 'GOAL' && x === 'NO GOAL')) return 'INCOMPATIBLE';
  const overUnder = (selection: string) => selection.match(/(OVER|UNDER)\s*(\d+(?:\.\d+)?)/);
  const ax = overUnder(x), by = overUnder(y);
  if (ax && by && ax[1] !== by[1]) {
    const aLine = Number(ax[2]), bLine = Number(by[2]);
    if ((ax[1] === 'OVER' && aLine >= bLine) || (by[1] === 'OVER' && bLine >= aLine)) return 'INCOMPATIBLE';
  }
  return 'COMPATIBLE';
}

export function correlation(a: Selection, b: Selection): Correlation {
  if (a.fixtureId !== b.fixtureId) return { score: 0.05, level: 'LOW', rulesetVersion: CORRELATION_RULESET_VERSION, reason: 'Eventi differenti' };
  const x = a.selection.toUpperCase(), y = b.selection.toUpperCase();
  let score = 0.45, reason = 'Stessa partita';
  if ((a.market === 'BTTS' && x === 'GOAL' && y.startsWith('OVER')) || (b.market === 'BTTS' && y === 'GOAL' && x.startsWith('OVER'))) {
    score = 0.72; reason = 'Goal e Over condividono lo scenario di gara ad alto punteggio';
  } else if (a.market === b.market) {
    score = 0.85; reason = 'Mercati della stessa famiglia sulla stessa partita';
  }
  return { score, level: score >= 0.70 ? 'HIGH' : score >= 0.40 ? 'MEDIUM' : 'LOW', rulesetVersion: CORRELATION_RULESET_VERSION, reason };
}

export function combinations<T>(items: T[], k: number): T[][] {
  if (k === 0) return [[]];
  if (items.length < k) return [];
  return items.flatMap((item, index) => combinations(items.slice(index + 1), k - 1).map((tail) => [item, ...tail]));
}

export function buildSystem(selections: Selection[], k: number, stake: number) {
  const invalid: Array<[string, string]> = [];
  for (let i = 0; i < selections.length; i++) for (let j = i + 1; j < selections.length; j++) {
    if (compatibility(selections[i], selections[j]) === 'INCOMPATIBLE') invalid.push([selections[i].id, selections[j].id]);
  }
  if (invalid.length) return { status: 'INCOMPATIBLE' as const, invalid, combinations: [], cost: 0 };
  const combos = combinations(selections, k);
  return { status: 'OK' as const, invalid: [], combinations: combos, cost: combos.length * stake };
}

export function optimizeSystem(selections: Selection[], budget: number, profile: 'PRUDENT' | 'BALANCED' | 'AGGRESSIVE' = 'BALANCED') {
  const minConfidence = profile === 'PRUDENT' ? 0.70 : profile === 'BALANCED' ? 0.60 : 0.50;
  const minDataQuality = profile === 'PRUDENT' ? 0.70 : 0.60;
  const valid = selections.filter((selection) => (selection.confidence ?? 1) >= minConfidence && (selection.dataQuality ?? 1) >= minDataQuality);
  const ordered = [...valid].sort((a, b) =>
    ((b.probability ?? 0) * (b.confidence ?? 1) * (b.dataQuality ?? 1)) -
    ((a.probability ?? 0) * (a.confidence ?? 1) * (a.dataQuality ?? 1)));
  const k = Math.max(1, Math.min(profile === 'PRUDENT' ? 2 : profile === 'BALANCED' ? 3 : 4, ordered.length));
  if (!ordered.length) return { status: 'NO_BET' as const, reason: 'Nessuna selezione supera le soglie' };
  const all = combinations(ordered, k).filter((combo) => combo.every((a, i) => combo.slice(i + 1).every((b) =>
    compatibility(a, b) === 'COMPATIBLE' && (profile !== 'PRUDENT' || correlation(a, b).level !== 'HIGH'))));
  if (!all.length) return { status: 'NO_BET' as const, reason: 'Nessuna combinazione compatibile con il profilo di rischio' };
  const stake = Math.max(0.1, Math.floor((budget / all.length) * 100) / 100);
  const selected = all.slice(0, Math.floor(budget / stake));
  const pairScores = selected.flatMap((combo) => combo.flatMap((a, i) => combo.slice(i + 1).map((b) => correlation(a, b).score)));
  return {
    status: 'OK' as const, k, stake, combinations: selected,
    cost: Number((selected.length * stake).toFixed(2)), selections: ordered,
    maxCorrelation: pairScores.length ? Math.max(...pairScores) : 0,
  };
}

export function settlementEligible(eventAt: Date, verified: boolean, now = new Date(), marginMinutes = 150) {
  return !verified && now.getTime() >= eventAt.getTime() + marginMinutes * 60_000;
}

export function settleMarket(market: string, selection: string, score: Score): 'WIN' | 'LOSS' | 'UNSUPPORTED' {
  const normalized = selection.toUpperCase();
  if (market === '1X2') {
    const outcome = score.home > score.away ? '1' : score.home < score.away ? '2' : 'X';
    return normalized === outcome ? 'WIN' : 'LOSS';
  }
  if (market === 'BTTS') {
    const goal = score.home > 0 && score.away > 0;
    return (normalized === 'GOAL') === goal ? 'WIN' : 'LOSS';
  }
  const match = normalized.match(/(OVER|UNDER)\s*(\d+(?:\.\d+)?)/);
  if (match && market.startsWith('OVER_UNDER')) {
    const total = score.home + score.away, line = Number(match[2]);
    return match[1] === 'OVER' ? (total > line ? 'WIN' : 'LOSS') : (total < line ? 'WIN' : 'LOSS');
  }
  return 'UNSUPPORTED';
}
