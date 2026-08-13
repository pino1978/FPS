import {describe,it,expect} from 'vitest';
import {playerImpactScore,predictAnytimeScorer} from './index';

const base={playerId:'9',playerName:'Attaccante',goals:10,assists:4,penalties:2,teamGoals:30,teamPlayed:20,teamGoalsFor:30,opponentGoalsAgainst:25,opponentPlayed:20,starterStatus:'CONFIRMED' as const,availabilityVerified:true,role:'Centre-Forward',expectedMinutes:82,teamExpectedGoals:1.7};

describe('player scorer',()=>{
 it('produces a bounded probability for confirmed available starter',()=>{const p=predictAnytimeScorer(base);expect(p.probability).toBeGreaterThan(0);expect(p.probability).toBeLessThan(1);expect(p.status).toBe('ACTIVE');expect(p.playerImpact.expectedMinutes).toBe(82);expect(p.playerImpact.role).toBe('ATTACKER')});
 it('does not bet without confirmed starting status',()=>{expect(predictAnytimeScorer({...base,starterStatus:'UNKNOWN'}).status).toBe('NO_BET')});
 it('blocks unavailable players',()=>{const p=predictAnytimeScorer({...base,starterStatus:'OUT'});expect(p.status).toBe('NO_BET');expect(p.probability).toBe(0)});
 it('weights a confirmed attacker above an equivalent bench defender',()=>{const starter=playerImpactScore({goals:8,assists:2,teamGoals:30,role:'Forward',starterStatus:'CONFIRMED',expectedMinutes:80,availabilityVerified:true});const reserve=playerImpactScore({goals:8,assists:2,teamGoals:30,role:'Defender',starterStatus:'BENCH',expectedMinutes:25,availabilityVerified:true});expect(starter.score).toBeGreaterThan(reserve.score);expect(starter.version).toBe('player-impact-v1')});
 it('uses team expected goals explicitly when available',()=>{const low=predictAnytimeScorer({...base,teamExpectedGoals:.7});const high=predictAnytimeScorer({...base,teamExpectedGoals:2.2});expect(high.probability).toBeGreaterThan(low.probability)});
});
