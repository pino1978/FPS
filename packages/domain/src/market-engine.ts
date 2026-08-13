import type { TeamMetrics, VenueMetrics } from './index';

export type StructuredMarket = {
  market: string;
  selection: string;
  probability: number;
  period: 'FT' | 'HT';
  metric: 'RESULT' | 'TOTAL_GOALS' | 'HOME_GOALS' | 'AWAY_GOALS' | 'BTTS' | 'EXACT_SCORE' | 'GOAL_RANGE' | 'CLEAN_SHEET' | 'WIN_MARGIN' | 'GOAL_PARITY';
  operator?: 'OVER' | 'UNDER' | 'EQ' | 'BETWEEN' | 'OUTCOME';
  threshold?: number;
  thresholdMax?: number;
  outcome?: string;
  fairOdds: number | null;
};

export type ScoreCell = { home: number; away: number; probability: number };
export type MatchContext = {
  homeAvailabilityLoss?: number;
  awayAvailabilityLoss?: number;
  availabilityCoverage?: number;
  lineupConfirmed?: boolean;
};
export type TeamStrength = { home: number; away: number; components: Record<string, number | null>; configVersion: string };
export type PredictionBundle = {
  expectedGoalsHome: number;
  expectedGoalsAway: number;
  teamStrength: TeamStrength;
  scoreMatrix: ScoreCell[];
  residualProbability: number;
  markets: StructuredMarket[];
};

export type ModelConfig = {
  maxGoals: number;
  homeAdvantage: number;
  formWeight: number;
  venueBlend: number;
  availabilityWeight: number;
  lambdaMin: number;
  lambdaMax: number;
  strengthWeights: {
    form: number;
    overall: number;
    venue: number;
    attackDefence: number;
    availability: number;
  };
};

export const MODEL_CONFIG_VERSION = 'poisson-strength-availability-config-v3';
export const DEFAULT_MODEL_CONFIG: ModelConfig = {
  maxGoals: 10,
  homeAdvantage: 1.08,
  formWeight: 0.20,
  venueBlend: 0.55,
  availabilityWeight: 0.10,
  lambdaMin: 0.15,
  lambdaMax: 3.8,
  strengthWeights: {
    form: 0.30,
    overall: 0.20,
    venue: 0.15,
    attackDefence: 0.15,
    availability: 0.10,
  },
};

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
const unit = (n: number) => clamp(n, 0, 1);
const factorial = (n: number): number => (n <= 1 ? 1 : n * factorial(n - 1));
const poisson = (goals: number, lambda: number) => Math.exp(-lambda) * Math.pow(lambda, goals) / factorial(goals);
const fair = (p: number) => (p > 0 ? 1 / p : null);
const item = (market: string, selection: string, probability: number, metric: StructuredMarket['metric'], operator?: StructuredMarket['operator'], threshold?: number, thresholdMax?: number, outcome?: string): StructuredMarket => ({ market, selection, probability, period: 'FT', metric, operator, threshold, thresholdMax, outcome, fairOdds: fair(probability) });
const perGame = (value: number, played: number) => played > 0 ? value / played : 0;
const venueOrTotal = (team: TeamMetrics, venue: 'home' | 'away'): VenueMetrics => team[venue] && team[venue]!.played > 0 ? team[venue]! : { played: team.played, points: team.points, goalsFor: team.goalsFor, goalsAgainst: team.goalsAgainst };
const blendedRate = (total: number, venue: number, blend: number) => total * (1 - blend) + venue * blend;

export function teamStrength(home: TeamMetrics, away: TeamMetrics, context: MatchContext = {}, config = DEFAULT_MODEL_CONFIG): TeamStrength {
  const homeVenue = venueOrTotal(home, 'home'), awayVenue = venueOrTotal(away, 'away');
  const homeAvailability = 1 - unit(context.homeAvailabilityLoss ?? 0);
  const awayAvailability = 1 - unit(context.awayAvailabilityLoss ?? 0);
  const components = {
    homeForm: home.formIndex == null ? null : unit(home.formIndex),
    awayForm: away.formIndex == null ? null : unit(away.formIndex),
    homeOverall: unit(perGame(home.points, home.played) / 3),
    awayOverall: unit(perGame(away.points, away.played) / 3),
    homeVenue: unit(perGame(homeVenue.points, homeVenue.played) / 3),
    awayVenue: unit(perGame(awayVenue.points, awayVenue.played) / 3),
    homeAttackDefence: unit((unit(perGame(home.goalsFor, home.played) / 3) + (1 - unit(perGame(home.goalsAgainst, home.played) / 3))) / 2),
    awayAttackDefence: unit((unit(perGame(away.goalsFor, away.played) / 3) + (1 - unit(perGame(away.goalsAgainst, away.played) / 3))) / 2),
    homeAvailability,
    awayAvailability,
  };
  const weighted = (side: 'home' | 'away') => {
    const pairs: Array<[number | null, number]> = [
      [components[`${side}Form`], config.strengthWeights.form],
      [components[`${side}Overall`], config.strengthWeights.overall],
      [components[`${side}Venue`], config.strengthWeights.venue],
      [components[`${side}AttackDefence`], config.strengthWeights.attackDefence],
      [components[`${side}Availability`], config.strengthWeights.availability],
    ];
    const usable = pairs.filter((x): x is [number, number] => x[0] != null);
    const weight = usable.reduce((sum, [, w]) => sum + w, 0) || 1;
    return usable.reduce((sum, [value, w]) => sum + value * w, 0) / weight;
  };
  return { home: weighted('home'), away: weighted('away'), components, configVersion: MODEL_CONFIG_VERSION };
}

