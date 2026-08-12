import {describe,it,expect} from 'vitest';import {buildSystem,optimizeSystem,predictMarkets,settleMarket,settlementEligible} from './index';
describe('domain',()=>{
 it('blocks incompatible picks',()=>{const r=buildSystem([{id:'a',fixtureId:'1',market:'BTTS',selection:'GOAL'},{id:'b',fixtureId:'1',market:'BTTS',selection:'NO GOAL'}],2,1);expect(r.status).toBe('INCOMPATIBLE')});
 it('blocks exclusive 1X2 outcomes',()=>{expect(buildSystem([{id:'a',fixtureId:'1',market:'1X2',selection:'1'},{id:'b',fixtureId:'1',market:'1X2',selection:'X'}],2,1).status).toBe('INCOMPATIBLE')});
 it('creates 20 triples from six',()=>{const s=Array.from({length:6},(_,i)=>({id:String(i),fixtureId:String(i),market:'1X2',selection:'1'}));expect(buildSystem(s,3,1).combinations).toHaveLength(20)});
 it('returns no bet on weak data',()=>{expect(predictMarkets({played:1,points:1,goalsFor:1,goalsAgainst:1},{played:1,points:1,goalsFor:1,goalsAgainst:1})[0].status).toBe('NO_BET')});
 it('optimizes within budget',()=>{const s=Array.from({length:6},(_,i)=>({id:String(i),fixtureId:String(i),market:'1X2',selection:'1',probability:.7,confidence:.8,dataQuality:.8}));const r=optimizeSystem(s,20,'BALANCED');expect(r.status).toBe('OK');if(r.status==='OK')expect(r.cost).toBeLessThanOrEqual(20)});
 it('settles supported markets',()=>{expect(settleMarket('1X2','1',{home:2,away:0})).toBe('WIN');expect(settleMarket('BTTS','NO GOAL',{home:2,away:0})).toBe('WIN');expect(settleMarket('OVER_UNDER_2_5','OVER 2.5',{home:2,away:1})).toBe('WIN')});
 it('does not reprocess verified events',()=>{expect(settlementEligible(new Date(0),true,new Date())).toBe(false)});
});
