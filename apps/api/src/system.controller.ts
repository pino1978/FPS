import { Body, Controller, Post } from '@nestjs/common';
import { buildSystemWithFixed, Selection, suggestAssistedSystem } from '@fps/domain';

@Controller('v2/systems')
export class SystemController {
  @Post('build')
  build(@Body() body: { selections: Selection[]; k: number; stake: number; budget?: number; fixedIds?: string[] }) {
    if (!Array.isArray(body?.selections)) throw new Error('selections must be an array');
    const result = buildSystemWithFixed(body.selections, Number(body.k), Number(body.stake), body.fixedIds || []);
    return {
      ...result,
      budget: body.budget ?? null,
      withinBudget: result.status === 'OK' ? body.budget == null || result.cost <= Number(body.budget) : false,
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
    if (!Array.isArray(body?.selections)) throw new Error('selections must be an array');
    return suggestAssistedSystem({
      selections: body.selections,
      minCorrect: Number(body.minCorrect),
      budget: Number(body.budget),
      fixedIds: body.fixedIds || [],
      profile: body.profile || 'BALANCED',
    });
  }
}
