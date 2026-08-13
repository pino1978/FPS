import {describe,expect,it} from 'vitest';
import {qualityEnvelope} from './prediction.controller';

const home={teamId:'h',played:20,points:42,goalsFor:36,goalsAgainst:18,formIndex:.8,home:{played:10,points:26,goalsFor:22,goalsAgainst:7},away:{played:10,points:16,goalsFor:14,goalsAgainst:11}};
const away={teamId:'a',played:20,points:36,goalsFor:31,goalsAgainst:22,formIndex:.7,home:{played:10,points:23,goalsFor:19,goalsAgainst:9},away:{played:10,points:13,goalsFor:12,goalsAgainst:13}};
const probs=[.48,.28,.24];

describe('prediction confidence and data quality',()=>{
  it('missing availability never increases data quality or confidence',()=>{
    const complete=qualityEnvelope(home,away,probs,{availabilityCoverage:1,lineupConfirmed:true});
    const missing=qualityEnvelope(home,away,probs,{availabilityCoverage:.75,lineupConfirmed:false});
    expect(missing.dataQuality).toBeLessThan(complete.dataQuality);
    expect(missing.confidence).toBeLessThan(complete.confidence);
  });

  it('missing venue split reduces quality',()=>{
    const complete=qualityEnvelope(home,away,probs,{availabilityCoverage:1,lineupConfirmed:true});
    const missingVenue=qualityEnvelope({...home,home:undefined},{...away,away:undefined},probs,{availabilityCoverage:1,lineupConfirmed:true});
    expect(missingVenue.dataQuality).toBeLessThan(complete.dataQuality);
  });
});
