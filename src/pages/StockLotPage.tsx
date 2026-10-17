import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

type Item = Record<string, any>;
type Section = 'suppliers' | 'lots' | 'demands';
const fields: Record<Section, { key: string; label: string; type?: string }[]> = {
  suppliers: [
    { key: 'companyName', label: 'Registered company name' }, { key: 'city', label: 'City' },
    { key: 'province', label: 'Province' }, { key: 'contactName', label: 'Contact person' },
    { key: 'contactDetails', label: 'Contact details' }, { key: 'licenseNumber', label: 'Business license number' },
    { key: 'notes', label: 'Notes' },
  ],
  lots: [
    { key: 'supplierId', label: 'Supplier ID' }, { key: 'productName', label: 'Product / lot name' },
    { key: 'category', label: 'Category' }, { key: 'origin', label: 'Surplus source' },
    { key: 'condition', label: 'Condition' }, { key: 'quantity', label: 'Available units', type: 'number' },
    { key: 'minimumOrder', label: 'Minimum order units', type: 'number' },
    { key: 'unitPriceCny', label: 'Unit price (CNY)', type: 'number' },
    { key: 'warehouseLocation', label: 'Warehouse address' },
    { key: 'evidenceUrl', label: 'HTTPS evidence photo link (optional)' }, { key: 'notes', label: 'Notes' },
  ],
  demands: [
    { key: 'productName', label: 'Requested product' }, { key: 'category', label: 'Category' },
    { key: 'quantity', label: 'Units required', type: 'number' },
    { key: 'maxBudgetCny', label: 'Total budget (CNY)', type: 'number' },
    { key: 'destination', label: 'Destination city/country' }, { key: 'notes', label: 'Buyer notes' },
  ],
};
const inputStyle = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500';
const labelStyle = 'block text-xs font-semibold text-slate-600 mb-1';
const origins = [
  ['factory_overstock', 'Factory overstock'], ['cancelled_order', 'Cancelled order'],
  ['export_leftover', 'Export leftover'], ['discontinued', 'Discontinued stock'],
  ['wholesale_clearance', 'Wholesale clearance'],
];
const conditions = [
  ['new_sealed', 'New sealed'], ['new_open_box', 'New open box'],
  ['mixed_new', 'Mixed new'], ['unknown', 'Not confirmed'],
];
async function request(url: string, init?: RequestInit) {
  const response = await fetch(url, { credentials: 'include', ...init, headers: { 'Content-Type': 'application/json', ...init?.headers } });
  const data = await response.json();
  if (!response.ok) {
    const detail = data.details?.fieldErrors ? Object.entries(data.details.fieldErrors).map(([key, value]) => key + ': ' + String(value)).join('; ') : '';
    throw new Error([data.error || 'Request failed', detail].filter(Boolean).join(' — '));
  }
  return data;
}

