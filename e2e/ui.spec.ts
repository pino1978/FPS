import { expect, test } from '@playwright/test';

const predictionPayload={
  source:'MOCK',modelVersion:'e2e-v1',data:[{
    fixture:{id:'fixture-1',utcDate:'2026-08-14T18:45:00.000Z',status:'SCHEDULED',home:{id:'h1',name:'Juventus'},away:{id:'a1',name:'Napoli'}},
    expectedGoalsHome:1.55,expectedGoalsAway:1.15,
    markets:[
      {market:'1X2',selection:'1',probability:0.46,confidence:0.72,dataQuality:0.85,fairOdds:2.17,status:'ACTIVE',period:'FT',metric:'RESULT',operator:'OUTCOME',outcome:'1'},
      {market:'1X2',selection:'X',probability:0.28,confidence:0.72,dataQuality:0.85,fairOdds:3.57,status:'ACTIVE'},
      {market:'1X2',selection:'2',probability:0.26,confidence:0.72,dataQuality:0.85,fairOdds:3.85,status:'ACTIVE'},
      {market:'OVER_UNDER_2_5',selection:'OVER 2.5',probability:0.54,confidence:0.70,dataQuality:0.84,fairOdds:1.85,status:'ACTIVE'},
      {market:'BTTS',selection:'GOAL',probability:0.52,confidence:0.69,dataQuality:0.84,fairOdds:1.92,status:'ACTIVE'},
      {market:'HOME_GOALS_1_5',selection:'HOME OVER 1.5',probability:0.45,confidence:0.68,dataQuality:0.82,fairOdds:2.22,status:'ACTIVE'}
    ]
  }]
};

const intelligence={
  statistics:{home:{played:20,points:42,goalsFor:36,goalsAgainst:18,formIndex:.8},away:{played:20,points:38,goalsFor:32,goalsAgainst:21,formIndex:.7}},
  lineup:{home:{starters:['Home Nine'],bench:['Home Reserve']},away:{starters:['Away Nine'],bench:['Away Reserve']},source:'MOCK'},
  injuries:[{playerName:'Home Doubt',teamName:'Juventus',reason:'Muscle'}],availabilityVerified:true,
  explanation:['Juventus: 42 punti in 20 gare.','Napoli: 38 punti in 20 gare.','Expected goals modello: 1.55 - 1.15.','Indisponibilità verificate.']
};
const playerMarkets={source:'MOCK',data:[{playerId:'p9',playerName:'Home Nine',market:'ANYTIME_SCORER',selection:'Home Nine segna',probability:.41,confidence:.74,dataQuality:.82,status:'ACTIVE',fairOdds:2.44,teamSide:'HOME',playerImpact:{role:'ATTACKER',expectedMinutes:78}}]};

