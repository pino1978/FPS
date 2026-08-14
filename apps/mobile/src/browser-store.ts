import type{LocalStore}from'@fps/mobile-runtime';

const PREDICTIONS='fps_browser_prediction_runs';
const RECORDS='fps_browser_records';

function read<T>(key:string,fallback:T):T{try{const raw=localStorage.getItem(key);return raw?JSON.parse(raw)as T:fallback}catch{return fallback}}
function write(key:string,value:unknown){localStorage.setItem(key,JSON.stringify(value))}

export class BrowserLocalStore implements LocalStore{
  async init(){/* localStorage is ready synchronously in the browser */}
  async savePredictionRun(run:any){const rows=read<any[]>(PREDICTIONS,[]);if(!rows.some(x=>String(x.id)===String(run.id))){rows.unshift(run);write(PREDICTIONS,rows)}}
  async listPredictionRuns(){return read<any[]>(PREDICTIONS,[])}
  async saveRecord(kind:string,record:any){const rows=read<any[]>(RECORDS,[]),id=String(record.id||crypto.randomUUID()),createdAt=String(record.createdAt||new Date().toISOString()),next={...record,id,kind,createdAt},index=rows.findIndex(x=>String(x.id)===id&&x.kind===kind);if(index>=0)rows[index]=next;else rows.unshift(next);write(RECORDS,rows)}
  async listRecords(kind:string){return read<any[]>(RECORDS,[]).filter(x=>x.kind===kind).sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt)))}
}
