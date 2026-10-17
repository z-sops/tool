import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Activity, ArrowDownRight, ArrowRight, ArrowUpRight, BadgeCheck, Boxes, Building2, CheckCircle2, ChevronDown, ClipboardList, Download, FileSearch, Filter, LayoutDashboard, MapPin, Menu, Package, Plus, RefreshCw, Search, ShieldCheck, SlidersHorizontal, Sparkles, TrendingUp, Users, Warehouse, X } from 'lucide-react';
import { StockLotForm } from '../components/stock-lots/StockLotForm';
import { type BuyerMatch, type Demand, type FormSection, type Lot, type Supplier, type View, type WorkspaceEntry, formatCny, formatInteger, friendlyDate, quoteCsv, readableStatus } from '../components/stock-lots/stockLotTypes';
import '../components/stock-lots/stockLots.css';

const navigation: { id: View; label: string; icon: typeof Package }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'lots', label: 'Stock lots', icon: Boxes },
  { id: 'suppliers', label: 'Suppliers', icon: Building2 },
  { id: 'buyers', label: 'Buyer demand', icon: Users },
  { id: 'matches', label: 'Lot matching', icon: Sparkles },
];
const categoryColors = ['lot-thumb-a', 'lot-thumb-b', 'lot-thumb-c', 'lot-thumb-d'];
const statusColor: Record<string,string> = { published:'lot-green', documents_checked:'lot-blue', unverified:'lot-yellow', withdrawn:'lot-gray', open:'lot-green' };
const sectionForView: Partial<Record<View,FormSection>> = { lots:'lots', suppliers:'suppliers',buyers:'demands' };

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    credentials: 'include',
    ...init,
    headers: {...init?.headers, ...(init?.body ? {'Content-Type':'application/json'} : {})},
  });
  // A Vercel protection/login HTML page or an unrouted function returns
  // non-JSON; reporting only "invalid response" masks the root cause.
  const contentType = (response.headers.get('content-type') || '').toLowerCase();
  const endpoint = path.split('?')[0];
  if (!contentType.includes('application/json') && !contentType.includes('+json')) {
    if (response.status === 401 || response.status === 403 || response.redirected) {
      throw new Error('Preview access was refused or redirected. Sign in to the correct Vercel team, then reload. (HTTP ' + response.status + ' at ' + endpoint + ')');
    }
    if (response.status === 404) {
      throw new Error('API route not found (' + endpoint + ', HTTP 404). This preview may be outdated; open the latest deployment.');
    }
    throw new Error('The API returned HTTP ' + response.status + ' instead of JSON at ' + endpoint + '. Check Vercel routing and deployment configuration.');
  }
  let data: Record<string,any>;
  try { data = await response.json(); }
  catch {
    throw new Error('The API returned malformed JSON at ' + endpoint + ' (HTTP ' + response.status + ').');
  }
  if (!response.ok) {
    const details = data.details?.fieldErrors ? Object.entries(data.details.fieldErrors).map(([k,v]) => k + ': ' + String(v)).join('; ') : '';
    throw new Error([data.error || 'API request failed (HTTP ' + response.status + ')', details].filter(Boolean).join(' — '));
  }
  return data as T;
}

function Status({ value }: {value:string}) {
  return <span className={'lot-status ' + (statusColor[value] || 'lot-gray')}><span className="lot-status-dot"/> {readableStatus(value)}</span>;
}
function LotArt({ lot, size='small' }: {lot:Lot;size?:'small'|'large'}) {
  const [broken,setBroken] = useState(false);
  const src = lot.evidenceUrls?.find(url => { try { const u = new URL(url); return u.protocol === 'https:'; } catch { return false; } });
  return <div className={'lot-product-art ' + (categoryColors[Math.abs(lot.category.length)%categoryColors.length]) + (size === 'large'?' lot-product-art-large':'')}>
    {src && !broken ? <img src={src} alt={'Supplier evidence for '+lot.productName} loading="lazy" onError={() => setBroken(true)} referrerPolicy="no-referrer" /> :
      <div className="lot-product-placeholder"><Package size={size === 'large'?52:36} strokeWidth={1.15}/><span>IMAGE NOT PROVIDED</span></div>}
  </div>;
}
function Empty({ title, description, onClick, action }: {title:string;description:string;onClick?:()=>void;action?:string}) {
  return <div className="lot-empty"><div className="lot-empty-icon"><Boxes size={27}/></div><h3>{title}</h3><p>{description}</p>{action&&onClick&&<button className="lot-btn-primary" onClick={onClick}><Plus size={16}/>{action}</button>}</div>;
}

