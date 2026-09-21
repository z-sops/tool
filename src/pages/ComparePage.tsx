import { useState } from 'react';
import { saveComparison } from '../storage';
import type { ComparisonProduct } from '../types';

const SAMPLE: ComparisonProduct[] = [
  { id: '1', name: 'Silicone Baking Mats', category: 'Home & Kitchen', price: 24.99, rating: 4.5, reviews: 12400, bsr: 3420, image: '🍰', highlights: ['Non-stick', 'BPA-free'], profitMargin: 35, roi: 120, ipRisk: 'low', restrictionRisk: 'low', sourcingRisk: 'low', listingQuality: 78 },
  { id: '2', name: 'Resistance Bands Set', category: 'Sports & Outdoors', price: 19.99, rating: 4.6, reviews: 8900, bsr: 1850, image: '💪', highlights: ['5 levels', 'Carry bag'], profitMargin: 42, roi: 150, ipRisk: 'low', restrictionRisk: 'low', sourcingRisk: 'medium', listingQuality: 85 },
  { id: '3', name: 'Bamboo Desk Organizer', category: 'Office Products', price: 34.99, rating: 4.3, reviews: 3200, bsr: 7800, image: '🗂️', highlights: ['Eco-friendly', 'Multi-compartment'], profitMargin: 28, roi: 90, ipRisk: 'low', restrictionRisk: 'low', sourcingRisk: 'medium', listingQuality: 72 },
];

function riskColor(risk?: string) {
  if (risk === 'low') return 'bg-green-100 text-green-700';
  if (risk === 'medium') return 'bg-yellow-100 text-yellow-700';
  if (risk === 'high') return 'bg-red-100 text-red-700';
  return 'bg-gray-100 text-gray-500';
}

export function ComparePage() {
  const [products] = useState<ComparisonProduct[]>(SAMPLE);
  const [selected, setSelected] = useState<string[]>([]);
  const [compareName, setCompareName] = useState('');
  const [saved, setSaved] = useState(false);

  const toggle = (id: string) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const compared = products.filter(p => selected.includes(p.id));

  const handleSave = () => {
    if (compared.length < 2) return;
    saveComparison(compareName || `Comparison ${new Date().toLocaleDateString()}`, compared);
    setSaved(true);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="text-center mb-8">
          <span className="inline-flex items-center gap-2 bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-medium mb-4">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Compare
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Compare Products</h1>
          <p className="text-gray-600 text-sm">Select 2+ products to compare side-by-side.</p>
        </div>

        {/* Product Selection */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {products.map(p => (
            <button
              key={p.id}
              onClick={() => toggle(p.id)}
              className={`flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all ${
                selected.includes(p.id)
                  ? 'border-orange-500 bg-orange-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <span className="text-2xl">{p.image}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{p.name}</p>
                <p className="text-xs text-gray-500">${p.price} · ★ {p.rating} · {p.reviews.toLocaleString()} reviews</p>
              </div>
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                selected.includes(p.id) ? 'border-orange-500 bg-orange-500' : 'border-gray-300'
              }`}>
                {selected.includes(p.id) && (
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
            </button>
          ))}
        </div>

        {/* Comparison Table */}
        {compared.length >= 2 && (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden mb-6">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left px-4 py-3 font-semibold text-gray-500 w-40">Metric</th>
                    {compared.map(p => (
                      <th key={p.id} className="text-left px-4 py-3 font-semibold text-gray-900">{p.image} {p.name}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    { label: 'Price', fn: (p: ComparisonProduct) => `$${p.price}` },
                    { label: 'Rating', fn: (p: ComparisonProduct) => `★ ${p.rating}` },
                    { label: 'Reviews', fn: (p: ComparisonProduct) => p.reviews.toLocaleString() },
                    { label: 'BSR', fn: (p: ComparisonProduct) => `#${p.bsr.toLocaleString()}` },
                    { label: 'Profit Margin', fn: (p: ComparisonProduct) => p.profitMargin ? `${p.profitMargin}%` : '—' },
                    { label: 'ROI', fn: (p: ComparisonProduct) => p.roi ? `${p.roi}%` : '—' },
                    { label: 'IP Risk', fn: (p: ComparisonProduct) => (
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${riskColor(p.ipRisk)}`}>{p.ipRisk || '—'}</span>
                    )},
                    { label: 'Restriction Risk', fn: (p: ComparisonProduct) => (
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${riskColor(p.restrictionRisk)}`}>{p.restrictionRisk || '—'}</span>
                    )},
                    { label: 'Sourcing Risk', fn: (p: ComparisonProduct) => (
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${riskColor(p.sourcingRisk)}`}>{p.sourcingRisk || '—'}</span>
                    )},
                    { label: 'Listing Quality', fn: (p: ComparisonProduct) => p.listingQuality ? `${p.listingQuality}/100` : '—' },
                  ].map(row => (
                    <tr key={row.label} className="border-b border-gray-50">
                      <td className="px-4 py-2.5 text-gray-500 font-medium">{row.label}</td>
                      {compared.map(p => (
                        <td key={p.id} className="px-4 py-2.5 text-gray-900">{row.fn(p)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {compared.length >= 2 && (
          <div className="flex gap-3 justify-center">
            <input
              type="text"
              value={compareName}
              onChange={e => setCompareName(e.target.value)}
              placeholder="Comparison name (optional)"
              className="px-4 py-2 rounded-lg border border-gray-200 text-sm"
            />
            <button
              onClick={handleSave}
              disabled={saved}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                saved ? 'bg-green-100 text-green-700' : 'bg-orange-500 text-white hover:bg-orange-600'
              }`}
            >
              {saved ? '✓ Saved' : 'Save Comparison'}
            </button>
          </div>
        )}

        {compared.length < 2 && (
          <div className="text-center py-8 text-gray-400 text-sm">
            Select at least 2 products above to see the comparison table.
          </div>
        )}

        {/* Data Honesty Note */}
        <div className="mt-8 bg-gray-50 rounded-xl p-4 text-xs text-gray-500 text-center">
          <p>Product data shown is sample data for demonstration. For real comparisons, use the tools below to calculate actual metrics for your products.</p>
        </div>

        {/* Related Tools */}
        <div className="mt-6 text-center">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Analyze your products with</p>
          <div className="flex flex-wrap gap-2 justify-center">
            <a href="/tools/niche-analysis" className="inline-flex items-center gap-1 px-3 py-1.5 bg-orange-50 text-orange-600 rounded-lg text-xs font-medium hover:bg-orange-100 transition-colors">Niche Analysis</a>
            <a href="/tools/amazon-profit-calculator" className="inline-flex items-center gap-1 px-3 py-1.5 bg-orange-50 text-orange-600 rounded-lg text-xs font-medium hover:bg-orange-100 transition-colors">Profit Calculator</a>
            <a href="/tools/amazon-ip-check" className="inline-flex items-center gap-1 px-3 py-1.5 bg-orange-50 text-orange-600 rounded-lg text-xs font-medium hover:bg-orange-100 transition-colors">IP Risk Check</a>
            <a href="/tools/amazon-listing-analyzer" className="inline-flex items-center gap-1 px-3 py-1.5 bg-orange-50 text-orange-600 rounded-lg text-xs font-medium hover:bg-orange-100 transition-colors">Listing Analyzer</a>
          </div>
        </div>
      </div>
    </div>
  );
}
