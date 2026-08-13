import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FootballProvider } from './services';

describe('FootballProvider resilience and normalization',()=>{
  beforeEach(()=>{
    process.env.FOOTBALL_DATA_TOKEN='test-token';
    vi.restoreAllMocks();
  });
  afterEach(()=>vi.restoreAllMocks());

  it('retries a 429 and succeeds on the next response',async()=>{
    const fetchMock=vi.spyOn(globalThis,'fetch')
      .mockResolvedValueOnce(new Response('{}',{status:429}))
      .mockResolvedValueOnce(new Response(JSON.stringify({standings:[]}),{status:200,headers:{'content-type':'application/json'}}));
    const provider=new FootballProvider();
    const result=await provider.footballData('/competitions/SA/standings',{},0);
    expect(result).toEqual({standings:[]});
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('does not retry a non-retryable 400 response',async()=>{
    const fetchMock=vi.spyOn(globalThis,'fetch').mockResolvedValue(new Response('{}',{status:400}));
    const provider=new FootballProvider();
    await expect(provider.footballData('/bad-request',{},0)).rejects.toThrow('football-data 400');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('normalizes TOTAL HOME and AWAY standing tables behind the provider adapter',async()=>{
    const row=(playedGames:number,points:number,goalsFor:number,goalsAgainst:number)=>({team:{id:7},playedGames,points,goalsFor,goalsAgainst});
    vi.spyOn(globalThis,'fetch').mockResolvedValue(new Response(JSON.stringify({standings:[
      {type:'TOTAL',table:[{...row(20,40,35,20),form:'WWDLW'}]},
      {type:'HOME',table:[row(10,25,22,7)]},
      {type:'AWAY',table:[row(10,15,13,13)]},
    ]}),{status:200,headers:{'content-type':'application/json'}}));
    const provider=new FootballProvider();
    const standings=await provider.standings('SA');
    expect(standings).toHaveLength(1);
    expect(standings[0]).toMatchObject({teamId:'7',played:20,points:40,home:{played:10,points:25,goalsFor:22,goalsAgainst:7},away:{played:10,points:15,goalsFor:13,goalsAgainst:13}});
    expect(standings[0].formIndex).toBeCloseTo(.7,6);
  });
});
