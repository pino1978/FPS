import type { TeamMetrics } from './index';

export type StructuredMarket = {
  market: string;
  selection: string;
  probability: number;
  period: 'FT' | 'HT';
  metric: 'RESULT' | 'TOTAL_GOALS' | 'HOME_GOALS' | 'AWAY_GOALS' | 'BTTS' | 'EXACT_SCORE' | 'GOAL_RANGE';
  operator?: 'OVER' | 'UNDER' | 'EQ' | 'BETWEEN' | 'OUTCOME';
  threshold?: number;
  thresholdMax?: number;
  outcome?: string;
  fairOdds: number | null;
};

export type ScoreCell = { home: number; away: number; probability: number };
export type PredictionBundle = {
  expectedGoalsHome: number;
  expectedGoalsAway: number;
  scoreMatrix: ScoreCell[];
  residualProbability: number;
  markets: StructuredMarket[];
};

export type ModelConfig = {
  maxGoals: number;
  homeAdvantage: number;
  formWeight: number;
  lambdaMin: number;
  lambdaMax: number;
};

export const MODEL_CONFIG_VERSION = 'poisson-config-v2';
export const DEFAULT_MODEL_CONFIG: ModelConfig = {
  maxGoals: 10,
  homeAdvantage: 1.08,
  formWeight: 0.20,
  lambdaMin: 0.15,
  lambdaMax: 3.8,
};

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
const factorial = (n: number): number => (n <= 1 ? 1 : n * factorial(n - 1));
const poisson = (goals: number, lambda: number) => Math.exp(-lambda) * Math.pow(lambda, goals) / factorial(goals);
const fair = (p: number) => (p > 0 ? 1 / p : null);
const item = (market: string, selection: string, probability: number, metric: StructuredMarket['metric'], operator?: StructuredMarket['operator'], threshold?: number, thresholdMax?: number, outcome?: string): StructuredMarket => ({ market, selection, probability, period: 'FT', metric, operator, threshold, thresholdMax, outcome, fairOdds: fair(probability) });

export function expectedGoals(home: TeamMetrics, away: TeamMetrics, config = DEFAULT_MODEL_CONFIG) {
  const homeAttack = home.played ? home.goalsFor / home.played : 0;
  const homeDefence = home.played ? home.goalsAgainst / home.played : 0;
  const awayAttack = away.played ? away.goalsFor / away.played : 0;
  const awayDefence = away.played ? away.goalsAgainst / away.played : 0;
  const homeForm = home.formIndex == null ? 1 : 1 - config.formWeight / 2 + config.formWeight * home.formIndex;
  const awayForm = away.formIndex == null ? 1 : 1 - config.formWeight / 2 + config.formWeight * away.formIndex;
  return {
    home: clamp(((homeAttack + awayDefence) / 2) * config.homeAdvantage * homeForm, config.lambdaMin, config.lambdaMax),
    away: clamp(((awayAttack + homeDefence) / 2) * awayForm, config.lambdaMin, config.lambdaMax),
  };
}

export function scoreProbabilityMatrix(lambdaHome: number, lambdaAway: number, maxGoals = DEFAULT_MODEL_CONFIG.maxGoals) {
  const raw: ScoreCell[] = [];
  let rawSum = 0;
  for (let home = 0; home <= maxGoals; home++) {
    for (let away = 0; away <= maxGoals; away++) {
      const probability = poisson(home, lambdaHome) * poisson(away, lambdaAway);
      raw.push({ home, away, probability });
      rawSum += probability;
    }
  }
  const residualProbability = Math.max(0, 1 - rawSum);
  const normalizer = rawSum > 0 ? rawSum : 1;
  const cells = raw.map((cell) => ({ ...cell, probability: cell.probability / normalizer }));
  return { cells, residualProbability };
}

const sumWhere = (matrix: ScoreCell[], predicate: (cell: ScoreCell) => boolean) => matrix.reduce((sum, cell) => sum + (predicate(cell) ? cell.probability : 0), 0);