async function mockApi(page:any,{incompatible=false}:{incompatible?:boolean}={}){
  let systemPlayed=false,systemSettled=false;
  await page.route('http://localhost:4000/**',async(route:any)=>{
    const request=route.request(),url=request.url(),method=request.method();
    if(url.includes('/v2/predictions'))return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(predictionPayload)});
    if(url.includes('/v2/matches/fixture-1/intelligence'))return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(intelligence)});
    if(url.includes('/player-markets'))return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(playerMarkets)});
    if(url.includes('/v2/systems/assist'))return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(incompatible?{status:'INCOMPATIBLE',reason:'Selezioni logicamente incompatibili',invalid:[['1','X']],combinations:[],cost:0}:{status:'OK',profile:'BALANCED',stake:1,cost:1,selections:[{id:'fixture-1|1X2|1',fixtureId:'fixture-1',market:'1X2',selection:'1',eventAt:'2026-08-14T18:45:00.000Z',probability:.46,confidence:.72,dataQuality:.85}],combinations:[[{id:'fixture-1|1X2|1'}]],coverage:{explanation:'Copertura e2e',guarantee:'Nessuna garanzia di profitto'}})});
    if(url.endsWith('/systems/save')&&method==='POST')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({id:'system-e2e'})});
    if(url.includes('/v2/history/systems/system-e2e/execution')&&method==='POST'){systemPlayed=true;return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({id:'system-e2e',played:true})});}
    if(url.includes('/v2/history/bets')&&method==='POST')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({id:'bet-e2e'})});
    if(url.endsWith('/settlement/run')&&method==='POST'){systemSettled=true;return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({processed:1,fixturesFetched:1})});}
    if(url.includes('/v2/history/systems')&&method==='GET')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(systemPlayed?[{id:'system-e2e',mode:'ASSISTED',profile:'BALANCED',totalCost:1,payout:systemSettled?1.9:null,played:true,simulated:false,status:systemSettled?'WIN':'PENDING',createdAt:'2026-08-13T01:00:00.000Z',selections:[{id:'sel-1',market:'1X2',selection:'1',odds:1.9,originalPrediction:{probability:.46,confidence:.72,dataQuality:.85,fairOdds:2.17,modelVersion:'e2e-v1',capturedAt:'2026-08-13T00:00:00.000Z'}}],combinations:[{id:'combo-1',status:systemSettled?'WIN':'PENDING'}]}]:[])});
    if((url.includes('/v2/history/bets')&&method==='GET')||url.includes('/v2/history/predictions'))return route.fulfill({status:200,contentType:'application/json',body:'[]'});
    if(url.includes('/v2/paper/report'))return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({bankrollInitial:1000,bankrollFinal:1000,profit:0,stakeTotal:0,returnsTotal:0,roi:null,yield:null,maxDrawdown:0,winRate:null,betsCount:0,systemsCount:0,incompleteEconomicRecords:0,marketPerformance:[]})});
    if(url.includes('/ops/performance'))return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({modelPerformance:{sample:2,brierScore:.2,logLoss:.5,hitRate:.5,calibration:[],byMarket:[],byCompetition:[],byConfidence:[],byModelVersion:[],byPeriod:[]},bettingPerformance:{sample:0,byMarket:[],byCompetition:[],byBookmaker:[],systemsVsSingles:{systems:{systems:0},singles:{sample:0}}}})});
    return route.fulfill({status:200,contentType:'application/json',body:'{}'});
  });
}

test('fixture → prediction → add to system critical flow',async({page})=>{
  await mockApi(page);
  await page.goto('/');
  await expect(page.getByRole('heading',{name:'Pronostici'})).toBeVisible();
  await expect(page.getByText('Juventus')).toBeVisible();
  await expect(page.getByText('Napoli')).toBeVisible();
  await page.getByRole('button',{name:'Aggiungi 1'}).click();
  await expect(page.getByText('1 selezioni')).toBeVisible();
  await page.getByRole('button',{name:'Sistemi'}).first().click();
  await expect(page.getByRole('heading',{name:'System Builder'})).toBeVisible();
  await expect(page.getByText('Pronostici 1')).toBeVisible();
});

test('single prediction can be registered as paper with execution odds',async({page})=>{
  await mockApi(page);
  await page.goto('/');
  await page.getByRole('button',{name:'Analisi completa →'}).click();
  await page.getByText('Registra singola').first().click();
  await page.getByRole('spinbutton',{name:'Quota singola 1'}).fill('1.95');
  await page.getByRole('button',{name:'Paper'}).first().click();
  await expect(page.getByText('Singola registrata in paper trading.')).toBeVisible();
});

test('active scorer can be added to system tray and recorded as a single',async({page})=>{
  await mockApi(page);
  await page.goto('/');
  await page.getByRole('button',{name:'Analisi completa →'}).click();
  await page.getByRole('button',{name:'Marcatori'}).click();
  const addScorer=page.getByRole('button',{name:'Aggiungi Home Nine segna'});
  await expect(addScorer).toBeVisible();
  await addScorer.click();
  await expect(page.getByText('1 selezioni')).toBeVisible();
  await page.getByText('Registra singola').click();
  await page.getByRole('spinbutton',{name:'Quota singola Home Nine segna'}).fill('2.50');
  await page.getByRole('button',{name:'L’ho giocata'}).click();
  await expect(page.getByText('Singola registrata come realmente giocata.')).toBeVisible();
});

