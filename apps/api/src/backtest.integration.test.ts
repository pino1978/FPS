import {afterAll,beforeEach,describe,expect,it} from 'vitest';
import {PrismaService} from './services';
import {AnalyticsService} from './analytics.service';

const db=new PrismaService();
async function clean(){
  await db.backtestRun.deleteMany();
  await db.predictionSettlement.deleteMany();
  await db.predictionSnapshot.deleteMany();
  await db.predictionRun.deleteMany();
  await db.fixture.deleteMany();
}

describe('Backtest runner integration',()=>{
  beforeEach(clean);
  afterAll(async()=>{await clean();await db.$disconnect()});

  it('persists a season-aware reproducible run and reuses the same frozen input fingerprint',async()=>{
    const eventAt=new Date('2026-01-10T18:00:00.000Z');
    await db.fixture.create({data:{id:'fx-backtest',competition:'SA',status:'FINISHED',utcDate:eventAt,homeTeamId:'h',homeTeam:'Home',awayTeamId:'a',awayTeam:'Away',source:'test'}});
    const run=await db.predictionRun.create({data:{fixtureId:'fx-backtest',modelVersion:'model-bt-v1',source:'test',asOf:new Date('2026-01-09T12:00:00.000Z'),eventAt,inputSnapshot:{capturedBeforeKickoff:true},snapshots:{create:[
      {market:'1X2',selection:'1',probability:.7,confidence:.8,dataQuality:.9,fairOdds:1/.7,offeredOdds:1.8,valueStatus:'AVAILABLE',status:'ACTIVE'},
      {market:'BTTS',selection:'GOAL',probability:.55,confidence:.7,dataQuality:.85,fairOdds:1/.55,status:'ACTIVE'},
    ]}},include:{snapshots:true}});
    await db.predictionSettlement.create({data:{snapshotId:run.snapshots[0].id,outcome:'WIN',resultVersion:'result-v1'}});
    await db.predictionSettlement.create({data:{snapshotId:run.snapshots[1].id,outcome:'LOSS',resultVersion:'result-v1'}});

    const analytics=new AnalyticsService(db);
    const input={competition:'SA',season:'2025-2026',modelVersion:'model-bt-v1',from:new Date('2026-01-01T00:00:00.000Z'),to:new Date('2026-01-31T23:59:59.000Z')};
    const first:any=await analytics.runBacktest(input);
    const parameters=first.parameters as any;
    expect(first.sample).toBe(2);
    expect(parameters.season).toBe('2025-2026');
    expect(parameters.antiLeakage).toContain('asOf < eventAt');
    expect(parameters.snapshotIds).toHaveLength(2);
    expect(parameters.inputFingerprint).toHaveLength(64);
    expect(parameters.virtualBetting.sample).toBe(1);
    expect(parameters.virtualBetting.coverage).toBe(.5);
    expect(parameters.calibrationError).not.toBeNull();

    const second:any=await analytics.runBacktest(input);
    expect(second.id).toBe(first.id);
    expect(second.reused).toBe(true);
    expect(await db.backtestRun.count()).toBe(1);
  });

  it('excludes runs generated at or after kickoff',async()=>{
    const eventAt=new Date('2026-02-10T18:00:00.000Z');
    await db.fixture.create({data:{id:'fx-leak',competition:'SA',status:'FINISHED',utcDate:eventAt,homeTeamId:'h',homeTeam:'Home',awayTeamId:'a',awayTeam:'Away',source:'test'}});
    const run=await db.predictionRun.create({data:{fixtureId:'fx-leak',modelVersion:'model-bt-v1',source:'test',asOf:new Date('2026-02-10T18:01:00.000Z'),eventAt,inputSnapshot:{futureLeak:true},snapshots:{create:[{market:'1X2',selection:'1',probability:.99,confidence:.99,dataQuality:1,status:'ACTIVE'}]}},include:{snapshots:true}});
    await db.predictionSettlement.create({data:{snapshotId:run.snapshots[0].id,outcome:'WIN',resultVersion:'result-v1'}});
    const result:any=await new AnalyticsService(db).runBacktest({competition:'SA',season:'2025-2026',modelVersion:'model-bt-v1',from:new Date('2026-02-01'),to:new Date('2026-02-28')});
    expect(result.sample).toBe(0);
    expect((result.parameters as any).eligiblePredictionRuns).toBe(0);
  });
});
