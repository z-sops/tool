import { useState } from 'react';
import { ToolLayout } from '../../components/layout/ToolLayout';
import { saveAnalysis } from '../../storage';
import type { SourcingRiskResult } from '../../types';

export function SourcingRiskCheckPage() {
  const [supplierType, setSupplierType] = useState<'manufacturer' | 'wholesaler' | 'distributor' | 'retailer' | 'unknown'>('unknown');
  const [supplierLocation, setSupplierLocation] = useState('');
  const [hasContract, setHasContract] = useState(false);
  const [moq, setMoq] = useState('');
  const [leadTimeDays, setLeadTimeDays] = useState('');
  const [hasCerts, setHasCerts] = useState(false);
  const [paymentTerms, setPaymentTerms] = useState('');
  const [communicationQuality, setCommunicationQuality] = useState<'excellent' | 'good' | 'fair' | 'poor'>('good');
  const [result, setResult] = useState<SourcingRiskResult | null>(null);
  const [saved, setSaved] = useState(false);

  const calculate = () => {
    let score = 0;
    const redFlags: string[] = [];
    const recommendations: string[] = [];

    // Supplier type
    if (supplierType === 'retailer') { score += 20; redFlags.push('Sourcing from a retailer increases costs significantly.'); }
    else if (supplierType === 'unknown') { score += 15; redFlags.push('Unknown supplier type — verify their legitimacy.'); }
    else if (supplierType === 'manufacturer') { recommendations.push('Manufacturer sourcing is ideal for cost and quality control.'); }

    // Location
    if (!supplierLocation.trim()) { score += 5; recommendations.push('Specify supplier location for better risk assessment.'); }

    // Contract
    if (!hasContract) { score += 15; redFlags.push('No contract — you have no legal protection.'); recommendations.push('Always get a written agreement before placing orders.'); }

    // MOQ
    const moqVal = parseInt(moq) || 0;
    if (moqVal > 1000) { score += 10; redFlags.push(`High MOQ (${moqVal} units) — higher upfront risk.`); }
    else if (moqVal > 0 && moqVal <= 100) { recommendations.push('Low MOQ is good for testing.'); }

    // Lead time
    const leadVal = parseInt(leadTimeDays) || 0;
    if (leadVal > 60) { score += 10; redFlags.push(`Long lead time (${leadVal} days) — plan inventory carefully.`); }
    else if (leadVal > 0 && leadVal <= 14) { recommendations.push('Short lead time is excellent for inventory management.'); }

    // Certifications
    if (!hasCerts) { score += 10; recommendations.push('Request quality certifications (ISO, CE, etc.) from supplier.'); }

    // Payment terms
    if (paymentTerms.toLowerCase().includes('100') && paymentTerms.toLowerCase().includes('upfront')) {
      score += 15; redFlags.push('100% upfront payment is risky — negotiate partial payment terms.');
    } else if (!paymentTerms.trim()) {
      score += 5; recommendations.push('Clarify payment terms before ordering.');
    }

    // Communication
    if (communicationQuality === 'poor') { score += 20; redFlags.push('Poor communication is a major red flag.'); }
    else if (communicationQuality === 'fair') { score += 10; redFlags.push('Fair communication may lead to misunderstandings.'); }
    else if (communicationQuality === 'excellent') { recommendations.push('Excellent communication reduces operational risk.'); }

    // General recommendations
    recommendations.push('Order samples before committing to large quantities.');
    recommendations.push('Use secure payment methods (Escrow, PayPal Goods & Services).');

    const riskLevel: SourcingRiskResult['riskLevel'] =
      score < 20 ? 'low' : score < 45 ? 'medium' : 'high';

    setResult({ riskLevel, score: Math.min(score, 100), redFlags, recommendations });
    setSaved(false);
  };

  const handleSave = () => {
    if (!result) return;
    saveAnalysis('sourcing', `${supplierType} Supplier`, { supplierType, supplierLocation, hasContract, moq, leadTimeDays, hasCerts, paymentTerms, communicationQuality }, result);
    setSaved(true);
  };

  const riskColor = (level: string) => {
    if (level === 'low') return 'text-green-600 bg-green-50 border-green-200';
    if (level === 'medium') return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  return (
    <ToolLayout title="Sourcing Risk Check" description="Assess supplier reliability and sourcing risks.">
      <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Supplier Type</label>
            <div className="grid grid-cols-3 gap-2">
              {(['manufacturer', 'wholesaler', 'distributor', 'retailer', 'unknown'] as const).map(t => (
                <button key={t} onClick={() => setSupplierType(t)} className={`px-3 py-2 rounded-lg text-sm font-medium border-2 transition-all ${supplierType === t ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-gray-200 text-gray-600'}`}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Supplier Location</label>
            <input type="text" value={supplierLocation} onChange={e => setSupplierLocation(e.target.value)} placeholder="e.g. Shenzhen, China" className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm" />
          </div>
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={hasContract} onChange={e => setHasContract(e.target.checked)} className="rounded" /> Have written contract/agreement
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={hasCerts} onChange={e => setHasCerts(e.target.checked)} className="rounded" /> Supplier has quality certifications
            </label>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">MOQ (units)</label>
              <input type="number" value={moq} onChange={e => setMoq(e.target.value)} placeholder="500" className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Lead Time (days)</label>
              <input type="number" value={leadTimeDays} onChange={e => setLeadTimeDays(e.target.value)} placeholder="30" className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Payment Terms</label>
            <input type="text" value={paymentTerms} onChange={e => setPaymentTerms(e.target.value)} placeholder="e.g. 30/70, T/T, Escrow" className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Communication Quality</label>
            <div className="grid grid-cols-4 gap-2">
              {(['excellent', 'good', 'fair', 'poor'] as const).map(c => (
                <button key={c} onClick={() => setCommunicationQuality(c)} className={`px-2 py-2 rounded-lg text-xs font-medium border-2 transition-all ${communicationQuality === c ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-gray-200 text-gray-600'}`}>
                  {c.charAt(0).toUpperCase() + c.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <button onClick={calculate} className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 rounded-xl transition-colors">
            Assess Risk
          </button>
        </div>

        <div>
          {result ? (
            <div className="space-y-4">
              <div className={`p-4 rounded-xl border ${riskColor(result.riskLevel)}`}>
                <p className="text-sm opacity-70">Sourcing Risk Assessment</p>
                <p className="text-3xl font-bold uppercase">{result.riskLevel === 'low' ? 'Low Risk' : result.riskLevel === 'medium' ? 'Moderate Risk' : 'High Risk'}</p>
                <p className="text-sm opacity-70">Score: {result.score}/100</p>
                <p className="text-xs mt-1 opacity-70">
                  {result.riskLevel === 'low' ? 'This supplier profile shows minimal risk indicators.'
                    : result.riskLevel === 'medium' ? 'Some factors warrant attention before committing.'
                    : 'Multiple risk factors identified — proceed with caution.'}
                </p>
              </div>

              {result.redFlags.length > 0 && (
                <div className="bg-red-50 rounded-xl p-4">
                  <h3 className="text-sm font-semibold text-red-700 mb-2">Red Flags</h3>
                  <ul className="space-y-1">
                    {result.redFlags.map((r, i) => (
                      <li key={i} className="text-xs text-red-600 flex gap-2">
                        <span className="shrink-0">⚠</span> {r}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="bg-blue-50 rounded-xl p-4">
                <h3 className="text-sm font-semibold text-blue-700 mb-2">Recommendations</h3>
                <ul className="space-y-1">
                  {result.recommendations.map((r, i) => (
                    <li key={i} className="text-xs text-blue-600 flex gap-2">
                      <span className="shrink-0">→</span> {r}
                    </li>
                  ))}
                </ul>
              </div>

              <button onClick={handleSave} disabled={saved} className={`w-full py-2.5 rounded-xl font-medium text-sm transition-colors ${saved ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                {saved ? '✓ Saved to My Research' : 'Save to My Research'}
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
              Fill in supplier details and click "Assess Risk".
            </div>
          )}
        </div>
      </div>

      {/* Educational Content */}
      <div className="border-t border-gray-100 p-6 space-y-6">
        <div>
          <h3 className="text-lg font-bold text-gray-900 mb-3">Evaluating Supplier Reliability</h3>
          <p className="text-sm text-gray-600 leading-relaxed mb-3">
            Your supplier relationship directly impacts product quality, delivery timelines, and your bottom line. A unreliable supplier can mean stockouts, quality defects, or communication breakdowns that cost you sales and reputation.
          </p>
          <p className="text-sm text-gray-600 leading-relaxed">
            This tool evaluates supplier risk across multiple dimensions: supplier type, location, contract status, order requirements, lead times, certifications, payment terms, and communication quality.
          </p>
        </div>

        <div>
          <h4 className="text-sm font-bold text-gray-900 mb-2">Red flags to watch for</h4>
          <ul className="text-sm text-gray-600 space-y-1.5">
            <li className="flex gap-2"><span className="text-red-500 shrink-0">✗</span> No written contract or agreement</li>
            <li className="flex gap-2"><span className="text-red-500 shrink-0">✗</span> 100% upfront payment required</li>
            <li className="flex gap-2"><span className="text-red-500 shrink-0">✗</span> Unwilling to provide samples</li>
            <li className="flex gap-2"><span className="text-red-500 shrink-0">✗</span> No quality certifications</li>
            <li className="flex gap-2"><span className="text-red-500 shrink-0">✗</span> Poor or slow communication</li>
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-bold text-gray-900 mb-2">Worked example</h4>
          <div className="bg-blue-50 rounded-xl p-4 text-sm text-gray-700 space-y-1">
            <p>Supplier: Manufacturer in Shenzhen | MOQ: 500 units | Lead time: 30 days</p>
            <p>Contract: Yes | Certifications: ISO 9001 | Payment: 30/70 | Communication: Good</p>
            <p className="font-mono mt-2">Result: <strong>Low risk</strong> — manufacturer source, reasonable MOQ, certifications, and standard payment terms.</p>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-bold text-gray-900 mb-2">Limitations</h4>
          <ul className="text-sm text-gray-600 space-y-1.5">
            <li className="flex gap-2"><span className="text-gray-400 shrink-0">•</span> This tool evaluates your input — it does not independently verify supplier claims. Always verify certifications and references yourself.</li>
            <li className="flex gap-2"><span className="text-gray-400 shrink-0">•</span> Risk scores are heuristic estimates, not predictive guarantees of supplier performance.</li>
            <li className="flex gap-2"><span className="text-gray-400 shrink-0">•</span> Communication quality is subjective — your experience may vary.</li>
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-bold text-gray-900 mb-2">Related NicheScout tools</h4>
          <div className="flex flex-wrap gap-2">
            <a href="/tools/amazon-ip-check" className="inline-flex items-center gap-1 px-3 py-1.5 bg-orange-50 text-orange-600 rounded-lg text-xs font-medium hover:bg-orange-100 transition-colors">IP Risk Check</a>
            <a href="/tools/amazon-restriction-check" className="inline-flex items-center gap-1 px-3 py-1.5 bg-orange-50 text-orange-600 rounded-lg text-xs font-medium hover:bg-orange-100 transition-colors">Restriction Check</a>
            <a href="/tools/product-research-checklist" className="inline-flex items-center gap-1 px-3 py-1.5 bg-orange-50 text-orange-600 rounded-lg text-xs font-medium hover:bg-orange-100 transition-colors">Research Checklist</a>
          </div>
        </div>
      </div>
    </ToolLayout>
  );
}
