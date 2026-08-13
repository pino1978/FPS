import { describe, expect, it, vi } from 'vitest';
import { HistoryController } from './history.controller';

describe('HistoryController payout projection',()=>{
  it('returns payout for WIN, LOSS, VOID and pending bets',async()=>{
    const db:any={bet:{findMany:vi.fn().mockResolvedValue([
      {id:'w',status:'WIN',stake:10,odds:2.2},
      {id:'l',status:'LOSS',stake:10,odds:2.2},
      {id:'v',status:'VOID',stake:10,odds:2.2},
      {id:'p',status:'PENDING',stake:10,odds:2.2},
    ])}};
    const controller=new HistoryController(db);
    const rows=await controller.bets();
    expect(rows.map((row:any)=>row.payout)).toEqual([22,0,10,null]);
    expect(db.bet.findMany).toHaveBeenCalledOnce();
  });
});
