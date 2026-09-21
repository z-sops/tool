import { useState } from 'react';
import { ToolLayout } from '../../components/layout/ToolLayout';
import { saveAnalysis } from '../../storage';
import type { ROIResult } from '../../types';

export function ROICalculatorPage() {
  const [investment, setInvestment] = useState('');
  const [monthlyProfit, setMonthlyProfit] = useState('');
  const [launchCost, setLaunchCost] = useState('');
  const [result, setResult] = useState<ROIResult | null>(null);
  const [saved, setSaved] = useState(false);

  const calculate = () => {
    const inv = parseFloat(investment) || 0;
    const mp = parseFloat(monthlyProfit) || 0;
    const lc = parseFloat(launchCost) || 0;
    const totalInvestment = inv + lc;

    const roi = totalInvestment > 0 ? (mp * 12 / totalInvestment) * 100 : 0;
    const paybackMonths = mp > 0 ? totalInvestment / mp : Infinity;
    const annualizedReturn = roi;

    setResult({
      roi,
      paybackPeriodMonths: paybackMonths,
      annualizedReturn,
    });
    setSaved(false);
  };

  const handleSave = () => {
    if (!result) return;
    saveAnalysis('roi', `Investment $${investment}`, { investment, monthlyProfit, launchCost }, result);
    setSaved(true);
  };

  return (
    <ToolLayout title="ROI Calculator" description="Measure your return on investment and payback period for e-commerce products.">
      <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Initial Investment ($)</label>
            <input type="number" step="0.01" value={investment} onChange={e => setInvestment(e.target.value)} placeholder="2000" className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm" />
            <p className="text-xs text-gray-400 mt-1">Your initial inventory purchase (first batch cost)</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Profit ($)</label>
            <input type="number" step="0.01" value={monthlyProfit} onChange={e => setMonthlyProfit(e.target.value)} placeholder="500" className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm" />
            <p className="text-xs text-gray-400 mt-1">Expected net profit per month (after all costs and fees)</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Launch / Setup Costs ($)</label>
            <input type="number" step="0.01" value={launchCost} onChange={e => setLaunchCost(e.target.value)} placeholder="500" className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm" />
            <p className="text-xs text-gray-400 mt-1">Photography, PPC, UPC codes, samples, brand registry, etc.</p>
          </div>
          <button onClick={calculate} className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 rounded-xl transition-colors">
            Calculate ROI
          </button>
        </div>

        <div>
          {result ? (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-blue-50 border border-blue-200">
                <p className="text-sm text-gray-500">Annual ROI</p>
                <p className="text-3xl font-bold text-blue-600">{result.roi.toFixed(1)}%</p>
                <p className="text-xs text-gray-500 mt-1">
                  {result.roi >= 100 ? 'Excellent — you could double your investment in under a year.'
                    : result.roi >= 50 ? 'Good — solid returns, but there may be room to optimize.'
                    : result.roi >= 20 ? 'Moderate — consider reducing costs or increasing price.'
                    : 'Low — this product may not justify the capital at risk.'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-xl p-4 text-center">
                  <p className="text-xs text-gray-500 mb-1">Payback Period</p>
                  <p className="text-xl font-bold text-gray-900">
                    {result.paybackPeriodMonths === Infinity ? '∞' : `${result.paybackPeriodMonths.toFixed(1)}`}
                  </p>
                  <p className="text-xs text-gray-400">months to recover investment</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4 text-center">
                  <p className="text-xs text-gray-500 mb-1">Annualized Return</p>
                  <p className="text-xl font-bold text-gray-900">{result.annualizedReturn.toFixed(1)}%</p>
                  <p className="text-xs text-gray-400">projected yearly return</p>
                </div>
              </div>

              <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-600 space-y-2">
                <p className="font-medium text-gray-700">What this means</p>
                <ul className="space-y-1.5">
                  {result.paybackPeriodMonths !== Infinity && result.paybackPeriodMonths <= 6 && (
                    <li className="flex gap-2"><span className="text-green-500 shrink-0">✓</span> Fast payback — you'll recover your investment quickly, reducing risk.</li>
                  )}
                  {result.paybackPeriodMonths !== Infinity && result.paybackPeriodMonths > 6 && result.paybackPeriodMonths <= 12 && (
                    <li className="flex gap-2"><span className="text-orange-500 shrink-0">→</span> Moderate payback — plan for 6-12 months of capital commitment.</li>
                  )}
                  {result.paybackPeriodMonths !== Infinity && result.paybackPeriodMonths > 12 && (
                    <li className="flex gap-2"><span className="text-red-500 shrink-0">⚠</span> Long payback — over 12 months to recover. Consider whether the capital could work harder elsewhere.</li>
                  )}
                  <li className="flex gap-2"><span className="text-gray-400 shrink-0">•</span> ROI assumes consistent monthly profit — actual results will vary with seasonality, competition, and ad performance.</li>
                </ul>
              </div>

              <button onClick={handleSave} disabled={saved} className={`w-full py-2.5 rounded-xl font-medium text-sm transition-colors ${saved ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                {saved ? '✓ Saved to My Research' : 'Save to My Research'}
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400 text-sm text-center px-4">
              <svg className="w-12 h-12 mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
              <p>Enter your investment details and expected monthly profit to calculate your return on investment.</p>
            </div>
          )}
        </div>
      </div>

      {/* Educational Content */}
      <div className="border-t border-gray-100 p-6 space-y-6">
        <div>
          <h3 className="text-lg font-bold text-gray-900 mb-3">Understanding Return on Investment</h3>
          <p className="text-sm text-gray-600 leading-relaxed mb-3">
            ROI measures how much return you get relative to what you invested. In e-commerce, your investment includes not just inventory, but also setup costs, photography, initial PPC advertising, and any samples or testing. A product with a 100% annual ROI means you double your investment every year.
          </p>
          <p className="text-sm text-gray-600 leading-relaxed">
            Payback period tells you how many months it takes to recoup your initial investment. Shorter payback periods mean lower risk and faster cash flow recycling. The faster you recover your capital, the sooner you can reinvest in additional inventory or new products.
          </p>
        </div>

        <div>
          <h4 className="text-sm font-bold text-gray-900 mb-2">The formulas</h4>
          <div className="bg-gray-50 rounded-xl p-4 font-mono text-sm text-gray-700 space-y-1">
            <p>Total Investment = Initial Investment + Launch Costs</p>
            <p>Annual Profit = Monthly Profit × 12</p>
            <p className="font-bold text-orange-600">ROI = (Annual Profit ÷ Total Investment) × 100</p>
            <p className="font-bold text-orange-600">Payback Period = Total Investment ÷ Monthly Profit (months)</p>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-bold text-gray-900 mb-2">Worked example</h4>
          <div className="bg-blue-50 rounded-xl p-4 text-sm text-gray-700 space-y-1">
            <p>Initial investment: $2,000 | Launch costs: $500 | Monthly profit: $500</p>
            <p className="font-mono">Total investment = $2,000 + $500 = $2,500</p>
            <p className="font-mono">ROI = ($500 × 12 ÷ $2,500) × 100 = <strong>240%</strong></p>
            <p className="font-mono">Payback = $2,500 ÷ $500 = <strong>5.0 months</strong></p>
            <p className="text-xs text-gray-500 mt-2">This means you'd earn 2.4× your investment annually and recover your capital in 5 months.</p>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-bold text-gray-900 mb-2">What to include in "Total Investment"</h4>
          <ul className="text-sm text-gray-600 space-y-1.5">
            <li className="flex gap-2"><span className="text-orange-500 shrink-0">→</span> Initial inventory purchase (first batch)</li>
            <li className="flex gap-2"><span className="text-orange-500 shrink-0">→</span> Product photography and design</li>
            <li className="flex gap-2"><span className="text-orange-500 shrink-0">→</span> UPC codes and brand registry</li>
            <li className="flex gap-2"><span className="text-orange-500 shrink-0">→</span> Initial PPC advertising budget</li>
            <li className="flex gap-2"><span className="text-orange-500 shrink-0">→</span> Sample orders and testing</li>
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-bold text-gray-900 mb-2">Common mistakes</h4>
          <ul className="text-sm text-gray-600 space-y-1.5">
            <li className="flex gap-2"><span className="text-red-500 shrink-0">✗</span> Only counting inventory cost and ignoring launch/setup expenses</li>
            <li className="flex gap-2"><span className="text-red-500 shrink-0">✗</span> Using revenue instead of net profit for "monthly profit"</li>
            <li className="flex gap-2"><span className="text-red-500 shrink-0">✗</span> Assuming constant monthly profit (seasonality, competition changes affect this)</li>
            <li className="flex gap-2"><span className="text-red-500 shrink-0">✗</span> Not accounting for the time value of money (capital locked for 12 months has opportunity cost)</li>
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-bold text-gray-900 mb-2">Limitations</h4>
          <ul className="text-sm text-gray-600 space-y-1.5">
            <li className="flex gap-2"><span className="text-gray-400 shrink-0">•</span> ROI assumes consistent monthly profit — actual results will vary with seasonality, competition, and ad spend fluctuations.</li>
            <li className="flex gap-2"><span className="text-gray-400 shrink-0">•</span> Does not account for the time value of money or alternative investment opportunities.</li>
            <li className="flex gap-2"><span className="text-gray-400 shrink-0">•</span> Payback period is an estimate — actual cash flow timing depends on Amazon's payment schedule and inventory turnover.</li>
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-bold text-gray-900 mb-2">Related NicheScout tools</h4>
          <div className="flex flex-wrap gap-2">
            <a href="/tools/amazon-profit-calculator" className="inline-flex items-center gap-1 px-3 py-1.5 bg-orange-50 text-orange-600 rounded-lg text-xs font-medium hover:bg-orange-100 transition-colors">Profit Calculator</a>
            <a href="/tools/amazon-pricing-calculator" className="inline-flex items-center gap-1 px-3 py-1.5 bg-orange-50 text-orange-600 rounded-lg text-xs font-medium hover:bg-orange-100 transition-colors">Pricing Calculator</a>
            <a href="/tools/niche-analysis" className="inline-flex items-center gap-1 px-3 py-1.5 bg-orange-50 text-orange-600 rounded-lg text-xs font-medium hover:bg-orange-100 transition-colors">Niche Analysis</a>
          </div>
        </div>
      </div>
    </ToolLayout>
  );
}