export function StockLotPage() {
  const [user,setUser] = useState<{id:string;email:string}|null>(null);
  const [sessionLoading,setSessionLoading] = useState(true);
  const [databaseReady,setDatabaseReady] = useState<boolean|null>(null);
  const [authMode,setAuthMode] = useState<'login'|'signup'>('login');
  const [credentials,setCredentials] = useState({email:'',password:'',displayName:''});
  const [workspaces,setWorkspaces] = useState<WorkspaceEntry[]>([]);
  const [workspaceId,setWorkspaceId] = useState('');
  const [workspaceName,setWorkspaceName] = useState('China Stock-Lot Desk');
  const [workspaceSlug,setWorkspaceSlug] = useState('china-stock-lots');
  const [view,setView] = useState<View>('overview');
  const [sidebarOpen,setSidebarOpen] = useState(false);
  const [suppliers,setSuppliers] = useState<Supplier[]>([]);
  const [lots,setLots] = useState<Lot[]>([]);
  const [demands,setDemands] = useState<Demand[]>([]);
  const [matches,setMatches] = useState<BuyerMatch[]>([]);
  const [loading,setLoading] = useState(false);
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState('');
  const [notice,setNotice] = useState('');
  const [form,setForm] = useState<FormSection|null>(null);
  const [selectedLot,setSelectedLot] = useState<Lot|null>(null);
  const [search,setSearch] = useState('');
  const [filter,setFilter] = useState('all');
  const [category,setCategory] = useState('all');
  const [sort,setSort] = useState('recent');
  const activeWorkspace = workspaces.find(w => w.workspace.id === workspaceId);
  const canReview = activeWorkspace?.role === 'owner' || activeWorkspace?.role === 'admin';
  const categories = useMemo(() => [...new Set(lots.map(x => x.category))].sort(),[lots]);
  const listedValue = lots.reduce((sum,l)=>sum + l.quantity*l.unitPriceCnyMinor,0);
  const published = lots.filter(l=>l.status==='published').length;

  async function loadWorkspaces() {
    const data = await api<{workspaces:WorkspaceEntry[]}>('/api/workspace/list');
    setWorkspaces(data.workspaces);
    setWorkspaceId(previous => data.workspaces.some(w=>w.workspace.id===previous) ? previous : data.workspaces[0]?.workspace.id || '');
  }
  useEffect(() => {
    let active = true;
    api<{databaseConfigured:boolean}>('/api/stocklots-status').then(status => {
      if (active) setDatabaseReady(status.databaseConfigured);
    }).catch(e => {if (active) setError((e as Error).message);});
    return () => {active = false;};
  },[]);
  useEffect(()=>{let active=true;api<{user:{id:string;email:string}|null}>('/api/auth/session')
    .then(data=>{if(!active)return;setUser(data.user);if(data.user)loadWorkspaces().catch(e=>setError(e.message));})
    .catch(e=>{if(active)setError(e.message);})
    .finally(()=>{if(active)setSessionLoading(false);});
    return ()=>{active=false;};},[]);
  async function reload(wid=workspaceId) {
    if(!wid)return;
    setLoading(true);setError('');
    try{
      const paths=['suppliers','lots','demands','matches'] as const;
      const results=await Promise.all(paths.map(type=>api<{items:unknown[]}>(`/api/stocklots?workspaceId=${encodeURIComponent(wid)}&type=${type}`)));
      if(wid!==workspaceId && workspaceId) return;
      setSuppliers(results[0].items as Supplier[]);setLots(results[1].items as Lot[]);
      setDemands(results[2].items as Demand[]);setMatches(results[3].items as BuyerMatch[]);
    }catch(e){setError((e as Error).message);}finally{setLoading(false);}
  }
  useEffect(()=>{if(workspaceId)void reload(workspaceId);else {setSuppliers([]);setLots([]);setDemands([]);setMatches([]);}},[workspaceId]);
  async function login(e:FormEvent){
    e.preventDefault();setBusy(true);setError('');
    try{
      const data=await api<{user:{id:string;email:string}}>(`/api/auth/${authMode}`,{method:'POST',body:JSON.stringify(authMode==='login'?
        {email:credentials.email,password:credentials.password}:{...credentials})});
      setUser(data.user);await loadWorkspaces();setNotice('Welcome to the sourcing desk.');
    }catch(e){setError((e as Error).message);}finally{setBusy(false);}
  }
  async function createWorkspace(e:FormEvent){
    e.preventDefault();setBusy(true);setError('');
    try{const data=await api<{workspace:{id:string}}>('/api/workspace/create',{method:'POST',body:JSON.stringify({name:workspaceName,slug:workspaceSlug})});
      await loadWorkspaces();setWorkspaceId(data.workspace.id);setNotice('Workspace created.');
    }catch(e){setError((e as Error).message);}finally{setBusy(false);}
  }
  async function save(section:FormSection,values:Record<string,string>){
    if(!workspaceId)return;setBusy(true);setError('');
    try {
      const payload:Record<string,unknown>={...values,workspaceId};
      if(section==='lots') {
        payload.quantity=Number(values.quantity);payload.minimumOrder=Number(values.minimumOrder);
        payload.unitPriceCnyMinor=Math.round(Number(values.unitPriceCny)*100);
        payload.splitAllowed=values.splitAllowed==='true';
        payload.evidenceUrls=values.evidenceUrl?.trim()?[values.evidenceUrl.trim()]:[];
        delete payload.unitPriceCny;delete payload.evidenceUrl;
      }
      if(section==='demands'){payload.quantity=Number(values.quantity);payload.maxBudgetCnyMinor=Math.round(Number(values.maxBudgetCny)*100);delete payload.maxBudgetCny;}
      for(const k of ['notes','buyerName','buyerContact','contactName','contactDetails','licenseNumber']) if(payload[k]==='')delete payload[k];
      await api('/api/stocklots?action='+(section==='suppliers'?'supplier':section==='lots'?'lot':'demand'),{method:'POST',body:JSON.stringify(payload)});
      setForm(null);setNotice('Record saved. All new lots remain unverified until reviewed.');await reload();
    }catch(e){setError((e as Error).message);}finally{setBusy(false);}
  }
  async function review(lot:Lot,action:'verify'|'publish'|'withdraw') {
    const note=action==='verify'?window.prompt('Describe reviewed documents (15+ characters):'):undefined;
    if(action==='verify'&&note===null)return;
    setBusy(true);setError('');
    try{await api('/api/stocklots?action=review',{method:'POST',body:JSON.stringify({workspaceId,lotId:lot.id,action,evidenceNote:note||undefined})});
      setSelectedLot(null);setNotice('Inventory status updated.');await reload();
    }catch(e){setError((e as Error).message);}finally{setBusy(false);}
  }
  function exportCsv(section:FormSection){
    const records=section==='suppliers'?suppliers:section==='lots'?lots:demands;
    if(!records.length){setError('There are no records to export.');return;}
    const keys=Object.keys(records[0]);
    const csv=[keys.map(quoteCsv).join(','),...records.map(row=>keys.map(k=>quoteCsv((row as unknown as Record<string,unknown>)[k])).join(','))].join('\r\n');
    const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
    const anchor=document.createElement('a');anchor.href=url;anchor.download='zunitech-'+section+'.csv';anchor.click();URL.revokeObjectURL(url);
  }
  const filteredLots=useMemo(()=>{
    const needle=search.trim().toLowerCase();
    return lots.filter(l=>(!needle||[l.productName,l.category,l.warehouseLocation,suppliers.find(s=>s.id===l.supplierId)?.companyName||''].some(v=>v.toLowerCase().includes(needle)))&&
      (filter==='all'||l.status===filter)&&(category==='all'||l.category===category))
      .sort((a,b)=>sort==='price-low'?a.unitPriceCnyMinor-b.unitPriceCnyMinor:sort==='quantity'?b.quantity-a.quantity:
      new Date(b.createdAt).getTime()-new Date(a.createdAt).getTime());
  },[lots,suppliers,search,filter,category,sort]);
  const mainTitle:Record<View,string>={overview:'Sourcing overview',lots:'Stock lot inventory',suppliers:'Supplier directory',buyers:'Buyer requirements',matches:'Demand matching'};
  const mainSub:Record<View,string>={
    overview:'Your China surplus-stock pipeline, at a glance.',
    lots:'Manage documented factory surplus, overstock and clearance inventory.',
    suppliers:'Chinese factories and stock-lot trading partners in your pipeline.',
    buyers:'Track what wholesale buyers are looking for.',
    matches:'Deterministic recommendations against published inventory only.',
  };
  const action=(section:FormSection)=>{setError('');setForm(section);};

  if(sessionLoading)return <div className="lot-standalone"><div className="lot-loading">Preparing your sourcing desk…</div></div>;
  if(!user)return <div className="lot-standalone lot-access"><div className="lot-auth-shell">
    <div className="lot-brand-mark"><Boxes size={22}/></div>
    <div className="lot-kicker">ZUNITECH / CHINA SOURCING</div>
    <h1>Stock-Lot Intelligence</h1><p>Sign in to your private supplier and inventory workspace.</p>
    {databaseReady === false && <div className="lot-flash lot-flash-error" role="alert">
      This preview has no database connected. Signup and login are unavailable until an isolated preview database is configured.
    </div>}
    <form className="lot-auth-form" onSubmit={login}>
      {authMode==='signup'&&<label>Your name<input required value={credentials.displayName} onChange={e=>setCredentials(p=>({...p,displayName:e.target.value}))} /></label>}
      <label>Work email<input type="email" required autoComplete="email" value={credentials.email} onChange={e=>setCredentials(p=>({...p,email:e.target.value}))}/></label>
      <label>Password<input type="password" minLength={authMode==='signup'?8:1} required autoComplete={authMode==='login'?'current-password':'new-password'} value={credentials.password} onChange={e=>setCredentials(p=>({...p,password:e.target.value}))}/></label>
      {error&&<p className="lot-error" role="alert">{error}</p>}
      <button className="lot-btn-primary w-full justify-center" disabled={busy}>{busy?'Working…':authMode==='login'?'Sign in':'Create account'} <ArrowRight size={17}/></button>
    </form>
    <button className="lot-link" onClick={()=>{setAuthMode(p=>p==='login'?'signup':'login');setError('');}}>{authMode==='login'?'New here? Create an account':'Already have an account? Sign in'}</button>
    <p className="lot-auth-footer">Internal sourcing pilot · No supplier data is independently verified</p>
    <Link to="/" className="lot-link">Back to NicheScout</Link>
  </div></div>;
  if(!workspaces.length)return <div className="lot-standalone lot-access"><div className="lot-auth-shell">
    <div className="lot-brand-mark"><Warehouse size={22}/></div><h1>Create your workspace</h1>
    <p>Keep supplier contacts, stock lots and buyer demand together in one private workspace.</p>
    <form className="lot-auth-form" onSubmit={createWorkspace}>
      <label>Workspace name<input value={workspaceName} required onChange={e=>setWorkspaceName(e.target.value)}/></label>
      <label>Unique slug<input value={workspaceSlug} required pattern="[a-z0-9-]+" onChange={e=>setWorkspaceSlug(e.target.value)}/></label>
      {error&&<p className="lot-error">{error}</p>}
      <button className="lot-btn-primary w-full justify-center" disabled={busy}>Create workspace <ArrowRight size={17}/></button>
    </form></div></div>;

  return <div className="lot-app" data-testid="stock-lot-dashboard">
    {sidebarOpen&&<button className="lot-mobile-backdrop" aria-label="Close navigation" onClick={()=>setSidebarOpen(false)}/>}
    <aside className={'lot-sidebar '+(sidebarOpen?'lot-sidebar-open':'')}>
      <div className="lot-sidebar-brand"><div className="lot-brand-mark"><Boxes size={21}/></div><div><strong>Stocklot<span>AI</span></strong><small>BY ZUNITECH · INTERNAL PILOT</small></div></div>
      <div className="lot-sidebar-caption">WORKSPACE</div>
      <label className="lot-workspace-selector"><Building2 size={16}/><select aria-label="Current workspace" value={workspaceId} onChange={e=>setWorkspaceId(e.target.value)}>
        {workspaces.map(w=><option key={w.workspace.id} value={w.workspace.id}>{w.workspace.name}</option>)}</select><ChevronDown size={14}/></label>
      <div className="lot-sidebar-caption">OPERATIONS</div>
      <nav className="lot-sidebar-nav" aria-label="Stock-lot navigation">{navigation.map(item=><button key={item.id}
        className={view===item.id?'lot-nav-active':''} onClick={()=>{setView(item.id);setSidebarOpen(false);setSearch('');setFilter('all');setCategory('all');}}>
        <item.icon size={18}/><span>{item.label}</span>{item.id==='matches'&&matches.length>0&&<em>{matches.length}</em>}
      </button>)}</nav>
      <div className="lot-sidebar-bottom"><div className="lot-sidebar-note"><ShieldCheck size={18}/><strong>Private sourcing pilot</strong><p>Document checks do not confirm physical inspection or guaranteed stock.</p></div>
        <Link to="/" className="lot-exit-link"><ArrowDownRight size={17}/> Return to NicheScout</Link></div>
    </aside>
    <div className="lot-main">
      <header className="lot-topbar">
        <button className="lot-icon-button lot-menu-trigger" aria-label="Open menu" onClick={()=>setSidebarOpen(true)}><Menu size={20}/></button>
        <div className="lot-breadcrumb">Operations <span>/</span> <b>{mainTitle[view]}</b></div>
        <div className="lot-top-actions"><span className="lot-pilot-pill"><span/> China pilot</span>
          <span className="lot-avatar" title={user.email}>{(user.email?.[0]||'U').toUpperCase()}</span></div>
      </header>
      <main className="lot-content">
        <div className="lot-page-head"><div><div className="lot-kicker">SOURCING WORKSPACE · CHINA</div>
          <h1>{mainTitle[view]}</h1><p>{mainSub[view]}</p></div>
          <div className="lot-head-actions">
            <button className="lot-btn-light" disabled={loading} onClick={()=>reload()}><RefreshCw size={16} className={loading?'animate-spin':''}/> Refresh</button>
            <button className="lot-btn-primary" onClick={()=>action(sectionForView[view] || 'lots')}><Plus size={17}/>{view==='suppliers'?'Add supplier':view==='buyers'?'Add requirement':'Add stock lot'}</button>
          </div></div>
        {error&&<div className="lot-flash lot-flash-error" role="alert">{error}<button onClick={()=>setError('')} aria-label="Dismiss error"><X size={16}/></button></div>}
        {notice&&<div className="lot-flash lot-flash-success" role="status">{notice}<button onClick={()=>setNotice('')} aria-label="Dismiss message"><X size={16}/></button></div>}
        {view==='overview'&&<>
          <div className="lot-hero"><div><div className="lot-hero-eyebrow"><Activity size={14}/> STOCK-LOT OPERATIONS</div>
            <h2>Turn surplus inventory<br/>into real sourcing opportunities.</h2><p>Capture Chinese factory lots, organize suppliers and match real buyer demand—without guessing stock availability.</p>
            <div className="lot-hero-buttons"><button className="lot-btn-white" onClick={()=>action('lots')}><Plus size={16}/> Register a lot</button>
              <button className="lot-hero-link" onClick={()=>setView('lots')}>Explore inventory <ArrowRight size={16}/></button></div></div>
            <div className="lot-hero-symbol" aria-hidden="true"><Boxes size={160} strokeWidth={0.75}/></div></div>
          <div className="lot-stat-grid">
            {[{label:'Active suppliers',value:formatInteger(suppliers.length),icon:Building2,foot:'Registered trading partners',tone:'mint'},
              {label:'Inventory lots',value:formatInteger(lots.length),icon:Package,foot:published+' published · '+(lots.length-published)+' not published',tone:'blue'},
              {label:'Buyer requirements',value:formatInteger(demands.filter(d=>d.status==='open').length),icon:ClipboardList,foot:'Open sourcing requests',tone:'violet'},
              {label:'Potential matches',value:formatInteger(matches.length),icon:Sparkles,foot:'Rule-based, not negotiated',tone:'amber'}].map(item=>
              <article className="lot-stat" key={item.label}><div className="lot-stat-top"><span>{item.label}</span><div className={'lot-stat-icon tone-'+item.tone}><item.icon size={19}/></div></div>
                <strong>{item.value}</strong><small>{item.foot}</small></article>)}</div>
          <div className="lot-overview-grid">
            <section className="lot-panel"><div className="lot-panel-heading"><div><h2>Recently captured lots</h2><p>Latest records from your sourcing desk</p></div>
              <button className="lot-text-action" onClick={()=>setView('lots')}>View all <ArrowRight size={15}/></button></div>
              {lots.length?<div className="lot-recent-list">{lots.slice(0,5).map(l=><button className="lot-recent-row" key={l.id} onClick={()=>setSelectedLot(l)}>
                <LotArt lot={l}/><div><strong>{l.productName}</strong><small>{l.category} · {formatInteger(l.quantity)} units</small></div><Status value={l.status}/></button>)}</div>:
                <Empty title="Your catalogue starts here" description="Register your first verified-source supplier and capture a real stock lot."
                  action="Add a supplier" onClick={()=>action('suppliers')}/>}
            </section>
            <section className="lot-panel"><div className="lot-panel-heading"><div><h2>Pipeline snapshot</h2><p>Status of recorded inventory</p></div><TrendingUp size={19} color="#64748b"/></div>
              <div className="lot-pipeline"><div className="lot-pipeline-value">{formatCny(listedValue)}<span>Reported stock value</span></div>
                <div className="lot-progress" role="img" aria-label={published+' of '+lots.length+' lots published'}><div style={{width:(lots.length?published/lots.length*100:0)+'%'}}/></div>
                <div className="lot-progress-caption"><span>Published</span><strong>{published} / {lots.length}</strong></div>
                <div className="lot-pipeline-row"><ShieldCheck size={18}/><span>Unverified or under review</span><strong>{lots.filter(l=>l.status==='unverified'||l.status==='documents_checked').length}</strong></div>
                <div className="lot-pipeline-row"><BadgeCheck size={18}/><span>Document-reviewed and published</span><strong>{published}</strong></div>
                <div className="lot-pipeline-row"><X size={18}/><span>Withdrawn listings</span><strong>{lots.filter(l=>l.status==='withdrawn').length}</strong></div></div>
              <p className="lot-footnote">Value excludes freight, duty and taxes. Supplier-reported prices are not confirmed transaction values.</p>
            </section>
          </div>
          <div className="lot-quick-actions"><h2>Quick actions</h2><div>
            {[{name:'Register supplier',caption:'Factory or trading company',icon:Building2,section:'suppliers' as const},
              {name:'Create inventory lot',caption:'Quantity, MOQ and price',icon:Warehouse,section:'lots' as const},
              {name:'Capture buyer demand',caption:'Turn requirements into matches',icon:FileSearch,section:'demands' as const}].map(x=>
              <button key={x.section} onClick={()=>action(x.section)}><x.icon size={21}/><span><strong>{x.name}</strong><small>{x.caption}</small></span><ArrowUpRight size={17}/></button>)}</div></div>
        </>}
        {view==='lots'&&<>
          <section className="lot-filterbar">
            <div className="lot-search"><Search size={19}/><input type="search" aria-label="Search stock lots" placeholder="Search products, suppliers, locations..." value={search} onChange={e=>setSearch(e.target.value)}/></div>
            <label><SlidersHorizontal size={16}/><select aria-label="Filter lot status" value={filter} onChange={e=>setFilter(e.target.value)}>
              <option value="all">All statuses</option><option value="published">Published</option><option value="documents_checked">Documents checked</option><option value="unverified">Unverified</option><option value="withdrawn">Withdrawn</option>
            </select></label>
            <label><Filter size={16}/><select aria-label="Filter by category" value={category} onChange={e=>setCategory(e.target.value)}>
              <option value="all">All categories</option>{categories.map(x=><option key={x} value={x}>{x}</option>)}</select></label>
            <label><ChevronDown size={16}/><select aria-label="Sort stock lots" value={sort} onChange={e=>setSort(e.target.value)}>
              <option value="recent">Newest first</option><option value="price-low">Price: low to high</option><option value="quantity">Highest quantity</option></select></label>
          </section>
          <div className="lot-section-heading"><span>{filteredLots.length} stock lots</span><button className="lot-text-action" onClick={()=>exportCsv('lots')}><Download size={16}/> Export private CSV</button></div>
          {filteredLots.length?<div className="lot-card-grid">{filteredLots.map(l=><button type="button" className="lot-product-card" key={l.id} onClick={()=>setSelectedLot(l)}>
            <LotArt lot={l}/><div className="lot-card-body"><div className="flex justify-between items-center gap-2"><span className="lot-card-category">{l.category}</span><Status value={l.status}/></div>
              <h3>{l.productName}</h3><div className="lot-card-location"><MapPin size={14}/>{l.warehouseLocation}</div>
              <div className="lot-card-metrics"><div><small>AVAILABLE</small><strong>{formatInteger(l.quantity)} <em>units</em></strong></div><div><small>MOQ</small><strong>{formatInteger(l.minimumOrder)}</strong></div></div>
              <div className="lot-card-footer"><div><small>ASKING / UNIT</small><strong>{formatCny(l.unitPriceCnyMinor)}</strong></div><span>View details <ArrowUpRight size={15}/></span></div></div></button>)}</div>:
            <Empty title={lots.length?'No lots match these filters':'No stock lots captured yet'} description={lots.length?'Try another search, category or status.':'Create your first real stock lot from a registered Chinese supplier.'}
              action={!lots.length?'Add stock lot':undefined} onClick={()=>action('lots')}/>}
        </>}
        {view==='suppliers'&&<section className="lot-panel">
          <div className="lot-panel-heading"><div><h2>Trading partner directory</h2><p>Only authorized workspace members can view these details</p></div><button className="lot-text-action" onClick={()=>exportCsv('suppliers')}><Download size={16}/> Export CSV</button></div>
          {suppliers.length?<div className="lot-directory">{suppliers.map(s=><article className="lot-directory-row" key={s.id}>
            <div className="lot-directory-avatar"><Building2 size={22}/></div><div className="lot-directory-info"><h3>{s.companyName}</h3><span><MapPin size={13}/> {s.city}, {s.province}</span><small>{s.contactName || 'Contact not supplied'}{s.contactDetails?' · '+s.contactDetails:''}</small></div>
            <div className="lot-directory-end"><Status value={s.status}/><span>{lots.filter(l=>l.supplierId===s.id).length} lots</span></div></article>)}</div>:
            <Empty title="No suppliers recorded" description="Register your first Chinese factory or clearance wholesaler." action="Register supplier" onClick={()=>action('suppliers')}/>}
        </section>}
        {view==='buyers'&&<section className="lot-panel"><div className="lot-panel-heading"><div><h2>Buyer requirement pipeline</h2><p>Track incoming sourcing requests and bulk buying budgets</p></div>
          <button className="lot-text-action" onClick={()=>exportCsv('demands')}><Download size={16}/> Export CSV</button></div>
          {demands.length?<div className="lot-directory">{demands.map(d=><article className="lot-directory-row" key={d.id}><div className="lot-directory-avatar lot-purple"><ClipboardList size={22}/></div>
            <div className="lot-directory-info"><h3>{d.productName}</h3><span>{d.category} · {formatInteger(d.quantity)} requested units</span><small><MapPin size={12}/> {d.destination}{d.buyerName?' · '+d.buyerName:''}</small></div>
            <div className="lot-directory-end"><Status value={d.status}/><strong>{formatCny(d.maxBudgetCnyMinor)}</strong><small>Total goods budget</small></div></article>)}</div>:
            <Empty title="No buyer requirements yet" description="Record a wholesale buyer's product, quantity and total budget." action="Add buyer demand" onClick={()=>action('demands')}/>}
        </section>}
        {view==='matches'&&<section className="lot-panel"><div className="lot-panel-heading"><div><h2>Eligible lot matches</h2><p>Preliminary, rule-based matches against published lots in this workspace</p></div>
          <button className="lot-text-action" onClick={()=>reload()}><RefreshCw size={16}/> Refresh</button></div>
          {matches.length?<div className="lot-directory">{matches.map((m,i)=>{const d=demands.find(x=>x.id===m.demandId),l=lots.find(x=>x.id===m.lotId);
            return <article className="lot-match-row" key={m.demandId+'-'+m.lotId+'-'+i}>
              <div className="lot-match-score"><strong>{m.score}</strong><span>MATCH</span></div>
              <div className="flex-1"><h3>{d?.productName || 'Buyer requirement'} <ArrowRight size={15} className="inline"/> {l?.productName || 'Matched lot'}</h3>
                <p>{formatInteger(m.units)} units · {m.fullLot?'Complete lot required':'Split permitted, reconfirm with supplier'}</p>
                <small>{m.notes.join(' · ')}</small></div>
              <div className="lot-match-price"><strong>{formatCny(m.totalPriceCnyMinor)}</strong><small>Goods only, excluding costs</small></div></article>;})}</div>:
            <Empty title="No eligible matches right now" description="Buyer requests appear here when a documented lot is published and meets the product, MOQ and budget rules." action="View stock lots" onClick={()=>setView('lots')}/>}
          <p className="lot-footnote">These are potential matches, not confirmed quotations or AI-generated predictions. Reconfirm goods, availability, logistics and documentation before negotiating.</p>
        </section>}
        <footer className="lot-workspace-footer"><span>© ZuniTech · Stock-Lot Intelligence pilot</span><span>China sourcing only · Internal data · No guaranteed inventory</span></footer>
      </main>
    </div>
    {form&&<StockLotForm section={form} suppliers={suppliers} saving={busy} error={error} onClose={()=>{if(!busy){setForm(null);setError('');}}} onSave={save}/>}
    {selectedLot&&<div className="lot-overlay" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)setSelectedLot(null);}}>
      <section className="lot-drawer" role="dialog" aria-modal="true" aria-label="Lot details">
        <div className="lot-drawer-head"><div className="flex-1"><div className="lot-kicker">INVENTORY DETAIL</div><h2 className="text-xl font-bold">{selectedLot.productName}</h2></div><button className="lot-icon-button" aria-label="Close details" onClick={()=>setSelectedLot(null)}><X size={20}/></button></div>
        <div className="lot-form-body"><LotArt lot={selectedLot} size="large"/><div className="flex justify-between items-center"><Status value={selectedLot.status}/><span className="text-xs text-slate-500">Added {friendlyDate(selectedLot.createdAt)}</span></div>
          <div className="lot-detail-price">{formatCny(selectedLot.unitPriceCnyMinor)} <small>per unit · Supplier asking price</small></div>
          <div className="lot-detail-grid">{[['Category',selectedLot.category],['Units available',formatInteger(selectedLot.quantity)],['Minimum order',formatInteger(selectedLot.minimumOrder)],['Lot splitting',selectedLot.splitAllowed?'Supplier reports allowed':'Not permitted'],['Condition',selectedLot.condition.replace(/_/g,' ')],['Source',selectedLot.origin.replace(/_/g,' ')],['Warehouse',selectedLot.warehouseLocation],['Supplier',suppliers.find(s=>s.id===selectedLot.supplierId)?.companyName || 'Unknown']].map(([k,v])=><div key={k}><span>{k}</span><strong>{v}</strong></div>)}</div>
          {selectedLot.notes&&<div className="lot-info-note">{selectedLot.notes}</div>}
          <div className="lot-info-note">Supplier data must be independently reconfirmed. Document review does not certify ownership, physical inspection or inventory availability.</div>
          {canReview&&<div className="lot-form-actions flex-wrap">
            {selectedLot.status==='unverified'&&<button className="lot-btn-primary" disabled={busy} onClick={()=>review(selectedLot,'verify')}><ShieldCheck size={16}/> Record document check</button>}
            {selectedLot.status==='documents_checked'&&<button className="lot-btn-primary" disabled={busy} onClick={()=>review(selectedLot,'publish')}><CheckCircle2 size={16}/> Publish</button>}
            {selectedLot.status!=='withdrawn'&&<button className="lot-btn-light" disabled={busy} onClick={()=>review(selectedLot,'withdraw')}>Withdraw lot</button>}
          </div>}
        </div>
      </section></div>}
  </div>;
}
