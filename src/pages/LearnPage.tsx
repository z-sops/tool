import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { SectionHeader } from '../components/layout/ToolLayout';

const GUIDES = [
  {
    id: 'product-research',
    title: 'Product Research 101',
    description: 'Learn how to identify profitable niches and evaluate product opportunities.',
    icon: '🔍',
    duration: '12 min read',
    level: 'Beginner' as const,
    color: 'blue',
    connectedTools: ['/tools/niche-analysis', '/tools/product-research-checklist'],
    sections: [
      {
        title: 'Why Product Research Matters',
        content: 'Product research is the foundation of a successful e-commerce business. The right product has existing demand, manageable competition, and healthy margins. The wrong product wastes capital, time, and opportunity. Research reduces risk — it does not eliminate it.',
      },
      {
        title: 'How to Identify a Profitable Niche',
        items: [
          'Look for consistent search volume — not just seasonal spikes. A product that sells year-round is more predictable.',
          'Check if multiple sellers are doing well — if only one seller dominates, the market may be too narrow or protected.',
          'Verify the price point supports your margins. Products under $15 are difficult to profit from after FBA fees.',
          'Look for review counts under 500 on top sellers — this suggests the market is not locked down by established brands.',
        ],
      },
      {
        title: 'Demand Signals to Look For',
        items: [
          'Consistent search volume over 6+ months (not just trending upward)',
          'Multiple products with 100+ monthly sales in the category',
          'Reviews trending upward — growing interest in the niche',
          'Related products appearing in "frequently bought together" — cross-selling potential',
        ],
      },
      {
        title: 'Competition Analysis Steps',
        items: [
          'Search your product keyword on Amazon and analyze the first 20 results.',
          'Note the review counts, prices, and listing quality of top sellers.',
          'Look for gaps: missing features, poor images, weak descriptions.',
          'Check if any top sellers have <500 reviews — accessible competitors.',
        ],
      },
      {
        title: 'Common Mistakes',
        items: [
          'Chasing trends without checking if demand is consistent.',
          'Ignoring fees — FBA fees can consume 30-40% of revenue.',
          'Skipping competitor analysis — you need to know who you are up against.',
          'Relying on gut feeling instead of data.',
        ],
      },
      {
        title: 'Limitations',
        content: 'No research tool can guarantee a product will sell. Real validation requires testing with actual inventory. This guide provides a framework for evaluation, not a guarantee of success.',
      },
    ],
  },
  {
    id: 'profit-calculation',
    title: 'Understanding Amazon FBA Fees',
    description: 'Break down all costs involved in selling on Amazon FBA.',
    icon: '💰',
    duration: '10 min read',
    level: 'Beginner' as const,
    color: 'green',
    connectedTools: ['/tools/amazon-profit-calculator', '/tools/amazon-roi-calculator'],
    sections: [
      {
        title: 'Why Fee Calculation Matters',
        content: 'Amazon FBA fees can consume 30-40% of your revenue if you do not account for them properly. Understanding every fee category is essential for pricing, margin calculation, and deciding whether a product is viable.',
      },
      {
        title: 'Fee Categories Explained',
        items: [
          'Referral Fee: 8-15% of sale price — Amazon\'s commission for each sale. Varies by category.',
          'FBA Fulfillment Fee: Based on product size and weight — covers picking, packing, and shipping.',
          'Storage Fee: $0.87-$2.40 per cubic foot per month — varies by season (higher in Q4).',
          'Long-term Storage: $6.90 per cubic foot for items stored 365+ days — avoid slow-moving inventory.',
        ],
      },
      {
        title: 'Hidden Costs Many Sellers Miss',
        items: [
          'Returns processing — Amazon charges for return shipping and handling.',
          'Prep and packaging — if your product requires special prep, this adds cost.',
          'Labeling — FBA requires barcodes; mislabeling leads to delays.',
          'Transportation to Amazon warehouse — inbound shipping costs.',
          'Sample costs, photography, and listing optimization.',
        ],
      },
      {
        title: 'Worked Example',
        content: 'A product sells for $24.99. Referral fee (15%) = $3.75. FBA fee (standard size) = $5.40. Storage = $0.87. Product cost = $4.00. Shipping to warehouse = $0.73. Total cost = $14.75. Profit = $10.24. Margin = 41%. This is a viable product.',
      },
      {
        title: 'Common Mistakes',
        items: [
          'Forgetting to include returns processing in margin calculations.',
          'Not accounting for seasonal storage fee increases (Q4).',
          'Ignoring inbound shipping costs.',
          'Using incorrect product size/weight for FBA fee estimation.',
        ],
      },
      {
        title: 'Limitations',
        content: 'Fee structures change. Always verify current fees in Seller Central. This guide provides general estimates — actual fees depend on category, product dimensions, and fulfillment options.',
      },
    ],
  },
  {
    id: 'listing-optimization',
    title: 'Listing Optimization Guide',
    description: 'Create listings that convert browsers into buyers.',
    icon: '📝',
    duration: '15 min read',
    level: 'Intermediate' as const,
    color: 'orange',
    connectedTools: ['/tools/amazon-listing-analyzer', '/tools/amazon-title-checker', '/tools/amazon-bullet-checker'],
    sections: [
      {
        title: 'Why Listing Optimization Matters',
        content: 'Your listing is your 24/7 salesperson. A well-optimized listing converts more browsers into buyers, ranks better in search, and reduces wasted advertising spend. Even small improvements in conversion rate can significantly impact revenue.',
      },
      {
        title: 'Title Optimization',
        content: 'Formula: [Brand] + [Product] + [Key Feature] + [Size/Quantity] + [Use Case]. Your title should include your most important keywords while remaining readable. For Amazon, 80-150 characters is optimal for most categories.',
        items: [
          'Include the product type and main feature as keywords.',
          'Use proper Title Case — not ALL CAPS.',
          'Keep under the platform character limit.',
          'Avoid keyword stuffing — each word should appear once.',
        ],
      },
      {
        title: 'Bullet Points Best Practices',
        items: [
          'Lead with the benefit, not the feature — "EASY TO CLEAN" not "Non-stick surface".',
          'Use ALL CAPS for the first word of each bullet — it draws the eye and structures the information.',
          'Stay under 500 characters per bullet.',
          'Include dimensions, materials, and use cases.',
          'Use all 5 bullet slots — each empty slot is a missed opportunity.',
        ],
      },
      {
        title: 'Description and A+ Content',
        items: [
          'Use HTML formatting for readability — paragraphs, bold text, and lists.',
          'Address objections proactively — what concerns might a buyer have?',
          'Include a call to action.',
          'A+ Content (if available) can increase conversion by 5-10%.',
        ],
      },
      {
        title: 'Backend Search Terms',
        items: [
          'Use all 250 bytes available.',
          'Include synonyms and alternate spellings.',
          'Do not repeat words from title or bullets.',
          'Include common misspellings of your product.',
        ],
      },
      {
        title: 'Common Mistakes',
        items: [
          'Stuffing keywords into the title — it reduces readability and may violate policies.',
          'Writing vague bullet points without specific details.',
          'Ignoring backend search terms — this is free keyword real estate.',
          'Not using all 5 bullet slots.',
        ],
      },
      {
        title: 'Limitations',
        content: 'Listing optimization does not guarantee ranking or sales. Amazon\'s algorithm considers many factors beyond listing text, including sales history, reviews, and advertising. Optimization improves your chances — it does not guarantee results.',
      },
    ],
  },
  {
    id: 'ip-and-compliance',
    title: 'IP Risk & Compliance',
    description: 'Understand intellectual property risks and stay compliant.',
    icon: '🛡️',
    duration: '8 min read',
    level: 'Intermediate' as const,
    color: 'pink',
    connectedTools: ['/tools/amazon-ip-check', '/tools/amazon-restriction-check'],
    sections: [
      {
        title: 'Why IP Risk Matters',
        content: 'IP violations can result in listing removal, account suspension, and legal action. Even unintentional infringement carries serious consequences. Understanding IP risk is essential before committing capital to any product.',
      },
      {
        title: 'CRITICAL: Never do this',
        content: 'Never use fake, counterfeit, copied, or unauthorized intellectual property. Always buy branded products from credible, legitimate suppliers and retain appropriate supplier/invoice documentation.',
        items: [
          'Do not copy another brand\'s trademarks, logos, packaging, images, branding, or listing content without authorization.',
          'Do not use fake multi-IP browsers or deceptive IP setups to bypass marketplace restrictions.',
          'Do not attempt to circumvent account controls, anti-abuse systems, or enforcement.',
        ],
      },
      {
        title: 'IP Risk Screening',
        content: 'Use the IP Risk Check tool to evaluate products before committing. This tool identifies potential trademark, patent, and design concerns using research-oriented screening — not a legal clearance.',
        items: [
          'Check for registered trademarks on the product name and design.',
          'Search for utility patents on functional features.',
          'Look for design patents on ornamental features.',
          'Verify that your supplier has the right to produce and sell the product.',
        ],
      },
      {
        title: 'Best Practices',
        items: [
          'Source from authorized distributors or directly from the brand.',
          'Keep invoices for all purchases — Amazon may request them.',
          'Run a trademark search before launching any product.',
          'Use the IP Risk Check tool to evaluate products systematically.',
        ],
      },
      {
        title: 'Limitations',
        content: 'IP Risk Check is a research screening tool, not legal advice. It does not provide legal clearance or guarantee that a product is free from IP claims. Final IP risk assessment should be done with qualified legal counsel for high-value products.',
      },
    ],
  },
  {
    id: 'sourcing',
    title: 'Supplier Evaluation Guide',
    description: 'How to find and vet reliable suppliers.',
    icon: '🏭',
    duration: '10 min read',
    level: 'Intermediate' as const,
    color: 'purple',
    connectedTools: ['/tools/sourcing-risk-check'],
    sections: [
      {
        title: 'Why Supplier Evaluation Matters',
        content: 'Your supplier relationship directly affects product quality, delivery timelines, and your ability to fulfill orders. A bad supplier can cost you months of delays, thousands in wasted inventory, and negative reviews from customers.',
      },
      {
        title: 'Evaluation Criteria',
        items: [
          'Communication responsiveness — suppliers who respond within 24 hours are more reliable.',
          'Sample quality vs. mass production consistency — always order samples before committing.',
          'Minimum order quantities (MOQs) — flexible MOQs reduce your initial risk.',
          'Payment terms — 30/70 split (30% upfront, 70% on shipment) is standard and reduces risk.',
          'Quality certifications — ISO, CE, or industry-specific certifications indicate quality control processes.',
          'Factory audit reports — third-party audits verify working conditions and production capacity.',
        ],
      },
      {
        title: 'Red Flags',
        items: [
          'No physical address or verifiable history.',
          'Unwilling to provide samples.',
          'Prices significantly below market — may indicate counterfeit or substandard materials.',
          'No quality control process.',
          'Cash-only payment terms — no buyer protection.',
          'Refuses to provide factory audit reports.',
        ],
      },
      {
        title: 'Common Mistakes',
        items: [
          'Choosing the cheapest supplier without checking quality.',
          'Not ordering samples before placing a bulk order.',
          'Skipping factory audits for high-value products.',
          'Not having a contract that specifies quality standards and penalties.',
        ],
      },
      {
        title: 'Limitations',
        content: 'Supplier evaluation is ongoing — not a one-time check. Quality can change, communication can break down, and market conditions shift. Regular re-evaluation is necessary.',
      },
    ],
  },
  {
    id: 'financial-planning',
    title: 'Financial Planning for Sellers',
    description: 'Budget, forecast, and manage cash flow for your e-commerce business.',
    icon: '📊',
    duration: '13 min read',
    level: 'Advanced' as const,
    color: 'amber',
    connectedTools: ['/tools/amazon-profit-calculator', '/tools/amazon-roi-calculator', '/tools/amazon-pricing-calculator'],
    sections: [
      {
        title: 'Why Financial Planning Matters',
        content: 'E-commerce businesses fail most often from running out of cash, not from lack of sales. Proper financial planning ensures you have enough capital to survive the startup phase and reach profitability.',
      },
      {
        title: 'Startup Budget Components',
        items: [
          'Initial inventory: $500-$5,000 depending on product and MOQ.',
          'Samples and testing: $100-$300.',
          'UPC codes: $30.',
          'Photography: $100-$500.',
          'Launch budget (PPC): $500-$1,000 for first 3 months.',
          'Contingency: 10-20% of total budget for unexpected costs.',
        ],
      },
      {
        title: 'Key Metrics to Track',
        items: [
          'Profit margin (target: >30%) — your net profit after all fees and costs.',
          'ROI (target: >100% annual) — return on your invested capital.',
          'Inventory turnover — how quickly you sell through inventory.',
          'TACOS (Total Advertising Cost of Sale) — ad spend as a percentage of total revenue.',
          'Break-even point — how many units you need to sell to recover your investment.',
        ],
      },
      {
        title: 'Cash Flow Management',
        items: [
          'Amazon pays every 2 weeks — factor this into your cash flow planning.',
          'Inventory lead times are typically 30-60 days from China.',
          'Maintain 2-3 months of operating capital as a reserve.',
          'Track your cash conversion cycle — how long from paying for inventory to receiving payment.',
        ],
      },
      {
        title: 'Worked Example',
        content: 'Investment: $2,500. Product cost: $5/unit. Sell at $24.99. FBA fees: $9.15. Net profit: $10.84/unit. Break-even: 231 units. At 300 units/month, you recover investment in 2.3 months. Year 1 revenue: $89,964. Year 1 profit: $38,940. ROI: 1,558%.',
      },
      {
        title: 'Common Mistakes',
        items: [
          'Not accounting for all fees — many sellers forget returns processing and storage fees.',
          'Underestimating startup costs — always add 10-20% contingency.',
          'Not tracking cash flow — running out of cash before reaching profitability.',
          'Ignoring advertising costs — new products need PPC spend to generate initial sales.',
        ],
      },
      {
        title: 'Limitations',
        content: 'Financial projections are estimates based on assumptions. Actual results depend on market conditions, competition, advertising effectiveness, and many other factors. These projections are planning tools, not guarantees.',
      },
    ],
  },
];

