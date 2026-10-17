import { useState, type FormEvent } from 'react';
import { ArrowLeft, Check, FileImage, PackagePlus, X } from 'lucide-react';
import type { Supplier, FormSection } from './stockLotTypes';

type FormValues = Record<string, string>;
type Props = {
  section: FormSection;
  suppliers: Supplier[];
  saving: boolean;
  error: string;
  onClose: () => void;
  onSave: (section: FormSection, values: FormValues) => Promise<void>;
};

const label = 'block text-xs font-semibold tracking-wide text-slate-600 mb-1.5';
const input = 'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10';
const originOptions = [
  ['factory_overstock', 'Factory surplus / overstock'],
  ['cancelled_order', 'Cancelled export order'],
  ['export_leftover', 'Export production leftover'],
  ['discontinued', 'Discontinued product'],
  ['wholesale_clearance', 'Wholesale clearance'],
];
const conditionOptions = [
  ['new_sealed', 'New, sealed'],
  ['new_open_box', 'New, open box'],
  ['mixed_new', 'Mixed new stock'],
  ['unknown', 'Not confirmed'],
];

export function StockLotForm({ section, suppliers, saving, error, onClose, onSave }: Props) {
  const [values, setValues] = useState<FormValues>({});
  const set = (key: string, value: string) => setValues(old => ({ ...old, [key]: value }));
  const field = (key: string, title: string, options?: { required?: boolean; type?: string; placeholder?: string; min?: string; step?: string }) =>
    <label className="block" key={key}>
      <span className={label}>{title}</span>
      <input className={input} name={key} value={values[key] || ''} onChange={e => set(key, e.target.value)}
        required={options?.required ?? true} type={options?.type || 'text'} min={options?.min} step={options?.step}
        placeholder={options?.placeholder}/>
    </label>;
  const select = (key: string, title: string, items: string[][]) =>
    <label className="block" key={key}>
      <span className={label}>{title}</span>
      <select className={input} name={key} required value={values[key] || ''} onChange={e => set(key, e.target.value)}>
        <option value="">Select an option</option>
        {items.map(([value, text]) => <option key={value} value={value}>{text}</option>)}
      </select>
    </label>;
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    await onSave(section, values);
  }
  const title = section === 'lots' ? 'Create stock lot' : section === 'suppliers' ? 'Register supplier' : 'Add buyer demand';
  return <div className="lot-overlay" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
    <section className="lot-drawer" role="dialog" aria-modal="true" aria-labelledby="lot-form-title">
      <div className="lot-drawer-head">
        <button className="lot-icon-button" type="button" onClick={onClose} aria-label="Close form"><ArrowLeft size={19}/></button>
        <div className="flex-1">
          <div className="lot-kicker">CHINA SOURCING DESK</div>
          <h2 className="text-xl font-bold text-slate-900" id="lot-form-title">{title}</h2>
        </div>
        <button className="lot-icon-button" type="button" onClick={onClose} aria-label="Close"><X size={19}/></button>
      </div>
      <form onSubmit={submit} className="lot-form-body" data-testid="lot-create-form">
        {section === 'suppliers' && <>
          <div className="lot-form-group-heading">Supplier information</div>
          {field('companyName', 'Company / trading name', { placeholder: 'e.g. Yiwu Industrial Co.' })}
          <div className="grid grid-cols-2 gap-3">
            {field('city', 'City', { placeholder: 'Yiwu' })}
            {field('province', 'Province', { placeholder: 'Zhejiang' })}
          </div>
          {field('contactName', 'Contact person', { required: false })}
          {field('contactDetails', 'Contact details (private)', { required: false, placeholder: 'Phone or business contact' })}
          {field('licenseNumber', 'Business licence / registration', { required: false })}
          <p className="lot-info-note">All new suppliers are recorded as unverified. Supplier information remains private to the workspace.</p>
        </>}
        {section === 'lots' && <>
          <div className="lot-form-group-heading">Lot identity</div>
          {select('supplierId', 'Registered supplier', suppliers.map(s => [s.id, s.companyName + ' · ' + s.city]))}
          {!suppliers.length && <p className="text-xs text-amber-700">Register a supplier first.</p>}
          {field('productName', 'Product / lot title', { placeholder: 'Stainless steel cutlery sets' })}
          {field('category', 'Category', { placeholder: 'Kitchenware' })}
          <div className="grid grid-cols-2 gap-3">
            {select('origin', 'Stock origin', originOptions)}
            {select('condition', 'Condition', conditionOptions)}
          </div>
          <div className="lot-form-group-heading mt-3">Quantity and commercial terms</div>
          <div className="grid grid-cols-2 gap-3">
            {field('quantity', 'Available units', { type: 'number', min: '1', step: '1', placeholder: '2400' })}
            {field('minimumOrder', 'MOQ (units)', { type: 'number', min: '1', step: '1', placeholder: '500' })}
          </div>
          {field('unitPriceCny', 'Asking price per unit (CNY)', { type: 'number', min: '0', step: '0.01', placeholder: '2.50' })}
          <label className="lot-check-row"><input type="checkbox" checked={values.splitAllowed === 'true'}
            onChange={e => set('splitAllowed', String(e.target.checked))} />
            <span><strong>Supplier allows splitting this lot</strong><small>Leave off unless explicitly confirmed</small></span></label>
          {field('warehouseLocation', 'Warehouse / storage location', { placeholder: 'Yiwu, Zhejiang' })}
          <div className="lot-form-group-heading mt-3">Evidence</div>
          <div className="lot-upload-placeholder">
            <FileImage size={23} className="text-teal-600"/>
            <span><strong>Photo evidence link</strong><small>Secure HTTPS URL · Direct file upload is a later milestone</small></span>
          </div>
          {field('evidenceUrl', 'Evidence image URL (optional)', { required: false, type: 'url', placeholder: 'https://...' })}
          <p className="lot-info-note">Saved lots start as <b>Unverified</b>. Documents review and publication require admin approval; neither guarantees physical inspection.</p>
        </>}
        {section === 'demands' && <>
          <div className="lot-form-group-heading">Buyer sourcing requirement</div>
          {field('productName', 'Product requested', { placeholder: 'Stainless steel cutlery' })}
          {field('category', 'Category', { placeholder: 'Kitchenware' })}
          <div className="grid grid-cols-2 gap-3">
            {field('quantity', 'Units required', { type: 'number', min: '1', step: '1', placeholder: '1000' })}
            {field('maxBudgetCny', 'Total budget (CNY)', { type: 'number', min: '0.01', step: '0.01', placeholder: '5000.00' })}
          </div>
          {field('destination', 'Destination', { placeholder: 'Karachi, Pakistan' })}
          {field('buyerName', 'Buyer / company (optional)', { required: false })}
          {field('buyerContact', 'Buyer contact (private)', { required: false })}
          <p className="lot-info-note">Matching compares product, category, quantity and goods price. Shipping, customs and inspections are excluded.</p>
        </>}
        <label className="block">
          <span className={label}>Internal notes (optional)</span>
          <textarea className={input} rows={3} value={values.notes || ''} onChange={e => set('notes', e.target.value)}
            placeholder="Any questions, stock details or visit notes..." maxLength={3000} />
        </label>
        {error && <div role="alert" className="rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>}
        <div className="lot-form-actions">
          <button type="button" onClick={onClose} className="lot-btn-light">Cancel</button>
          <button type="submit" disabled={saving || (section === 'lots' && !suppliers.length)} className="lot-btn-primary">
            {saving ? 'Saving...' : <><Check size={16}/> Save {section === 'suppliers' ? 'supplier' : section === 'lots' ? 'lot' : 'requirement'}</>}
          </button>
        </div>
      </form>
    </section>
  </div>;
}
