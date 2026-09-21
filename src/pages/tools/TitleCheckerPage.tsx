import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ToolLayout } from '../../components/layout/ToolLayout';
import { saveAnalysis } from '../../storage';
import type { TitleCheckResult } from '../../types';

interface CriterionResult {
  name: string;
  status: 'pass' | 'warn' | 'fail';
  score: number;
  maxScore: number;
  whatDetected: string;
  whyItMatters: string;
  whatToImprove: string;
}

export function TitleCheckerPage() {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [platform, setPlatform] = useState<'amazon' | 'etsy' | 'shopify'>('amazon');
  const [result, setResult] = useState<TitleCheckResult & { criteria: CriterionResult[] } | null>(null);
  const [saved, setSaved] = useState(false);

  const maxChars = platform === 'amazon' ? 200 : platform === 'etsy' ? 140 : 70;

  const check = () => {
    const criteria: CriterionResult[] = [];
    let totalScore = 0;
    const charCount = title.length;
    const words = title.split(/\s+/).filter(w => w.length > 0);
    const uniqueWords = [...new Set(words.map(w => w.toLowerCase()))];
    const density = words.length > 0 ? Math.round((uniqueWords.length / words.length) * 100) : 0;

    // 1. Title length
    if (charCount === 0) {
      criteria.push({ name: 'Title Length', status: 'fail', score: 0, maxScore: 20, whatDetected: 'Title is empty.', whyItMatters: 'A title tells both shoppers and search algorithms what your product is. An empty title means zero discoverability.', whatToImprove: 'Enter a descriptive title that includes your product type, key features, and size or quantity.' });
    } else if (charCount > maxChars) {
      criteria.push({ name: 'Title Length', status: 'fail', score: 3, maxScore: 20, whatDetected: `Title is ${charCount} characters — exceeds ${platform} limit of ${maxChars}.`, whyItMatters: `Titles longer than ${maxChars} characters may be truncated in search results, hiding important information from shoppers.`, whatToImprove: `Shorten to under ${maxChars} characters. Remove filler words, redundant descriptors, or unnecessary punctuation.` });
    } else if (charCount < maxChars * 0.4) {
      criteria.push({ name: 'Title Length', status: 'warn', score: 8, maxScore: 20, whatDetected: `Title is ${charCount} characters — only ${Math.round(charCount / maxChars * 100)}% of the ${maxChars}-character limit.`, whyItMatters: 'Short titles miss opportunities to include searchable keywords and product details that help shoppers find you.', whatToImprove: 'Add relevant product attributes: material, size, use case, or target audience.' });
    } else if (charCount >= maxChars * 0.6 && charCount <= maxChars * 0.9) {
      criteria.push({ name: 'Title Length', status: 'pass', score: 20, maxScore: 20, whatDetected: `Title is ${charCount} characters — well within the ${maxChars}-character limit.`, whyItMatters: 'A good-length title includes enough keywords for search without being truncated.', whatToImprove: 'No change needed for length.' });
    } else {
      criteria.push({ name: 'Title Length', status: 'pass', score: 16, maxScore: 20, whatDetected: `Title is ${charCount} characters — within the ${maxChars}-character limit.`, whyItMatters: 'Meets platform requirements, though you could potentially add more descriptive detail.', whatToImprove: 'Consider adding more product attributes if space allows.' });
    }
    totalScore += criteria[criteria.length - 1].score;

    // 2. Keyword relevance
    if (charCount === 0) {
      criteria.push({ name: 'Keyword Relevance', status: 'fail', score: 0, maxScore: 15, whatDetected: 'No keywords — title is empty.', whyItMatters: 'Keywords are how shoppers find your product through search. Without them, your product is invisible.', whatToImprove: 'Include your product type and main feature as keywords.' });
    } else if (words.length < 4) {
      criteria.push({ name: 'Keyword Relevance', status: 'warn', score: 5, maxScore: 15, whatDetected: `Only ${words.length} words — limited keyword coverage.`, whyItMatters: 'Fewer words means fewer search queries your product can match. Shoppers search using specific combinations of terms.', whatToImprove: 'Add more descriptive words: material, size, use case, or target audience.' });
    } else if (words.length >= 8) {
      criteria.push({ name: 'Keyword Relevance', status: 'pass', score: 15, maxScore: 15, whatDetected: `${words.length} words — strong keyword coverage.`, whyItMatters: 'More words means more search terms your product can appear in. Each word is a potential search match.', whatToImprove: 'Good coverage — ensure words are relevant and not filler.' });
    } else {
      criteria.push({ name: 'Keyword Relevance', status: 'pass', score: 10, maxScore: 15, whatDetected: `${words.length} words — moderate keyword coverage.`, whyItMatters: 'A reasonable number of keywords, but adding more could capture additional search traffic.', whatToImprove: 'Consider adding one or two more relevant descriptors.' });
    }
    totalScore += criteria[criteria.length - 1].score;

    // 3. Readability (case)
    if (charCount === 0) {
      criteria.push({ name: 'Readability', status: 'fail', score: 0, maxScore: 10, whatDetected: 'No title to evaluate.', whyItMatters: 'Readability determines whether shoppers can quickly understand what you sell.', whatToImprove: 'Write a title using natural capitalization.' });
    } else if (title === title.toUpperCase() && charCount > 10) {
      criteria.push({ name: 'Readability', status: 'fail', score: 2, maxScore: 10, whatDetected: 'Title is ALL CAPS.', whyItMatters: 'ALL CAPS looks unprofessional, reduces readability, and is harder to scan quickly in search results.', whatToImprove: 'Use Title Case or sentence case. Capitalize the first letter of each major word.' });
    } else if (/[a-z]/.test(title) && /[A-Z]/.test(title) && words.length >= 5) {
      criteria.push({ name: 'Readability', status: 'pass', score: 10, maxScore: 10, whatDetected: 'Title uses proper capitalization with mixed case.', whyItMatters: 'Proper capitalization is easier to read and looks professional in search results.', whatToImprove: 'No change needed.' });
    } else {
      criteria.push({ name: 'Readability', status: 'pass', score: 7, maxScore: 10, whatDetected: 'Title has acceptable capitalization.', whyItMatters: 'Readable titles help shoppers understand your product faster.', whatToImprove: 'Ensure proper Title Case for best readability.' });
    }
    totalScore += criteria[criteria.length - 1].score;

    // 4. Special characters
    if (charCount === 0) {
      criteria.push({ name: 'Special Characters', status: 'fail', score: 0, maxScore: 5, whatDetected: 'No title to evaluate.', whyItMatters: 'Clean formatting looks professional and avoids rendering issues.', whatToImprove: 'Enter a title.' });
    } else {
      const specialChars = (title.match(/[^a-zA-Z0-9\s\-,'.&!]/g) || []).length;
      if (specialChars > 3) {
        criteria.push({ name: 'Special Characters', status: 'fail', score: 0, maxScore: 5, whatDetected: `${specialChars} special characters found.`, whyItMatters: 'Excessive special characters reduce readability, look unprofessional, and may trigger rendering issues on some platforms.', whatToImprove: 'Remove unnecessary symbols. Use hyphens or commas instead of slashes, pipes, or excessive punctuation.' });
      } else {
        criteria.push({ name: 'Special Characters', status: 'pass', score: 5, maxScore: 5, whatDetected: `${specialChars} special character(s) — within acceptable limits.`, whyItMatters: 'Clean formatting improves readability and professional appearance.', whatToImprove: 'No change needed.' });
      }
    }
    totalScore += criteria[criteria.length - 1].score;

    // 5. Category relevance
    if (category && charCount > 0) {
      const hasCategory = title.toLowerCase().includes(category.toLowerCase());
      if (hasCategory) {
        criteria.push({ name: 'Category Match', status: 'pass', score: 10, maxScore: 10, whatDetected: `Category "${category}" is included in the title.`, whyItMatters: 'Including your product category helps shoppers quickly understand what category your product belongs to, and reinforces relevance for that search term.', whatToImprove: 'No change needed.' });
      } else {
        criteria.push({ name: 'Category Match', status: 'warn', score: 4, maxScore: 10, whatDetected: `Category "${category}" is NOT found in the title.`, whyItMatters: 'Missing your category term means you miss a key search keyword. Shoppers often include the category in their search.', whatToImprove: `Consider including "${category}" in the title naturally.` });
      }
    } else if (category && charCount === 0) {
      criteria.push({ name: 'Category Match', status: 'fail', score: 0, maxScore: 10, whatDetected: 'Title is empty — cannot match category.', whyItMatters: 'Category relevance is impossible without a title.', whatToImprove: 'Write a title that includes your category.' });
    } else {
      criteria.push({ name: 'Category Match', status: 'warn', score: 3, maxScore: 10, whatDetected: 'No category provided for comparison.', whyItMatters: 'Without a category, we cannot check if your title includes relevant category keywords.', whatToImprove: 'Enter a category to check if it appears in your title.' });
    }
    totalScore += criteria[criteria.length - 1].score;

    // 6. Keyword stuffing
    if (charCount === 0) {
      criteria.push({ name: 'Keyword Stuffing', status: 'fail', score: 0, maxScore: 10, whatDetected: 'No title to evaluate.', whyItMatters: 'Keyword stuffing makes titles unreadable and may violate platform policies.', whatToImprove: 'Write a natural title.' });
    } else {
      const stuffingIndicator = words.length > 0 ? 1 - (uniqueWords.length / words.length) : 0;
      if (stuffingIndicator > 0.3 && words.length >= 6) {
        const repeats = words.filter((w, i) => words.indexOf(w) !== i);
        criteria.push({ name: 'Keyword Stuffing', status: 'fail', score: 2, maxScore: 10, whatDetected: `Possible keyword repetition detected — ${[...new Set(repeats)].join(', ')} appear multiple times.`, whyItMatters: 'Repeating the same keywords makes your title look spammy, reduces readability, and can hurt search ranking.', whatToImprove: 'Use each keyword once. Amazon\'s algorithm matches each word independently — repetition does not improve ranking.' });
      } else {
        criteria.push({ name: 'Keyword Stuffing', status: 'pass', score: 10, maxScore: 10, whatDetected: 'No keyword repetition detected.', whyItMatters: 'A natural title with unique words is easier to read and looks professional.', whatToImprove: 'No change needed.' });
      }
    }
    totalScore += criteria[criteria.length - 1].score;

    // 7. Price/quantity in title
    if (/\$/.test(title)) {
      criteria.push({ name: 'No Price in Title', status: 'fail', score: 0, maxScore: 5, whatDetected: 'Price ($) is included in the title.', whyItMatters: 'Price in the title wastes character space and becomes outdated. Price is displayed separately on the product page.', whatToImprove: 'Remove the price from the title. Use the price field instead.' });
      totalScore += 0;
    } else {
      criteria.push({ name: 'No Price in Title', status: 'pass', score: 5, maxScore: 5, whatDetected: 'No price found in title.', whyItMatters: 'Keeping price out of the title preserves character space for searchable terms.', whatToImprove: 'No change needed.' });
      totalScore += 5;
    }

    // 8. Product attributes (material, size, etc.)
    if (charCount === 0) {
      criteria.push({ name: 'Product Attributes', status: 'fail', score: 0, maxScore: 15, whatDetected: 'No title to evaluate.', whyItMatters: 'Attributes help shoppers filter and compare products.', whatToImprove: 'Include material, size, color, or quantity.' });
    } else if (charCount >= 60) {
      const attrPatterns = /\b(silicone|stainless|wooden|plastic|metal|glass|cotton|bamboo|large|small|medium|mini|pro|professional|set|pack|pcs|inch|cm|oz|lb|kg|ml|gallon|red|blue|black|white|green)\b/i;
      const hasAttributes = attrPatterns.test(title);
      if (hasAttributes) {
        criteria.push({ name: 'Product Attributes', status: 'pass', score: 15, maxScore: 15, whatDetected: 'Title includes product attributes (material, size, quantity, or similar).', whyItMatters: 'Attributes like material, size, and quantity help shoppers compare products and make faster decisions.', whatToImprove: 'No change needed.' });
      } else {
        criteria.push({ name: 'Product Attributes', status: 'warn', score: 7, maxScore: 15, whatDetected: 'No common product attributes detected (material, size, quantity, etc.).', whyItMatters: 'Titles without attributes are harder to compare. Shoppers often search for specific attributes.', whatToImprove: 'Add relevant attributes: material (silicone, stainless steel), size (large, 10-inch), or quantity (set of 3).' });
      }
    } else {
      criteria.push({ name: 'Product Attributes', status: 'warn', score: 5, maxScore: 15, whatDetected: 'Title is short — limited room for attributes.', whyItMatters: 'Short titles often lack the detail shoppers need to evaluate a product.', whatToImprove: 'Expand the title to include at least one attribute (material, size, or quantity).' });
    }
    totalScore += criteria[criteria.length - 1].score;

    setResult({
      score: Math.min(totalScore, 100),
      characterCount: charCount,
      keywordDensity: density,
      issues: criteria.filter(c => c.status === 'fail').map(c => `${c.name}: ${c.whatDetected}`),
      suggestions: criteria.filter(c => c.status === 'warn').map(c => `${c.name}: ${c.whatToImprove}`),
      criteria,
    });
    setSaved(false);
  };

  const handleSave = () => {
    if (!result) return;
    saveAnalysis('title', title || 'Title Check', { title, category, platform }, result);
    setSaved(true);
  };

  return (
    <ToolLayout title="Title Checker" description="Optimize your product title for maximum search visibility.">
      <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Product Title</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Enter your product title" className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm" />
            <p className="text-xs text-gray-400 mt-1">{title.length} / {maxChars} characters</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <input type="text" value={category} onChange={e => setCategory(e.target.value)} placeholder="e.g. Kitchen, Electronics" className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Platform</label>
            <div className="grid grid-cols-3 gap-2">
              {(['amazon', 'etsy', 'shopify'] as const).map(p => (
                <button key={p} onClick={() => setPlatform(p)} className={`px-3 py-2 rounded-lg text-sm font-medium border-2 transition-all ${platform === p ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-gray-200 text-gray-600'}`}>
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-1">
              {platform === 'amazon' ? 'Max 200 characters' : platform === 'etsy' ? 'Max 140 characters' : 'Max ~70 characters for SEO'}
            </p>
          </div>
          <button onClick={check} className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 rounded-xl transition-colors">
            Check Title
          </button>
        </div>

        <div>
          {result ? (
            <div className="space-y-4">
              <div className={`p-4 rounded-xl border ${result.score >= 70 ? 'bg-green-50 border-green-200' : result.score >= 40 ? 'bg-yellow-50 border-yellow-200' : 'bg-red-50 border-red-200'}`}>
                <p className="text-sm text-gray-500">Title Score</p>
                <p className={`text-3xl font-bold ${result.score >= 70 ? 'text-green-600' : result.score >= 40 ? 'text-yellow-600' : 'text-red-600'}`}>{result.score}/100</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-xl p-3 text-center">
                  <p className="text-[10px] text-gray-500">Characters</p>
                  <p className="text-lg font-bold text-gray-900">{result.characterCount}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3 text-center">
                  <p className="text-[10px] text-gray-500">Unique Word %</p>
                  <p className="text-lg font-bold text-gray-900">{result.keywordDensity}%</p>
                </div>
              </div>

              {/* Explain-WHY Criteria */}
              {result.criteria && result.criteria.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-gray-700">Detailed Analysis</h3>
                  {result.criteria.map((c, i) => (
                    <div key={i} className={`rounded-xl p-4 border ${c.status === 'pass' ? 'bg-green-50 border-green-200' : c.status === 'warn' ? 'bg-yellow-50 border-yellow-200' : 'bg-red-50 border-red-200'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-sm font-bold ${c.status === 'pass' ? 'text-green-700' : c.status === 'warn' ? 'text-yellow-700' : 'text-red-700'}`}>{c.name}</span>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded ${c.status === 'pass' ? 'bg-green-200 text-green-800' : c.status === 'warn' ? 'bg-yellow-200 text-yellow-800' : 'bg-red-200 text-red-800'}`}>
                          {c.status === 'pass' ? 'Pass' : c.status === 'warn' ? 'Review' : 'Issue'}
                        </span>
                      </div>
                      <div className="space-y-1.5 text-xs">
                        <p><span className="font-semibold text-gray-700">Detected:</span> <span className="text-gray-600">{c.whatDetected}</span></p>
                        <p><span className="font-semibold text-gray-700">Why it matters:</span> <span className="text-gray-600">{c.whyItMatters}</span></p>
                        <p><span className="font-semibold text-gray-700">Action:</span> <span className="text-gray-600">{c.whatToImprove}</span></p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {result.issues.length > 0 && (
                <div className="bg-red-50 rounded-xl p-4">
                  <h3 className="text-sm font-semibold text-red-700 mb-2">Issues ({result.issues.length})</h3>
                  <ul className="space-y-1">
                    {result.issues.map((issue, i) => (
                      <li key={i} className="text-xs text-red-600 flex gap-2"><span className="shrink-0">✗</span> {issue}</li>
                    ))}
                  </ul>
                </div>
              )}

              {result.suggestions.length > 0 && (
                <div className="bg-blue-50 rounded-xl p-4">
                  <h3 className="text-sm font-semibold text-blue-700 mb-2">Suggestions ({result.suggestions.length})</h3>
                  <ul className="space-y-1">
                    {result.suggestions.map((s, i) => (
                      <li key={i} className="text-xs text-blue-600 flex gap-2"><span className="shrink-0">→</span> {s}</li>
                    ))}
                  </ul>
                </div>
              )}

              <button onClick={handleSave} disabled={saved} className={`w-full py-2.5 rounded-xl font-medium text-sm transition-colors ${saved ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                {saved ? '✓ Saved to My Research' : 'Save to My Research'}
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
              Enter your title and click "Check Title".
            </div>
          )}
        </div>
      </div>

      {/* Educational Content */}
      <div className="border-t border-gray-100 p-6 space-y-6">
        {/* What this checker evaluates */}
        <div>
          <h3 className="text-lg font-bold text-gray-900 mb-3">What This Checker Evaluates</h3>
          <p className="text-sm text-gray-600 leading-relaxed mb-3">
            This tool analyzes your product title across 8 dimensions: length, keyword relevance, readability, special character usage, category matching, keyword repetition, price inclusion, and product attributes. Each dimension is scored independently with a clear explanation of what was detected and why it matters.
          </p>
        </div>

        {/* How to use */}
        <div>
          <h3 className="text-lg font-bold text-gray-900 mb-3">How to Use This Tool</h3>
          <ol className="text-sm text-gray-600 space-y-2 list-decimal list-inside">
            <li><strong>Enter your title</strong> — paste or type the title you want to evaluate.</li>
            <li><strong>Add your category</strong> (optional but recommended) — helps check if your category keyword appears in the title.</li>
            <li><strong>Select your platform</strong> — Amazon, Etsy, or Shopify have different title length limits.</li>
            <li><strong>Click "Check Title"</strong> — the tool scores each criterion and explains why it matters.</li>
          </ol>
        </div>

        {/* How the checks work */}
        <div>
          <h3 className="text-lg font-bold text-gray-900 mb-3">How the Checks Work</h3>
          <div className="text-sm text-gray-600 space-y-2">
            <p><strong>Length check:</strong> Compares your character count against the platform limit. Titles that are too short miss keyword opportunities; titles that too long get truncated.</p>
            <p><strong>Keyword relevance:</strong> Counts words and unique terms. More words means more potential search matches.</p>
            <p><strong>Readability:</strong> Checks for ALL CAPS or improper casing that reduces readability.</p>
            <p><strong>Keyword stuffing:</strong> Detects repeated words. Repeating the same keyword does not improve ranking — it reduces readability.</p>
            <p><strong>Category match:</strong> Checks if your entered category keyword appears in the title.</p>
            <p><strong>Product attributes:</strong> Looks for common attribute words (material, size, quantity, color) that help shoppers compare products.</p>
          </div>
        </div>

        {/* Worked example */}
        <div>
          <h3 className="text-lg font-bold text-gray-900 mb-3">Worked Example</h3>
          <div className="bg-gray-50 rounded-xl p-4 space-y-3 text-sm">
            <div>
              <p className="font-semibold text-gray-700">Input:</p>
              <p className="text-gray-600">Title: "Silicone Baking Mats Set of 3 — Non-Stick, Reusable, Heat Resistant, Large 16.5x11.6 inch"</p>
              <p className="text-gray-600">Category: Kitchen | Platform: Amazon</p>
            </div>
            <div>
              <p className="font-semibold text-gray-700">What would be detected:</p>
              <ul className="text-gray-600 space-y-1">
                <li>• Length: 85 characters — within Amazon's 200 limit</li>
                <li>• Keywords: 14 words — strong keyword coverage</li>
                <li>• Readability: Mixed case — professional appearance</li>
                <li>• Category: "Kitchen" — not in title (would be flagged as warning)</li>
                <li>• Attributes: "Silicone" (material), "Set of 3" (quantity), "16.5x11.6 inch" (size) — well covered</li>
                <li>• No price, no keyword stuffing, minimal special characters</li>
              </ul>
            </div>
            <div>
              <p className="font-semibold text-gray-700">Why this works:</p>
              <p className="text-gray-600">This title includes the product type, material, quantity, size, and two benefit keywords (non-stick, heat resistant). It's specific, scannable, and covers multiple search terms without repetition.</p>
            </div>
          </div>
        </div>

        {/* Common mistakes */}
        <div>
          <h3 className="text-lg font-bold text-gray-900 mb-3">Common Mistakes</h3>
          <ul className="text-sm text-gray-600 space-y-2">
            <li className="flex gap-2"><span className="text-red-500 shrink-0">✗</span> <strong>ALL CAPS TITLES</strong> — reduce readability and look spammy.</li>
            <li className="flex gap-2"><span className="text-red-500 shrink-0">✗</span> <strong>Repeating keywords</strong> — "Baking Mat Baking Sheet Baking Pad" does not improve ranking.</li>
            <li className="flex gap-2"><span className="text-red-500 shrink-0">✗</span> <strong>Prices in titles</strong> — wastes characters and becomes outdated.</li>
            <li className="flex gap-2"><span className="text-red-500 shrink-0">✗</span> <strong>Superlatives without evidence</strong> — "Best Seller" or "#1" claims need substantiation.</li>
            <li className="flex gap-2"><span className="text-red-500 shrink-0">✗</span> <strong>Too many special characters</strong> — ★, |, /, ! clutter the title.</li>
            <li className="flex gap-2"><span className="text-red-500 shrink-0">✗</span> <strong>Missing product attributes</strong> — material, size, and quantity help shoppers compare.</li>
          </ul>
        </div>

        {/* Limitations */}
        <div>
          <h3 className="text-lg font-bold text-gray-900 mb-3">Limitations</h3>
          <ul className="text-sm text-gray-600 space-y-1.5">
            <li className="flex gap-2"><span className="text-orange-500 shrink-0">→</span> This tool uses deterministic heuristics, not live Amazon search data.</li>
            <li className="flex gap-2"><span className="text-orange-500 shrink-0">→</span> It does not predict ranking, indexing, or conversion rates.</li>
            <li className="flex gap-2"><span className="text-orange-500 shrink-0">→</span> Amazon's actual search algorithm considers many factors beyond title text.</li>
            <li className="flex gap-2"><span className="text-orange-500 shrink-0">→</span> Category-specific guidelines vary — some categories have stricter rules.</li>
          </ul>
        </div>

        {/* Related questions */}
        <div>
          <h3 className="text-lg font-bold text-gray-900 mb-3">Related Questions</h3>
          <ul className="text-sm text-gray-600 space-y-1.5">
            <li className="flex gap-2"><span className="text-orange-500 shrink-0">→</span> How long should my Amazon product title be?</li>
            <li className="flex gap-2"><span className="text-orange-500 shrink-0">→</span> Should I put my brand name in the title?</li>
            <li className="flex gap-2"><span className="text-orange-500 shrink-0">→</span> How many keywords should I include in my title?</li>
            <li className="flex gap-2"><span className="text-orange-500 shrink-0">→</span> What happens if my title is too long on Amazon?</li>
          </ul>
        </div>

        {/* Related NicheScout tools */}
        <div>
          <h3 className="text-lg font-bold text-gray-900 mb-3">Related NicheScout Tools</h3>
          <div className="flex flex-wrap gap-2">
            <Link to="/tools/amazon-bullet-checker" className="inline-flex items-center gap-1 px-3 py-1.5 bg-orange-50 text-orange-600 rounded-lg text-xs font-medium hover:bg-orange-100 transition-colors">Bullet Checker</Link>
            <Link to="/tools/amazon-listing-analyzer" className="inline-flex items-center gap-1 px-3 py-1.5 bg-orange-50 text-orange-600 rounded-lg text-xs font-medium hover:bg-orange-100 transition-colors">Listing Analyzer</Link>
            <Link to="/create" className="inline-flex items-center gap-1 px-3 py-1.5 bg-orange-50 text-orange-600 rounded-lg text-xs font-medium hover:bg-orange-100 transition-colors">Create Listing</Link>
          </div>
        </div>
      </div>
    </ToolLayout>
  );
}
