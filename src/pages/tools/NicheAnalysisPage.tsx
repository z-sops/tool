import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ToolLayout } from '../../components/layout/ToolLayout';
import { saveAnalysis } from '../../storage';

interface NicheResult {
  score: number;
  demandScore: number;
  competitionScore: number;
  profitScore: number;
  trendScore: number;
  entryBarrierScore: number;
  verdict: string;
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  actionItems: string[];
}

export function NicheAnalysisPage() {
  const [searchParams] = useSearchParams();
  const [nicheName, setNicheName] = useState('');
  const [avgPrice, setAvgPrice] = useState('');
  const [avgReviews, setAvgReviews] = useState('');
  const [avgRating, setAvgRating] = useState('');
  const [topSellerSales, setTopSellerSales] = useState('');
  const [trendDirection, setTrendDirection] = useState<'rising' | 'stable' | 'declining'>('stable');
  const [competitionLevel, setCompetitionLevel] = useState<'low' | 'medium' | 'high'>('medium');
  const [seasonalProduct, setSeasonalProduct] = useState(false);
  const [result, setResult] = useState<NicheResult | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const product = searchParams.get('product');
    const price = searchParams.get('price');
    if (product) setNicheName(product);
    if (price) setAvgPrice(price);
  }, [searchParams]);

  const analyze = () => {
    const price = parseFloat(avgPrice) || 0;
    const reviews = parseFloat(avgReviews) || 0;
    const rating = parseFloat(avgRating) || 0;
    const sales = parseFloat(topSellerSales) || 0;

    let demandScore = 0;
    let competitionScore = 0;
    let profitScore = 0;
    let trendScore = 0;
    let entryBarrierScore = 0;
    const strengths: string[] = [];
    const weaknesses: string[] = [];
    const opportunities: string[] = [];
    const actionItems: string[] = [];

    // Demand (0-25)
    if (sales > 500) { demandScore = 25; strengths.push('Strong demand — top sellers moving 500+ units/month.'); }
    else if (sales > 200) { demandScore = 20; strengths.push('Good demand — consistent sales velocity.'); }
    else if (sales > 50) { demandScore = 12; }
    else { demandScore = 5; weaknesses.push('Low demand — verify market size.'); }

    // Competition (0-30) — base 0-25, review bonus up to +5
    if (competitionLevel === 'low') { competitionScore = 25; strengths.push('Low competition — easier to rank and gain market share.'); }
    else if (competitionLevel === 'medium') { competitionScore = 15; }
    else { competitionScore = 5; weaknesses.push('High competition — significant PPC and differentiation needed.'); }

    if (reviews < 200) { competitionScore = Math.min(competitionScore + 5, 30); strengths.push('Low average reviews — accessible market with room for new entrants.'); }
    else if (reviews < 1000) { competitionScore = Math.min(competitionScore + 2, 30); }
    else { weaknesses.push(`High average reviews (${Math.round(reviews)}) — incumbents have strong social proof.`); }

    // Profit (0-25)
    if (price > 0) {
      if (price >= 25 && price <= 70) { profitScore = 25; strengths.push('Sweet spot pricing — good margin potential.'); }
      else if (price >= 15 && price < 25) { profitScore = 15; }
      else if (price > 70) { profitScore = 18; }
      else { profitScore = 8; weaknesses.push('Low price point — margin pressure likely.'); }
    }

    // Trend (0-15)
    if (trendDirection === 'rising') { trendScore = 15; strengths.push('Rising trend — growing market opportunity.'); }
    else if (trendDirection === 'stable') { trendScore = 10; }
    else { trendScore = 3; weaknesses.push('Declining trend — risky long-term investment.'); }

    if (seasonalProduct) { weaknesses.push('Seasonal product — expect demand fluctuations.'); trendScore = Math.max(trendScore - 3, 0); }

    // Entry barrier (0-10) — higher rating means higher barrier (established quality expectations)
    if (rating >= 4.5) { entryBarrierScore = 10; weaknesses.push('High average rating (4.5+) — buyers expect excellent quality from day one.'); }
    else if (rating >= 4.3) { entryBarrierScore = 7; }
    else if (rating >= 4.0) { entryBarrierScore = 5; strengths.push('Moderate quality bar — opportunity to differentiate on quality.'); }
    else { entryBarrierScore = 3; strengths.push('Lower ratings suggest quality gaps you can exploit with a better product.'); }

    // Opportunities
    if (competitionLevel === 'high') opportunities.push('Differentiate through bundling, better images, or unique features that competitors lack.');
    if (reviews > 500) opportunities.push('Focus on underserved sub-niches within this category where competition is lower.');
    if (price < 20) opportunities.push('Consider product bundles to increase average order value and amortize fixed costs.');
    if (price >= 25 && price <= 70) opportunities.push('This price range supports healthy margins — invest in quality and listing optimization.');
    if (trendDirection === 'rising') opportunities.push('Rising trend means growing demand — act quickly to establish market position.');

    const totalScore = Math.min(demandScore + competitionScore + profitScore + trendScore + entryBarrierScore, 100);

    // Action items — prioritized by specific analysis results
    if (totalScore >= 60) {
      actionItems.push('This niche shows promise — proceed to the next research steps with confidence.');
    } else {
      actionItems.push('This niche has mixed signals — consider alternatives or significant differentiation.');
    }
    actionItems.push('Run IP Risk Check to identify any intellectual property concerns before committing.');
    actionItems.push('Use Profit Calculator to verify margins at your actual sourcing cost.');
    actionItems.push('Order samples from 2-3 suppliers to compare quality and reliability.');
    if (competitionLevel === 'high') actionItems.push('Develop a clear unique selling proposition (USP) — what makes your product different?');
    if (seasonalProduct) actionItems.push('Plan inventory and cash flow around peak seasons — expect demand fluctuations.');
    if (reviews > 1000) actionItems.push('Study top-seller reviews to find common complaints you can address in your product.');
    if (trendDirection === 'declining') actionItems.push('Declining trends reduce long-term viability — consider if the investment timeline justifies it.');

    const verdict = totalScore >= 75 ? 'Strong Niche — High potential, pursue aggressively.'
      : totalScore >= 55 ? 'Good Niche — Viable opportunity, proceed with standard precautions.'
      : totalScore >= 35 ? 'Moderate Niche — Proceed cautiously, validate with samples.'
      : 'Weak Niche — Consider alternatives or significantly differentiate.';

    setResult({
      score: totalScore,
      demandScore,
      competitionScore,
      profitScore,
      trendScore,
      entryBarrierScore,
      verdict,
      strengths,
      weaknesses,
      opportunities,
      actionItems,
    });
    setSaved(false);
  };

  const handleSave = () => {
    if (!result) return;
    saveAnalysis('niche', nicheName || 'Niche Analysis', { nicheName, avgPrice, avgReviews, avgRating, topSellerSales, trendDirection, competitionLevel, seasonalProduct }, result);
    setSaved(true);
  };

  const scoreColor = (score: number) => {
    if (score >= 75) return 'text-green-600';
    if (score >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <ToolLayout title="Niche Analysis" description="Deep dive into niche viability, competition, and demand.">
      <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Niche / Product Name</label>
            <input type="text" value={nicheName} onChange={e => setNicheName(e.target.value)} placeholder="e.g. Silicone Baking Mats" className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Avg. Selling Price ($)</label>
              <input type="number" step="0.01" value={avgPrice} onChange={e => setAvgPrice(e.target.value)} placeholder="24.99" className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Avg. Reviews (top 10)</label>
              <input type="number" value={avgReviews} onChange={e => setAvgReviews(e.target.value)} placeholder="500" className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Avg. Rating</label>
              <input type="number" step="0.1" value={avgRating} onChange={e => setAvgRating(e.target.value)} placeholder="4.5" className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Top Seller Monthly Sales</label>
              <input type="number" value={topSellerSales} onChange={e => setTopSellerSales(e.target.value)} placeholder="1000" className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Trend Direction</label>
            <div className="grid grid-cols-3 gap-2">
              {(['rising', 'stable', 'declining'] as const).map(t => (
                <button key={t} onClick={() => setTrendDirection(t)} className={`px-3 py-2 rounded-lg text-sm font-medium border-2 transition-all ${trendDirection === t ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-gray-200 text-gray-600'}`}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Competition Level</label>
            <div className="grid grid-cols-3 gap-2">
              {(['low', 'medium', 'high'] as const).map(c => (
                <button key={c} onClick={() => setCompetitionLevel(c)} className={`px-3 py-2 rounded-lg text-sm font-medium border-2 transition-all ${competitionLevel === c ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-gray-200 text-gray-600'}`}>
                  {c.charAt(0).toUpperCase() + c.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={seasonalProduct} onChange={e => setSeasonalProduct(e.target.checked)} className="rounded" /> Seasonal product
          </label>
          <button onClick={analyze} className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 rounded-xl transition-colors">
            Analyze Niche
          </button>
        </div>

        <div>
          {result ? (
            <div className="space-y-4">
              <div className={`p-4 rounded-xl border ${result.score >= 60 ? 'bg-green-50 border-green-200' : result.score >= 40 ? 'bg-yellow-50 border-yellow-200' : 'bg-red-50 border-red-200'}`}>
                <p className="text-sm text-gray-500">Niche Score</p>
                <p className={`text-3xl font-bold ${scoreColor(result.score)}`}>{result.score}/100</p>
                <p className="text-sm text-gray-600 mt-1">{result.verdict}</p>
              </div>

              <div className="grid grid-cols-5 gap-2">
                {[
                  { label: 'Demand', score: result.demandScore, max: 25 },
                  { label: 'Competition', score: result.competitionScore, max: 30 },
                  { label: 'Profit', score: result.profitScore, max: 25 },
                  { label: 'Trend', score: result.trendScore, max: 15 },
                  { label: 'Entry', score: result.entryBarrierScore, max: 10 },
                ].map(s => (
                  <div key={s.label} className="text-center bg-gray-50 rounded-lg p-2">
                    <p className="text-[10px] text-gray-500">{s.label}</p>
                    <p className={`text-xs font-bold ${scoreColor((s.score / s.max) * 100)}`}>{s.score}/{s.max}</p>
                  </div>
                ))}
              </div>

              {result.strengths.length > 0 && (
                <div className="bg-green-50 rounded-xl p-4">
                  <h3 className="text-sm font-semibold text-green-700 mb-2">Strengths</h3>
                  <ul className="space-y-1">
                    {result.strengths.map((s, i) => (
                      <li key={i} className="text-xs text-green-600 flex gap-2"><span className="shrink-0">✓</span> {s}</li>
                    ))}
                  </ul>
                </div>
              )}

              {result.weaknesses.length > 0 && (
                <div className="bg-red-50 rounded-xl p-4">
                  <h3 className="text-sm font-semibold text-red-700 mb-2">Weaknesses</h3>
                  <ul className="space-y-1">
                    {result.weaknesses.map((w, i) => (
                      <li key={i} className="text-xs text-red-600 flex gap-2"><span className="shrink-0">⚠</span> {w}</li>
                    ))}
                  </ul>
                </div>
              )}

              {result.opportunities.length > 0 && (
                <div className="bg-blue-50 rounded-xl p-4">
                  <h3 className="text-sm font-semibold text-blue-700 mb-2">Opportunities</h3>
                  <ul className="space-y-1">
                    {result.opportunities.map((o, i) => (
                      <li key={i} className="text-xs text-blue-600 flex gap-2"><span className="shrink-0">→</span> {o}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="bg-gray-50 rounded-xl p-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Action Items</h3>
                <ul className="space-y-1">
                  {result.actionItems.map((a, i) => (
                    <li key={i} className="text-xs text-gray-600 flex gap-2"><span className="text-orange-500 shrink-0">●</span> {a}</li>
                  ))}
                </ul>
              </div>

              <button onClick={handleSave} disabled={saved} className={`w-full py-2.5 rounded-xl font-medium text-sm transition-colors ${saved ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                {saved ? '✓ Saved to My Research' : 'Save to My Research'}
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
              Fill in the niche details and click "Analyze Niche".
            </div>
          )}
        </div>
      </div>

      {/* Educational Content */}
      <div className="border-t border-gray-100 p-6 space-y-6">
        <div>
          <h3 className="text-lg font-bold text-gray-900 mb-3">How Niche Analysis Works</h3>
          <p className="text-sm text-gray-600 leading-relaxed mb-3">
            Niche analysis evaluates the viability of a product category by examining demand, competition, profit potential, market trends, and barriers to entry. A strong niche has high demand, manageable competition, good margins, and a stable or growing trend.
          </p>
          <p className="text-sm text-gray-600 leading-relaxed">
            This tool uses the data you provide — average prices, reviews, ratings, and sales estimates — to generate a composite score. The more accurate your input data, the more useful the analysis. Note: this tool uses curated market signals, not live marketplace data.
          </p>
        </div>

        <div>
          <h4 className="text-sm font-bold text-gray-900 mb-2">Scoring dimensions</h4>
          <ul className="text-sm text-gray-600 space-y-1.5">
            <li className="flex gap-2"><span className="text-orange-500 shrink-0">→</span> <strong>Demand (25)</strong> — monthly sales velocity of top sellers. Higher sales = stronger market signal.</li>
            <li className="flex gap-2"><span className="text-orange-500 shrink-0">→</span> <strong>Competition (30)</strong> — review counts, competition level, entry difficulty. Lower competition = easier entry.</li>
            <li className="flex gap-2"><span className="text-orange-500 shrink-0">→</span> <strong>Profit (25)</strong> — price point sweet spot for margins. $25-$70 is the ideal range.</li>
            <li className="flex gap-2"><span className="text-orange-500 shrink-0">→</span> <strong>Trend (15)</strong> — market direction and seasonality. Rising trends reduce risk.</li>
            <li className="flex gap-2"><span className="text-orange-500 shrink-0">→</span> <strong>Entry Barrier (10)</strong> — average rating and market accessibility. Lower ratings = easier to compete.</li>
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-bold text-gray-900 mb-2">Worked example</h4>
          <div className="bg-blue-50 rounded-xl p-4 text-sm text-gray-700 space-y-1">
            <p>Niche: "Silicone Baking Mats" | Price: $25 | Reviews: 300 | Rating: 4.4 | Sales: 800/month | Trend: Rising | Competition: Medium</p>
            <p className="font-mono">Demand: 20 (good sales) | Competition: 17 (medium + low reviews) | Profit: 25 (sweet spot) | Trend: 15 (rising) | Entry: 7 (4.4 rating)</p>
            <p className="font-mono">Total: <strong>84/100 — Strong Niche</strong></p>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-bold text-gray-900 mb-2">Common mistakes</h4>
          <ul className="text-sm text-gray-600 space-y-1.5">
            <li className="flex gap-2"><span className="text-red-500 shrink-0">✗</span> Relying solely on BSR without checking review counts and competition level</li>
            <li className="flex gap-2"><span className="text-red-500 shrink-0">✗</span> Ignoring seasonality — a product that sells well in December may die in January</li>
            <li className="flex gap-2"><span className="text-red-500 shrink-0">✗</span> Not validating demand with actual keyword search volume</li>
            <li className="flex gap-2"><span className="text-red-500 shrink-0">✗</span> Assuming high reviews means high profit — review-heavy niches often have thin margins</li>
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-bold text-gray-900 mb-2">Limitations</h4>
          <ul className="text-sm text-gray-600 space-y-1.5">
            <li className="flex gap-2"><span className="text-gray-400 shrink-0">•</span> This tool uses user-provided data, not live Amazon marketplace data. Sales estimates and review counts should be verified independently.</li>
            <li className="flex gap-2"><span className="text-gray-400 shrink-0">•</span> Scores are heuristic estimates based on common patterns — they do not guarantee success or failure.</li>
            <li className="flex gap-2"><span className="text-gray-400 shrink-0">•</span> Competition level is subjective — your actual experience may differ based on listing quality and PPC strategy.</li>
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-bold text-gray-900 mb-2">Related NicheScout tools</h4>
          <div className="flex flex-wrap gap-2">
            <a href="/tools/product-research-checklist" className="inline-flex items-center gap-1 px-3 py-1.5 bg-orange-50 text-orange-600 rounded-lg text-xs font-medium hover:bg-orange-100 transition-colors">Research Checklist</a>
            <a href="/tools/amazon-profit-calculator" className="inline-flex items-center gap-1 px-3 py-1.5 bg-orange-50 text-orange-600 rounded-lg text-xs font-medium hover:bg-orange-100 transition-colors">Profit Calculator</a>
            <a href="/tools/amazon-ip-check" className="inline-flex items-center gap-1 px-3 py-1.5 bg-orange-50 text-orange-600 rounded-lg text-xs font-medium hover:bg-orange-100 transition-colors">IP Risk Check</a>
            <a href="/compare" className="inline-flex items-center gap-1 px-3 py-1.5 bg-orange-50 text-orange-600 rounded-lg text-xs font-medium hover:bg-orange-100 transition-colors">Compare Products</a>
          </div>
        </div>
      </div>
    </ToolLayout>
  );
}
