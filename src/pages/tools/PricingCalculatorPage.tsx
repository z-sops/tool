import { useState } from 'react';
import { ToolLayout } from '../../components/layout/ToolLayout';
import { saveAnalysis } from '../../storage';
import type { PricingResult } from '../../types';

export function PricingCalculatorPage() {
  const [costOfGoods, setCostOfGoods] = useState('');
  const [shippingCost, setShippingCost] = useState('');
  const [amazonFeesPct, setAmazonFeesPct] = useState('15');
  const [targetMargin, setTargetMargin] = useState('30');
  const [competitorPrice, setCompetitorPrice] = useState('');
  const [result, setResult] = useState<PricingResult | null>(null);
  const [saved, setSaved] = useState(false);

  const calculate = () => {
    const cogs = parseFloat(costOfGoods) || 0;
    const shipping = parseFloat(shippingCost) || 0;
    const feePct = parseFloat(amazonFeesPct) || 15;
    const marginPct = parseFloat(targetMargin) || 30;
    const comp = parseFloat(competitorPrice) || 0;

    // Price = (COGS + Shipping) / (1 - margin%/100 - fee%/100)
    const divisor = 1 - (marginPct / 100) - (feePct / 100);
    const suggestedPrice = divisor > 0 ? (cogs + shipping) / divisor : 0;
    const minPrice = divisor > 0 ? (cogs + shipping) / divisor : 0;
    const maxPrice = comp > 0 ? Math.max(suggestedPrice, comp * 1.15) : suggestedPrice * 1.3;

    const marginAtSuggested = suggestedPrice > 0
      ? ((suggestedPrice - cogs - shipping - suggestedPrice * feePct / 100) / suggestedPrice) * 100
      : 0;

    const competitivePosition: PricingResult['competitivePosition'] =
      comp === 0 ? 'at' : suggestedPrice < comp ? 'below' : suggestedPrice > comp ? 'above' : 'at';

    setResult({
      suggestedPrice: Math.round(suggestedPrice * 100) / 100,
      minPrice: Math.round(minPrice * 100) / 100,
      maxPrice: Math.round(maxPrice * 100) / 100,
      marginAtSuggested,
      competitivePosition,
    });
    setSaved(false);
  };

  const handleSave = () => {
    if (!result) return;
    saveAnalysis('pricing', `Target ${targetMargin}% margin`, { costOfGoods, shippingCost, amazonFeesPct, targetMargin, competitorPrice }, result);
    setSaved(true);
  };

  return (
    <ToolLayout title="Pricing Calculator" description="Find the optimal price point for your Amazon product based on costs, margins, and competition.">
      <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cost of Goods ($)</label>
            <input type="number" step="0.01" value={costOfGoods} onChange={e => setCostOfGoods(e.target.value)} placeholder="5.00" className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm" />
            <p className="text-xs text-gray-400 mt-1">Per-unit cost from your supplier</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Shipping Cost ($)</label>
            <input type="number" step="0.01" value={shippingCost} onChange={e => setShippingCost(e.target.value)} placeholder="2.00" className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm" />
            <p className="text-xs text-gray-400 mt-1">Per-unit shipping from supplier to Amazon warehouse</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Amazon Referral Fee (%)</label>
            <input type="number" step="0.1" value={amazonFeesPct} onChange={e => setAmazonFeesPct(e.target.value)} className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm" />
            <p className="text-xs text-gray-400 mt-1">Most categories: 15%. Check Amazon's fee schedule for your category.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Target Profit Margin (%)</label>
            <input type="number" step="1" value={targetMargin} onChange={e => setTargetMargin(e.target.value)} className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm" />
            <p className="text-xs text-gray-400 mt-1">Your desired profit margin after all costs. 30%+ is typical for sustainable businesses.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Competitor Price ($) — optional</label>
            <input type="number" step="0.01" value={competitorPrice} onChange={e => setCompetitorPrice(e.target.value)} placeholder="24.99" className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm" />
            <p className="text-xs text-gray-400 mt-1">The average price of top competitors in your niche</p>
          </div>
          <button onClick={calculate} className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 rounded-xl transition-colors">
            Calculate Price
          </button>
        </div>

        <div>
          {result ? (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-purple-50 border border-purple-200">
                <p className="text-sm text-gray-500">Suggested Price</p>
                <p className="text-3xl font-bold text-purple-600">${result.suggestedPrice.toFixed(2)}</p>
                <p className="text-sm text-gray-500">{result.marginAtSuggested.toFixed(1)}% margin at this price (after Amazon fees)</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-xl p-4 text-center">
                  <p className="text-xs text-gray-500 mb-1">Minimum Price</p>
                  <p className="text-xl font-bold text-gray-900">${result.minPrice.toFixed(2)}</p>
                  <p className="text-[10px] text-gray-400">break-even floor</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4 text-center">
                  <p className="text-xs text-gray-500 mb-1">Maximum Price</p>
                  <p className="text-xl font-bold text-gray-900">${result.maxPrice.toFixed(2)}</p>
                  <p className="text-[10px] text-gray-400">upper range estimate</p>
                </div>
              </div>

              <div className="bg-gray-50 rounded-xl p-4 text-sm space-y-2">
                <p className="font-medium text-gray-700">Competitive Position</p>
                <p className="text-gray-600">
                  {result.competitivePosition === 'below' && 'Your suggested price is below competitors — good for market entry, but ensure your listing clearly communicates value to justify the lower price.'}
                  {result.competitivePosition === 'at' && 'Your suggested price aligns with competitors — compete on listing quality, reviews, and features rather than price alone.'}
                  {result.competitivePosition === 'above' && 'Your suggested price exceeds competitors — this only works with strong differentiation (better brand, unique features, superior listing).'}
                </p>
              </div>

              <button onClick={handleSave} disabled={saved} className={`w-full py-2.5 rounded-xl font-medium text-sm transition-colors ${saved ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                {saved ? '✓ Saved to My Research' : 'Save to My Research'}
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400 text-sm text-center px-4">
              <svg className="w-12 h-12 mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <p>Enter your costs and target margin to calculate the optimal price for your product.</p>
            </div>
          )}
        </div>
      </div>

      {/* Educational Content */}
      <div className="border-t border-gray-100 p-6 space-y-6">
        <div>
          <h3 className="text-lg font-bold text-gray-900 mb-3">How to Price Products on Amazon</h3>
          <p className="text-sm text-gray-600 leading-relaxed mb-3">
            Pricing is one of the most critical decisions in e-commerce. Price too high and you lose sales to competitors. Price too low and you erode your margins or signal low quality. The optimal price balances your cost structure, target margins, and market competition.
          </p>
          <p className="text-sm text-gray-600 leading-relaxed">
            This calculator works backwards from your desired margin to determine the minimum price that covers all costs while hitting your profit target. It also shows how your price compares to competitors so you can make an informed positioning decision.
          </p>
        </div>

        <div>
          <h4 className="text-sm font-bold text-gray-900 mb-2">The pricing formula</h4>
          <div className="bg-gray-50 rounded-xl p-4 font-mono text-sm text-gray-700 space-y-1">
            <p>Cost per unit = COGS + Shipping</p>
            <p>Fee portion = Sale Price × Referral Fee %</p>
            <p className="font-bold text-orange-600">Sale Price = (COGS + Shipping) ÷ (1 − Margin% ÷ 100 − Fee% ÷ 100)</p>
            <p className="text-xs text-gray-500 mt-2">The divisor accounts for the fact that Amazon's fee is a percentage of the sale price, not a fixed amount.</p>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-bold text-gray-900 mb-2">Worked example</h4>
          <div className="bg-blue-50 rounded-xl p-4 text-sm text-gray-700 space-y-1">
            <p>COGS: $5.00 | Shipping: $2.00 | Amazon fee: 15% | Target margin: 30%</p>
            <p className="font-mono">Divisor = 1 − 0.30 − 0.15 = 0.55</p>
            <p className="font-mono">Suggested price = $7.00 ÷ 0.55 = <strong>$12.73</strong></p>
            <p className="font-mono">Actual margin at $12.73 = ($12.73 − $7.00 − $1.91) ÷ $12.73 = <strong>30.0%</strong></p>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-bold text-gray-900 mb-2">Pricing strategy considerations</h4>
          <ul className="text-sm text-gray-600 space-y-1.5">
            <li className="flex gap-2"><span className="text-orange-500 shrink-0">→</span> <strong>Sweet spot range:</strong> $25-$70 typically offers the best balance of margin and volume on Amazon.</li>
            <li className="flex gap-2"><span className="text-orange-500 shrink-0">→</span> <strong>Psychological pricing:</strong> $24.99 converts better than $25.00 — round down, not up.</li>
            <li className="flex gap-2"><span className="text-orange-500 shrink-0">→</span> <strong>PPC costs:</strong> If you're running ads, factor in 10-30% of revenue for advertising spend.</li>
            <li className="flex gap-2"><span className="text-orange-500 shrink-0">→</span> <strong>Return rates:</strong> Some categories have 5-15% return rates — price to absorb returns.</li>
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-bold text-gray-900 mb-2">Common mistakes</h4>
          <ul className="text-sm text-gray-600 space-y-1.5">
            <li className="flex gap-2"><span className="text-red-500 shrink-0">✗</span> Setting price based only on competitor pricing without checking your own margins</li>
            <li className="flex gap-2"><span className="text-red-500 shrink-0">✗</span> Forgetting that Amazon's referral fee is a percentage of sale price, not a fixed cost</li>
            <li className="flex gap-2"><span className="text-red-500 shrink-0">✗</span> Not accounting for PPC advertising when calculating effective margin</li>
            <li className="flex gap-2"><span className="text-red-500 shrink-0">✗</span> Pricing too low to "compete" — this often leads to unsustainable businesses</li>
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-bold text-gray-900 mb-2">Limitations</h4>
          <ul className="text-sm text-gray-600 space-y-1.5">
            <li className="flex gap-2"><span className="text-gray-400 shrink-0">•</span> This tool uses user-provided inputs, not live Amazon fee data. Verify current fees in Seller Central.</li>
            <li className="flex gap-2"><span className="text-gray-400 shrink-0">•</span> Does not account for PPC advertising costs, which can significantly impact effective margin.</li>
            <li className="flex gap-2"><span className="text-gray-400 shrink-0">•</span> Competitor price is user-provided — always verify current market prices independently.</li>
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-bold text-gray-900 mb-2">Related NicheScout tools</h4>
          <div className="flex flex-wrap gap-2">
            <a href="/tools/amazon-profit-calculator" className="inline-flex items-center gap-1 px-3 py-1.5 bg-orange-50 text-orange-600 rounded-lg text-xs font-medium hover:bg-orange-100 transition-colors">Profit Calculator</a>
            <a href="/tools/amazon-roi-calculator" className="inline-flex items-center gap-1 px-3 py-1.5 bg-orange-50 text-orange-600 rounded-lg text-xs font-medium hover:bg-orange-100 transition-colors">ROI Calculator</a>
            <a href="/tools/amazon-listing-analyzer" className="inline-flex items-center gap-1 px-3 py-1.5 bg-orange-50 text-orange-600 rounded-lg text-xs font-medium hover:bg-orange-100 transition-colors">Listing Analyzer</a>
          </div>
        </div>
      </div>
    </ToolLayout>
  );
}
