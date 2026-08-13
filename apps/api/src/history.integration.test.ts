import {afterAll,beforeEach,describe,expect,it} from 'vitest';
import {PrismaService} from './services';
import {HistoryController} from './history.controller';
import {AppController} from './controller';

const db=new PrismaService();

async function clean(){
  await db.combinationItem.deleteMany();
  await db.systemCombination.deleteMany();
  await db.systemSelection.deleteMany();
  await db.bettingSystem.deleteMany();
  await db.predictionSettlement.deleteMany();
  await db.predictionSnapshot.deleteMany();
  await db.predictionRun.deleteMany();
  await db.bet.deleteMany();
  await db.auditEvent.deleteMany();
  await db.fixture.deleteMany();
}

async function seedPrediction(){
  const eventAt=new Date(Date.now()+24*60*60_000);
  await db.fixture.create({data:{id:'fx-origin',competition:'SA',status:'TIMED',utcDate:eventAt,homeTeamId:'h',homeTeam:'Juventus',awayTeamId:'a',awayTeam:'Napoli',source:'test'}});
  const run=await db.predictionRun.create({data:{fixtureId:'fx-origin',modelVersion:'model-origin-v1',source:'test',eventAt,inputSnapshot:{preKickoff:true},snapshots:{create:[{market:'1X2',selection:'1',probability:.61,confidence:.72,dataQuality:.83,fairOdds:1/.61,status:'ACTIVE'}]}},include:{snapshots:true}});
  return {eventAt,run,snapshot:run.snapshots[0]};
}

describe('history prediction origin',()=>{
  beforeEach(clean);
  afterAll(async()=>{await clean();await db.$disconnect()});

  it('freezes original prediction context on a saved bet and exposes prediction history filters',async()=>{
    const seeded=await seedPrediction();
    const history=new HistoryController(db);
    const bet:any=await history.createBet({fixtureId:'fx-origin',competition:'SA',market:'1X2',selection:'1',stake:10,eventAt:seeded.eventAt.toISOString(),played:false});
    expect(bet.originalPrediction).toMatchObject({probability:.61,confidence:.72,dataQuality:.83,modelVersion:'model-origin-v1'});
    expect(bet.originalPrediction.capturedAt).toBeTruthy();

    const predictions:any[]=await history.predictions('SA','Juve','1X2',undefined,'model-origin-v1');
    expect(predictions).toHaveLength(1);
    expect(predictions[0]).toMatchObject({fixtureId:'fx-origin',market:'1X2',selection:'1',probability:.61,modelVersion:'model-origin-v1'});
    expect(predictions[0].fixture.homeTeam).toBe('Juventus');
  });

  it('freezes prediction context independently for selections saved in a system',async()=>{
    const seeded=await seedPrediction();
    const controller=new AppController({} as any,db,{} as any);
    const system:any=await controller.saveSystem({mode:'MANUAL',budget:10,totalCost:1,played:false,selections:[{clientKey:'pick-1',fixtureId:'fx-origin',market:'1X2',selection:'1',eventAt:seeded.eventAt.toISOString()}],combinations:[{selectionKeys:['pick-1'],stake:1}]});
    expect(system.selections[0]).toMatchObject({originProbability:.61,originConfidence:.72,originDataQuality:.83,originModelVersion:'model-origin-v1',competition:'SA'});
    expect(system.selections[0].originCapturedAt).toBeTruthy();
  });
});