test('played system → settlement → history critical flow',async({page})=>{
  await mockApi(page);
  await page.goto('/');
  await page.getByRole('button',{name:'Aggiungi 1'}).click();
  await page.getByRole('button',{name:'Sistemi'}).first().click();
  await page.getByRole('button',{name:'Genera sistema'}).click();
  await expect(page.getByText('COMBINAZIONI')).toBeVisible();
  await page.getByText('Quote di esecuzione · reale o paper').click();
  await page.getByRole('spinbutton',{name:'Quota effettiva 1'}).fill('1.90');
  await page.getByRole('button',{name:'L’ho giocato'}).click();
  await expect(page.getByText('Sistema registrato come realmente giocato.')).toBeVisible();
  await page.getByRole('button',{name:'Storico'}).first().click();
  await page.getByRole('button',{name:'Sistemi'}).last().click();
  await expect(page.getByText(/ASSISTED · 1 selezioni/)).toBeVisible();
  await page.getByRole('button',{name:'Verifica ora'}).click();
  await expect(page.getByText('1 elementi elaborati · 1 fixture interrogate.')).toBeVisible();
  await expect(page.locator('strong.status-win')).toHaveText('WIN');
  await expect(page.getByRole('button',{name:'Prediction'})).toBeVisible();
});

test('paper trading dashboard keeps virtual bankroll separate',async({page})=>{
  await mockApi(page);
  await page.goto('/');
  await page.getByRole('button',{name:'Statistiche'}).first().click();
  await expect(page.getByRole('heading',{name:'Portafoglio simulato'})).toBeVisible();
  await expect(page.getByRole('spinbutton',{name:'Bankroll paper trading'})).toHaveValue('1000');
  await expect(page.getByText('P/L VIRTUALE')).toBeVisible();
});

test('match detail exposes form lineup injuries and quantitative motivation progressively',async({page})=>{
  await mockApi(page);
  await page.goto('/');
  await page.getByRole('button',{name:'Analisi completa →'}).click();
  await expect(page.getByRole('heading',{name:'Juventus — Napoli'})).toBeVisible();
  await expect(page.getByText('FORMA CASA')).toBeVisible();
  await page.getByText('Lineup & indisponibili').click();
  await expect(page.getByText('Home Nine')).toBeVisible();
  await expect(page.getByText('Home Doubt')).toBeVisible();
  await page.getByText('Motivazione quantitativa').click();
  await expect(page.getByText('Expected goals modello: 1.55 - 1.15.')).toBeVisible();
});

test('incompatible system response is visibly blocked',async({page})=>{
  await mockApi(page,{incompatible:true});
  await page.goto('/');
  await page.getByRole('button',{name:'Aggiungi 1'}).click();
  await page.getByRole('button',{name:'Sistemi'}).first().click();
  await page.getByRole('button',{name:'Genera sistema'}).click();
  await expect(page.getByText('INCOMPATIBLE')).toBeVisible();
  await expect(page.getByText('Selezioni logicamente incompatibili')).toBeVisible();
});

test('principal controls are keyboard reachable and named',async({page})=>{
  await mockApi(page);
  await page.goto('/');
  const nav=page.getByRole('navigation',{name:'Navigazione principale'});
  await expect(nav).toBeVisible();
  await expect(page.getByRole('button',{name:'Aggiungi 1'})).toHaveAttribute('aria-label','Aggiungi 1');
  await page.keyboard.press('Tab');
  const firstFocused=await page.evaluate(()=>document.activeElement?.tagName);
  expect(firstFocused).toBe('BUTTON');
  await page.keyboard.press('Tab');
  const secondName=await page.evaluate(()=>document.activeElement?.textContent?.trim());
  expect(secondName).toBeTruthy();
});

for(const viewport of [
  {name:'320px',width:320,height:720},
  {name:'mobile',width:390,height:844},
  {name:'tablet',width:768,height:1024},
  {name:'desktop',width:1440,height:1000},
]){
  test(`responsive layout ${viewport.name}`,async({page})=>{
    await mockApi(page);
    await page.setViewportSize({width:viewport.width,height:viewport.height});
    await page.goto('/');
    await expect(page.getByRole('heading',{name:'Pronostici'})).toBeVisible();
    const dimensions=await page.evaluate(()=>({scrollWidth:document.documentElement.scrollWidth,clientWidth:document.documentElement.clientWidth}));
    expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth+1);
    await expect(page.getByText('Juventus')).toBeVisible();
  });
}
