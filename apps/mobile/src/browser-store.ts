import type{LocalStore}from'@fps/mobile-runtime';

const PREDICTIONS='fps_browser_prediction_runs';
const RECORDS='fps_browser_records';
const MAX_PREDICTION_RUNS=80;
const MAX_RECORDS=250;

function read<T>(key:string,fallback:T):T{try{const raw=localStorage.getItem(key);return raw?JSON.parse(raw)as T:fallback}catch{return fallback}}
function isQuotaError(e:unknown){return e instanceof DOMException&&(e.name==='QuotaExceededError'||e.name==='NS_ERROR_DOM_QUOTA_REACHED')}
function safeWrite(key:string,value:unknown,shrink:(v:any)=>any){let next=value;for(let i=0;i<5;i++){try{localStorage.setItem(key,JSON.stringify(next));return}catch(e){if(!isQuotaError(e))throw e;next=shrink(next)}}try{localStorage.removeItem(key);localStorage.setItem(key,JSON.stringify(next))}catch{/* browser persistence is best-effort only */}}
function prunePredictions(rows:any[]){const seen=new Set<string>(),out:any[]=[];for(const row of rows){const key=`${row.fixtureId||row.fixture?.id||''}|${row.modelVersion||''}`;if(seen.has(key))continue;seen.add(key);out.push(row);if(out.length>=MAX_PREDICTION_RUNS)break}return out}
function shrinkPredictions(rows:any[]){return prunePredictions((Array.isArray(rows)?rows:[]).slice(0,Math.max(10,Math.floor((rows?.length||0)*.6))))}
function pruneRecords(rows:any[]){return(Array.isArray(rows)?rows:[]).sort((a,b)=>String(b.createdAt||'').localeCompare(String(a.createdAt||''))).slice(0,MAX_RECORDS)}
function shrinkRecords(rows:any[]){return(Array.isArray(rows)?rows:[]).slice(0,Math.max(20,Math.floor((rows?.length||0)*.6)))}

export class BrowserLocalStore implements LocalStore{
  async init(){
    // Clean up older unbounded desktop snapshots created by previous dev builds.
    const predictions=read<any[]>(PREDICTIONS,[]),records=read<any[]>(RECORDS,[]);
    safeWrite(PREDICTIONS,prunePredictions(predictions),shrinkPredictions);
    safeWrite(RECORDS,pruneRecords(records),shrinkRecords);
  }
  async savePredictionRun(run:any){
    const rows=read<any[]>(PREDICTIONS,[]).filter(x=>String(x.id)!==String(run.id));
    rows.unshift(run);
    safeWrite(PREDICTIONS,prunePredictions(rows),shrinkPredictions);
  }
  async listPredictionRuns(){return prunePredictions(read<any[]>(PREDICTIONS,[]))}
  async saveRecord(kind:string,record:any){
    const rows=read<any[]>(RECORDS,[]),id=String(record.id||crypto.randomUUID()),createdAt=String(record.createdAt||new Date().toISOString()),next={...record,id,kind,createdAt},index=rows.findIndex(x=>String(x.id)===id&&x.kind===kind);
    if(index>=0)rows[index]=next;else rows.unshift(next);
    safeWrite(RECORDS,pruneRecords(rows),shrinkRecords);
  }
  async listRecords(kind:string){return read<any[]>(RECORDS,[]).filter(x=>x.kind===kind).sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt)))}
}
