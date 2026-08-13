import { Body, Controller, Post } from '@nestjs/common';
import { buildSystemWithFixed, optimizeSystem, Selection, suggestAssistedSystem } from '@fps/domain';

@Controller('v2/systems')
export class SystemController {
  @Post('build')
  build(@Body() body: { selections: Selection[]; k: number; stake: number; budget?: number; fixedIds?: string[] }) {
    const selections = validSelections(body?.selections);
    const k = positiveInteger(body?.k, 'k');
    const stake = positive(body?.stake, 'stake');
    const budget = body.budget == null ? undefined : positive(body.budget, 'budget');
    const fixedIds = validFixedIds(body?.fixedIds, selections);
    if (k > selections.length) throw new Error('k cannot exceed selections count');
    const result = buildSystemWithFixed(selections, k, stake, fixedIds);
    return {
      ...result,
      budget: budget ?? null,
      withinBudget: result.status === 'OK' ? budget == null || result.cost <= budget : false,
    };
  }

  @Post('assist')
  assist(@Body() body: {
    selections: Selection[];
    minCorrect: number;
    budget: number;
    fixedIds?: string[];
    profile?: 'PRUDENT' | 'BALANCED' | 'AGGRESSIVE';
  }) {
    const selections = validSelections(body?.selections);
    const minCorrect = positiveInteger(body?.minCorrect, 'minCorrect');
    const budget = positive(body?.budget, 'budget');
    const fixedIds = validFixedIds(body?.fixedIds, selections);
    const profile = validProfile(body?.profile);
    if (minCorrect > selections.length) throw new Error('minCorrect cannot exceed selections count');
    return suggestAssistedSystem({ selections, minCorrect, budget, fixedIds, profile });
  }

  @Post('optimize')
  optimize(@Body() body: {
    selections: Selection[];
    budget: number;
    profile?: 'PRUDENT' | 'BALANCED' | 'AGGRESSIVE';
  }) {
    const selections = validSelections(body?.selections);
    const budget = positive(body?.budget, 'budget');
    return optimizeSystem(selections, budget, validProfile(body?.profile));
  }
}

function validSelections(value: unknown): Selection[] {
  if (!Array.isArray(value) || value.length === 0) throw new Error('selections must be a non-empty array');
  const ids = new Set<string>();
  return value.map((raw, index) => {
    if (!raw || typeof raw !== 'object') throw new Error(`selections[${index}] is invalid`);
    const item = raw as Record<string, unknown>;
    const id = text(item.id, `selections[${index}].id`);
    const fixtureId = text(item.fixtureId, `selections[${index}].fixtureId`);
    const market = text(item.market, `selections[${index}].market`);
    const selection = text(item.selection, `selections[${index}].selection`);
    if (ids.has(id)) throw new Error(`duplicate selection id: ${id}`);
    ids.add(id);
    const odds = item.odds == null ? undefined : minNumber(item.odds, 1.01, `selections[${index}].odds`);
    const probability = item.probability == null ? undefined : unitInterval(item.probability, `selections[${index}].probability`);
    const confidence = item.confidence == null ? undefined : unitInterval(item.confidence, `selections[${index}].confidence`);
    const dataQuality = item.dataQuality == null ? undefined : unitInterval(item.dataQuality, `selections[${index}].dataQuality`);
    const period = item.period == null ? undefined : enumValue(item.period,['FT','HT'],`selections[${index}].period`) as 'FT'|'HT';
    const teamSide = item.teamSide == null ? undefined : enumValue(item.teamSide,['HOME','AWAY'],`selections[${index}].teamSide`) as 'HOME'|'AWAY';
    const metric = optionalText(item.metric,`selections[${index}].metric`);
    const operator = optionalText(item.operator,`selections[${index}].operator`);
    const outcome = optionalText(item.outcome,`selections[${index}].outcome`);
    const playerId = optionalText(item.playerId,`selections[${index}].playerId`);
    const threshold = item.threshold == null ? undefined : finiteNumber(item.threshold,`selections[${index}].threshold`);
    return { id, fixtureId, market, selection, odds, probability, confidence, dataQuality, period, teamSide, metric, operator, outcome, playerId, threshold };
  });
}

function validFixedIds(value: unknown, selections: Selection[]) {
  if (value == null) return [];
  if (!Array.isArray(value)) throw new Error('fixedIds must be an array');
  const allowed = new Set(selections.map((selection) => selection.id));
  const result = [...new Set(value.map((id, index) => text(id, `fixedIds[${index}]`)))];
  if (result.some((id) => !allowed.has(id))) throw new Error('fixedIds contains an unknown selection');
  return result;
}

function validProfile(value: unknown): 'PRUDENT' | 'BALANCED' | 'AGGRESSIVE' {
  const profile = value == null ? 'BALANCED' : String(value);
  if (!['PRUDENT', 'BALANCED', 'AGGRESSIVE'].includes(profile)) throw new Error('profile is invalid');
  return profile as 'PRUDENT' | 'BALANCED' | 'AGGRESSIVE';
}
function text(value: unknown, field: string) { if (typeof value !== 'string' || !value.trim()) throw new Error(`${field} is required`); return value.trim().slice(0, 200); }
function optionalText(value:unknown,field:string){if(value==null)return undefined;if(typeof value!=='string'||!value.trim())throw new Error(`${field} is invalid`);return value.trim().slice(0,200);}
function enumValue(value:unknown,allowed:string[],field:string){const v=String(value);if(!allowed.includes(v))throw new Error(`${field} is invalid`);return v;}
function positive(value: unknown, field: string) { const n = Number(value); if (!Number.isFinite(n) || n <= 0) throw new Error(`${field} must be > 0`); return n; }
function positiveInteger(value: unknown, field: string) { const n = positive(value, field); if (!Number.isInteger(n)) throw new Error(`${field} must be an integer`); return n; }
function minNumber(value: unknown, min: number, field: string) { const n = Number(value); if (!Number.isFinite(n) || n < min) throw new Error(`${field} must be >= ${min}`); return n; }
function finiteNumber(value:unknown,field:string){const n=Number(value);if(!Number.isFinite(n))throw new Error(`${field} must be finite`);return n;}
function unitInterval(value: unknown, field: string) { const n = Number(value); if (!Number.isFinite(n) || n < 0 || n > 1) throw new Error(`${field} must be between 0 and 1`); return n; }
