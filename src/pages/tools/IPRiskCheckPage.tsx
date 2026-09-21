import { useState } from 'react';
import { ToolLayout } from '../../components/layout/ToolLayout';
import { saveAnalysis } from '../../storage';
import type { IPRiskResult } from '../../types';

const PRODUCT_TYPE_OPTIONS = [
  { value: 'generic' as const, label: 'Generic / White-label', desc: 'No brand name, no logo' },
  { value: 'private-label' as const, label: 'Private Label', desc: 'Your own brand' },
  { value: 'branded-authorized' as const, label: 'Branded (Authorized)', desc: 'Licensed or authorized reseller' },
  { value: 'branded-unauthorized' as const, label: 'Branded (No Authorization)', desc: 'Selling branded product without authorization' },
  { value: 'uses-another-brand' as const, label: "Uses Another Brand's IP", desc: 'Uses trademark, logo, or branding from another company' },
] as const;

export function IPRiskCheckPage() {
  const [brandName, setBrandName] = useState('');
  const [productType, setProductType] = useState<'generic' | 'private-label' | 'branded-authorized' | 'branded-unauthorized' | 'uses-another-brand'>('generic');
  const [trademarkStatus, setTrademarkStatus] = useState<'registered' | 'pending' | 'none' | 'unknown'>('unknown');
  const [hasLogo, setHasLogo] = useState(false);
  const [hasPackaging, setHasPackaging] = useState(false);
  const [supplierVerified, setSupplierVerified] = useState(false);
  const [supplierInvoices, setSupplierInvoices] = useState(false);
  const [productImages, setProductImages] = useState<'original' | 'supplier' | 'copied'>('original');
  const [listingContent, setListingContent] = useState<'original' | 'supplier' | 'copied'>('original');
  const [result, setResult] = useState<IPRiskResult | null>(null);
  const [saved, setSaved] = useState(false);

  const calculate = () => {
    let score = 0;
    const signals: string[] = [];
    const warnings: string[] = [];
    const recommendations: string[] = [];
    const sellerIntegrityNotes: string[] = [];

    // === PRODUCT TYPE (base risk) ===
    if (productType === 'generic') {
      score += 0;
      signals.push('Generic or white-label product — no brand-related IP risk signals from product type alone.');
    } else if (productType === 'private-label') {
      score += 0;
      signals.push('Private-label product under your own brand — low inherent IP risk from product type.');
    } else if (productType === 'branded-authorized') {
      score += 10;
      signals.push('Branded product — authorization status and documentation will affect risk level.');
    } else if (productType === 'branded-unauthorized') {
      score += 45;
      signals.push('Selling branded product without confirmed authorization — elevated IP risk.');
      warnings.push('Selling branded products without authorization may expose you to IP complaints, listing removal, or account action.');
    } else if (productType === 'uses-another-brand') {
      score += 70;
      signals.push("Product uses another company's trademark, logo, or branding — high IP risk unless properly authorized.");
      warnings.push("Using another company's intellectual property without authorization is a significant IP risk factor.");
    }

    // === TRADEMARK STATUS ===
    if (trademarkStatus === 'registered') {
      if (productType === 'uses-another-brand') {
        score += 15;
        signals.push('The brand has a registered trademark — unauthorized use of a registered mark carries higher legal risk.');
      } else if (productType === 'branded-unauthorized') {
        score += 10;
        signals.push('The brand has a registered trademark — authorized resellers should confirm their authorization covers this mark.');
      } else if (productType === 'branded-authorized') {
        signals.push('The brand has a registered trademark — your authorization should cover use of this mark.');
      } else {
        signals.push('Registered trademark noted, but this does not affect a generic/private-label product.');
      }
    } else if (trademarkStatus === 'pending') {
      if (productType === 'uses-another-brand') {
        score += 10;
        signals.push('Trademark is pending — risk may change if registration is granted.');
      } else if (productType === 'branded-unauthorized' || productType === 'branded-authorized') {
        score += 5;
        signals.push('Trademark is pending — risk may change if registration is granted.');
      } else {
        signals.push('Trademark is pending — not relevant for generic/private-label products.');
      }
    } else if (trademarkStatus === 'unknown') {
      if (productType === 'uses-another-brand' || productType === 'branded-unauthorized') {
        score += 10;
        signals.push('Trademark status unknown — research the brand before committing resources.');
      } else {
        signals.push('Trademark status unknown — not a concern for generic/private-label products.');
      }
    }

    // === LOGO / PACKAGING ===
    if (hasLogo) {
      if (productType === 'uses-another-brand' || productType === 'branded-unauthorized') {
        score += 10;
        warnings.push('Using a brand logo without authorization increases IP risk.');
      } else if (productType === 'branded-authorized') {
        signals.push('Brand logo present — consistent with authorized branded product.');
      } else {
        signals.push('Logo noted — not an IP concern for generic/private-label products.');
      }
    }
    if (hasPackaging) {
      if (productType === 'uses-another-brand' || productType === 'branded-unauthorized') {
        score += 10;
        warnings.push('Using branded packaging without authorization increases IP risk.');
      } else if (productType === 'branded-authorized') {
        signals.push('Branded packaging — expected for authorized branded products.');
      } else {
        signals.push('Packaging noted — not an IP concern for generic/private-label products.');
      }
    }

    // === SUPPLIER ===
    if (!supplierVerified) {
      if (productType === 'uses-another-brand' || productType === 'branded-unauthorized') {
        score += 15;
        recommendations.push('Verify your supplier is authorized to distribute this brand. Request authorization documentation.');
      } else if (productType === 'branded-authorized') {
        score += 5;
        recommendations.push('Confirm your supplier is authorized for this brand.');
      } else {
        score += 0;
        signals.push('Supplier not verified — standard due diligence recommended for any supplier.');
      }
    } else {
      signals.push('Supplier is verified — positive signal for sourcing legitimacy.');
    }
    if (!supplierInvoices) {
      if (productType === 'uses-another-brand' || productType === 'branded-unauthorized' || productType === 'branded-authorized') {
        score += 10;
        recommendations.push('Keep supplier invoices and purchase documentation as proof of legitimate sourcing.');
      } else {
        recommendations.push('Keep supplier invoices as standard sourcing documentation.');
      }
    } else {
      signals.push('Supplier invoices available — positive signal for sourcing legitimacy.');
    }

    // === PRODUCT IMAGES ===
    if (productImages === 'copied') {
      score += 25;
      warnings.push('Using images copied from another seller or brand is a strong IP risk signal. Original or licensed images are recommended.');
    } else if (productImages === 'supplier') {
      score += 0;
      signals.push('Supplier-provided images — acceptable, though original photos are preferred.');
    } else {
      signals.push('Original product images — no IP risk signal from image sourcing.');
    }

    // === LISTING CONTENT ===
    if (listingContent === 'copied') {
      score += 25;
      warnings.push('Copying listing text from other sellers or brands is a strong IP risk signal. Original content is recommended.');
    } else if (listingContent === 'supplier') {
      score += 0;
      signals.push('Supplier-provided content — acceptable, though rewriting for uniqueness is recommended.');
    } else {
      signals.push('Original listing content — no IP risk signal from content sourcing.');
    }

    // === SELLER INTEGRITY ===
    sellerIntegrityNotes.push('Never use fake, counterfeit, copied, or unauthorized intellectual property.');
    sellerIntegrityNotes.push('Always source branded products through credible, legitimate suppliers and retain appropriate purchase documentation.');
    sellerIntegrityNotes.push("Do not copy another brand's trademarks, logos, packaging, product images, listing content, or brand identity without authorization.");
    sellerIntegrityNotes.push('Do not use deceptive techniques or fake multi-IP/browser setups to bypass marketplace restrictions, account controls, anti-abuse systems, or enforcement.');

    // === SCORE CAP ===
    score = Math.min(score, 100);

    // === RISK LEVEL ===
    const riskLevel: IPRiskResult['riskLevel'] =
      score < 15 ? 'low' : score < 40 ? 'medium' : score < 65 ? 'high' : 'critical';

    const riskLabel = riskLevel === 'low'
      ? 'No obvious IP risk signal'
      : riskLevel === 'medium'
      ? 'Review recommended'
      : riskLevel === 'high'
      ? 'Potential IP concern'
      : 'Significant IP concern — investigate thoroughly';

    // === WHAT TO REVIEW ===
    const whatToReview: string[] = [];
    if (productType !== 'generic' && productType !== 'private-label') {
      whatToReview.push('Supplier authorization and brand licensing documentation');
    }
    if (!supplierInvoices) {
      whatToReview.push('Purchase invoices and proof of legitimate sourcing');
    }
    if (productImages === 'copied' || listingContent === 'copied') {
      whatToReview.push('Replace copied images/content with original or licensed materials');
    }
    if (productType === 'uses-another-brand' || productType === 'branded-unauthorized') {
      whatToReview.push('Trademark ownership and your authorization to use the mark');
      whatToReview.push('Whether your supplier is an authorized distributor for this brand');
    }
    if (whatToReview.length === 0) {
      whatToReview.push('Standard due diligence — verify supplier reputation and keep documentation on file');
    }

    // === NEXT STEP ===
    let nextStep = '';
    if (riskLevel === 'low') {
      nextStep = 'No obvious IP risk indicators detected based on the information provided. Proceed with standard sourcing precautions: verify your supplier, keep invoices, and use original content.';
    } else if (riskLevel === 'medium') {
      nextStep = 'Some factors warrant closer review before committing to this product. Verify supplier authorization, confirm trademark status, and ensure you have proper documentation.';
    } else if (riskLevel === 'high') {
      nextStep = 'Multiple IP risk signals detected. Before investing further, verify you have authorization to sell this branded product, confirm your supplier is legitimate, and consider consulting an IP attorney if you plan to sell branded goods at scale.';
    } else {
      nextStep = 'Significant IP risk factors identified. Strongly reconsider this product or obtain proper authorization before proceeding. Selling products that use another company\'s IP without authorization can result in listing removal, account suspension, or legal action.';
    }

    // === RECOMMENDATIONS (final pass) ===
    if (riskLevel === 'low') {
      recommendations.push('Standard precautions apply: verify supplier, retain invoices, use original content.');
    } else if (riskLevel === 'medium') {
      recommendations.push('Verify supplier authorization and confirm trademark status before committing inventory.');
    } else if (riskLevel === 'high') {
      recommendations.push('Verify authorization to sell this branded product and consult documentation before proceeding.');
    } else {
      recommendations.push('Strongly reconsider this product or obtain proper authorization. Consider consulting a qualified IP attorney.');
    }

    setResult({ riskLevel, score, riskLabel, signals, whatToReview, nextStep, warnings, recommendations, sellerIntegrityNotes });
    setSaved(false);
  };

  const handleSave = () => {
    if (!result) return;
    saveAnalysis('ip', brandName || 'Brand Check', { brandName, productType, trademarkStatus, hasLogo, hasPackaging, supplierVerified, supplierInvoices, productImages, listingContent }, result);
    setSaved(true);
  };

  const scoreColor = (level: string) => {
    if (level === 'low') return 'text-green-700 bg-green-50 border-green-200';
    if (level === 'medium') return 'text-yellow-700 bg-yellow-50 border-yellow-200';
    if (level === 'high') return 'text-orange-700 bg-orange-50 border-orange-200';
    return 'text-red-700 bg-red-50 border-red-200';
  };

  return (
    <ToolLayout title="IP Risk Check" description="Evaluate intellectual property risks for a product before sourcing or listing.">
      <div className="p-6">
        {/* Prominent Disclaimer */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
          <div className="flex gap-3">
            <svg className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
            <div className="text-xs text-amber-800 leading-relaxed">
              <p className="font-semibold mb-1">This is a risk-screening research tool only — not legal advice.</p>
              <p>This tool provides a preliminary risk assessment based on the information you enter. It does not access Amazon's internal IP database, determine legal clearance, or guarantee safety from infringement. Always consult a qualified attorney for IP-related decisions.</p>
            </div>
          </div>
        </div>

        {/* Seller Integrity Warning */}
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
          <div className="flex gap-3">
            <svg className="w-5 h-5 text-red-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
            <div className="text-xs text-red-800 leading-relaxed">
              <p className="font-bold mb-1">SELLER INTEGRITY WARNING</p>
              <ul className="space-y-1 list-disc list-inside">
                <li>Never use fake, counterfeit, copied, or unauthorized intellectual property.</li>
                <li>Always source branded products through credible, legitimate suppliers and retain purchase documentation.</li>
                <li>Do not copy trademarks, logos, packaging, product images, listing content, or brand identity without authorization.</li>
                <li>Do not use deceptive techniques or fake multi-IP/browser setups to bypass marketplace restrictions, account controls, anti-abuse systems, or enforcement.</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-5">
          {/* Brand Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Brand Name (optional)</label>
            <input type="text" value={brandName} onChange={e => setBrandName(e.target.value)} placeholder="e.g. Nike, Disney, or leave blank for generic" className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm" />
          </div>

          {/* Product Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Product Type</label>
            <div className="space-y-2">
              {PRODUCT_TYPE_OPTIONS.map(opt => (
                <button key={opt.value} onClick={() => setProductType(opt.value)} className={`w-full text-left px-4 py-3 rounded-lg border-2 transition-all ${productType === opt.value ? 'border-orange-500 bg-orange-50' : 'border-gray-200 hover:border-gray-300'}`}>
                  <span className={`text-sm font-medium ${productType === opt.value ? 'text-orange-700' : 'text-gray-700'}`}>{opt.label}</span>
                  <span className="block text-xs text-gray-500 mt-0.5">{opt.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Trademark Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Trademark Status</label>
            <div className="grid grid-cols-2 gap-2">
              {(['registered', 'pending', 'none', 'unknown'] as const).map(s => (
                <button key={s} onClick={() => setTrademarkStatus(s)} className={`px-3 py-2 rounded-lg text-sm font-medium border-2 transition-all ${trademarkStatus === s ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-gray-200 text-gray-600'}`}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Checkboxes */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={hasLogo} onChange={e => setHasLogo(e.target.checked)} className="rounded" /> Uses branded logo
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={hasPackaging} onChange={e => setHasPackaging(e.target.checked)} className="rounded" /> Uses branded packaging
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={supplierVerified} onChange={e => setSupplierVerified(e.target.checked)} className="rounded" /> Supplier is verified/authorized
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={supplierInvoices} onChange={e => setSupplierInvoices(e.target.checked)} className="rounded" /> Have supplier invoices
            </label>
          </div>

          {/* Product Images */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Product Images</label>
            <div className="grid grid-cols-3 gap-2">
              {(['original', 'supplier', 'copied'] as const).map(t => (
                <button key={t} onClick={() => setProductImages(t)} className={`px-3 py-2 rounded-lg text-sm font-medium border-2 transition-all ${productImages === t ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-gray-200 text-gray-600'}`}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Listing Content */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Listing Content</label>
            <div className="grid grid-cols-3 gap-2">
              {(['original', 'supplier', 'copied'] as const).map(t => (
                <button key={t} onClick={() => setListingContent(t)} className={`px-3 py-2 rounded-lg text-sm font-medium border-2 transition-all ${listingContent === t ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-gray-200 text-gray-600'}`}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <button onClick={calculate} className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 rounded-xl transition-colors">
            Check IP Risk
          </button>
        </div>

        {/* Results */}
        <div>
          {result ? (
            <div className="space-y-4">
              {/* Risk Level Card */}
              <div className={`p-4 rounded-xl border ${scoreColor(result.riskLevel)}`}>
                <p className="text-xs opacity-70 uppercase tracking-wide font-medium">Research Signal</p>
                <p className="text-2xl font-bold mt-1">{result.riskLabel}</p>
                <p className="text-xs opacity-70 mt-1">Score: {result.score}/100</p>
              </div>

              {/* Why This Result */}
              <div className="bg-gray-50 rounded-xl p-4">
                <h3 className="text-sm font-semibold text-gray-800 mb-2">Why This Result</h3>
                <ul className="space-y-1.5">
                  {result.signals.map((s, i) => (
                    <li key={i} className="text-xs text-gray-600 flex gap-2">
                      <span className="shrink-0 mt-0.5">•</span> {s}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Warnings */}
              {result.warnings.length > 0 && (
                <div className="bg-red-50 rounded-xl p-4">
                  <h3 className="text-sm font-semibold text-red-700 mb-2">Warnings</h3>
                  <ul className="space-y-1">
                    {result.warnings.map((w, i) => (
                      <li key={i} className="text-xs text-red-600 flex gap-2">
                        <span className="shrink-0">⚠</span> {w}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* What to Review */}
              <div className="bg-blue-50 rounded-xl p-4">
                <h3 className="text-sm font-semibold text-blue-700 mb-2">What to Review</h3>
                <ul className="space-y-1">
                  {result.whatToReview.map((r, i) => (
                    <li key={i} className="text-xs text-blue-600 flex gap-2">
                      <span className="shrink-0">→</span> {r}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Next Step */}
              <div className="bg-gray-50 rounded-xl p-4">
                <h3 className="text-sm font-semibold text-gray-800 mb-2">Next Step</h3>
                <p className="text-xs text-gray-600 leading-relaxed">{result.nextStep}</p>
              </div>

              {/* Recommendations */}
              {result.recommendations.length > 0 && (
                <div className="bg-orange-50 rounded-xl p-4">
                  <h3 className="text-sm font-semibold text-orange-700 mb-2">Recommendations</h3>
                  <ul className="space-y-1">
                    {result.recommendations.map((r, i) => (
                      <li key={i} className="text-xs text-orange-600 flex gap-2">
                        <span className="shrink-0">→</span> {r}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Seller Integrity */}
              <div className="bg-red-50 rounded-xl p-4">
                <h3 className="text-sm font-semibold text-red-700 mb-2">Seller Integrity Requirements</h3>
                <ul className="space-y-1.5">
                  {result.sellerIntegrityNotes.map((n, i) => (
                    <li key={i} className="text-xs text-red-600 flex gap-2">
                      <span className="text-red-400 shrink-0">●</span> {n}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Save */}
              <button onClick={handleSave} disabled={saved} className={`w-full py-2.5 rounded-xl font-medium text-sm transition-colors ${saved ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                {saved ? '✓ Saved to My Research' : 'Save to My Research'}
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
              Fill in the product details and click "Check IP Risk".
            </div>
          )}
        </div>
      </div>
      </div>

      {/* Educational Content */}
      <div className="border-t border-gray-100 p-6 space-y-6">
        {/* What This Tool Does */}
        <div>
          <h3 className="text-lg font-bold text-gray-900 mb-3">What This IP Risk Check Does</h3>
          <p className="text-sm text-gray-600 leading-relaxed mb-3">
            This tool provides a preliminary IP risk screening based on the information you enter about your product, supplier, and sourcing. It evaluates signals like trademark status, branding elements, supplier verification, and content originality to help you identify potential red flags before committing to a product.
          </p>
          <p className="text-sm text-gray-600 leading-relaxed">
            It does not access Amazon's internal IP database, perform live trademark searches, or provide legal clearance. Results are heuristic signals based on your inputs, not legal conclusions.
          </p>
        </div>

        {/* When to Use It */}
        <div>
          <h4 className="text-sm font-bold text-gray-900 mb-2">When to Use It</h4>
          <ul className="text-sm text-gray-600 space-y-1.5">
            <li className="flex gap-2"><span className="text-orange-500 shrink-0">→</span> Before committing inventory to a branded product</li>
            <li className="flex gap-2"><span className="text-orange-500 shrink-0">→</span> When evaluating a new supplier for branded goods</li>
            <li className="flex gap-2"><span className="text-orange-500 shrink-0">→</span> When your listing uses supplier-provided images or content</li>
            <li className="flex gap-2"><span className="text-orange-500 shrink-0">→</span> When you are unsure whether your product could trigger an IP complaint</li>
          </ul>
        </div>

        {/* How It Works */}
        <div>
          <h4 className="text-sm font-bold text-gray-900 mb-2">How It Works</h4>
          <p className="text-sm text-gray-600 leading-relaxed mb-2">
            The tool evaluates five categories of signals and assigns a research risk score from 0 to 100:
          </p>
          <ul className="text-sm text-gray-600 space-y-1.5">
            <li className="flex gap-2"><span className="text-orange-500 shrink-0">→</span> <strong>Product type</strong> — generic, private-label, authorized branded, unauthorized branded, or uses another brand's IP</li>
            <li className="flex gap-2"><span className="text-orange-500 shrink-0">→</span> <strong>Trademark status</strong> — registered, pending, unknown, or none</li>
            <li className="flex gap-2"><span className="text-orange-500 shrink-0">→</span> <strong>Brand elements</strong> — logos, packaging, and branded materials</li>
            <li className="flex gap-2"><span className="text-orange-500 shrink-0">→</span> <strong>Supplier verification</strong> — authorization and invoice documentation</li>
            <li className="flex gap-2"><span className="text-orange-500 shrink-0">→</span> <strong>Content originality</strong> — product images and listing text origin</li>
          </ul>
        </div>

        {/* Worked Examples */}
        <div className="bg-gray-50 rounded-xl p-4">
          <h4 className="text-sm font-bold text-gray-900 mb-3">Worked Examples</h4>
          <div className="space-y-4">
            <div className="border-l-4 border-green-400 pl-3">
              <p className="text-xs font-semibold text-green-700 mb-1">Example A — Generic/private-label product</p>
              <p className="text-xs text-gray-600">Product type: Generic. No brand name. Original images and content. Supplier verified with invoices.</p>
              <p className="text-xs text-green-600 mt-1">Result: No obvious IP risk signal. Generic products with no brand association carry minimal inherent IP risk.</p>
            </div>
            <div className="border-l-4 border-blue-400 pl-3">
              <p className="text-xs font-semibold text-blue-700 mb-1">Example B — Branded product from authorized supplier</p>
              <p className="text-xs text-gray-600">Product type: Branded (Authorized). Registered trademark. Supplier verified. Invoices available. Original images.</p>
              <p className="text-xs text-blue-600 mt-1">Result: No obvious IP risk signal. Authorized reseller with proper documentation — low risk.</p>
            </div>
            <div className="border-l-4 border-orange-400 pl-3">
              <p className="text-xs font-semibold text-orange-700 mb-1">Example C — Branded product, no authorization, copied images</p>
              <p className="text-xs text-gray-600">Product type: Branded (No Authorization). Registered trademark. Logo present. Copied images. No supplier docs.</p>
              <p className="text-xs text-orange-600 mt-1">Result: Potential IP concern. Multiple risk signals — authorization, images, and documentation need review.</p>
            </div>
            <div className="border-l-4 border-red-400 pl-3">
              <p className="text-xs font-semibold text-red-700 mb-1">Example D — Uses another brand's trademark, counterfeit packaging</p>
              <p className="text-xs text-gray-600">Product type: Uses Another Brand's IP. Registered trademark. Logo and packaging present. Copied images and content. No authorization.</p>
              <p className="text-xs text-red-600 mt-1">Result: Significant IP concern. Multiple strong risk signals — do not proceed without proper authorization.</p>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-3 italic">These are examples of the screening logic, not legal conclusions.</p>
        </div>

        {/* Common Mistakes */}
        <div>
          <h4 className="text-sm font-bold text-gray-900 mb-2">Common Mistakes</h4>
          <ul className="text-sm text-gray-600 space-y-1.5">
            <li className="flex gap-2"><span className="text-red-500 shrink-0">✗</span> Assuming branded product = automatically infringing. A legitimate authorized reseller with documentation is materially different from a counterfeiter.</li>
            <li className="flex gap-2"><span className="text-red-500 shrink-0">✗</span> Relying on "everyone else does it" — other sellers' listings may also be at risk.</li>
            <li className="flex gap-2"><span className="text-red-500 shrink-0">✗</span> Skipping supplier verification because the price seems good.</li>
            <li className="flex gap-2"><span className="text-red-500 shrink-0">✗</span> Using copied listing content or images to "save time" — this is a strong IP risk signal.</li>
          </ul>
        </div>

        {/* What the Result Does NOT Mean */}
        <div className="bg-amber-50 rounded-xl p-4">
          <h4 className="text-sm font-bold text-amber-800 mb-2">What This Result Does NOT Mean</h4>
          <ul className="text-sm text-amber-700 space-y-1.5">
            <li className="flex gap-2"><span className="shrink-0">✗</span> It does not mean your product is free from infringement risk or that no further research is needed</li>
            <li className="flex gap-2"><span className="shrink-0">✗</span> It does not determine whether a trademark is registered or a patent is active</li>
            <li className="flex gap-2"><span className="shrink-0">✗</span> It does not guarantee Amazon, Etsy, or Shopify will approve your listing</li>
            <li className="flex gap-2"><span className="shrink-0">✗</span> It does not constitute legal advice or a legal opinion</li>
            <li className="flex gap-2"><span className="shrink-0">✗</span> It does not access any marketplace's internal IP enforcement database</li>
          </ul>
        </div>

        {/* What to Verify Before Sourcing */}
        <div>
          <h4 className="text-sm font-bold text-gray-900 mb-2">What to Verify Before Sourcing</h4>
          <ul className="text-sm text-gray-600 space-y-1.5">
            <li className="flex gap-2"><span className="text-green-500 shrink-0">✓</span> Supplier is an authorized distributor for the brand (request documentation)</li>
            <li className="flex gap-2"><span className="text-green-500 shrink-0">✓</span> You have invoices and purchase records for every transaction</li>
            <li className="flex gap-2"><span className="text-green-500 shrink-0">✓</span> Trademark status — search USPTO, EUIPO, or relevant trademark databases</li>
            <li className="flex gap-2"><span className="text-green-500 shrink-0">✓</span> Product images are original or properly licensed</li>
            <li className="flex gap-2"><span className="text-green-500 shrink-0">✓</span> Listing content is original or properly licensed</li>
            <li className="flex gap-2"><span className="text-green-500 shrink-0">✓</span> Packaging and branding appear authentic, not copied</li>
          </ul>
        </div>

        {/* Limitations */}
        <div>
          <h4 className="text-sm font-bold text-gray-900 mb-2">Limitations</h4>
          <ul className="text-sm text-gray-600 space-y-1.5">
            <li className="flex gap-2"><span className="text-gray-400 shrink-0">•</span> This tool uses deterministic heuristic logic, not live IP database lookups</li>
            <li className="flex gap-2"><span className="text-gray-400 shrink-0">•</span> It cannot verify whether a trademark is actually registered or a patent is active</li>
            <li className="flex gap-2"><span className="text-gray-400 shrink-0">•</span> It cannot determine whether Amazon will approve or reject a listing</li>
            <li className="flex gap-2"><span className="text-gray-400 shrink-0">•</span> Results depend entirely on the accuracy of the information you enter</li>
            <li className="flex gap-2"><span className="text-gray-400 shrink-0">•</span> For definitive IP guidance, consult a qualified intellectual property attorney</li>
          </ul>
        </div>

        {/* Related Tools */}
        <div>
          <h4 className="text-sm font-bold text-gray-900 mb-2">Related NicheScout Tools</h4>
          <div className="flex flex-wrap gap-2">
            <a href="/tools/amazon-restriction-check" className="inline-flex items-center gap-1 px-3 py-1.5 bg-orange-50 text-orange-600 rounded-lg text-xs font-medium hover:bg-orange-100 transition-colors">Restriction Check</a>
            <a href="/tools/sourcing-risk-check" className="inline-flex items-center gap-1 px-3 py-1.5 bg-orange-50 text-orange-600 rounded-lg text-xs font-medium hover:bg-orange-100 transition-colors">Sourcing Risk Check</a>
            <a href="/tools/amazon-listing-analyzer" className="inline-flex items-center gap-1 px-3 py-1.5 bg-orange-50 text-orange-600 rounded-lg text-xs font-medium hover:bg-orange-100 transition-colors">Listing Analyzer</a>
            <a href="/tools/product-research-checklist" className="inline-flex items-center gap-1 px-3 py-1.5 bg-orange-50 text-orange-600 rounded-lg text-xs font-medium hover:bg-orange-100 transition-colors">Research Checklist</a>
          </div>
        </div>
      </div>
    </ToolLayout>
  );
}