export function deriveMarkets(matrix: ScoreCell[]): StructuredMarket[] {
  const result: StructuredMarket[] = [];
  const p1 = sumWhere(matrix, (c) => c.home > c.away);
  const px = sumWhere(matrix, (c) => c.home === c.away);
  const p2 = sumWhere(matrix, (c) => c.home < c.away);
  result.push(item('1X2', '1', p1, 'RESULT', 'OUTCOME', undefined, undefined, '1'));
  result.push(item('1X2', 'X', px, 'RESULT', 'OUTCOME', undefined, undefined, 'X'));
  result.push(item('1X2', '2', p2, 'RESULT', 'OUTCOME', undefined, undefined, '2'));
  result.push(item('DOUBLE_CHANCE', '1X', p1 + px, 'RESULT', 'OUTCOME', undefined, undefined, '1X'));
  result.push(item('DOUBLE_CHANCE', 'X2', px + p2, 'RESULT', 'OUTCOME', undefined, undefined, 'X2'));
  result.push(item('DOUBLE_CHANCE', '12', p1 + p2, 'RESULT', 'OUTCOME', undefined, undefined, '12'));
  const dnbDenominator = Math.max(1e-12, 1 - px);
  result.push(item('DRAW_NO_BET', '1 DNB', p1 / dnbDenominator, 'RESULT', 'OUTCOME', undefined, undefined, '1'));
  result.push(item('DRAW_NO_BET', '2 DNB', p2 / dnbDenominator, 'RESULT', 'OUTCOME', undefined, undefined, '2'));

  for (const line of [0.5, 1.5, 2.5, 3.5, 4.5]) {
    const over = sumWhere(matrix, (c) => c.home + c.away > line);
    result.push(item(`OVER_UNDER_${String(line).replace('.', '_')}`, `OVER ${line}`, over, 'TOTAL_GOALS', 'OVER', line));
    result.push(item(`OVER_UNDER_${String(line).replace('.', '_')}`, `UNDER ${line}`, 1 - over, 'TOTAL_GOALS', 'UNDER', line));
  }

  const btts = sumWhere(matrix, (c) => c.home > 0 && c.away > 0);
  result.push(item('BTTS', 'GOAL', btts, 'BTTS', 'EQ', 1));
  result.push(item('BTTS', 'NO GOAL', 1 - btts, 'BTTS', 'EQ', 0));

  for (const line of [0.5, 1.5, 2.5]) {
    const homeOver = sumWhere(matrix, (c) => c.home > line);
    const awayOver = sumWhere(matrix, (c) => c.away > line);
    result.push(item(`HOME_GOALS_${String(line).replace('.', '_')}`, `HOME OVER ${line}`, homeOver, 'HOME_GOALS', 'OVER', line));
    result.push(item(`HOME_GOALS_${String(line).replace('.', '_')}`, `HOME UNDER ${line}`, 1 - homeOver, 'HOME_GOALS', 'UNDER', line));
    result.push(item(`AWAY_GOALS_${String(line).replace('.', '_')}`, `AWAY OVER ${line}`, awayOver, 'AWAY_GOALS', 'OVER', line));
    result.push(item(`AWAY_GOALS_${String(line).replace('.', '_')}`, `AWAY UNDER ${line}`, 1 - awayOver, 'AWAY_GOALS', 'UNDER', line));
  }

  for (let home = 0; home <= 4; home++) for (let away = 0; away <= 4; away++) {
    const probability = sumWhere(matrix, (c) => c.home === home && c.away === away);
    result.push(item('EXACT_SCORE', `${home}-${away}`, probability, 'EXACT_SCORE', 'EQ', undefined, undefined, `${home}-${away}`));
  }

  for (const [min, max] of [[0, 1], [1, 3], [2, 4], [2, 5], [3, 5]] as const) {
    const probability = sumWhere(matrix, (c) => c.home + c.away >= min && c.home + c.away <= max);
    result.push(item('MULTIGOAL', `${min}-${max} GOALS`, probability, 'GOAL_RANGE', 'BETWEEN', min, max));
  }

  const homeWinOver15 = sumWhere(matrix, (c) => c.home > c.away && c.home + c.away > 1.5);
  const awayWinOver15 = sumWhere(matrix, (c) => c.home < c.away && c.home + c.away > 1.5);
  const homeWinBtts = sumWhere(matrix, (c) => c.home > c.away && c.home > 0 && c.away > 0);
  const awayWinBtts = sumWhere(matrix, (c) => c.home < c.away && c.home > 0 && c.away > 0);
  result.push(item('COMBO', '1 + OVER 1.5', homeWinOver15, 'RESULT', 'OUTCOME', undefined, undefined, '1+O1.5'));
  result.push(item('COMBO', '2 + OVER 1.5', awayWinOver15, 'RESULT', 'OUTCOME', undefined, undefined, '2+O1.5'));
  result.push(item('COMBO', '1 + GOAL', homeWinBtts, 'RESULT', 'OUTCOME', undefined, undefined, '1+BTTS'));
  result.push(item('COMBO', '2 + GOAL', awayWinBtts, 'RESULT', 'OUTCOME', undefined, undefined, '2+BTTS'));
  return result;
}

export function predictFixture(home: TeamMetrics, away: TeamMetrics, config = DEFAULT_MODEL_CONFIG): PredictionBundle {
  const lambdas = expectedGoals(home, away, config);
  const matrix = scoreProbabilityMatrix(lambdas.home, lambdas.away, config.maxGoals);
  return {
    expectedGoalsHome: lambdas.home,
    expectedGoalsAway: lambdas.away,
    scoreMatrix: matrix.cells,
    residualProbability: matrix.residualProbability,
    markets: deriveMarkets(matrix.cells),
  };
}
