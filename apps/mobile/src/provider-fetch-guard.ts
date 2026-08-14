const CACHE_PREFIX='fps_provider_cache_v1:';
const FORCE_KEY='fps_force_provider_refresh_until';
const LAST_META_KEY='fps_provider_last_meta';
const inflight=new Map<string,Promise<Response>>();
const windows=new Map<string,number[]>();
const blockedUntil=new Map<string,number>();
let installed=false;

type CacheEntry={savedAt:number;status:number;body:string;contentType:string;provider:string;url:string};
export type ProviderCacheMeta={provider:string;url:string;updatedAt:string;source:'NETWORK'|'CACHE'|'STALE_CACHE';stale:boolean;status:number};

function providerOf(url:string){if(url.includes('/fd/')||url.includes('api.football-data.org'))return'football-data';if(url.includes('/af/')||url.includes('api-sports.io'))return'api-football';return''}
function ttl(url:string){if(url.includes('/odds'))return 2*60_000;if(url.includes('/lineups')||url.includes('/injuries')||url.includes('/matches/'))return 5*60_000;if(url.includes('/matches'))return 10*60_000;if(url.includes('/standings')||url.includes('/scorers'))return 30*60_000;return 10*60_000}
function cacheKey(url:string){try{const u=new URL(url,location.origin);return CACHE_PREFIX+u.pathname+u.search}catch{return CACHE_PREFIX+url}}
function readEntry(key:string):CacheEntry|undefined{try{const raw=localStorage.getItem(key);return raw?JSON.parse(raw):undefined}catch{return undefined}}
function writeEntry(key:string,e:CacheEntry){try{localStorage.setItem(key,JSON.stringify(e))}catch{}}
function responseOf(e:CacheEntry,source:'CACHE'|'STALE_CACHE'){emit({provider:e.provider,url:e.url,updatedAt:new Date(e.savedAt).toISOString(),source,stale:source==='STALE_CACHE',status:e.status});return new Response(e.body,{status:e.status,headers:{'content-type':e.contentType||'application/json','x-fps-cache':source}})}
function emit(meta:ProviderCacheMeta){try{localStorage.setItem(LAST_META_KEY,JSON.stringify(meta))}catch{};window.dispatchEvent(new CustomEvent('fps:provider-meta',{detail:meta}))}
function forceActive(){try{return Number(sessionStorage.getItem(FORCE_KEY)||0)>Date.now()}catch{return false}}
async function throttle(provider:string){if(provider!=='football-data')return;const block=blockedUntil.get(provider)||0;if(block>Date.now())await sleep(block-Date.now());const now=Date.now(),xs=(windows.get(provider)||[]).filter(t=>now-t<60_000);windows.set(provider,xs);if(xs.length>=8){const wait=Math.max(0,60_250-(now-xs[0]));if(wait>0)await sleep(wait);const fresh=(windows.get(provider)||[]).filter(t=>Date.now()-t<60_000);windows.set(provider,fresh)}(windows.get(provider)||[]).push(Date.now())}
function sleep(ms:number){return new Promise(r=>setTimeout(r,ms))}
function retryDelay(r:Response){const seconds=Number(r.headers.get('x-requestcounter-reset')||r.headers.get('retry-after')||0);return Number.isFinite(seconds)&&seconds>0?seconds*1000:60_000}

export function installProviderFetchGuard(){if(installed||typeof window==='undefined')return;installed=true;const nativeFetch=window.fetch.bind(window);window.fetch=(async(input:RequestInfo|URL,init?:RequestInit)=>{const method=(init?.method||'GET').toUpperCase(),url=typeof input==='string'?input:input instanceof URL?input.toString():input.url,provider=providerOf(url);if(!provider||method!=='GET')return nativeFetch(input as any,init);const key=cacheKey(url),cached=readEntry(key),force=forceActive(),fresh=!!cached&&(Date.now()-cached.savedAt)<ttl(url);if(!force&&fresh)return responseOf(cached!,'CACHE');if(inflight.has(key))return (await inflight.get(key)!).clone();const task=(async()=>{await throttle(provider);window.dispatchEvent(new CustomEvent('fps:provider-loading',{detail:{provider,url}}));try{const r=await nativeFetch(input as any,init);const body=await r.clone().text();if(r.status===429){blockedUntil.set(provider,Date.now()+retryDelay(r));if(cached)return responseOf(cached,'STALE_CACHE');return new Response(body,{status:r.status,statusText:r.statusText,headers:r.headers})}if(r.ok){const e:CacheEntry={savedAt:Date.now(),status:r.status,body,contentType:r.headers.get('content-type')||'application/json',provider,url};writeEntry(key,e);emit({provider,url,updatedAt:new Date(e.savedAt).toISOString(),source:'NETWORK',stale:false,status:r.status})}return new Response(body,{status:r.status,statusText:r.statusText,headers:r.headers})}catch(error){if(cached)return responseOf(cached,'STALE_CACHE');throw error}finally{window.dispatchEvent(new CustomEvent('fps:provider-loading',{detail:{provider,url,done:true}}))}})();inflight.set(key,task);try{return (await task).clone()}finally{inflight.delete(key)}})as typeof window.fetch}

export function forceProviderRefresh(){try{sessionStorage.setItem(FORCE_KEY,String(Date.now()+20_000))}catch{};window.dispatchEvent(new CustomEvent('fps:force-provider-refresh'))}
export function clearProviderCache(){for(let i=localStorage.length-1;i>=0;i--){const k=localStorage.key(i);if(k?.startsWith(CACHE_PREFIX))localStorage.removeItem(k)}}
export function lastProviderMeta():ProviderCacheMeta|undefined{try{const raw=localStorage.getItem(LAST_META_KEY);return raw?JSON.parse(raw):undefined}catch{return undefined}}

installProviderFetchGuard();
