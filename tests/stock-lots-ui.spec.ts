import { expect, test, type Page } from '@playwright/test';

const wid = '11111111-1111-4111-8111-111111111111';
const uid = '11111111-1111-4111-8111-111111111112';
const sid = '22222222-2222-4222-8222-222222222222';
const lotId = '33333333-3333-4333-8333-333333333333';
const buyerId = '44444444-4444-4444-8444-444444444444';
const iso = '2026-10-17T10:00:00.000Z';

type Data = { suppliers: Record<string,any>[]; lots: Record<string,any>[]; demands: Record<string,any>[]; matches: Record<string,any>[] };
const fixture = (): Data => ({
  suppliers:[{id:sid,workspaceId:wid,companyName:'Yiwu Trade Warehouse',city:'Yiwu',province:'Zhejiang',status:'unverified',createdAt:iso}],
  lots:[
    {id:lotId,workspaceId:wid,supplierId:sid,productName:'Stainless steel cutlery sets',category:'Kitchenware',origin:'factory_overstock',condition:'new_sealed',quantity:2400,minimumOrder:500,splitAllowed:true,unitPriceCnyMinor:250,warehouseLocation:'Yiwu, Zhejiang',evidenceUrls:[],status:'published',createdAt:iso},
    {id:'55555555-5555-4555-8555-555555555555',workspaceId:wid,supplierId:sid,productName:'Ceramic coffee mugs',category:'Tableware',origin:'cancelled_order',condition:'unknown',quantity:500,minimumOrder:500,splitAllowed:false,unitPriceCnyMinor:450,warehouseLocation:'Guangzhou',evidenceUrls:[],status:'unverified',createdAt:iso},
  ],
  demands:[{id:buyerId,workspaceId:wid,productName:'Stainless steel cutlery',category:'Kitchenware',quantity:1000,maxBudgetCnyMinor:500000,destination:'Karachi, Pakistan',status:'open',createdAt:iso}],
  matches:[{lotId,demandId:buyerId,units:1000,score:90,fullLot:false,totalPriceCnyMinor:250000,notes:['Supplier permits split orders (reconfirm)','Excludes inspection, shipping, import duties and taxes']}],
});

async function mockApi(page: Page, options?: {anonymous?:boolean; empty?:boolean}) {
  const state = options?.empty ? {suppliers:[],lots:[],demands:[],matches:[]} as Data : fixture();
  await page.route('**/api/**', async route => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    const send = (body: unknown, status=200) => route.fulfill({status, contentType:'application/json',body:JSON.stringify(body)});
    if(path==='/api/stocklots-status')return send({service:'stock-lots',databaseConfigured:true});
    if(path==='/api/auth/session')return send({user:options?.anonymous?null:{id:uid,email:'sourcing@example.com'}});
    if(path==='/api/workspace/list')return send({workspaces:[{workspace:{id:wid,name:'China Supplier Field Desk'},role:'owner'}]});
    if(path==='/api/auth/login')return send({user:{id:uid,email:'sourcing@example.com'}});
    if(path==='/api/stocklots' && request.method()==='GET'){
      const type=url.searchParams.get('type') as keyof Data;
      if(!Object.prototype.hasOwnProperty.call(state,type))return send({error:'Unknown type'},400);
      return send({items:state[type]});
    }
    if(path==='/api/stocklots' && request.method()==='POST'){
      const payload=request.postDataJSON() as Record<string,any>;
      const action=url.searchParams.get('action');
      const now={createdAt:iso};
      if(action==='supplier'){
        const item={...now,...payload,id:'66666666-6666-4666-8666-666666666666',status:'unverified'};
        state.suppliers.unshift(item);return send({item},201);
      }
      if(action==='lot'){
        const item={...now,...payload,id:'77777777-7777-4777-8777-777777777777',status:'unverified'};
        state.lots.unshift(item);return send({item},201);
      }
      if(action==='demand'){
        const item={...now,...payload,id:'88888888-8888-4888-8888-888888888888',status:'open'};
        state.demands.unshift(item);return send({item},201);
      }
      if(action==='review'){
        const lot=state.lots.find(x=>x.id===payload.lotId);
        if(!lot)return send({error:'Lot not found'},404);
        lot.status=payload.action==='verify'?'documents_checked':payload.action==='publish'?'published':'withdrawn';
        if(lot.status==='withdrawn')state.matches=state.matches.filter(m=>m.lotId!==lot.id);
        return send({item:lot});
      }
    }
    return send({error:'Unexpected request '+path},404);
  });
  return state;
}
async function openDashboard(page:Page, options?: {empty?:boolean}) {
  const state=await mockApi(page,options);
  await page.goto('/stock-lots');
  await expect(page.getByTestId('stock-lot-dashboard')).toBeVisible();
  return state;
}
async function openView(page:Page,name:string) {
  if((page.viewportSize()?.width||0)<760){
    await page.getByRole('button',{name:'Open menu'}).click();
  }
  await page.getByRole('navigation',{name:'Stock-lot navigation'}).getByRole('button',{name:new RegExp('^'+name+'(?:\\s|$)')}).click();
}