export function StockLotPage() {
  const [user, setUser] = useState<Item | null>(null);
  const [workspaceId, setWorkspaceId] = useState('');
  const [workspaces, setWorkspaces] = useState<Item[]>([]);
  const [section, setSection] = useState<Section>('suppliers');
  const [records, setRecords] = useState<Record<Section, Item[]>>({ suppliers: [], lots: [], demands: [] });
  const [form, setForm] = useState<Record<string, string>>({});
  const [login, setLogin] = useState({ email: '', password: '', name: '', mode: 'login' });
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [newWorkspace, setNewWorkspace] = useState('ZuniTech China Stock Lots');
  const [newSlug, setNewSlug] = useState('china-stock-lots');

  async function reloadWorkspaces() {
    const data = await request('/api/workspace/list');
    setWorkspaces(data.workspaces || []);
    setWorkspaceId(old => (data.workspaces || []).some((w: Item) => w.workspace.id === old) ? old : (data.workspaces?.[0]?.workspace.id || ''));
  }
  useEffect(() => {
    request('/api/auth/session').then(data => {
      setUser(data.user);
      if (data.user) return reloadWorkspaces();
    }).catch(err => setMessage(err.message));
  }, []);
  useEffect(() => {
    if (!workspaceId) { setRecords({ suppliers: [], lots: [], demands: [] }); return; }
    Promise.all((['suppliers', 'lots', 'demands'] as Section[]).map(async type => {
      const data = await request('/api/stocklots?workspaceId=' + encodeURIComponent(workspaceId) + '&type=' + type);
      return [type, data.items] as const;
    })).then(data => setRecords(Object.fromEntries(data) as Record<Section, Item[]>))
      .catch(err => setMessage(err.message));
  }, [workspaceId]);

  async function authenticate(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setMessage('');
    try {
      const payload = login.mode === 'signup' ? { email: login.email, password: login.password, displayName: login.name || undefined } : { email: login.email, password: login.password };
      const data = await request('/api/auth/' + login.mode, { method: 'POST', body: JSON.stringify(payload) });
      setUser(data.user); await reloadWorkspaces(); setMessage('Signed in successfully.');
    } catch (err) { setMessage((err as Error).message); }
    finally { setBusy(false); }
  }
  async function createWorkspace(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setMessage('');
    try {
      const data = await request('/api/workspace/create', { method: 'POST', body: JSON.stringify({ name: newWorkspace, slug: newSlug }) });
      await reloadWorkspaces(); setWorkspaceId(data.workspace.id); setMessage('Workspace created.');
    } catch (err) { setMessage((err as Error).message); }
    finally { setBusy(false); }
  }
  async function save(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setMessage('');
    try {
      const payload: Record<string, unknown> = { ...form, workspaceId };
      if (section === 'lots') {
        for (const field of ['quantity', 'minimumOrder']) payload[field] = Number(form[field]);
        payload.unitPriceCnyMinor = Math.round(Number(form.unitPriceCny) * 100);
        payload.evidenceUrls = form.evidenceUrl?.trim() ? [form.evidenceUrl.trim()] : [];
        delete payload.unitPriceCny; delete payload.evidenceUrl;
      }
      if (section === 'demands') {
        payload.quantity = Number(form.quantity);
        payload.maxBudgetCnyMinor = Math.round(Number(form.maxBudgetCny) * 100);
        delete payload.maxBudgetCny;
      }
      for (const key of ['contactName', 'contactDetails', 'licenseNumber', 'notes']) {
        if (payload[key] === '') delete payload[key];
      }
      const action = section === 'suppliers' ? 'supplier' : section === 'lots' ? 'lot' : 'demand';
      const data = await request('/api/stocklots?action=' + action, { method: 'POST', body: JSON.stringify(payload) });
      setRecords(prev => ({ ...prev, [section]: [data.item, ...prev[section]] })); setForm({});
      setMessage('Saved securely. Lots remain unverified until reviewed.');
    } catch (err) { setMessage((err as Error).message); }
    finally { setBusy(false); }
  }
  async function review(lot: Item, action: 'verify' | 'publish' | 'withdraw') {
    const evidenceNote = action === 'verify' ? window.prompt('Describe the documents checked (min 15 characters):') : '';
    if (action === 'verify' && evidenceNote === null) return;
    setBusy(true); setMessage('');
    try {
      const data = await request('/api/stocklots?action=review', { method: 'POST', body: JSON.stringify({ workspaceId, lotId: lot.id, action, evidenceNote: evidenceNote || undefined }) });
      setRecords(prev => ({ ...prev, lots: prev.lots.map(l => l.id === lot.id ? data.item : l) }));
      setMessage('Lot status updated.');
    } catch (err) { setMessage((err as Error).message); }
    finally { setBusy(false); }
  }

  return <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><div className="text-xs uppercase tracking-widest text-blue-600 font-bold">ZuniTech · China pilot</div>
        <h1 className="text-3xl font-bold text-slate-900">Stock-Lot Field Desk</h1>
        <p className="text-slate-600 mt-1">Capture Chinese suppliers, surplus lots and buyer demand for the November sourcing mission.</p>
      </div>
      <Link to="/" className="text-sm text-blue-700 underline">Existing NicheScout home</Link>
    </div>
    <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-amber-900 text-sm">
      Internal pilot. Supplier-reported data is not independently verified. Published means documents were reviewed, not that physical inspection or stock availability is guaranteed.
    </div>
    {message && <div role="status" className="rounded-lg bg-slate-100 p-3 text-sm text-slate-800">{message}</div>}
    {!user ? <form onSubmit={authenticate} className="max-w-lg rounded-xl border p-5 space-y-3">
      <h2 className="font-bold text-lg">{login.mode === 'login' ? 'Sign in' : 'Create account'}</h2>
      <label className={labelStyle}>Email</label><input className={inputStyle} type="email" required value={login.email} onChange={e => setLogin(p => ({ ...p, email: e.target.value }))}/>
      <label className={labelStyle}>Password</label><input className={inputStyle} type="password" minLength={login.mode === 'signup' ? 8 : 1} required value={login.password} onChange={e => setLogin(p => ({ ...p, password: e.target.value }))}/>
      {login.mode === 'signup' && <><label className={labelStyle}>Display name</label><input className={inputStyle} value={login.name} onChange={e => setLogin(p => ({ ...p, name: e.target.value }))}/></>}
      <button disabled={busy} className="rounded-lg bg-blue-700 text-white px-4 py-2 disabled:opacity-50">{login.mode === 'login' ? 'Sign in' : 'Sign up'}</button>
      <button type="button" className="ml-3 text-sm underline" onClick={() => setLogin(p => ({ ...p, mode: p.mode === 'login' ? 'signup' : 'login' }))}>Switch to {login.mode === 'login' ? 'signup' : 'login'}</button>
    </form> : !workspaces.length ? <form onSubmit={createWorkspace} className="max-w-lg border rounded-xl p-5 space-y-3">
      <h2 className="font-bold">Create first sourcing workspace</h2>
      <label className={labelStyle}>Workspace name</label><input className={inputStyle} required value={newWorkspace} onChange={e => setNewWorkspace(e.target.value)}/>
      <label className={labelStyle}>Unique slug</label><input className={inputStyle} required value={newSlug} onChange={e => setNewSlug(e.target.value)}/>
      <button disabled={busy} className="bg-blue-700 text-white px-4 py-2 rounded-lg">Create workspace</button>
    </form> : <>
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm font-semibold">Workspace</label>
        <select className={inputStyle + ' max-w-xs'} value={workspaceId} onChange={e => setWorkspaceId(e.target.value)}>
          {workspaces.map(w => <option key={w.workspace.id} value={w.workspace.id}>{w.workspace.name} ({w.role})</option>)}
        </select>
      </div>
      <div className="grid grid-cols-3 gap-3">{(['suppliers', 'lots', 'demands'] as Section[]).map(type =>
        <button key={type} onClick={() => { setSection(type); setForm({}); }} className={'rounded-xl p-4 border text-left ' + (section === type ? 'border-blue-600 bg-blue-50' : 'border-slate-200')}>
          <div className="font-bold capitalize">{type}</div><div className="text-2xl font-bold">{records[type].length}</div>
        </button>)}</div>
      <div className="grid lg:grid-cols-2 gap-6">
        <form onSubmit={save} className="border rounded-xl p-5 space-y-3">
          <h2 className="font-bold text-xl">Add {section === 'demands' ? 'buyer requirement' : section === 'lots' ? 'inventory lot' : 'supplier'}</h2>
          {fields[section].map(field => <div key={field.key}>
            <label className={labelStyle}>{field.label}</label>
            {field.key === 'supplierId' ? <select required className={inputStyle} value={form.supplierId || ''} onChange={e => setForm(p => ({ ...p, supplierId: e.target.value }))}>
              <option value="">Select registered supplier</option>{records.suppliers.map(s => <option key={s.id} value={s.id}>{s.companyName} — {s.city}</option>)}
            </select> : field.key === 'origin' || field.key === 'condition' ? <select required className={inputStyle} value={form[field.key] || ''} onChange={e => setForm(p => ({ ...p, [field.key]: e.target.value }))}>
              <option value="">Choose</option>{(field.key === 'origin' ? origins : conditions).map(([value, name]) => <option key={value} value={value}>{name}</option>)}
            </select> : <input className={inputStyle} type={field.type || 'text'} min={field.type === 'number' ? '0' : undefined} step={field.type === 'number' ? field.key.includes('Price') || field.key.includes('Budget') ? '0.01' : '1' : undefined}
                required={!['contactName','contactDetails','licenseNumber','notes','evidenceUrl'].includes(field.key)}
                value={form[field.key] || ''} onChange={e => setForm(p => ({ ...p, [field.key]: e.target.value }))}/>}
          </div>)}
          <button disabled={busy || (section === 'lots' && !records.suppliers.length)} className="bg-blue-700 disabled:opacity-50 text-white rounded-lg px-4 py-2">Save {section.slice(0, -1)}</button>
        </form>
        <section className="border rounded-xl p-5 space-y-3">
          <h2 className="font-bold text-xl capitalize">Recorded {section}</h2>
          {!records[section].length && <p className="text-sm text-slate-500">No records yet. Add your first {section === 'demands' ? 'buyer requirement' : section.slice(0,-1)}.</p>}
          {records[section].map(item => <div key={item.id} className="border-b pb-4 space-y-1">
            <div className="font-semibold">{item.companyName || item.productName}</div>
            <div className="text-sm text-slate-600">{item.city ? item.city + ', ' + item.province : item.category + (item.quantity ? ' · ' + item.quantity + ' units' : '')}</div>
            <div className="text-xs font-medium text-slate-500">Status: {item.status || 'open'}</div>
            {section === 'lots' && <>
              <div className="text-sm">CNY {(item.unitPriceCnyMinor / 100).toFixed(2)} per unit · MOQ {item.minimumOrder}</div>
              <div className="flex flex-wrap gap-2 pt-1">
                {item.status === 'unverified' && <button disabled={busy} onClick={() => review(item,'verify')} type="button" className="border rounded px-2 py-1 text-xs">Mark documents checked (admin)</button>}
                {item.status === 'documents_checked' && <button disabled={busy} onClick={() => review(item,'publish')} type="button" className="border rounded px-2 py-1 text-xs">Publish (admin)</button>}
                {item.status !== 'withdrawn' && <button disabled={busy} onClick={() => review(item,'withdraw')} type="button" className="border rounded px-2 py-1 text-xs">Withdraw (admin)</button>}
              </div>
            </>}
          </div>)}
        </section>
      </div>
    </>}
  </div>;
}
