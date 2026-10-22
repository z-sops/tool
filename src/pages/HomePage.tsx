import { Link } from 'react-router-dom';
import { ToolCard, SectionHeader } from '../components/layout/ToolLayout';
import { getRecentActivity, formatTimestamp } from '../storage';

const mainFeatures = [
  {
    title: 'Explore Products',
    description: 'Discover profitable niches and analyze market trends across Amazon, Etsy, and Shopify.',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    ),
    color: 'blue',
    href: '/explore',
  },
  {
    title: 'Create Listing',
    description: 'Generate AI-powered product listings optimized for Amazon, Etsy, or Shopify.',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
    ),
    color: 'orange',
    href: '/create',
  },
  {
    title: 'Compare Products',
    description: 'Side-by-side comparison of products to find the best opportunity.',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    color: 'green',
    href: '/compare',
  },
  {
    title: 'My Research',
    description: 'Access your saved analyses, comparisons, and product research notes.',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
      </svg>
    ),
    color: 'purple',
    href: '/my-research',
  },
];

const tools = [
  {
    title: 'Amazon Bulk File Doctor',
    description: 'Review CSV upload errors offline, group issues, and export a trim-only file with your approval.',
    icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4h16v16H4zM4 10h16M10 4v16" /></svg>,
    color: 'blue',
    href: '/tools/amazon-bulk-file-doctor',
  },

  {
    title: 'Profit Calculator',
    description: 'Calculate Amazon FBA profit margins with fees, shipping, and COGS breakdown.',
    icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    color: 'green',
    href: '/tools/amazon-profit-calculator',
  },
  {
    title: 'ROI Calculator',
    description: 'Measure return on investment and payback period for product launches.',
    icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>,
    color: 'blue',
    href: '/tools/amazon-roi-calculator',
  },
  {
    title: 'Pricing Calculator',
    description: 'Find optimal pricing based on margins and competitor analysis.',
    icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>,
    color: 'purple',
    href: '/tools/amazon-pricing-calculator',
  },
  {
    title: 'IP Risk Check',
    description: 'Evaluate intellectual property risks before launching a product.',
    icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>,
    color: 'pink',
    href: '/tools/amazon-ip-check',
  },
  {
    title: 'Restriction Check',
    description: 'Check category and brand restrictions on Amazon marketplace.',
    icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>,
    color: 'red',
    href: '/tools/amazon-restriction-check',
  },
  {
    title: 'Sourcing Risk Check',
    description: 'Assess supplier reliability and sourcing risks.',
    icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>,
    color: 'amber',
    href: '/tools/sourcing-risk-check',
  },
  {
    title: 'Listing Analyzer',
    description: 'Analyze and score your product listing for SEO and conversion.',
    icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>,
    color: 'blue',
    href: '/tools/amazon-listing-analyzer',
  },
  {
    title: 'Title Checker',
    description: 'Optimize product titles for maximum search visibility.',
    icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" /></svg>,
    color: 'orange',
    href: '/tools/amazon-title-checker',
  },
  {
    title: 'Bullet Checker',
    description: 'Validate bullet points for clarity, length, and keyword optimization.',
    icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>,
    color: 'green',
    href: '/tools/amazon-bullet-checker',
  },
  {
    title: 'Niche Analysis',
    description: 'Deep dive into niche viability, competition, and demand.',
    icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>,
    color: 'purple',
    href: '/tools/niche-analysis',
  },
  {
    title: 'Research Checklist',
    description: 'Step-by-step checklist to validate your product before launch.',
    icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>,
    color: 'amber',
    href: '/tools/product-research-checklist',
  },
];

