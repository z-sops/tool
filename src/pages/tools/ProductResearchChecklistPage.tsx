import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ToolLayout } from '../../components/layout/ToolLayout';
import { saveAnalysis } from '../../storage';
import type { ChecklistResult } from '../../types';

interface ChecklistItem {
  id: string;
  label: string;
  checked: boolean;
  section: string;
  whyItMatters: string;
}

const CHECKLIST_STORAGE_KEY = 'nichescout_checklist_progress';
const PRODUCT_NAME_STORAGE_KEY = 'nichescout_checklist_product';

const DEFAULT_ITEMS: Omit<ChecklistItem, 'checked'>[] = [
  // Market Research
  { id: 'mr1', label: 'Identified target niche and sub-niche', section: 'Market Research', whyItMatters: 'A clearly defined niche tells you who your buyer is and what they need.' },
  { id: 'mr2', label: 'Validated demand with search volume data', section: 'Market Research', whyItMatters: 'Search volume confirms people are actively looking for this product type.' },
  { id: 'mr3', label: 'Analyzed top 10 competitors', section: 'Market Research', whyItMatters: 'Competitor analysis reveals pricing, positioning, and gaps you can fill.' },
  { id: 'mr4', label: 'Checked seasonal trends (Google Trends)', section: 'Market Research', whyItMatters: 'Seasonal products have demand spikes — you need to plan inventory and cash flow around them.' },
  { id: 'mr5', label: 'Identified target customer persona', section: 'Market Research', whyItMatters: 'Knowing your buyer helps you write better listings and choose the right product features.' },
  // Product Validation
  { id: 'pv1', label: 'Ordered and tested product samples', section: 'Product Validation', whyItMatters: 'Samples reveal quality, sizing, and material issues that photos cannot show.' },
  { id: 'pv2', label: 'Confirmed product quality meets standards', section: 'Product Validation', whyItMatters: 'Quality issues lead to returns, negative reviews, and account risk.' },
  { id: 'pv3', label: 'Verified product fits target market needs', section: 'Product Validation', whyItMatters: 'A product that does not solve a real problem will not sell regardless of marketing.' },
  { id: 'pv4', label: 'Photographed product (7+ images)', section: 'Product Validation', whyItMatters: 'High-quality images are the #1 factor in whether shoppers click and buy.' },
  { id: 'pv5', label: 'Created product packaging design', section: 'Product Validation', whyItMatters: 'Packaging affects unboxing experience, brand perception, and shipping durability.' },
  // Financial Viability
  { id: 'fv1', label: 'Calculated profit margin (target: >30%)', section: 'Financial Viability', whyItMatters: 'Margins below 30% leave little room for advertising, returns, and unexpected costs.' },
  { id: 'fv2', label: 'Calculated ROI (target: >100% annual)', section: 'Financial Viability', whyItMatters: 'ROI tells you if the investment is worth it compared to other uses of your capital.' },
  { id: 'fv3', label: 'Determined total startup costs', section: 'Financial Viability', whyItMatters: 'Knowing your total investment prevents running out of capital before reaching profitability.' },
  { id: 'fv4', label: 'Set pricing strategy', section: 'Financial Viability', whyItMatters: 'Pricing affects positioning, margins, and how you compete with existing sellers.' },
  { id: 'fv5', label: 'Established monthly profit targets', section: 'Financial Viability', whyItMatters: 'Targets give you a measurable goal to track progress against.' },
  // Risk Assessment
  { id: 'ra1', label: 'Completed IP Risk Check', section: 'Risk Assessment', whyItMatters: 'IP violations can result in listing removal, account suspension, and legal action.' },
  { id: 'ra2', label: 'Completed Restriction Check', section: 'Risk Assessment', whyItMatters: 'Some categories require approval — selling without it can suspend your account.' },
  { id: 'ra3', label: 'Verified supplier legitimacy', section: 'Risk Assessment', whyItMatters: 'Unverified suppliers may deliver poor quality, late shipments, or no product at all.' },
  { id: 'ra4', label: 'Confirmed no patent/trademark conflicts', section: 'Risk Assessment', whyItMatters: 'Patent infringement can lead to legal action and listing removal.' },
  { id: 'ra5', label: 'Reviewed Amazon category requirements', section: 'Risk Assessment', whyItMatters: 'Category requirements (certifications, labeling) vary and must be met before launch.' },
  // Operational Readiness
  { id: 'or1', label: 'Secured reliable supplier', section: 'Operational Readiness', whyItMatters: 'Supply chain reliability directly affects your ability to fulfill orders and maintain stock.' },
  { id: 'or2', label: 'Negotiated payment terms', section: 'Operational Readiness', whyItMatters: 'Payment terms (e.g., 30/70 split) reduce your upfront financial risk.' },
  { id: 'or3', label: 'Set up FBA shipping plan', section: 'Operational Readiness', whyItMatters: 'FBA setup must be planned in advance — delays can miss your launch window.' },
  { id: 'or4', label: 'Created optimized listing (title, bullets, description)', section: 'Operational Readiness', whyItMatters: 'Your listing is your 24/7 salesperson — poor listings waste advertising spend.' },
  { id: 'or5', label: 'Prepared launch PPC campaign budget', section: 'Operational Readiness', whyItMatters: 'New products need advertising spend to generate initial reviews and rankings.' },
];

