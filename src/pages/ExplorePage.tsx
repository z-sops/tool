import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ToolCard, SectionHeader } from '../components/layout/ToolLayout';

const CATEGORIES = [
  'All', 'Home & Kitchen', 'Sports & Outdoors', 'Beauty & Personal Care',
  'Electronics', 'Pet Supplies', 'Baby Products', 'Health & Wellness',
  'Office Products', 'Toys & Games', 'Automotive', 'Garden & Outdoor',
];

const SAMPLE_PRODUCTS = [
  { id: '1', name: 'Silicone Baking Mats (Set of 3)', category: 'Home & Kitchen', price: 24.99, rating: 4.5, reviews: 12400, bsr: 3420, image: '🍰', highlights: ['Non-stick', 'BPA-free', 'Oven safe to 480°F'] },
  { id: '2', name: 'Resistance Bands Set (5-Pack)', category: 'Sports & Outdoors', price: 19.99, rating: 4.6, reviews: 8900, bsr: 1850, image: '💪', highlights: ['5 resistance levels', 'Carry bag included', 'Latex-free option'] },
  { id: '3', name: 'Bamboo Desk Organizer', category: 'Office Products', price: 34.99, rating: 4.3, reviews: 3200, bsr: 7800, image: '🗂️', highlights: ['Eco-friendly', 'Multi-compartment', 'Assembly-free'] },
  { id: '4', name: 'Pet Grooming Glove', category: 'Pet Supplies', price: 12.99, rating: 4.4, reviews: 15600, bsr: 2100, image: '🐕', highlights: ['Removes loose hair', 'Gentle massage', 'Machine washable'] },
  { id: '5', name: 'Yoga Mat Towel (Non-Slip)', category: 'Sports & Outdoors', price: 22.99, rating: 4.7, reviews: 6700, bsr: 4500, image: '🧘', highlights: ['Quick-dry', 'Anti-slip grip', 'Fits standard mats'] },
  { id: '6', name: 'Stainless Steel Ice Cream Scoop', category: 'Home & Kitchen', price: 14.99, rating: 4.8, reviews: 9400, bsr: 1200, image: '🍦', highlights: ['Ergonomic handle', 'Dishwasher safe', 'Lifetime warranty'] },
  { id: '7', name: 'LED Desk Lamp (Dimmable)', category: 'Office Products', price: 29.99, rating: 4.5, reviews: 5100, bsr: 6300, image: '💡', highlights: ['5 brightness levels', 'USB charging port', 'Eye-care technology'] },
  { id: '8', name: 'Travel Makeup Brush Set', category: 'Beauty & Personal Care', price: 16.99, rating: 4.3, reviews: 7800, bsr: 3900, image: '💄', highlights: ['12 brushes', 'Travel case', 'Synthetic bristles'] },
  { id: '9', name: 'Plant Self-Watering Spikes', category: 'Garden & Outdoor', price: 11.99, rating: 4.2, reviews: 4300, bsr: 8200, image: '🌱', highlights: ['Adjustable flow', 'Set of 12', 'Works with bottles'] },
  { id: '10', name: 'Car Phone Mount (Magnetic)', category: 'Automotive', price: 15.99, rating: 4.6, reviews: 11200, bsr: 2800, image: '🚗', highlights: ['360° rotation', 'One-hand use', 'Strong magnets'] },
  { id: '11', name: 'Baby Nail Trimmer Kit', category: 'Baby Products', price: 18.99, rating: 4.7, reviews: 8100, bsr: 3100, image: '👶', highlights: ['LED light', 'Whisper quiet', '6 grinding heads'] },
  { id: '12', name: 'Collapsible Water Bottle', category: 'Sports & Outdoors', price: 13.99, rating: 4.4, reviews: 5600, bsr: 5200, image: '💧', highlights: ['BPA-free', 'Leak-proof', 'Folds to 2 inches'] },
];

