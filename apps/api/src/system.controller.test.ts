import { describe, expect, it } from 'vitest';
import { SystemController } from './system.controller';

const selection={id:'a',fixtureId:'f1',market:'1X2',selection:'1',probability:0.6,confidence:0.7,dataQuality:0.8};

describe('SystemController validation',()=>{
  const controller=new SystemController();

  it('rejects empty selections',()=>{
    expect(()=>controller.build({selections:[],k:1,stake:1})).toThrow('selections must be a non-empty array');
  });

  it('rejects invalid stake and budget',()=>{
    expect(()=>controller.build({selections:[selection],k:1,stake:0})).toThrow('stake must be > 0');
    expect(()=>controller.optimize({selections:[selection],budget:-1})).toThrow('budget must be > 0');
  });

  it('rejects probabilities outside the unit interval',()=>{
    expect(()=>controller.optimize({selections:[{...selection,probability:1.2}],budget:10})).toThrow('probability must be between 0 and 1');
  });

  it('rejects unknown fixed selections',()=>{
    expect(()=>controller.build({selections:[selection],k:1,stake:1,fixedIds:['missing']})).toThrow('fixedIds contains an unknown selection');
  });

  it('reports incompatibility before a pick is admitted to the system tray',()=>{
    const result=controller.analyze({selections:[selection,{...selection,id:'b',selection:'X'}]});
    expect(result.status).toBe('INCOMPATIBLE');
    expect(result.incompatible).toEqual([{left:'a',right:'b'}]);
  });

  it('reports correlation separately from logical compatibility',()=>{
    const result=controller.analyze({selections:[
      {id:'a',fixtureId:'f1',market:'BTTS',selection:'GOAL'},
      {id:'b',fixtureId:'f1',market:'OVER_UNDER_2_5',selection:'OVER 2.5'},
    ]});
    expect(result.status).toBe('COMPATIBLE');
    expect(result.incompatible).toHaveLength(0);
    expect(result.correlations[0].level).toBe('HIGH');
    expect(result.maxCorrelation).toBeGreaterThanOrEqual(.7);
  });

  it('blocks logically incompatible selections in backend system generation',()=>{
    const result=controller.build({selections:[selection,{...selection,id:'b',selection:'X'}],k:2,stake:1});
    expect(result.status).toBe('INCOMPATIBLE');
    expect(result.combinations).toHaveLength(0);
    expect(result.cost).toBe(0);
  });

  it('accepts a valid optimizer request',()=>{
    const result=controller.optimize({selections:[selection],budget:10,profile:'BALANCED'});
    expect(['OK','NO_BET']).toContain(result.status);
  });
});