const SECTION_DESCRIPTIONS: Record<string, string> = {
  'Market Research': 'Understanding the market before you invest.',
  'Product Validation': 'Confirming the product meets quality and customer expectations.',
  'Financial Viability': 'Ensuring the numbers work before committing capital.',
  'Risk Assessment': 'Identifying and mitigating potential business risks.',
  'Operational Readiness': 'Preparing logistics, supplier, and listing for launch.',
};

function loadProgress(): Record<string, boolean> {
  try {
    const saved = localStorage.getItem(CHECKLIST_STORAGE_KEY);
    return saved ? JSON.parse(saved) : {};
  } catch {
    return {};
  }
}

function saveProgress(progress: Record<string, boolean>): void {
  try {
    localStorage.setItem(CHECKLIST_STORAGE_KEY, JSON.stringify(progress));
  } catch (error) {
    console.error('Failed to save checklist progress:', error);
  }
}

function loadProductName(): string {
  try {
    return localStorage.getItem(PRODUCT_NAME_STORAGE_KEY) || '';
  } catch {
    return '';
  }
}

function saveProductName(name: string): void {
  try {
    localStorage.setItem(PRODUCT_NAME_STORAGE_KEY, name);
  } catch (error) {
    console.error('Failed to save product name:', error);
  }
}

