import { useState } from 'react';
import { ToolLayout } from '../../components/layout/ToolLayout';
import { saveAnalysis } from '../../storage';
import type { ListingAnalysisResult } from '../../types';

export function ListingAnalyzerPage() {
  const [title, setTitle] = useState('');
  const [bulletPoints, setBulletPoints] = useState(['', '', '', '', '']);
  const [description, setDescription] = useState('');
  const [searchTerms, setSearchTerms] = useState('');
  const [images, setImages] = useState('1');
  const [category, setCategory] = useState('');
  const [result, setResult] = useState<ListingAnalysisResult | null>(null);
  const [saved, setSaved] = useState(false);

  const analyze = () => {
    let titleScore = 0;
    let bulletsScore = 0;
    let descriptionScore = 0;
    let seoScore = 0;
    let imagesScore = 0;
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Title analysis (max 25)
    const tLen = title.length;
    if (tLen === 0) { issues.push('Title is empty.'); }
    else {
      if (tLen > 50) titleScore += 10; else titleScore += 5;
      if (tLen >= 100 && tLen <= 200) { titleScore += 10; }
      else if (tLen > 200) { issues.push('Title exceeds 200 characters.'); titleScore += 3; }
      else { recommendations.push('Title could be longer (aim for 100-200 characters).'); titleScore += 5; }
      if (/[A-Z]/.test(title) && /[a-z]/.test(title)) titleScore += 5;
    }

    // Bullets analysis (max 25)
    const filledBullets = bulletPoints.filter(b => b.trim().length > 0);
    if (filledBullets.length === 0) { issues.push('No bullet points provided.'); }
    else {
      bulletsScore += Math.min(filledBullets.length * 3, 15);
      filledBullets.forEach((b, i) => {
        if (b.length > 500) { issues.push(`Bullet ${i + 1} exceeds 500 characters.`); }
        else if (b.length < 20) { recommendations.push(`Bullet ${i + 1} is quite short — add more detail.`); }
        else { bulletsScore += 2; }
      });
      if (filledBullets.length < 5) { recommendations.push('Add all 5 bullet points for maximum impact.'); }
    }

    // Description analysis (max 25)
    const dLen = description.length;
    if (dLen === 0) { issues.push('Description is empty.'); }
    else {
      if (dLen > 500) descriptionScore += 10; else descriptionScore += 5;
      if (dLen >= 1000) descriptionScore += 10;
      else if (dLen >= 500) descriptionScore += 5;
      else { recommendations.push('Description is short — aim for 1000+ characters.'); }
      if (dLen > 2000) { issues.push('Description exceeds 2000 characters.'); descriptionScore -= 5; }
    }

    // SEO analysis (max 15)
    const terms = searchTerms.split(',').map(s => s.trim()).filter(Boolean);
    if (terms.length === 0) { issues.push('No search terms provided.'); }
    else {
      seoScore += Math.min(terms.length * 2, 10);
      if (terms.length >= 5) seoScore += 5;
      else { recommendations.push('Add more search terms (aim for 5-8).'); }
    }

    // Images (max 10)
    const imgCount = parseInt(images) || 0;
    if (imgCount === 0) { issues.push('No images specified.'); }
    else if (imgCount >= 7) { imagesScore = 10; }
    else if (imgCount >= 4) { imagesScore = 7; recommendations.push('Add more images (7+ recommended).'); }
    else { imagesScore = 3; issues.push('Very few images — aim for 7+ product images.'); }

    const totalScore = Math.min(titleScore + bulletsScore + descriptionScore + seoScore + imagesScore, 100);

    setResult({
      score: totalScore,
      titleScore,
      bulletsScore,
      descriptionScore,
      seoScore,
      imagesScore,
      issues,
      recommendations,
    });
    setSaved(false);
  };

  const handleSave = () => {
    if (!result) return;
    saveAnalysis('listing', title || 'Listing Analysis', { title, bulletPoints, description, searchTerms, images, category }, result);
    setSaved(true);
  };

  const scoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const scoreLabel = (score: number) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Needs Work';
    return 'Poor';
  };

  const titleExplanation = (title: string, score: number) => {
    if (title.length === 0) return 'Your title is empty. Amazon requires a title for every listing.';
    const reasons: string[] = [];
    if (title.length <= 50) reasons.push(`At ${title.length} characters, your title is too short. Amazon allows up to 200 characters — use them to include keywords, features, and size.`);
    if (title.length > 200) reasons.push(`At ${title.length} characters, your title exceeds Amazon's 200-character limit.`);
    if (title.length >= 100 && title.length <= 200) reasons.push(`Good length at ${title.length} characters — within the optimal 100-200 range.`);
    if (!/[A-Z]/.test(title) || !/[a-z]/.test(title)) reasons.push('Mix uppercase and lowercase for readability — all caps or all lowercase hurts conversion.');
    return reasons.join(' ');
  };

  const bulletsExplanation = (bullets: string[], score: number) => {
    const filled = bullets.filter(b => b.trim().length > 0);
    if (filled.length === 0) return 'No bullet points provided. Bullet points are your primary tool for communicating features and benefits.';
    const reasons: string[] = [];
    if (filled.length < 5) reasons.push(`Only ${filled.length}/5 bullets provided — each bullet is an opportunity to address a buyer concern.`);
    filled.forEach((b, i) => {
      if (b.length > 500) reasons.push(`Bullet ${i + 1} exceeds 500 characters — Amazon may truncate it.`);
      if (b.length < 20) reasons.push(`Bullet ${i + 1} is very short — add specific details about features, materials, or dimensions.`);
    });
    return reasons.join(' ');
  };

  const descriptionExplanation = (desc: string, score: number) => {
    if (desc.length === 0) return 'No description provided. The description is where you address objections and tell your product story.';
    const reasons: string[] = [];
    if (desc.length < 500) reasons.push(`At ${desc.length} characters, your description is thin. Aim for 1000+ characters to address buyer concerns and improve search visibility.`);
    if (desc.length >= 1000) reasons.push(`Good length at ${desc.length} characters — detailed descriptions help buyers make informed decisions.`);
    if (desc.length > 2000) reasons.push(`Description exceeds 2000 characters — some platforms may truncate it.`);
    return reasons.join(' ');
  };

  const seoExplanation = (terms: string, score: number) => {
    const termList = terms.split(',').map(s => s.trim()).filter(Boolean);
    if (termList.length === 0) return 'No search terms provided. Backend search terms help Amazon find your product for relevant queries.';
    const reasons: string[] = [];
    reasons.push(`${termList.length} search term(s) provided.`);
    if (termList.length < 5) reasons.push('Consider adding 5-8 search terms to cover synonyms, alternate spellings, and related queries.');
    return reasons.join(' ');
  };

  const imagesExplanation = (count: string, score: number) => {
    const n = parseInt(count) || 0;
    if (n === 0) return 'No images specified. Product images are the #1 factor in purchase decisions.';
    if (n >= 7) return `${n} images — excellent. 7+ images give buyers confidence and reduce return rates.`;
    if (n >= 4) return `${n} images — decent, but 7+ is recommended. Additional images could show the product in use, packaging, dimensions, or different angles.`;
    return `Only ${n} image(s) — this is a significant gap. Aim for 7+ images including main, lifestyle, detail, size comparison, and packaging.`;
  };

  return (
    <ToolLayout title="Listing Analyzer" description="Analyze and score your product listing for SEO and conversion.">
      <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Product Title</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Enter your product title" className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm" />
            <p className="text-xs text-gray-400 mt-1">{title.length}/200 characters</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bullet Points</label>
            <div className="space-y-2">
              {bulletPoints.map((b, i) => (
                <input key={i} type="text" value={b} onChange={e => { const next = [...bulletPoints]; next[i] = e.target.value; setBulletPoints(next); }} placeholder={`Bullet point ${i + 1}`} className="w-full px-4 py-2 rounded-lg border border-gray-200 text-sm" />
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Enter your product description" rows={4} className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm" />
            <p className="text-xs text-gray-400 mt-1">{description.length}/2000 characters</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Search Terms (comma-separated)</label>
            <input type="text" value={searchTerms} onChange={e => setSearchTerms(e.target.value)} placeholder="keyword1, keyword2, keyword3" className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Number of Images</label>
              <input type="number" value={images} onChange={e => setImages(e.target.value)} min="0" max="10" className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <input type="text" value={category} onChange={e => setCategory(e.target.value)} placeholder="e.g. Kitchen" className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm" />
            </div>
          </div>
          <button onClick={analyze} className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 rounded-xl transition-colors">
            Analyze Listing
          </button>
        </div>

        <div>
          {result ? (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 text-center">
                <p className="text-sm text-gray-500">Overall Score</p>
                <p className={`text-4xl font-bold ${scoreColor(result.score)}`}>{result.score}</p>
                <p className="text-sm text-gray-500">{scoreLabel(result.score)}</p>
              </div>

              <div className="grid grid-cols-5 gap-2">
                {[
                  { label: 'Title', score: result.titleScore, max: 25, explanation: titleExplanation(title, result.titleScore) },
                  { label: 'Bullets', score: result.bulletsScore, max: 25, explanation: bulletsExplanation(bulletPoints, result.bulletsScore) },
                  { label: 'Description', score: result.descriptionScore, max: 25, explanation: descriptionExplanation(description, result.descriptionScore) },
                  { label: 'SEO', score: result.seoScore, max: 15, explanation: seoExplanation(searchTerms, result.seoScore) },
                  { label: 'Images', score: result.imagesScore, max: 10, explanation: imagesExplanation(images, result.imagesScore) },
                ].map(s => (
                  <div key={s.label} className="text-center bg-gray-50 rounded-lg p-2">
                    <p className="text-[10px] text-gray-500">{s.label}</p>
                    <p className={`text-sm font-bold ${scoreColor((s.score / s.max) * 100)}`}>{s.score}/{s.max}</p>
                  </div>
                ))}
              </div>

              <div className="space-y-3">
                {[
                  { label: 'Title', score: result.titleScore, max: 25, explanation: titleExplanation(title, result.titleScore) },
                  { label: 'Bullets', score: result.bulletsScore, max: 25, explanation: bulletsExplanation(bulletPoints, result.bulletsScore) },
                  { label: 'Description', score: result.descriptionScore, max: 25, explanation: descriptionExplanation(description, result.descriptionScore) },
                  { label: 'SEO', score: result.seoScore, max: 15, explanation: seoExplanation(searchTerms, result.seoScore) },
                  { label: 'Images', score: result.imagesScore, max: 10, explanation: imagesExplanation(images, result.imagesScore) },
                ].filter(s => s.explanation).map(s => (
                  <div key={s.label} className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-gray-700">{s.label}</span>
                      <span className={`text-xs font-bold ${scoreColor((s.score / s.max) * 100)}`}>{s.score}/{s.max}</span>
                    </div>
                    <p className="text-xs text-gray-600 leading-relaxed">{s.explanation}</p>
                  </div>
                ))}
              </div>

              {result.issues.length > 0 && (
                <div className="bg-red-50 rounded-xl p-4">
                  <h3 className="text-sm font-semibold text-red-700 mb-2">Issues Found</h3>
                  <ul className="space-y-1">
                    {result.issues.map((issue, i) => (
                      <li key={i} className="text-xs text-red-600 flex gap-2">
                        <span className="shrink-0">✗</span> {issue}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {result.recommendations.length > 0 && (
                <div className="bg-blue-50 rounded-xl p-4">
                  <h3 className="text-sm font-semibold text-blue-700 mb-2">Recommendations</h3>
                  <ul className="space-y-1">
                    {result.recommendations.map((rec, i) => (
                      <li key={i} className="text-xs text-blue-600 flex gap-2">
                        <span className="shrink-0">→</span> {rec}
                      </li>
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
              Enter your listing details and click "Analyze Listing".
            </div>
          )}
        </div>
      </div>

      {/* Educational Content */}
      <div className="border-t border-gray-100 p-6 space-y-6">
        <div>
          <h3 className="text-lg font-bold text-gray-900 mb-3">What Makes a High-Converting Listing</h3>
          <p className="text-sm text-gray-600 leading-relaxed mb-3">
            Your product listing is your 24/7 salesperson. On Amazon, buyers make decisions in seconds — they scan the title, glance at images, skim bullet points, and maybe read the description. Every element needs to work together to communicate value quickly and build trust.
          </p>
          <p className="text-sm text-gray-600 leading-relaxed">
            This analyzer evaluates five key dimensions: title optimization, bullet point quality, description effectiveness, SEO keyword coverage, and image count. Each dimension is scored independently so you can identify exactly where to improve.
          </p>
        </div>

        <div>
          <h4 className="text-sm font-bold text-gray-900 mb-2">How the scoring works</h4>
          <ul className="text-sm text-gray-600 space-y-1.5">
            <li className="flex gap-2"><span className="text-orange-500 shrink-0">→</span> <strong>Title (25 points)</strong> — length, keyword inclusion, character case, platform compliance</li>
            <li className="flex gap-2"><span className="text-orange-500 shrink-0">→</span> <strong>Bullets (25 points)</strong> — count, length, detail, formatting</li>
            <li className="flex gap-2"><span className="text-orange-500 shrink-0">→</span> <strong>Description (25 points)</strong> — length, detail, completeness</li>
            <li className="flex gap-2"><span className="text-orange-500 shrink-0">→</span> <strong>SEO (15 points)</strong> — search term count and coverage</li>
            <li className="flex gap-2"><span className="text-orange-500 shrink-0">→</span> <strong>Images (10 points)</strong> — product image count (7+ recommended)</li>
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-bold text-gray-900 mb-2">Related NicheScout tools</h4>
          <div className="flex flex-wrap gap-2">
            <a href="/tools/amazon-title-checker" className="inline-flex items-center gap-1 px-3 py-1.5 bg-orange-50 text-orange-600 rounded-lg text-xs font-medium hover:bg-orange-100 transition-colors">Title Checker</a>
            <a href="/tools/amazon-bullet-checker" className="inline-flex items-center gap-1 px-3 py-1.5 bg-orange-50 text-orange-600 rounded-lg text-xs font-medium hover:bg-orange-100 transition-colors">Bullet Checker</a>
            <a href="/create" className="inline-flex items-center gap-1 px-3 py-1.5 bg-orange-50 text-orange-600 rounded-lg text-xs font-medium hover:bg-orange-100 transition-colors">Create Listing</a>
          </div>
        </div>
      </div>
    </ToolLayout>
  );
}
