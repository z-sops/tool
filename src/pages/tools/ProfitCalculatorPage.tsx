import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ToolLayout } from '../../components/layout/ToolLayout';
import { saveAnalysis } from '../../storage';
import type { ProfitResult } from '../../types';

export function ProfitCalculatorPage() {
  const [searchParams] = useSearchParams();
  const [salePrice, setSalePrice] = useState('');
  const [costOfGoods, setCostOfGoods] = useState('');
  const [shippingCost, setShippingCost] = useState('');
  const [amazonFeesPct, setAmazonFeesPct] = useState('15');
  const [otherFees, setOtherFees] = useState('');
  const [result, setResult] = useState<ProfitResult | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const price = searchParams.get('price');
    if (price) setSalePrice(price);
  }, [searchParams]);

  const calculate = () => {
    const price = parseFloat(salePrice) || 0;
    const cogs = parseFloat(costOfGoods) || 0;
    const shipping = parseFloat(shippingCost) || 0;
    const feePct = parseFloat(amazonFeesPct) || 15;
    const other = parseFloat(otherFees) || 0;

    const amazonFees = price * (feePct / 100);
    const totalCosts = cogs + shipping + amazonFees + other;
    const profit = price - totalCosts;
    const margin = price > 0 ? (profit / price) * 100 : 0;

    setResult({
      revenue: price,
      totalCosts,
      profit,
      margin,
      breakdown: { cogs, shipping, amazonFees, otherFees: other },
    });
    setSaved(false);
  };

  const handleSave = () => {
    if (!result) return;
    saveAnalysis('profit', `Profit: $${salePrice}`, { salePrice, costOfGoods, shippingCost, amazonFeesPct, otherFees }, result);
    setSaved(true);
  };

  const profitColor = result && result.profit >= 0 ? 'text-green-600' : 'text-red-600';
  const profitBg = result && result.profit >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200';

  return (
    <ToolLayout title="Amazon Profit Calculator" description="Calculate true profit margins after all Amazon FBA fees and costs.">
      <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sale Price ($)</label>
            <input type="number" step="0.01" value={salePrice} onChange={e => setSalePrice(e.target.value)} placeholder="24.99" className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm" />
            <p className="text-xs text-gray-400 mt-1">The price customers pay on Amazon</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cost of Goods ($)</label>
            <input type="number" step="0.01" value={costOfGoods} onChange={e => setCostOfGoods(e.target.value)} placeholder="5.00" className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm" />
            <p className="text-xs text-gray-400 mt-1">What you pay per unit to your supplier</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Shipping to Amazon ($)</label>
            <input type="number" step="0.01" value={shippingCost} onChange={e => setShippingCost(e.target.value)} placeholder="2.00" className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm" />
            <p className="text-xs text-gray-400 mt-1">Per-unit cost to ship from supplier to Amazon warehouse</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Amazon Referral Fee (%)</label>
            <input type="number" step="0.1" value={amazonFeesPct} onChange={e => setAmazonFeesPct(e.target.value)} placeholder="15" className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm" />
            <p className="text-xs text-gray-400 mt-1">Typically 8-15% depending on category (15% is the most common)</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Other Fees ($)</label>
            <input type="number" step="0.01" value={otherFees} onChange={e => setOtherFees(e.target.value)} placeholder="0.00" className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm" />
            <p className="text-xs text-gray-400 mt-1">FBA fulfillment fee, storage, returns processing, etc.</p>
          </div>
          <button onClick={calculate} className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 rounded-xl transition-colors">
            Calculate Profit
          </button>
        </div>

        <div>
          {result ? (
            <div className="space-y-4">
              <div className={`p-4 rounded-xl border ${profitBg}`}>
                <p className="text-sm text-gray-500">Net Profit Per Unit</p>
                <p className={`text-3xl font-bold ${profitColor}`}>
                  ${result.profit.toFixed(2)}
                </p>
                <p className="text-sm text-gray-500">{result.margin.toFixed(1)}% margin</p>
                {result.profit < 0 && (
                  <p className="text-xs text-red-600 mt-2 font-medium">This product loses money at current costs. Adjust inputs to find a viable path to profitability.</p>
                )}
              </div>

              <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Cost Breakdown</h3>
                {[
                  { label: 'Revenue', value: result.revenue, color: 'text-gray-900' },
                  { label: 'Cost of Goods', value: -result.breakdown.cogs, color: 'text-red-600' },
                  { label: 'Shipping to Amazon', value: -result.breakdown.shipping, color: 'text-red-600' },
                  { label: `Amazon Fees (${amazonFeesPct}%)`, value: -result.breakdown.amazonFees, color: 'text-red-600' },
                  { label: 'Other Fees', value: -result.breakdown.otherFees, color: 'text-red-600' },
                ].map(item => (
                  <div key={item.label} className="flex justify-between text-sm">
                    <span className="text-gray-600">{item.label}</span>
                    <span className={`font-medium ${item.color}`}>{item.value < 0 ? '-' : ''}${Math.abs(item.value).toFixed(2)}</span>
                  </div>
                ))}
                <div className="border-t border-gray-200 pt-2 flex justify-between text-sm font-bold">
                  <span>Net Profit</span>
                  <span className={profitColor}>${result.profit.toFixed(2)}</span>
                </div>
              </div>

              <button onClick={handleSave} disabled={saved} className={`w-full py-2.5 rounded-xl font-medium text-sm transition-colors ${saved ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                {saved ? '✓ Saved to My Research' : 'Save to My Research'}
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400 text-sm text-center px-4">
              <svg className="w-12 h-12 mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" /></svg>
              <p>Enter your costs and click "Calculate Profit" to see your true margins after all Amazon fees.</p>
            </div>
          )}
        </div>
      </div>

      {/* Educational Content */}
      <div className="border-t border-gray-100 p-6 space-y-6">
        <div>
          <h3 className="text-lg font-bold text-gray-900 mb-3">How Amazon FBA Profit Calculation Works</h3>
          <p className="text-sm text-gray-600 leading-relaxed mb-3">
            Selling on Amazon involves more costs than most new sellers expect. Your profit isn't simply the sale price minus what you paid for the product — Amazon takes a referral fee, FBA fulfillment fees cover storage and shipping to customers, and there are often hidden costs like returns processing, advertising, and monthly storage.
          </p>
          <p className="text-sm text-gray-600 leading-relaxed">
            This calculator gives you a clear breakdown of where your money goes. Enter your actual costs — not estimates — to get a realistic picture of your margins before committing to inventory.
          </p>
        </div>

        <div>
          <h4 className="text-sm font-bold text-gray-900 mb-2">The profit formula</h4>
          <div className="bg-gray-50 rounded-xl p-4 font-mono text-sm text-gray-700 space-y-1">
            <p>Revenue = Sale Price</p>
            <p>Total Costs = COGS + Shipping + Amazon Fees + Other Fees</p>
            <p>Amazon Fees = Sale Price × Referral Fee %</p>
            <p className="font-bold text-orange-600">Net Profit = Revenue − Total Costs</p>
            <p className="font-bold text-orange-600">Margin = (Net Profit / Revenue) × 100</p>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-bold text-gray-900 mb-2">Worked example</h4>
          <div className="bg-blue-50 rounded-xl p-4 text-sm text-gray-700 space-y-1">
            <p>Sale price: $24.99 | COGS: $5.00 | Shipping: $2.00 | Amazon 15%: $3.75 | Other: $1.00</p>
            <p className="font-mono">Profit = $24.99 − ($5.00 + $2.00 + $3.75 + $1.00) = <strong>$13.24</strong></p>
            <p className="font-mono">Margin = ($13.24 / $24.99) × 100 = <strong>53.0%</strong></p>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-bold text-gray-900 mb-2">Common mistakes</h4>
          <ul className="text-sm text-gray-600 space-y-1.5">
            <li className="flex gap-2"><span className="text-red-500 shrink-0">✗</span> Forgetting FBA fulfillment fees (usually $3-8 per unit depending on size/weight)</li>
            <li className="flex gap-2"><span className="text-red-500 shrink-0">✗</span> Not accounting for returns processing (typically 2-5% of sales)</li>
            <li className="flex gap-2"><span className="text-red-500 shrink-0">✗</span> Using 15% referral fee for all categories (some are 8%, others 17%)</li>
            <li className="flex gap-2"><span className="text-red-500 shrink-0">✗</span> Ignoring monthly storage fees ($0.87-$2.40/cubic foot)</li>
            <li className="flex gap-2"><span className="text-red-500 shrink-0">✗</span> Not including advertising costs (PPC can consume 10-30% of revenue)</li>
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-bold text-gray-900 mb-2">Important considerations</h4>
          <ul className="text-sm text-gray-600 space-y-1.5">
            <li className="flex gap-2"><span className="text-orange-500 shrink-0">→</span> <strong>Referral fees vary by category:</strong> Most are 15%, but electronics can be 8%, clothing 17%, and some categories differ.</li>
            <li className="flex gap-2"><span className="text-orange-500 shrink-0">→</span> <strong>FBA fees are separate from referral fees:</strong> Fulfillment fees are charged per unit based on size and weight.</li>
            <li className="flex gap-2"><span className="text-orange-500 shrink-0">→</span> <strong>Break-even analysis:</strong> If your profit is negative, calculate how much you need to reduce costs or increase price.</li>
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-bold text-gray-900 mb-2">Limitations</h4>
          <ul className="text-sm text-gray-600 space-y-1.5">
            <li className="flex gap-2"><span className="text-gray-400 shrink-0">•</span> This tool uses user-provided inputs, not live Amazon fee data. Amazon fees change — always verify current rates in Seller Central.</li>
            <li className="flex gap-2"><span className="text-gray-400 shrink-0">•</span> Does not account for PPC advertising spend, which can significantly impact true profitability.</li>
            <li className="flex gap-2"><span className="text-gray-400 shrink-0">•</span> Does not include Returns Processing Fee or Monthly Storage Fee as separate line items.</li>
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-bold text-gray-900 mb-2">Related questions</h4>
          <ul className="text-sm text-gray-600 space-y-1.5">
            <li className="flex gap-2"><span className="text-orange-500 shrink-0">→</span> "What's a good profit margin on Amazon?" — Aim for 30%+ after all costs.</li>
            <li className="flex gap-2"><span className="text-orange-500 shrink-0">→</span> "How do I find my Amazon referral fee rate?" — Check the Amazon Fee Schedule for your category.</li>
            <li className="flex gap-2"><span className="text-orange-500 shrink-0">→</span> "Should I include PPC in my profit calculation?" — Yes, for true profitability analysis.</li>
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-bold text-gray-900 mb-2">Related NicheScout tools</h4>
          <div className="flex flex-wrap gap-2">
            <a href="/tools/amazon-roi-calculator" className="inline-flex items-center gap-1 px-3 py-1.5 bg-orange-50 text-orange-600 rounded-lg text-xs font-medium hover:bg-orange-100 transition-colors">ROI Calculator</a>
            <a href="/tools/amazon-pricing-calculator" className="inline-flex items-center gap-1 px-3 py-1.5 bg-orange-50 text-orange-600 rounded-lg text-xs font-medium hover:bg-orange-100 transition-colors">Pricing Calculator</a>
            <a href="/tools/niche-analysis" className="inline-flex items-center gap-1 px-3 py-1.5 bg-orange-50 text-orange-600 rounded-lg text-xs font-medium hover:bg-orange-100 transition-colors">Niche Analysis</a>
            <a href="/tools/product-research-checklist" className="inline-flex items-center gap-1 px-3 py-1.5 bg-orange-50 text-orange-600 rounded-lg text-xs font-medium hover:bg-orange-100 transition-colors">Research Checklist</a>
          </div>
        </div>
      </div>
    </ToolLayout>
  );
}
