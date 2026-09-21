import { useState } from 'react';
import { saveListing } from '../storage';

const PLATFORMS = [
  { value: 'amazon', label: 'Amazon', description: 'Title (200 chars), 5 bullets (500 chars), description (2000 chars)' },
  { value: 'etsy', label: 'Etsy', description: 'Title (140 chars), 5 tags, warm/personal tone' },
  { value: 'shopify', label: 'Shopify', description: 'SEO-optimized title, meta description, product description' },
] as const;

const TONES = [
  { value: 'professional', label: 'Professional', description: 'Authoritative, spec-focused' },
  { value: 'friendly', label: 'Friendly', description: 'Warm, conversational' },
  { value: 'luxury', label: 'Luxury', description: 'Elegant, premium feel' },
  { value: 'urgent', label: 'Urgent', description: 'Action-oriented, persuasive' },
] as const;

export function CreatePage() {
  const [productName, setProductName] = useState('');
  const [category, setCategory] = useState('');
  const [keyFeatures, setKeyFeatures] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [platform, setPlatform] = useState<'amazon' | 'etsy' | 'shopify'>('amazon');
  const [tone, setTone] = useState<'professional' | 'friendly' | 'luxury' | 'urgent'>('professional');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const handleGenerate = async () => {
    if (!productName.trim()) {
      setError('Product name is required');
      return;
    }
    setError('');
    setLoading(true);
    setResult(null);
    setSaved(false);

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productName, category, keyFeatures, targetAudience, platform, tone }),
      });
      if (!res.ok) throw new Error('Generation failed');
      const data = await res.json();
      setResult(data);
    } catch (err) {
      setError('Failed to generate listing. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = () => {
    if (!result) return;
    saveListing(productName, result);
    setSaved(true);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="text-center mb-8">
          <span className="inline-flex items-center gap-2 bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-xs font-medium mb-4">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            AI-Powered
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Create Product Listing</h1>
          <p className="text-gray-600 text-sm">Generate optimized listings for Amazon, Etsy, or Shopify using AI.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Input Form */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Product Name *</label>
              <input
                type="text"
                value={productName}
                onChange={e => setProductName(e.target.value)}
                placeholder="e.g. Stainless Steel Water Bottle"
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Category</label>
              <input
                type="text"
                value={category}
                onChange={e => setCategory(e.target.value)}
                placeholder="e.g. Kitchen & Dining"
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Key Features</label>
              <textarea
                value={keyFeatures}
                onChange={e => setKeyFeatures(e.target.value)}
                placeholder="e.g. Double-wall insulated, BPA-free, 24oz capacity"
                rows={3}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Target Audience</label>
              <input
                type="text"
                value={targetAudience}
                onChange={e => setTargetAudience(e.target.value)}
                placeholder="e.g. Health-conscious adults, gym-goers"
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Platform</label>
              <div className="grid grid-cols-3 gap-2">
                {PLATFORMS.map(p => (
                  <button
                    key={p.value}
                    onClick={() => setPlatform(p.value)}
                    className={`p-3 rounded-lg border-2 text-center transition-all ${
                      platform === p.value
                        ? 'border-orange-500 bg-orange-50 text-orange-700'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <span className="text-sm font-semibold block">{p.label}</span>
                    <span className="text-[10px] text-gray-500 block mt-1">{p.description}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tone</label>
              <div className="grid grid-cols-2 gap-2">
                {TONES.map(t => (
                  <button
                    key={t.value}
                    onClick={() => setTone(t.value)}
                    className={`p-2.5 rounded-lg border-2 text-left transition-all ${
                      tone === t.value
                        ? 'border-orange-500 bg-orange-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <span className="text-sm font-medium block">{t.label}</span>
                    <span className="text-[10px] text-gray-500">{t.description}</span>
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
            )}

            <button
              onClick={handleGenerate}
              disabled={loading || !productName.trim()}
              className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Generating...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Generate Listing
                </>
              )}
            </button>
          </div>

          {/* Result */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            {result ? (
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-gray-900">Generated Listing</h2>
                  <button
                    onClick={handleSave}
                    disabled={saved}
                    className={`text-sm font-medium px-3 py-1.5 rounded-lg transition-colors ${
                      saved
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {saved ? '✓ Saved' : 'Save to My Research'}
                  </button>
                </div>

                <div>
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Title</h3>
                  <p className="text-sm text-gray-900 bg-gray-50 rounded-lg p-3">{result.title}</p>
                  <p className="text-xs text-gray-400 mt-1">{result.title?.length || 0} characters</p>
                </div>

                <div>
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Bullet Points</h3>
                  <ul className="space-y-2">
                    {result.bulletPoints?.map((b: string, i: number) => (
                      <li key={i} className="text-sm text-gray-900 bg-gray-50 rounded-lg p-3 flex gap-2">
                        <span className="text-orange-500 font-bold shrink-0">•</span>
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Description</h3>
                  <p className="text-sm text-gray-900 bg-gray-50 rounded-lg p-3 whitespace-pre-wrap">{result.description}</p>
                  <p className="text-xs text-gray-400 mt-1">{result.description?.length || 0} characters</p>
                </div>

                {result.searchTerms?.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Search Terms</h3>
                    <div className="flex flex-wrap gap-1.5">
                      {result.searchTerms.map((s: string, i: number) => (
                        <span key={i} className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs">{s}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center">
                <div className="w-16 h-16 bg-orange-50 rounded-2xl flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </div>
                <p className="text-gray-500 text-sm">Fill in the product details and click "Generate Listing" to see your AI-optimized listing here.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
