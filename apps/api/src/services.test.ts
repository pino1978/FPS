import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FootballProvider } from './services';

describe('FootballProvider resilience',()=>{
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
});