export function expectedGoals(home: TeamMetrics, away: TeamMetrics, config = DEFAULT_MODEL_CONFIG, context: MatchContext = {}) {
  const homeVenue = venueOrTotal(home, 'home'), awayVenue = venueOrTotal(away, 'away');
  const homeAttack = blendedRate(perGame(home.goalsFor, home.played), perGame(homeVenue.goalsFor, homeVenue.played), config.venueBlend);
  const homeDefence = blendedRate(perGame(home.goalsAgainst, home.played), perGame(homeVenue.goalsAgainst, homeVenue.played), config.venueBlend);
  const awayAttack = blendedRate(perGame(away.goalsFor, away.played), perGame(awayVenue.goalsFor, awayVenue.played), config.venueBlend);
  const awayDefence = blendedRate(perGame(away.goalsAgainst, away.played), perGame(awayVenue.goalsAgainst, awayVenue.played), config.venueBlend);
  const homeForm = home.formIndex == null ? 1 : 1 - config.formWeight / 2 + config.formWeight * unit(home.formIndex);
  const awayForm = away.formIndex == null ? 1 : 1 - config.formWeight / 2 + config.formWeight * unit(away.formIndex);
  const homeAvailability = 1 - config.availabilityWeight * unit(context.homeAvailabilityLoss ?? 0);
  const awayAvailability = 1 - config.availabilityWeight * unit(context.awayAvailabilityLoss ?? 0);
  return {
    home: clamp(((homeAttack + awayDefence) / 2) * config.homeAdvantage * homeForm * homeAvailability, config.lambdaMin, config.lambdaMax),
    away: clamp(((awayAttack + homeDefence) / 2) * awayForm * awayAvailability, config.lambdaMin, config.lambdaMax),
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
  const normalizer = rawSum > 0 ? rawSum : 1;
  const cells = raw.map((cell) => ({ ...cell, probability: cell.probability / normalizer }));
  const normalizedSum = cells.reduce((sum, cell) => sum + cell.probability, 0);
  const residualProbability = Math.max(0, 1 - normalizedSum);
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

  const homeClean = sumWhere(matrix, (c) => c.away === 0);
  const awayClean = sumWhere(matrix, (c) => c.home === 0);
  const homeWinToNil = sumWhere(matrix, (c) => c.home > c.away && c.away === 0);
  const awayWinToNil = sumWhere(matrix, (c) => c.away > c.home && c.home === 0);
  result.push(item('CLEAN_SHEET', 'HOME YES', homeClean, 'CLEAN_SHEET', 'EQ', 0, undefined, 'HOME'));
  result.push(item('CLEAN_SHEET', 'AWAY YES', awayClean, 'CLEAN_SHEET', 'EQ', 0, undefined, 'AWAY'));
  result.push(item('WIN_TO_NIL', 'HOME YES', homeWinToNil, 'RESULT', 'OUTCOME', undefined, undefined, 'HOME'));
  result.push(item('WIN_TO_NIL', 'AWAY YES', awayWinToNil, 'RESULT', 'OUTCOME', undefined, undefined, 'AWAY'));

  const margins = [
    ['HOME BY 1', (c:ScoreCell)=>c.home-c.away===1],
    ['HOME BY 2+', (c:ScoreCell)=>c.home-c.away>=2],
    ['DRAW', (c:ScoreCell)=>c.home===c.away],
    ['AWAY BY 1', (c:ScoreCell)=>c.away-c.home===1],
    ['AWAY BY 2+', (c:ScoreCell)=>c.away-c.home>=2],
  ] as const;
  for(const [selection,predicate] of margins) result.push(item('WIN_MARGIN',selection,sumWhere(matrix,predicate),'WIN_MARGIN','OUTCOME',undefined,undefined,selection));
  const even = sumWhere(matrix,(c)=>(c.home+c.away)%2===0);
  result.push(item('GOALS_PARITY','EVEN',even,'GOAL_PARITY','EQ',0));
  result.push(item('GOALS_PARITY','ODD',1-even,'GOAL_PARITY','EQ',1));

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

export function predictFixture(home: TeamMetrics, away: TeamMetrics, config = DEFAULT_MODEL_CONFIG, context: MatchContext = {}): PredictionBundle {
  const lambdas = expectedGoals(home, away, config, context);
  const matrix = scoreProbabilityMatrix(lambdas.home, lambdas.away, config.maxGoals);
  return {
    expectedGoalsHome: lambdas.home,
    expectedGoalsAway: lambdas.away,
    teamStrength: teamStrength(home, away, context, config),
    scoreMatrix: matrix.cells,
    residualProbability: matrix.residualProbability,
    markets: deriveMarkets(matrix.cells),
  };
}