test('renders genuine private dashboard without the legacy page header',async({page})=>{
  await openDashboard(page);
  await expect(page.getByRole('heading',{name:'Sourcing overview'})).toBeVisible();
  await expect(page.getByText('2 published · 0 not published')).toHaveCount(0); // one published, one unverified
  await expect(page.getByText('1 published · 1 not published')).toBeVisible();
  await expect(page.getByText('Stainless steel cutlery sets')).toBeVisible();
  await expect(page.getByRole('link',{name:'NicheScout Home'})).toHaveCount(0);
  await expect(page.getByText('Your China surplus-stock pipeline, at a glance.')).toBeVisible();
});
test('catalogue search, category and status filters work',async({page})=>{
  await openDashboard(page);
  await openView(page,'Stock lots');
  await expect(page.getByRole('button',{name:/Stainless steel cutlery sets/})).toBeVisible();
  await expect(page.getByRole('button',{name:/Ceramic coffee mugs/})).toBeVisible();
  await page.getByRole('searchbox',{name:'Search stock lots'}).fill('cutlery');
  await expect(page.getByRole('button',{name:/Ceramic coffee mugs/})).toHaveCount(0);
  await page.getByRole('searchbox',{name:'Search stock lots'}).fill('');
  await page.getByRole('combobox',{name:'Filter lot status'}).selectOption('unverified');
  await expect(page.getByRole('button',{name:/Stainless steel cutlery sets/})).toHaveCount(0);
  await expect(page.getByRole('button',{name:/Ceramic coffee mugs/})).toBeVisible();
  await page.getByRole('combobox',{name:'Filter by category'}).selectOption('Kitchenware');
  await expect(page.getByText('No lots match these filters')).toBeVisible();
});
test('records a new supplier using the real slide-out form and refreshes directory',async({page})=>{
  await openDashboard(page);
  await openView(page,'Suppliers');
  await page.getByRole('button',{name:'Add supplier'}).click();
  const dialog=page.getByRole('dialog',{name:'Register supplier'});
  await expect(dialog).toBeVisible();
  await dialog.getByRole('textbox',{name:'Company / trading name'}).fill('Guangdong Clearance Factory');
  await dialog.getByRole('textbox',{name:'City'}).fill('Guangzhou');
  await dialog.getByRole('textbox',{name:'Province'}).fill('Guangdong');
  await dialog.getByRole('button',{name:'Save supplier'}).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByText('Guangdong Clearance Factory')).toBeVisible();
  await expect(page.getByText('Record saved.')).toBeVisible();
});
test('displays buyer-to-lot matches and lot detail without inventing photos',async({page})=>{
  await openDashboard(page);
  await openView(page,'Lot matching');
  await expect(page.getByText('¥2,500.00')).toBeVisible();
  await expect(page.getByText('Stainless steel cutlery', {exact:false}).first()).toBeVisible();
  await openView(page,'Stock lots');
  await page.getByRole('button',{name:/Stainless steel cutlery sets/}).click();
  const details=page.getByRole('dialog',{name:'Lot details'});
  await expect(details.getByText('Supplier asking price')).toBeVisible();
  await expect(details.getByText('IMAGE NOT PROVIDED')).toBeVisible();
  await expect(details.getByText('Supplier reports allowed')).toBeVisible();
});
test('responsive sidebar opens and closes without horizontal overflow',async({page})=>{
  await openDashboard(page);
  if((page.viewportSize()?.width||0)<760){
    await page.getByRole('button',{name:'Open menu'}).click();
    await expect(page.getByRole('navigation',{name:'Stock-lot navigation'}).getByRole('button',{name:'Suppliers'})).toBeVisible();
    await page.getByRole('navigation',{name:'Stock-lot navigation'}).getByRole('button',{name:'Suppliers'}).click();
    await expect(page.getByRole('heading',{name:'Supplier directory'})).toBeVisible();
  } else {
    await expect(page.getByRole('navigation',{name:'Stock-lot navigation'})).toBeVisible();
  }
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1)).toBe(true);
});
test('shows login form without a valid session',async({page})=>{
  await mockApi(page,{anonymous:true});
  await page.goto('/stock-lots');
  await expect(page.getByRole('heading',{name:'Stock-Lot Intelligence'})).toBeVisible();
  await expect(page.getByRole('button',{name:'Sign in'})).toBeVisible();
});

test('explains non-JSON HTML API responses instead of hiding the HTTP error', async ({page}) => {
  await mockApi(page,{anonymous:true});
  await page.route('**/api/auth/login', async route =>
    route.fulfill({status:404,contentType:'text/html',body:'<html><body>Not Found</body></html>'}));
  await page.goto('/stock-lots');
  await page.getByRole('textbox',{name:'Work email'}).fill('demo@example.com');
  await page.getByLabel('Password').fill('temporary-password');
  await page.getByRole('button',{name:'Sign in'}).click();
  await expect(page.getByRole('alert')).toContainText('API route not found (/api/auth/login, HTTP 404)');
});
test('shows a clear preview database configuration warning', async ({page}) => {
  await mockApi(page,{anonymous:true});
  await page.route('**/api/stocklots-status',async route=>route.fulfill({
    status:200,contentType:'application/json',body:JSON.stringify({service:'stock-lots',databaseConfigured:false}),
  }));
  await page.goto('/stock-lots');
  await expect(page.getByRole('alert')).toContainText('This preview has no database connected');
});
