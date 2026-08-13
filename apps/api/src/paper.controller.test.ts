import {describe,expect,it} from 'vitest';
import {computePaperReport} from './paper.controller';

describe('paper trading report',()=>{
  it('keeps virtual bankroll separate and computes ROI/yield/drawdown',()=>{
    const report=computePaperReport(100,[
      {status:'WIN',stake:10,odds:2,market:'1X2',createdAt:new Date('2026-01-01')},
      {status:'LOSS',stake:10,odds:1.8,market:'BTTS',createdAt:new Date('2026-01-02')},
    ],[]);
    expect(report.bankrollInitial).toBe(100);
    expect(report.bankrollFinal).toBe(100);
    expect(report.profit).toBe(0);
    expect(report.stakeTotal).toBe(20);
    expect(report.returnsTotal).toBe(20);
    expect(report.roi).toBe(0);
    expect(report.yield).toBe(0);
    expect(report.maxDrawdown).toBe(10);
    expect(report.betsCount).toBe(2);
  });

  it('does not fabricate economics when a winning simulated record has no odds',()=>{
    const report=computePaperReport(100,[{status:'WIN',stake:10,odds:null,market:'1X2',createdAt:new Date()}],[]);
    expect(report.stakeTotal).toBe(0);
    expect(report.incompleteEconomicRecords).toBe(1);
  });

  it('calculates a system return from actual simulated selection odds',()=>{
    const report=computePaperReport(100,[],[{
      status:'WIN',verificationStatus:'VERIFIED',createdAt:new Date(),selections:[{market:'1X2',status:'WIN'}],
      combinations:[{status:'WIN',stake:5,items:[{selection:{odds:2}},{selection:{odds:1.5}}]}],
    }]);
    expect(report.stakeTotal).toBe(5);
    expect(report.returnsTotal).toBe(15);
    expect(report.profit).toBe(10);
    expect(report.bankrollFinal).toBe(110);
    expect(report.systemsCount).toBe(1);
  });
});