export function ProductResearchChecklistPage() {
  const [items, setItems] = useState<ChecklistItem[]>(() => {
    const progress = loadProgress();
    return DEFAULT_ITEMS.map(item => ({ ...item, checked: progress[item.id] || false }));
  });
  const [productName, setProductName] = useState(loadProductName);
  const [result, setResult] = useState<ChecklistResult | null>(null);
  const [saved, setSaved] = useState(false);
  const [showWhy, setShowWhy] = useState<string | null>(null);

  // Persist progress whenever items change
  useEffect(() => {
    const progress: Record<string, boolean> = {};
    items.forEach(item => { progress[item.id] = item.checked; });
    saveProgress(progress);
  }, [items]);

  // Persist product name
  useEffect(() => {
    saveProductName(productName);
  }, [productName]);

  const toggle = (id: string) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, checked: !item.checked } : item));
    setResult(null);
    setSaved(false);
  };

  const resetChecklist = () => {
    setItems(DEFAULT_ITEMS.map(item => ({ ...item, checked: false })));
    setProductName('');
    setResult(null);
    setSaved(false);
  };

  const sections = ['Market Research', 'Product Validation', 'Financial Viability', 'Risk Assessment', 'Operational Readiness'];

  const sectionScores: Record<string, number> = {};
  sections.forEach(s => {
    const sectionItems = items.filter(i => i.section === s);
    sectionScores[s] = sectionItems.length > 0 ? (sectionItems.filter(i => i.checked).length / sectionItems.length) * 100 : 0;
  });

  const totalChecked = items.filter(i => i.checked).length;
  const totalItems = items.length;
  const totalPercentage = totalItems > 0 ? Math.round((totalChecked / totalItems) * 100) : 0;

  const calculate = () => {
    const passedItems = items.filter(i => i.checked).map(i => i.label);
    const failedItems = items.filter(i => !i.checked).map(i => i.label);

    const sectionsResult = {
      marketResearch: sectionScores['Market Research'],
      productValidation: sectionScores['Product Validation'],
      financialViability: sectionScores['Financial Viability'],
      riskAssessment: sectionScores['Risk Assessment'],
      operationalReadiness: sectionScores['Operational Readiness'],
    };

    setResult({
      totalScore: totalChecked,
      maxScore: totalItems,
      percentage: totalPercentage,
      sections: sectionsResult,
      passedItems,
      failedItems,
    });
    setSaved(false);
  };

  const handleSave = () => {
    if (!result) return;
    saveAnalysis('checklist', productName || 'Product Checklist', { items, productName }, result);
    setSaved(true);
  };

  const scoreColor = (pct: number) => {
    if (pct >= 80) return 'text-green-600 bg-green-50';
    if (pct >= 50) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  // Determine risk assessment status
  const raComplete = items.filter(i => i.section === 'Risk Assessment').every(i => i.checked);
  const raPartial = items.filter(i => i.section === 'Risk Assessment').some(i => i.checked);
  const fvComplete = items.filter(i => i.section === 'Financial Viability').every(i => i.checked);
  const fvPartial = items.filter(i => i.section === 'Financial Viability').some(i => i.checked);

  return (
    <ToolLayout title="Product Research Checklist" description="Step-by-step checklist to validate your product before launch.">
      <div className="p-6">
        {/* Educational intro */}
        <div className="bg-blue-50 rounded-xl p-4 mb-6">
          <h3 className="text-sm font-bold text-blue-800 mb-1">What This Checklist Covers</h3>
          <p className="text-xs text-blue-700 leading-relaxed">
            This checklist walks you through 25 essential steps across 5 categories: market research, product validation, financial viability, risk assessment, and operational readiness. Check off each item as you complete it. Your progress is saved automatically in your browser.
          </p>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">Product Name (optional)</label>
          <input type="text" value={productName} onChange={e => setProductName(e.target.value)} placeholder="e.g. Silicone Baking Mats" className="w-full max-w-md px-4 py-2.5 rounded-lg border border-gray-200 text-sm" />
        </div>

        {/* Progress Bar */}
        <div className="mb-6 bg-gray-100 rounded-full h-3 overflow-hidden">
          <div className="bg-orange-500 h-full rounded-full transition-all" style={{ width: `${totalPercentage}%` }} />
        </div>
        <div className="flex items-center justify-between mb-6">
          <p className="text-sm text-gray-600">{totalChecked}/{totalItems} items complete ({totalPercentage}%)</p>
          <button onClick={resetChecklist} className="text-xs text-gray-400 hover:text-red-500 transition-colors">Reset All</button>
        </div>

        <div className="space-y-6">
          {sections.map(section => (
            <div key={section}>
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-sm font-bold text-gray-900">{section}</h3>
                <span className={`text-xs font-medium px-2 py-0.5 rounded ${scoreColor(sectionScores[section])}`}>
                  {Math.round(sectionScores[section])}%
                </span>
              </div>
              <p className="text-xs text-gray-400 mb-3">{SECTION_DESCRIPTIONS[section]}</p>
              <div className="space-y-2">
                {items.filter(i => i.section === section).map(item => (
                  <div key={item.id}>
                    <label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${item.checked ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200 hover:border-gray-300'}`}>
                      <input type="checkbox" checked={item.checked} onChange={() => toggle(item.id)} className="rounded shrink-0" />
                      <span className={`text-sm flex-1 ${item.checked ? 'text-green-700 line-through opacity-70' : 'text-gray-700'}`}>{item.label}</span>
                      <button type="button" onClick={(e) => { e.preventDefault(); setShowWhy(showWhy === item.id ? null : item.id); }} className="text-xs text-blue-500 hover:text-blue-700 shrink-0">
                        {showWhy === item.id ? 'Hide' : 'Why?'}
                      </button>
                    </label>
                    {showWhy === item.id && (
                      <div className="mt-1 ml-8 p-2 bg-blue-50 rounded text-xs text-blue-700">{item.whyItMatters}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 flex gap-3 flex-wrap">
          <button onClick={calculate} className="bg-orange-500 hover:bg-orange-600 text-white font-semibold px-6 py-3 rounded-xl transition-colors">
            Generate Report
          </button>
          <button onClick={handleSave} disabled={!result || saved} className={`font-semibold px-6 py-3 rounded-xl transition-colors ${!result ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : saved ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
            {saved ? '✓ Saved' : 'Save Report'}
          </button>
        </div>

        {/* Report */}
        {result && (
          <div className="mt-8 bg-gray-50 rounded-2xl p-6 space-y-4">
            <h3 className="text-lg font-bold text-gray-900">Checklist Report</h3>
            <div className="text-center py-4">
              <p className={`text-4xl font-bold ${result.percentage >= 80 ? 'text-green-600' : result.percentage >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>{result.percentage}%</p>
              <p className="text-sm text-gray-500">{result.totalScore}/{result.maxScore} items completed</p>
            </div>

            {/* Section scores */}
            <div className="grid grid-cols-5 gap-2">
              {sections.map(s => (
                <div key={s} className="text-center bg-white rounded-lg p-2">
                  <p className="text-[10px] text-gray-500">{s.split(' ').slice(0, 2).join(' ')}</p>
                  <p className={`text-xs font-bold ${sectionScores[s] >= 80 ? 'text-green-600' : sectionScores[s] >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                    {Math.round(sectionScores[s])}%
                  </p>
                </div>
              ))}
            </div>

            {/* Completed items */}
            {result.passedItems.length > 0 && (
              <div className="bg-green-50 rounded-xl p-4">
                <h4 className="text-sm font-semibold text-green-700 mb-2">Completed ({result.passedItems.length})</h4>
                <ul className="space-y-1">
                  {result.passedItems.map((item, i) => (
                    <li key={i} className="text-xs text-green-600 flex gap-2"><span className="shrink-0">✓</span> {item}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Incomplete items */}
            {result.failedItems.length > 0 && (
              <div className="bg-yellow-50 rounded-xl p-4">
                <h4 className="text-sm font-semibold text-yellow-700 mb-2">Incomplete — Still Needs Attention ({result.failedItems.length})</h4>
                <ul className="space-y-1">
                  {result.failedItems.map((item, i) => (
                    <li key={i} className="text-xs text-yellow-600 flex gap-2"><span className="shrink-0">○</span> {item}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Next actions based on status */}
            <div className="bg-orange-50 rounded-xl p-4">
              <h4 className="text-sm font-semibold text-orange-700 mb-2">Next Actions</h4>
              <ul className="text-xs text-orange-600 space-y-1.5">
                {!raComplete && (
                  <li className="flex gap-2"><span className="shrink-0">→</span>
                    {raPartial ? 'Complete remaining risk assessment items before investing.' : 'Run IP Risk Check and Restriction Check to identify potential legal issues.'}
                  </li>
                )}
                {!fvComplete && (
                  <li className="flex gap-2"><span className="shrink-0">→</span>
                    {fvPartial ? 'Complete remaining financial viability checks — margins and ROI must be confirmed.' : 'Calculate profit margins and ROI before committing capital.'}
                  </li>
                )}
                {totalPercentage < 50 && (
                  <li className="flex gap-2"><span className="shrink-0">→</span>You have less than 50% complete — focus on the weakest section first.</li>
                )}
                {totalPercentage >= 80 && (
                  <li className="flex gap-2"><span className="shrink-0">→</span>You're nearly ready — verify the remaining items and proceed to listing creation.</li>
                )}
                <li className="flex gap-2"><span className="shrink-0">→</span>After completing all items, use the Profit Calculator and ROI Calculator to confirm financial viability.</li>
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Educational Content */}
      <div className="border-t border-gray-100 p-6 space-y-6">
        <div>
          <h3 className="text-lg font-bold text-gray-900 mb-3">Why Use a Research Checklist</h3>
          <p className="text-sm text-gray-600 leading-relaxed mb-3">
            Product research is complex — there are dozens of factors to evaluate before committing capital to inventory. A checklist ensures you don't overlook critical steps like IP verification, financial modeling, or supplier vetting. It turns vague research into concrete, actionable validation.
          </p>
          <p className="text-sm text-gray-600 leading-relaxed">
            Your progress is saved automatically in your browser. You can close this page, navigate away, or refresh — your checked items will persist.
          </p>
        </div>

        <div>
          <h4 className="text-sm font-bold text-gray-900 mb-2">How to Use This Checklist</h4>
          <ol className="text-sm text-gray-600 space-y-1.5 list-decimal list-inside">
            <li>Enter a product name (optional — helps organize multiple research projects).</li>
            <li>Work through each section in order, or start with the section most relevant to you.</li>
            <li>Click "Why?" next to any item to understand why it matters.</li>
            <li>Check off items as you complete them — progress saves automatically.</li>
            <li>Click "Generate Report" to see a summary with next actions.</li>
          </ol>
        </div>

        <div>
          <h4 className="text-sm font-bold text-gray-900 mb-2">Checklist Sections</h4>
          <ul className="text-sm text-gray-600 space-y-1.5">
            <li className="flex gap-2"><span className="text-orange-500 shrink-0">→</span> <strong>Market Research</strong> — niche identification, demand validation, competitor analysis</li>
            <li className="flex gap-2"><span className="text-orange-500 shrink-0">→</span> <strong>Product Validation</strong> — samples, quality, photography, packaging</li>
            <li className="flex gap-2"><span className="text-orange-500 shrink-0">→</span> <strong>Financial Viability</strong> — margins, ROI, pricing, startup costs</li>
            <li className="flex gap-2"><span className="text-orange-500 shrink-0">→</span> <strong>Risk Assessment</strong> — IP checks, restrictions, supplier verification</li>
            <li className="flex gap-2"><span className="text-orange-500 shrink-0">→</span> <strong>Operational Readiness</strong> — supplier, FBA setup, listing, launch budget</li>
          </ul>
        </div>

        {/* Common mistakes */}
        <div>
          <h4 className="text-sm font-bold text-gray-900 mb-2">Common Mistakes</h4>
          <ul className="text-sm text-gray-600 space-y-2">
            <li className="flex gap-2"><span className="text-red-500 shrink-0">✗</span> <strong>Skip risk assessment</strong> — IP violations and restriction issues can shut down your account.</li>
            <li className="flex gap-2"><span className="text-red-500 shrink-0">✗</span> <strong>Skip financial modeling</strong> — committing capital without confirming margins leads to losses.</li>
            <li className="flex gap-2"><span className="text-red-500 shrink-0">✗</span> <strong>Not ordering samples</strong> — photos do not reveal quality, sizing, or material issues.</li>
            <li className="flex gap-2"><span className="text-red-500 shrink-0">✗</span> <strong>Ignoring seasonality</strong> — seasonal products require inventory planning around demand peaks.</li>
          </ul>
        </div>

        {/* Limitations */}
        <div>
          <h4 className="text-sm font-bold text-gray-900 mb-2">Limitations</h4>
          <ul className="text-sm text-gray-600 space-y-1.5">
            <li className="flex gap-2"><span className="text-orange-500 shrink-0">→</span> This checklist does not guarantee a product will be profitable or successful.</li>
            <li className="flex gap-2"><span className="text-orange-500 shrink-0">→</span> It is a research aid, not market validation — real validation requires testing with real products.</li>
            <li className="flex gap-2"><span className="text-orange-500 shrink-0">→</span> Risk assessment items are screening steps — final verification must be done in Seller Central.</li>
            <li className="flex gap-2"><span className="text-orange-500 shrink-0">→</span> Progress is saved in your browser's localStorage — clearing browser data will reset progress.</li>
          </ul>
        </div>

        {/* Related NicheScout tools */}
        <div>
          <h4 className="text-sm font-bold text-gray-900 mb-2">Related NicheScout Tools</h4>
          <div className="flex flex-wrap gap-2">
            <Link to="/tools/niche-analysis" className="inline-flex items-center gap-1 px-3 py-1.5 bg-orange-50 text-orange-600 rounded-lg text-xs font-medium hover:bg-orange-100 transition-colors">Niche Analysis</Link>
            <Link to="/tools/amazon-profit-calculator" className="inline-flex items-center gap-1 px-3 py-1.5 bg-orange-50 text-orange-600 rounded-lg text-xs font-medium hover:bg-orange-100 transition-colors">Profit Calculator</Link>
            <Link to="/tools/amazon-roi-calculator" className="inline-flex items-center gap-1 px-3 py-1.5 bg-orange-50 text-orange-600 rounded-lg text-xs font-medium hover:bg-orange-100 transition-colors">ROI Calculator</Link>
            <Link to="/tools/amazon-ip-check" className="inline-flex items-center gap-1 px-3 py-1.5 bg-orange-50 text-orange-600 rounded-lg text-xs font-medium hover:bg-orange-100 transition-colors">IP Risk Check</Link>
            <Link to="/tools/amazon-restriction-check" className="inline-flex items-center gap-1 px-3 py-1.5 bg-orange-50 text-orange-600 rounded-lg text-xs font-medium hover:bg-orange-100 transition-colors">Restriction Check</Link>
            <Link to="/tools/sourcing-risk-check" className="inline-flex items-center gap-1 px-3 py-1.5 bg-orange-50 text-orange-600 rounded-lg text-xs font-medium hover:bg-orange-100 transition-colors">Sourcing Risk Check</Link>
          </div>
        </div>
      </div>
    </ToolLayout>
  );
}
