import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ToolLayout } from '../../components/layout/ToolLayout';
import { saveAnalysis } from '../../storage';
import type { BulletCheckResult } from '../../types';

interface BulletCriterion {
  name: string;
  status: 'pass' | 'warn' | 'fail';
  score: number;
  maxScore: number;
  whatDetected: string;
  whyItMatters: string;
  whatToImprove: string;
}

export function BulletCheckerPage() {
  const [bullets, setBullets] = useState(['', '', '', '', '']);
  const [category, setCategory] = useState('');
  const [platform, setPlatform] = useState<'amazon' | 'etsy' | 'shopify'>('amazon');
  const [result, setResult] = useState<BulletCheckResult & { criteria: BulletCriterion[] } | null>(null);
  const [saved, setSaved] = useState(false);

  const maxChars = 500;

  const check = () => {
    const criteria: BulletCriterion[] = [];
    let totalScore = 0;

    const filled = bullets.filter(b => b.trim().length > 0);

    // 1. Bullet count
    if (filled.length === 0) {
      criteria.push({ name: 'Bullet Count', status: 'fail', score: 0, maxScore: 20, whatDetected: 'No bullet points provided.', whyItMatters: 'Bullet points are where you answer customer questions, highlight benefits, and differentiate from competitors. Without them, shoppers have no detailed information.', whatToImprove: 'Enter at least 3 bullet points. Amazon allows 5 — use all 5 for maximum impact.' });
    } else if (filled.length < 5) {
      criteria.push({ name: 'Bullet Count', status: 'warn', score: filled.length * 4, maxScore: 20, whatDetected: `${filled.length}/5 bullet points provided.`, whyItMatters: `You have ${5 - filled.length} empty bullet slots. Each empty slot is a missed opportunity to address customer concerns or highlight features.`, whatToImprove: `Add ${5 - filled.length} more bullet point(s) to cover key benefits, materials, dimensions, or use cases.` });
    } else {
      criteria.push({ name: 'Bullet Count', status: 'pass', score: 20, maxScore: 20, whatDetected: 'All 5 bullet points provided.', whyItMatters: 'Using all 5 bullet points maximizes the information available to shoppers.', whatToImprove: 'No change needed — all slots are filled.' });
    }
    totalScore += criteria[criteria.length - 1].score;

    if (filled.length === 0) {
      setResult({
        score: 0,
        bulletCount: 0,
        issues: criteria.filter(c => c.status === 'fail').map(c => c.whatDetected),
        suggestions: criteria.filter(c => c.status === 'warn').map(c => c.whatToImprove),
        criteria,
      });
      setSaved(false);
      return;
    }

    // Analyze each bullet
    let allCapsCount = 0;
    let shortCount = 0;
    let longCount = 0;
    let noPunctuationCount = 0;
    let noBenefitWords = 0;
    let repeatedStarts = 0;
    const firstWords: string[] = [];

    filled.forEach((b, i) => {
      const len = b.length;

      // 2. Length per bullet
      if (len > maxChars) {
        longCount++;
      } else if (len < 30) {
        shortCount++;
      }

      // 3. ALL CAPS
      if (b === b.toUpperCase() && len > 20) {
        allCapsCount++;
      }

      // 4. Punctuation
      if (!b.trim().match(/[.!?]$/)) {
        noPunctuationCount++;
      }

      // 5. Benefit words
      const benefitWords = ['free', 'easy', 'safe', 'durable', 'premium', 'guarantee', 'warranty', 'lifetime', 'professional', 'comfortable', 'lightweight', 'heavy-duty', 'versatile', 'eco-friendly', 'non-toxic', 'bpa-free', 'stainless', 'reusable', 'portable'];
      if (!benefitWords.some(w => b.toLowerCase().includes(w))) {
        noBenefitWords++;
      }

      // 6. First word
      const firstWord = b.split(/\s+/)[0]?.toLowerCase();
      if (firstWord) firstWords.push(firstWord);
    });

    // Check for repeated starts (all start with same word)
    if (firstWords.length >= 3) {
      const uniqueStarts = new Set(firstWords);
      if (uniqueStarts.size === 1) {
        repeatedStarts = firstWords.length;
      }
    }

    // Length issues
    if (longCount > 0) {
      criteria.push({ name: 'Bullet Length', status: 'fail', score: 0, maxScore: 15, whatDetected: `${longCount} bullet(s) exceed ${maxChars} characters.`, whyItMatters: `Bullets over ${maxChars} characters may be truncated. Shoppers scanning quickly will miss the end of your message.`, whatToImprove: 'Shorten each bullet to under 500 characters. Focus on the most important information first.' });
    } else if (shortCount >= 3) {
      criteria.push({ name: 'Bullet Length', status: 'warn', score: 6, maxScore: 15, whatDetected: `${shortCount} bullet(s) are under 30 characters.`, whyItMatters: 'Very short bullets provide little information and miss the opportunity to address customer concerns.', whatToImprove: 'Expand short bullets with specific details: dimensions, materials, use cases, or what\'s included.' });
    } else if (shortCount > 0) {
      criteria.push({ name: 'Bullet Length', status: 'warn', score: 10, maxScore: 15, whatDetected: `${shortCount} bullet(s) could be longer.`, whyItMatters: 'A few bullets are quite short. Adding more detail helps shoppers make decisions.', whatToImprove: 'Add 1-2 sentences of supporting detail to shorter bullets.' });
    } else {
      criteria.push({ name: 'Bullet Length', status: 'pass', score: 15, maxScore: 15, whatDetected: 'All bullets have appropriate length.', whyItMatters: 'Good-length bullets provide enough detail without overwhelming the reader.', whatToImprove: 'No change needed.' });
    }
    totalScore += criteria[criteria.length - 1].score;

    // ALL CAPS check
    if (allCapsCount === filled.length) {
      criteria.push({ name: 'Formatting', status: 'fail', score: 0, maxScore: 10, whatDetected: `All ${allCapsCount} bullet(s) are in ALL CAPS.`, whyItMatters: 'ALL CAPS is harder to read and looks unprofessional. It can also violate platform content policies.', whatToImprove: 'Use sentence case. Capitalize only the first letter and proper nouns.' });
    } else if (allCapsCount > 0) {
      criteria.push({ name: 'Formatting', status: 'warn', score: 5, maxScore: 10, whatDetected: `${allCapsCount} bullet(s) are in ALL CAPS.`, whyItMatters: 'ALL CAPS reduces readability and may look unprofessional in search results.', whatToImprove: 'Convert ALL CAPS bullets to sentence case.' });
    } else {
      criteria.push({ name: 'Formatting', status: 'pass', score: 10, maxScore: 10, whatDetected: 'All bullets use proper capitalization.', whyItMatters: 'Consistent, professional formatting improves readability.', whatToImprove: 'No change needed.' });
    }
    totalScore += criteria[criteria.length - 1].score;

    // Punctuation
    if (noPunctuationCount === filled.length) {
      criteria.push({ name: 'Punctuation', status: 'warn', score: 3, maxScore: 5, whatDetected: `${noPunctuationCount} bullet(s) lack ending punctuation.`, whyItMatters: 'Periods at the end of bullets create a polished, professional appearance.', whatToImprove: 'Add a period at the end of each bullet for consistency.' });
    } else if (noPunctuationCount > 0) {
      criteria.push({ name: 'Punctuation', status: 'warn', score: 4, maxScore: 5, whatDetected: `${noPunctuationCount} bullet(s) lack ending punctuation.`, whyItMatters: 'Inconsistent punctuation looks unpolished.', whatToImprove: 'Add periods to the remaining bullets.' });
    } else {
      criteria.push({ name: 'Punctuation', status: 'pass', score: 5, maxScore: 5, whatDetected: 'All bullets end with proper punctuation.', whyItMatters: 'Consistent punctuation looks professional and polished.', whatToImprove: 'No change needed.' });
    }
    totalScore += criteria[criteria.length - 1].score;

    // Benefit words
    if (noBenefitWords === filled.length) {
      criteria.push({ name: 'Benefit Language', status: 'fail', score: 0, maxScore: 15, whatDetected: 'No benefit-related words detected in any bullet.', whyItMatters: 'Shoppers buy benefits, not features. Without benefit language, your bullets read like dry specifications.', whatToImprove: 'Add benefit words: "durable", "easy to clean", "lightweight", "eco-friendly", "BPA-free", etc.' });
    } else if (noBenefitWords >= 3) {
      criteria.push({ name: 'Benefit Language', status: 'warn', score: 7, maxScore: 15, whatDetected: `${noBenefitWords}/${filled.length} bullets lack benefit-related words.`, whyItMatters: 'Some bullets focus only on features without explaining benefits to the customer.', whatToImprove: 'For each feature, explain the benefit: "Stainless steel (durable, easy to clean)".' });
    } else {
      criteria.push({ name: 'Benefit Language', status: 'pass', score: 15, maxScore: 15, whatDetected: `${filled.length - noBenefitWords}/${filled.length} bullets include benefit-related language.`, whyItMatters: 'Benefit-focused bullets help shoppers understand why your product matters to them.', whatToImprove: 'No change needed.' });
    }
    totalScore += criteria[criteria.length - 1].score;

    // Repetition check
    if (repeatedStarts > 0) {
      criteria.push({ name: 'Repetition', status: 'warn', score: 3, maxScore: 10, whatDetected: `All ${repeatedStarts} bullets start with the same word ("${firstWords[0]}").`, whyItMatters: 'Repeating the same opening word makes bullets feel monotonous. Each bullet should open with a unique benefit.', whatToImprove: 'Vary the first word of each bullet. Start with the benefit: "DURABLE —", "EASY —", "VERSATILE —".' });
    } else {
      criteria.push({ name: 'Repetition', status: 'pass', score: 10, maxScore: 10, whatDetected: 'Bullet openings are varied.', whyItMatters: 'Different opening words keep the reader engaged and highlight distinct benefits.', whatToImprove: 'No change needed.' });
    }
    totalScore += criteria[criteria.length - 1].score;

    setResult({
      score: Math.min(totalScore, 100),
      bulletCount: filled.length,
      issues: criteria.filter(c => c.status === 'fail').map(c => c.whatDetected),
      suggestions: criteria.filter(c => c.status === 'warn').map(c => c.whatToImprove),
      criteria,
    });
    setSaved(false);
  };

  const handleSave = () => {
    if (!result) return;
    saveAnalysis('bullet', `${filled.length} Bullets`, { bullets, category, platform }, result);
    setSaved(true);
  };

  const filled = bullets.filter(b => b.trim().length > 0);

  return (
    <ToolLayout title="Bullet Checker" description="Validate your bullet points for clarity, length, and optimization.">
      <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bullet Points</label>
            <div className="space-y-2">
              {bullets.map((b, i) => (
                <div key={i}>
                  <input type="text" value={b} onChange={e => { const next = [...bullets]; next[i] = e.target.value; setBullets(next); }} placeholder={`Bullet ${i + 1}`} className="w-full px-4 py-2 rounded-lg border border-gray-200 text-sm" />
                  <p className="text-[10px] text-gray-400 mt-0.5 text-right">{b.length}/500</p>
                </div>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <input type="text" value={category} onChange={e => setCategory(e.target.value)} placeholder="e.g. Kitchen" className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm" />
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
          </div>
          <button onClick={check} className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 rounded-xl transition-colors">
            Check Bullets
          </button>
        </div>

        <div>
          {result ? (
            <div className="space-y-4">
              <div className={`p-4 rounded-xl border ${result.score >= 70 ? 'bg-green-50 border-green-200' : result.score >= 40 ? 'bg-yellow-50 border-yellow-200' : 'bg-red-50 border-red-200'}`}>
                <p className="text-sm text-gray-500">Bullet Score</p>
                <p className={`text-3xl font-bold ${result.score >= 70 ? 'text-green-600' : result.score >= 40 ? 'text-yellow-600' : 'text-red-600'}`}>{result.score}/100</p>
                <p className="text-sm text-gray-500">{result.bulletCount}/5 bullet points provided</p>
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
              Enter your bullet points and click "Check Bullets".
            </div>
          )}
        </div>
      </div>

      {/* Educational Content */}
      <div className="border-t border-gray-100 p-6 space-y-6">
        {/* What this tool does */}
        <div>
          <h3 className="text-lg font-bold text-gray-900 mb-3">What This Tool Does</h3>
          <p className="text-sm text-gray-600 leading-relaxed mb-3">
            This tool evaluates your bullet points across 7 dimensions: count, length, formatting, punctuation, benefit language, and repetition. For each dimension, it explains what was detected, why it matters, and what to improve.
          </p>
        </div>

        {/* When to use */}
        <div>
          <h3 className="text-lg font-bold text-gray-900 mb-3">When to Use This Tool</h3>
          <ul className="text-sm text-gray-600 space-y-1.5">
            <li className="flex gap-2"><span className="text-orange-500 shrink-0">→</span> After writing your first draft of bullet points</li>
            <li className="flex gap-2"><span className="text-orange-500 shrink-0">→</span> Before publishing a new listing</li>
            <li className="flex gap-2"><span className="text-orange-500 shrink-0">→</span> When optimizing an underperforming listing</li>
            <li className="flex gap-2"><span className="text-orange-500 shrink-0">→</span> During A/B testing of different bullet variations</li>
          </ul>
        </div>

        {/* How it works */}
        <div>
          <h3 className="text-lg font-bold text-gray-900 mb-3">How It Works</h3>
          <div className="text-sm text-gray-600 space-y-2">
            <p><strong>Count check:</strong> Verifies you're using all 5 allowed bullet points. Each empty slot is a missed opportunity.</p>
            <p><strong>Length check:</strong> Ensures bullets are long enough to be informative but not so long they get truncated.</p>
            <p><strong>Formatting:</strong> Checks for ALL CAPS issues that reduce readability.</p>
            <p><strong>Benefit language:</strong> Looks for words that explain customer benefits (durable, easy, safe, etc.).</p>
            <p><strong>Repetition:</strong> Detects if all bullets start with the same word, which feels monotonous.</p>
          </div>
        </div>

        {/* Bullet point formula */}
        <div>
          <h3 className="text-lg font-bold text-gray-900 mb-3">The Bullet Point Formula</h3>
          <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-700">
            <p className="mb-2"><strong>BENEFIT IN CAPS</strong> — Supporting detail, specifications, and context.</p>
            <p className="text-xs text-gray-500">Example: "EASY TO CLEAN — Non-stick silicone surface wipes clean in seconds. Dishwasher safe. No scrubbing required."</p>
          </div>
        </div>

        {/* Worked example */}
        <div>
          <h3 className="text-lg font-bold text-gray-900 mb-3">Worked Example</h3>
          <div className="bg-gray-50 rounded-xl p-4 space-y-3 text-sm">
            <div>
              <p className="font-semibold text-gray-700">Input:</p>
              <ul className="text-gray-600 space-y-1">
                <li>1. "DURABLE — Made from food-grade silicone, heat resistant up to 480°F. BPA-free and non-toxic."</li>
                <li>2. "VERSATILE — Perfect for baking, roasting, kneading dough, and covering bowls. Replaces parchment paper."</li>
                <li>3. "EASY TO CLEAN — Non-stick surface wipes clean in seconds. Dishwasher safe. No scrubbing required."</li>
                <li>4. "SET OF 3 — Includes large (16.5x11.6"), medium (11.8x8.3"), and small (8.3x5.9") mats."</li>
                <li>5. "LIFETIME WARRANTY — We stand behind our product. If it ever fails, we replace it free."</li>
              </ul>
            </div>
            <div>
              <p className="font-semibold text-gray-700">What would be detected:</p>
              <ul className="text-gray-600 space-y-1">
                <li>• Count: 5/5 — all slots filled</li>
                <li>• Length: All within 500 characters</li>
                <li>• Benefit language: "durable", "versatile", "easy", "lifetime" detected</li>
                <li>• Formatting: Proper sentence case</li>
                <li>• No repeated openings — each starts with a different benefit</li>
              </ul>
            </div>
            <div>
              <p className="font-semibold text-gray-700">Why this works:</p>
              <p className="text-gray-600">Each bullet opens with a benefit keyword, followed by specific details. The bullets address different concerns: durability, versatility, ease of cleaning, size, and warranty. They're specific (exact temperatures, dimensions) rather than vague.</p>
            </div>
          </div>
        </div>

        {/* Common mistakes */}
        <div>
          <h3 className="text-lg font-bold text-gray-900 mb-3">Common Mistakes</h3>
          <ul className="text-sm text-gray-600 space-y-2">
            <li className="flex gap-2"><span className="text-red-500 shrink-0">✗</span> <strong>Feature-only bullets</strong> — "Made of silicone" doesn't tell the customer why it matters.</li>
            <li className="flex gap-2"><span className="text-red-500 shrink-0">✗</span> <strong>ALL CAPS bullets</strong> — harder to read, looks unprofessional.</li>
            <li className="flex gap-2"><span className="text-red-500 shrink-0">✗</span> <strong>Repeating the same opening word</strong> — "This product... This product... This product..."</li>
            <li className="flex gap-2"><span className="text-red-500 shrink-0">✗</span> <strong>Using fewer than 5 bullets</strong> — each empty slot is a missed opportunity.</li>
            <li className="flex gap-2"><span className="text-red-500 shrink-0">✗</span> <strong>Vague claims</strong> — "high quality" without specifics (what material? what standard?).</li>
            <li className="flex gap-2"><span className="text-red-500 shrink-0">✗</span> <strong>No punctuation</strong> — looks unfinished and unpolished.</li>
          </ul>
        </div>

        {/* Limitations */}
        <div>
          <h3 className="text-lg font-bold text-gray-900 mb-3">Limitations</h3>
          <ul className="text-sm text-gray-600 space-y-1.5">
            <li className="flex gap-2"><span className="text-orange-500 shrink-0">→</span> This tool uses deterministic heuristics, not live Amazon search data.</li>
            <li className="flex gap-2"><span className="text-orange-500 shrink-0">→</span> It does not predict ranking, indexing, conversion rates, or sales.</li>
            <li className="flex gap-2"><span className="text-orange-500 shrink-0">→</span> Benefit word detection is keyword-based — it may miss synonyms or context-specific benefits.</li>
            <li className="flex gap-2"><span className="text-orange-500 shrink-0">→</span> Category-specific guidelines vary — some categories have stricter content rules.</li>
          </ul>
        </div>

        {/* Related questions */}
        <div>
          <h3 className="text-lg font-bold text-gray-900 mb-3">Related Questions</h3>
          <ul className="text-sm text-gray-600 space-y-1.5">
            <li className="flex gap-2"><span className="text-orange-500 shrink-0">→</span> How should I structure my Amazon bullet points?</li>
            <li className="flex gap-2"><span className="text-orange-500 shrink-0">→</span> What's the difference between a feature and a benefit?</li>
            <li className="flex gap-2"><span className="text-orange-500 shrink-0">→</span> How many characters should each bullet be?</li>
            <li className="flex gap-2"><span className="text-orange-500 shrink-0">→</span> Should I put the most important bullet first?</li>
          </ul>
        </div>

        {/* Related NicheScout tools */}
        <div>
          <h3 className="text-lg font-bold text-gray-900 mb-3">Related NicheScout Tools</h3>
          <div className="flex flex-wrap gap-2">
            <Link to="/tools/amazon-title-checker" className="inline-flex items-center gap-1 px-3 py-1.5 bg-orange-50 text-orange-600 rounded-lg text-xs font-medium hover:bg-orange-100 transition-colors">Title Checker</Link>
            <Link to="/tools/amazon-listing-analyzer" className="inline-flex items-center gap-1 px-3 py-1.5 bg-orange-50 text-orange-600 rounded-lg text-xs font-medium hover:bg-orange-100 transition-colors">Listing Analyzer</Link>
            <Link to="/create" className="inline-flex items-center gap-1 px-3 py-1.5 bg-orange-50 text-orange-600 rounded-lg text-xs font-medium hover:bg-orange-100 transition-colors">Create Listing</Link>
          </div>
        </div>
      </div>
    </ToolLayout>
  );
}