const levelColors = {
  Beginner: 'bg-green-100 text-green-700',
  Intermediate: 'bg-blue-100 text-blue-700',
  Advanced: 'bg-purple-100 text-purple-700',
};

const STORAGE_KEY = 'nichescout_learn_progress';

function loadProgress(): Record<string, boolean> {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : {};
  } catch {
    return {};
  }
}

function saveProgress(progress: Record<string, boolean>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch (error) {
    console.error('Failed to save learn progress:', error);
  }
}

export function LearnPage() {
  const [expandedGuide, setExpandedGuide] = useState<string | null>(null);
  const [completedGuides, setCompletedGuides] = useState<Record<string, boolean>>(loadProgress);

  const toggleGuide = (id: string) => {
    setExpandedGuide(expandedGuide === id ? null : id);
  };

  const markComplete = (id: string) => {
    const updated = { ...completedGuides, [id]: !completedGuides[id] };
    setCompletedGuides(updated);
    saveProgress(updated);
  };

  const completedCount = Object.values(completedGuides).filter(Boolean).length;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <SectionHeader
          badge="Learn"
          badgeColor="blue"
          title="E-commerce Research Guides"
          subtitle="Master product research, listing optimization, and business planning with our curated guides."
          as="h1"
        />

        {/* Progress tracker */}
        <div className="mb-8 bg-white rounded-xl border border-gray-100 p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-900">Your Progress</p>
            <p className="text-xs text-gray-500">{completedCount}/{GUIDES.length} guides completed</p>
          </div>
          <div className="flex gap-1">
            {GUIDES.map(g => (
              <div key={g.id} className={`w-8 h-2 rounded-full ${completedGuides[g.id] ? 'bg-green-400' : 'bg-gray-200'}`} />
            ))}
          </div>
        </div>

        <div className="space-y-4">
          {GUIDES.map(guide => (
            <div key={guide.id} className="bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-md transition-all">
              {/* Guide header */}
              <button onClick={() => toggleGuide(guide.id)} className="w-full p-6 text-left flex items-start gap-4">
                <span className="text-3xl shrink-0">{guide.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${levelColors[guide.level]}`}>
                      {guide.level}
                    </span>
                    <span className="text-xs text-gray-400">{guide.duration}</span>
                    {completedGuides[guide.id] && (
                      <span className="text-xs text-green-500 font-medium">✓ Completed</span>
                    )}
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">{guide.title}</h3>
                  <p className="text-sm text-gray-600 mt-1">{guide.description}</p>
                </div>
                <svg className={`w-5 h-5 text-gray-400 shrink-0 mt-2 transition-transform ${expandedGuide === guide.id ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Expanded content */}
              {expandedGuide === guide.id && (
                <div className="px-6 pb-6 space-y-6 border-t border-gray-100 pt-4">
                  {guide.sections.map((section, i) => (
                    <div key={i}>
                      <h4 className="text-sm font-bold text-gray-900 mb-2">{section.title}</h4>
                      {section.content && (
                        <p className="text-sm text-gray-600 leading-relaxed mb-2">{section.content}</p>
                      )}
                      {section.items && (
                        <ul className="text-sm text-gray-600 space-y-1.5">
                          {section.items.map((item, j) => (
                            <li key={j} className="flex gap-2">
                              <span className="text-orange-500 shrink-0">→</span>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}

                  {/* Connected Tools */}
                  <div>
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Connected Tools</p>
                    <div className="flex flex-wrap gap-2">
                      {guide.connectedTools.map(tool => (
                        <Link
                          key={tool}
                          to={tool}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-orange-50 text-orange-600 rounded-lg text-xs font-medium hover:bg-orange-100 transition-colors"
                        >
                          {tool.split('/').pop()?.replace(/-/g, ' ').replace('amazon ', '')}
                        </Link>
                      ))}
                    </div>
                  </div>

                  {/* Mark complete button */}
                  <button
                    onClick={() => markComplete(guide.id)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${completedGuides[guide.id] ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                  >
                    {completedGuides[guide.id] ? '✓ Mark as Incomplete' : 'Mark as Complete'}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-12 text-center bg-gradient-to-r from-orange-500 to-amber-500 rounded-2xl p-8 sm:p-12">
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-3">Ready to Apply What You've Learned?</h2>
          <p className="text-orange-100 mb-6 max-w-xl mx-auto">Use our free tools to put these strategies into practice.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/tools/product-research-checklist" className="bg-white text-orange-600 px-6 py-2.5 rounded-xl font-semibold hover:bg-gray-100 transition-colors">
              Start Research Checklist
            </Link>
            <Link to="/explore" className="bg-orange-600 text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-orange-700 border border-orange-400">
              Explore Products
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