export function HomePage() {
  const recentActivity = getRecentActivity(5);

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-orange-50 via-white to-amber-50 py-16 sm:py-24">
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-10 left-10 w-72 h-72 bg-orange-500 rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-amber-500 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 bg-orange-100 text-orange-700 px-4 py-1.5 rounded-full text-sm font-medium mb-6">
            <span className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
            Free Beta — No Signup Required
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
            E-commerce Product &amp; Niche<br />
            <span className="text-gradient">Research Platform</span>
          </h1>
          <p className="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto mb-8">
            Explore profitable niches, analyze competition, calculate ROI, and create optimized listings — 
            all in one free platform for Amazon, Etsy &amp; Shopify sellers.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/explore"
              className="inline-flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-8 py-3.5 rounded-xl font-semibold text-lg transition-colors shadow-lg shadow-orange-500/25"
            >
              Start Exploring
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
            <Link
              to="/create"
              className="inline-flex items-center justify-center gap-2 bg-white hover:bg-gray-50 text-gray-900 border border-gray-200 px-8 py-3.5 rounded-xl font-semibold text-lg transition-colors"
            >
              Create a Listing
            </Link>
          </div>
        </div>
      </section>

      {/* Main Features */}
      <section className="py-16 sm:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeader
            badge="Platform"
            badgeColor="blue"
            title="Everything You Need to Research & Launch"
            subtitle="From niche discovery to listing creation — NicheScout covers the entire product research workflow."
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {mainFeatures.map(f => (
              <ToolCard key={f.href} {...f} />
            ))}
          </div>
        </div>
      </section>

      {/* Tools Grid */}
      <section className="py-16 sm:py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeader
            badge="Free Tools"
            badgeColor="green"
            title="Research Tools"
            subtitle="Deterministic, no-API-required tools for product analysis and validation."
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {tools.map(t => (
              <ToolCard key={t.href} {...t} />
            ))}
          </div>
        </div>
      </section>

      {/* Workflow */}
      <section className="py-16 sm:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeader
            badge="Workflow"
            badgeColor="orange"
            title="Research → Analyze → Calculate → Learn → Create"
            subtitle="Take a product from initial discovery all the way to a fully optimized listing."
          />
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-2 max-w-4xl mx-auto">
            {['Explore', 'Analyze', 'Calculate', 'Learn', 'Create'].map((step, i) => (
              <div key={step} className="flex items-center gap-2 sm:gap-4">
                <div className="flex items-center gap-2 bg-orange-50 border border-orange-200 rounded-xl px-5 py-3">
                  <span className="w-7 h-7 bg-orange-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                    {i + 1}
                  </span>
                  <span className="font-semibold text-gray-900">{step}</span>
                </div>
                {i < 4 && (
                  <svg className="w-5 h-5 text-orange-400 hidden sm:block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Recent Activity */}
      {recentActivity.length > 0 && (
        <section className="py-12 sm:py-16 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <SectionHeader
              badge="Recent"
              badgeColor="blue"
              title="Your Recent Activity"
            />
            <div className="max-w-2xl mx-auto space-y-3">
              {recentActivity.map(a => (
                <div key={a.id} className="flex items-center gap-3 bg-white rounded-xl px-4 py-3 border border-gray-100">
                  <div className="w-2 h-2 rounded-full bg-orange-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{a.title}</p>
                    {a.productName && (
                      <p className="text-xs text-gray-500 truncate">{a.productName}</p>
                    )}
                  </div>
                  <span className="text-xs text-gray-400 shrink-0">{formatTimestamp(a.timestamp)}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="py-16 sm:py-20 bg-gradient-to-br from-orange-500 to-amber-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-4">
            Ready to Find Your Next Winning Product?
          </h2>
          <p className="text-orange-100 text-lg mb-8 max-w-2xl mx-auto">
            Start exploring profitable niches and creating optimized listings — completely free.
          </p>
          <Link
            to="/explore"
            className="inline-flex items-center gap-2 bg-white hover:bg-gray-100 text-orange-600 px-8 py-3.5 rounded-xl font-semibold text-lg transition-colors shadow-lg"
          >
            Get Started Free
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
        </div>
      </section>
    </div>
  );
}
