import { useState } from 'react';
import { ToolLayout } from '../../components/layout/ToolLayout';
import { saveAnalysis } from '../../storage';
import type { RestrictionResult } from '../../types';

export function RestrictionCheckPage() {
  const [category, setCategory] = useState('');
  const [brand, setBrand] = useState('');
  const [condition, setCondition] = useState<'new' | 'used' | 'refurbished'>('new');
  const [requiresApproval, setRequiresApproval] = useState(false);
  const [hasInvoice, setHasInvoice] = useState(false);
  const [invoiceAgeDays, setInvoiceAgeDays] = useState('');
  const [result, setResult] = useState<RestrictionResult | null>(null);
  const [saved, setSaved] = useState(false);

  const restrictedCategories = ['Grocery', 'Jewelry', 'Watches', 'Clothing', 'Beauty', 'Health', 'Baby', 'Toys', 'Automotive'];

  const calculate = () => {
    const notes: string[] = [];
    let isRestricted = false;
    let restrictionType: RestrictionResult['restrictionType'] = 'none';
    let approvalProbability: RestrictionResult['approvalProbability'] = 'high';
    let requiresApprovalResult = false;

    // Category check
    const matchedCategory = restrictedCategories.find(c => category.toLowerCase().includes(c.toLowerCase()));
    if (matchedCategory) {
      isRestricted = true;
      restrictionType = 'category';
      notes.push(`"${matchedCategory}" is a gated category on Amazon. Approval is typically required.`);
      requiresApprovalResult = true;
    }

    // Brand check
    if (brand.trim()) {
      isRestricted = true;
      restrictionType = 'brand';
      notes.push(`Selling "${brand}" products may require brand authorization or approval.`);
      requiresApprovalResult = true;
    }

    // Condition check
    if (condition === 'refurbished') {
      notes.push('Refurbished items may require additional documentation and Amazon approval.');
      requiresApprovalResult = true;
    }

    // Approval probability
    if (!hasInvoice) {
      approvalProbability = 'low';
      notes.push('No supplier invoice — approval is unlikely without proper documentation.');
    } else {
      const age = parseInt(invoiceAgeDays) || 0;
      if (age > 365) {
        approvalProbability = 'low';
        notes.push('Invoice is over 1 year old — Amazon typically requires invoices within 180 days.');
      } else if (age > 180) {
        approvalProbability = 'medium';
        notes.push('Invoice is older than 180 days — may not be accepted.');
      } else {
        approvalProbability = 'high';
        notes.push('Recent invoice available — good for approval application.');
      }
    }

    if (!isRestricted) {
      notes.push('No obvious restrictions detected for this product. Standard listing rules apply.');
    }

    setResult({
      isRestricted,
      restrictionType,
      requiresApproval: requiresApprovalResult,
      approvalProbability,
      notes,
      sellerCentralVerificationRequired: requiresApprovalResult,
    });
    setSaved(false);
  };

  const handleSave = () => {
    if (!result) return;
    saveAnalysis('restriction', `${brand || category || 'Product'} Check`, { category, brand, condition, requiresApproval, hasInvoice, invoiceAgeDays }, result);
    setSaved(true);
  };

  return (
    <ToolLayout title="Restriction Check" description="Check marketplace restrictions and approval requirements.">
      <div className="p-6">
        {/* Prominent Disclaimer */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
          <div className="flex gap-3">
            <svg className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
            <div className="text-xs text-amber-800 leading-relaxed">
              <p className="font-semibold mb-1">Research signal only — not account-level approval.</p>
              <p>This tool provides a preliminary assessment based on known category and brand restrictions. Final eligibility and restriction status must be verified directly in your Amazon Seller Central account. NicheScout does not guarantee ungating or approval.</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <input type="text" value={category} onChange={e => setCategory(e.target.value)} placeholder="e.g. Beauty, Grocery, Jewelry" className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Brand (if any)</label>
            <input type="text" value={brand} onChange={e => setBrand(e.target.value)} placeholder="e.g. Nike, Sony" className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Condition</label>
            <div className="grid grid-cols-3 gap-2">
              {(['new', 'used', 'refurbished'] as const).map(c => (
                <button key={c} onClick={() => setCondition(c)} className={`px-3 py-2 rounded-lg text-sm font-medium border-2 transition-all ${condition === c ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-gray-200 text-gray-600'}`}>
                  {c.charAt(0).toUpperCase() + c.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={requiresApproval} onChange={e => setRequiresApproval(e.target.checked)} className="rounded" /> Category/brand requires approval
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={hasInvoice} onChange={e => setHasInvoice(e.target.checked)} className="rounded" /> Have supplier invoice
            </label>
          </div>
          {hasInvoice && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Age (days)</label>
              <input type="number" value={invoiceAgeDays} onChange={e => setInvoiceAgeDays(e.target.value)} placeholder="30" className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm" />
            </div>
          )}
          <button onClick={calculate} className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 rounded-xl transition-colors">
            Check Restrictions
          </button>
        </div>

        <div>
          {result ? (
            <div className="space-y-4">
              <div className={`p-4 rounded-xl border ${result.isRestricted ? 'bg-yellow-50 border-yellow-200 text-yellow-700' : 'bg-green-50 border-green-200 text-green-700'}`}>
                <p className="text-sm opacity-70">Research Signal</p>
                <p className="text-3xl font-bold">{result.isRestricted ? 'Restriction Indicators Found' : 'No Obvious Restrictions'}</p>
                {result.requiresApproval && (
                  <p className="text-sm mt-1">Approval likelihood estimate: <span className="font-bold uppercase">{result.approvalProbability}</span></p>
                )}
                <p className="text-xs mt-2 opacity-70">This is a research signal — final eligibility must be verified in Seller Central.</p>
              </div>

              <div className="bg-gray-50 rounded-xl p-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Details</h3>
                <ul className="space-y-1.5">
                  {result.notes.map((n, i) => (
                    <li key={i} className="text-xs text-gray-600 flex gap-2">
                      <span className="text-orange-500 shrink-0">●</span> {n}
                    </li>
                  ))}
                </ul>
              </div>

              {result.sellerCentralVerificationRequired && (
                <div className="bg-blue-50 rounded-xl p-4 text-xs text-blue-700">
                  <p className="font-medium mb-1">Seller Central Verification Required</p>
                  <p>You'll need to apply for approval in Seller Central. Prepare: supplier invoice, purchase order, and authorization letter (if brand-gated).</p>
                </div>
              )}

              <button onClick={handleSave} disabled={saved} className={`w-full py-2.5 rounded-xl font-medium text-sm transition-colors ${saved ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                {saved ? '✓ Saved to My Research' : 'Save to My Research'}
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
              Enter category and brand details, then click "Check Restrictions".
            </div>
          )}
        </div>
      </div>
      </div>

      {/* Educational Content */}
      <div className="border-t border-gray-100 p-6 space-y-6">
        <div>
          <h3 className="text-lg font-bold text-gray-900 mb-3">How Amazon Marketplace Restrictions Work</h3>
          <p className="text-sm text-gray-600 leading-relaxed mb-3">
            Amazon restricts certain product categories and brands to maintain quality and compliance. Selling in restricted categories or brands without approval can result in listing suppression, account warnings, or suspension.
          </p>
          <p className="text-sm text-gray-600 leading-relaxed">
            This tool provides a preliminary assessment based on common restriction patterns. It is not a live connection to Amazon's restriction database — it uses curated knowledge of known gated categories and typical approval requirements.
          </p>
        </div>

        <div>
          <h4 className="text-sm font-bold text-gray-900 mb-2">Commonly restricted categories</h4>
          <div className="flex flex-wrap gap-1.5">
            {['Grocery', 'Jewelry', 'Watches', 'Clothing', 'Beauty', 'Health', 'Baby', 'Toys', 'Automotive'].map(c => (
              <span key={c} className="px-2.5 py-1 bg-gray-100 text-gray-600 rounded text-xs">{c}</span>
            ))}
          </div>
        </div>

        <div>
          <h4 className="text-sm font-bold text-gray-900 mb-2">Typical approval requirements</h4>
          <ul className="text-sm text-gray-600 space-y-1.5">
            <li className="flex gap-2"><span className="text-orange-500 shrink-0">→</span> <strong>Supplier invoice</strong> — typically within 180 days, showing quantity and date</li>
            <li className="flex gap-2"><span className="text-orange-500 shrink-0">→</span> <strong>Authorization letter</strong> — required for brand-gated products</li>
            <li className="flex gap-2"><span className="text-orange-500 shrink-0">→</span> <strong>Purchase order</strong> — proof of legitimate sourcing</li>
            <li className="flex gap-2"><span className="text-orange-500 shrink-0">→</span> <strong>Product photos</strong> — actual product images matching your listing</li>
          </ul>
        </div>

        <div className="bg-blue-50 rounded-xl p-4">
          <h4 className="text-sm font-bold text-blue-700 mb-1">Always verify in Seller Central</h4>
          <p className="text-xs text-blue-600">This tool provides guidance only. Your actual eligibility depends on your account history, documentation quality, and Amazon's current policies. Always check your Amazon Seller Central dashboard for the definitive restriction status of any product.</p>
        </div>

        <div>
          <h4 className="text-sm font-bold text-gray-900 mb-2">Related NicheScout tools</h4>
          <div className="flex flex-wrap gap-2">
            <a href="/tools/amazon-ip-check" className="inline-flex items-center gap-1 px-3 py-1.5 bg-orange-50 text-orange-600 rounded-lg text-xs font-medium hover:bg-orange-100 transition-colors">IP Risk Check</a>
            <a href="/tools/sourcing-risk-check" className="inline-flex items-center gap-1 px-3 py-1.5 bg-orange-50 text-orange-600 rounded-lg text-xs font-medium hover:bg-orange-100 transition-colors">Sourcing Risk Check</a>
            <a href="/tools/product-research-checklist" className="inline-flex items-center gap-1 px-3 py-1.5 bg-orange-50 text-orange-600 rounded-lg text-xs font-medium hover:bg-orange-100 transition-colors">Research Checklist</a>
          </div>
        </div>
      </div>
    </ToolLayout>
  );
}