const tools = [
  { title: 'Profit Calculator', desc: 'Calculate margins & fees', href: '/tools/amazon-profit-calculator', color: 'green' },
  { title: 'ROI Calculator', desc: 'Measure return on investment', href: '/tools/amazon-roi-calculator', color: 'blue' },
  { title: 'IP Risk Check', desc: 'Evaluate IP risks', href: '/tools/amazon-ip-check', color: 'pink' },
  { title: 'Restriction Check', desc: 'Check marketplace restrictions', href: '/tools/amazon-restriction-check', color: 'red' },
  { title: 'Niche Analysis', desc: 'Analyze niche viability', href: '/tools/niche-analysis', color: 'purple' },
  { title: 'Listing Analyzer', desc: 'Score your listing quality', href: '/tools/amazon-listing-analyzer', color: 'blue' },
];

export function ExplorePage() {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = SAMPLE_PRODUCTS.filter(p => {
    const matchCategory = selectedCategory === 'All' || p.category === selectedCategory;
    const matchSearch = !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCategory && matchSearch;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <SectionHeader
          badge="Explore"
          badgeColor="blue"
          title="Discover Profitable Products"
          subtitle="Browse sample products across categories. Use the research tools below to analyze any product."
          as="h1"
        />

        {/* Search + Filters */}
        <div className="mb-8 space-y-4">
          <div className="relative max-w-xl mx-auto">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 bg-white text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            />
          </div>
          <div className="flex flex-wrap gap-2 justify-center">
            {CATEGORIES.map(c => (
              <button
                key={c}
                onClick={() => setSelectedCategory(c)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  selectedCategory === c
                    ? 'bg-orange-500 text-white'
                    : 'bg-white text-gray-600 border border-gray-200 hover:border-orange-300 hover:text-orange-600'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {filtered.map(product => (
            <div key={product.id} className="bg-white rounded-xl border border-gray-100 p-5 hover:shadow-lg transition-all">
              <div className="flex items-start gap-3 mb-3">
                <span className="text-3xl">{product.image}</span>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 text-sm leading-tight">{product.name}</h3>
                  <span className="text-xs text-gray-500">{product.category}</span>
                </div>
              </div>
              <div className="flex items-center gap-4 mb-3 text-sm">
                <span className="font-bold text-gray-900">${product.price}</span>
                <span className="text-amber-500">★ {product.rating}</span>
                <span className="text-gray-400">{product.reviews.toLocaleString()} reviews</span>
              </div>
              <div className="flex items-center gap-3 mb-3 text-xs text-gray-500">
                <span>BSR: #{product.bsr.toLocaleString()}</span>
              </div>
              <div className="flex flex-wrap gap-1.5 mb-4">
                {product.highlights.map(h => (
                  <span key={h} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-[11px]">{h}</span>
                ))}
              </div>
              <div className="flex gap-2">
                <Link
                  to={`/tools/niche-analysis?product=${encodeURIComponent(product.name)}`}
                  className="flex-1 text-center text-xs font-medium bg-orange-50 text-orange-600 hover:bg-orange-100 rounded-lg py-2 transition-colors"
                >
                  Analyze Niche
                </Link>
                <Link
                  to={`/tools/amazon-profit-calculator?product=${encodeURIComponent(product.name)}&price=${product.price}`}
                  className="flex-1 text-center text-xs font-medium bg-green-50 text-green-600 hover:bg-green-100 rounded-lg py-2 transition-colors"
                >
                  Calculate Profit
                </Link>
              </div>
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No products found. Try a different search or category.</p>
          </div>
        )}

        {/* Quick Tools */}
        <SectionHeader
          badge="Quick Tools"
          badgeColor="green"
          title="Research Tools"
          subtitle="Use these tools to analyze any product."
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {tools.map(t => (
            <Link
              key={t.href}
              to={t.href}
              className="flex items-center gap-3 bg-white rounded-xl border border-gray-100 p-4 hover:shadow-md transition-all"
            >
              <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">{t.title}</p>
                <p className="text-xs text-gray-500">{t.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
