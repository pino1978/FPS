import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { PrismaService } from './services';
import { SettlementService } from './settlement.service';

const db = new PrismaService();

async function clean() {
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

async function fixture(id:string,eventAt:Date){
  await db.fixture.create({data:{id,competition:'SA',status:'TIMED',utcDate:eventAt,homeTeamId:'h',homeTeam:'Home',awayTeamId:'a',awayTeam:'Away',source:'test'}});
}

describe('SettlementService integration', () => {
  beforeEach(clean);
  afterAll(async () => { await clean(); await db.$disconnect(); });

  it('settles real bets and immutable predictions once while fetching a fixture once per run', async () => {
    const eventAt = new Date(Date.now() - 4 * 60 * 60_000);
    const fixtureId = 'e2e-fixture-1';
    await fixture(fixtureId,eventAt);
    const run = await db.predictionRun.create({
      data: {
        fixtureId,
        modelVersion: 'test-model-v1',
        source: 'fixture',
        eventAt,
        inputSnapshot: { capturedBeforeKickoff: true },
        snapshots: { create: [{ market: '1X2', selection: '1', probability: 0.65, confidence: 0.7, dataQuality: 0.8, fairOdds: 1/0.65, status: 'ACTIVE' }] },
      },
      include: { snapshots: true },
    });
    const bet = await db.bet.create({ data: { fixtureId, market: 'OVER_UNDER_2_5', selection: 'OVER 2.5', stake: 5, odds: 1.8, played: true, eventAt } });

    let calls = 0;
    const provider = { result: async () => { calls += 1; return { id: fixtureId, status: 'FINISHED', home: 2, away: 1, lastUpdated: 'test-v1', scorers: ['Player One'] }; } } as any;
    const service = new SettlementService(provider, db);
    const first = await service.run();

    expect(calls).toBe(1);
    expect(first.fixturesFetched).toBe(1);
    const storedFixture=await db.fixture.findUniqueOrThrow({where:{id:fixtureId}});
    expect(storedFixture.resultVerified).toBe(true);
    expect(storedFixture.homeScore).toBe(2);
    expect(storedFixture.awayScore).toBe(1);
    const settledBet = await db.bet.findUniqueOrThrow({ where: { id: bet.id } });
    expect(settledBet.status).toBe('WIN');
    expect(settledBet.verificationStatus).toBe('VERIFIED');

    const originalSnapshot = await db.predictionSnapshot.findUniqueOrThrow({ where: { id: run.snapshots[0].id } });
    expect(originalSnapshot.outcome).toBeNull();
    expect(originalSnapshot.settledAt).toBeNull();
    const settlement = await db.predictionSettlement.findUniqueOrThrow({ where: { snapshotId: originalSnapshot.id } });
    expect(settlement.outcome).toBe('WIN');

    // A later record for the same fixture must use the consolidated result and never refetch it.
    const lateBet=await db.bet.create({data:{fixtureId,market:'1X2',selection:'1',stake:1,odds:1.5,played:true,eventAt}});
    calls = 0;
    const second = await service.run();
    expect(calls).toBe(0);
    expect(second.fixturesFetched).toBe(0);
    expect((await db.bet.findUniqueOrThrow({where:{id:lateBet.id}})).status).toBe('WIN');
    expect(await db.predictionSettlement.count({ where: { snapshotId: originalSnapshot.id } })).toBe(1);
  });

  it('settles CANCELLED events as VOID and consolidates the cancellation',async()=>{
    const eventAt=new Date(Date.now()-4*60*60_000),fixtureId='fx-cancelled';
    await fixture(fixtureId,eventAt);
    const bet=await db.bet.create({data:{fixtureId,market:'1X2',selection:'1',stake:5,odds:2,played:true,eventAt}});
    let calls=0;
    const provider={result:async()=>{calls++;return{id:fixtureId,status:'CANCELLED',home:null,away:null,lastUpdated:'cancel-v1',scorers:[]}}} as any;
    const service=new SettlementService(provider,db);
    await service.run();
    expect(calls).toBe(1);
    expect((await db.bet.findUniqueOrThrow({where:{id:bet.id}})).status).toBe('VOID');
    const stored=await db.fixture.findUniqueOrThrow({where:{id:fixtureId}});
    expect(stored.resultVerified).toBe(true);
    expect(stored.status).toBe('CANCELLED');
  });

  it('keeps non-final provider states pending',async()=>{
    const eventAt=new Date(Date.now()-4*60*60_000),fixtureId='fx-postponed';
    await fixture(fixtureId,eventAt);
    const bet=await db.bet.create({data:{fixtureId,market:'1X2',selection:'1',stake:5,odds:2,played:true,eventAt}});
    const provider={result:async()=>({id:fixtureId,status:'POSTPONED',home:null,away:null,lastUpdated:'v1',scorers:[]})} as any;
    const service=new SettlementService(provider,db);
    await service.run();
    const pending=await db.bet.findUniqueOrThrow({where:{id:bet.id}});
    expect(pending.verificationStatus).toBe('PENDING');
    expect((await db.fixture.findUniqueOrThrow({where:{id:fixtureId}})).resultVerified).toBe(false);
  });

  it('settles each system combination instead of collapsing the whole system on one losing selection', async () => {
    const eventAt = new Date(Date.now() - 4 * 60 * 60_000);
    await fixture('fx-win',eventAt);await fixture('fx-loss',eventAt);
    const system = await db.bettingSystem.create({ data: { mode: 'MANUAL', budget: 2, totalCost: 2, played: true } });
    const win = await db.systemSelection.create({ data: { systemId: system.id, clientKey: 'a', fixtureId: 'fx-win', market: '1X2', selection: '1', eventAt } });
    const loss = await db.systemSelection.create({ data: { systemId: system.id, clientKey: 'b', fixtureId: 'fx-loss', market: '1X2', selection: '2', eventAt } });
    const comboWin = await db.systemCombination.create({ data: { systemId: system.id, stake: 1, items: { create: [{ selectionId: win.id }] } } });
    const comboLoss = await db.systemCombination.create({ data: { systemId: system.id, stake: 1, items: { create: [{ selectionId: loss.id }] } } });

    const provider = { result: async (fixtureId:string) => fixtureId === 'fx-win'
      ? { id: fixtureId, status: 'FINISHED', home: 2, away: 0, lastUpdated: 'v1', scorers: [] }
      : { id: fixtureId, status: 'FINISHED', home: 1, away: 0, lastUpdated: 'v1', scorers: [] } } as any;
    const service = new SettlementService(provider, db);
    await service.run();

    expect((await db.systemCombination.findUniqueOrThrow({ where: { id: comboWin.id } })).status).toBe('WIN');
    expect((await db.systemCombination.findUniqueOrThrow({ where: { id: comboLoss.id } })).status).toBe('LOSS');
    const settledSystem = await db.bettingSystem.findUniqueOrThrow({ where: { id: system.id } });
    expect(settledSystem.status).toBe('PARTIAL');
    expect(settledSystem.verificationStatus).toBe('VERIFIED');
  });
});
