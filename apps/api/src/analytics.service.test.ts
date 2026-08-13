import {describe,expect,it} from 'vitest';
import {binaryLogLoss,summarizeBets,summarizePredictions,summarizeSystems} from './analytics.service';

describe('analytics metrics',()=>{
  it('computes finite log loss and rewards calibrated correct probabilities',()=>{
    expect(Number.isFinite(binaryLogLoss(1,true))).toBe(true);
    expect(binaryLogLoss(.8,true)).toBeLessThan(binaryLogLoss(.55,true));
  });

  it('summarizes all prediction outcomes independently from betting execution',()=>{
    const rows:any[]=[
      {market:'1X2',probability:.8,confidence:.75,outcome:'WIN',modelVersion:'m1',competition:'SA',capturedAt:new Date('2026-01-01')},
      {market:'1X2',probability:.3,confidence:.65,outcome:'LOSS',modelVersion:'m1',competition:'SA',capturedAt:new Date('2026-01-02')},
    ];
    const summary=summarizePredictions(rows);
    expect(summary.sample).toBe(2);
    expect(summary.hitRate).toBe(.5);
    expect(summary.brierScore).toBeGreaterThan(0);
    expect(summary.logLoss).toBeGreaterThan(0);
  });

  it('computes betting economics from real-bet style records including voids',()=>{
    const rows:any[]=[
      {market:'1X2',competition:'SA',bookmaker:'A',stake:10,odds:2,status:'WIN',playedAt:new Date('2026-01-01')},
      {market:'BTTS',competition:'SA',bookmaker:'A',stake:5,odds:1.8,status:'LOSS',playedAt:new Date('2026-01-02')},
      {market:'1X2',competition:'SA',bookmaker:'A',stake:5,odds:2.2,status:'VOID',playedAt:new Date('2026-01-03')},
    ];
    const summary=summarizeBets(rows);
    expect(summary.stake).toBe(20);
    expect(summary.returns).toBe(25);
    expect(summary.profit).toBe(5);
    expect(summary.roi).toBe(.25);
    expect(summary.winRate).toBe(.5);
  });

  it('uses unit odds for a void leg in a winning real system',()=>{
    const summary=summarizeSystems([{combinations:[{
      status:'WIN',stake:5,items:[
        {selection:{status:'WIN',odds:2}},
        {selection:{status:'VOID',odds:1.8}},
      ],
    }]}]);
    expect(summary.stake).toBe(5);
    expect(summary.returns).toBe(10);
    expect(summary.profit).toBe(5);
    expect(summary.financiallySettled).toBe(1);
  });
});
