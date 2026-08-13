import { expect, test } from '@playwright/test';

const predictionPayload={
  source:'MOCK',modelVersion:'e2e-v1',data:[{
    fixture:{id:'fixture-1',utcDate:'2026-08-14T18:45:00.000Z',status:'SCHEDULED',home:{id:'h1',name:'Juventus'},away:{id:'a1',name:'Napoli'}},
    expectedGoalsHome:1.55,expectedGoalsAway:1.15,
    markets:[
      {market:'1X2',selection:'1',probability:0.46,confidence:0.72,dataQuality:0.85,fairOdds:2.17,status:'ACTIVE'},
      {market:'1X2',selection:'X',probability:0.28,confidence:0.72,dataQuality:0.85,fairOdds:3.57,status:'ACTIVE'},
      {market:'1X2',selection:'2',probability:0.26,confidence:0.72,dataQuality:0.85,fairOdds:3.85,status:'ACTIVE'},
      {market:'OVER_UNDER_2_5',selection:'OVER 2.5',probability:0.54,confidence:0.70,dataQuality:0.84,fairOdds:1.85,status:'ACTIVE'},
      {market:'BTTS',selection:'GOAL',probability:0.52,confidence:0.69,dataQuality:0.84,fairOdds:1.92,status:'ACTIVE'},
      {market:'HOME_GOALS_1_5',selection:'HOME OVER 1.5',probability:0.45,confidence:0.68,dataQuality:0.82,fairOdds:2.22,status:'ACTIVE'}
    ]
  }]
};

async function mockApi(page:any){
  await page.route('http://localhost:4000/**',async(route:any)=>{
    const url=route.request().url();
    if(url.includes('/v2/predictions'))return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(predictionPayload)});
    if(url.includes('/v2/systems/assist'))return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({status:'OK',profile:'BALANCED',stake:1,cost:1,selections:[],combinations:[],coverage:{explanation:'Copertura e2e',guarantee:'Nessuna garanzia di profitto'}})});
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
