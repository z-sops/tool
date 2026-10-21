import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const SITE_URL = 'https://listingai-woad.vercel.app';
const SITE_NAME = 'NicheScout';

export interface SEOData {
  title: string;
  description: string;
  canonical?: string;
  noindex?: boolean;
  nofollow?: boolean;
  ogType?: string;
  ogImage?: string;
  jsonLd?: Record<string, any>;
}

const SEO_MAP: Record<string, SEOData> = {
  '/': {
    title: 'NicheScout — E-commerce Product & Niche Research Platform',
    description: 'Free product research, niche analysis, profit calculators, and AI listing generator for Amazon, Etsy & Shopify sellers. Explore, analyze, calculate, learn, and create — all in one place.',
    ogType: 'website',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'NicheScout',
      url: SITE_URL,
      description: 'Free e-commerce product & niche research platform for Amazon, Etsy & Shopify sellers.',
      potentialAction: {
        '@type': 'SearchAction',
        target: `${SITE_URL}/explore?search={search_term_string}`,
        'query-input': 'required name=search_term_string',
      },
    },
  },
  '/explore': {
    title: 'Explore Products — Discover Profitable Niches | NicheScout',
    description: 'Browse and analyze profitable e-commerce products across Amazon, Etsy & Shopify categories. Find niches, check pricing, and assess market opportunity.',
    ogType: 'website',
  },
  '/learn': {
    title: 'E-commerce Research Guides — Learn Product Research | NicheScout',
    description: 'Master product research, listing optimization, and business planning with step-by-step guides for Amazon, Etsy & Shopify sellers.',
    ogType: 'website',
  },
  '/create': {
    title: 'AI Listing Generator — Create Optimized Product Listings | NicheScout',
    description: 'Generate AI-powered product listings optimized for Amazon, Etsy, or Shopify. Create titles, bullet points, descriptions, and search terms.',
    ogType: 'website',
    noindex: true,
  },
  '/compare': {
    title: 'Compare Products — Side-by-Side Product Analysis | NicheScout',
    description: 'Compare products side-by-side across price, ratings, competition, profit margins, and risk factors to find the best opportunity.',
    ogType: 'website',
  },
  '/my-research': {
    title: 'My Research — Saved Products, Analyses & Notes | NicheScout',
    description: 'Access your saved product research, comparisons, analyses, and notes. All data stored locally in your browser.',
    ogType: 'website',
    noindex: true,
  },
  '/tools/amazon-profit-calculator': {
    title: 'Amazon Profit Calculator — Estimate FBA Profit & Margin | NicheScout',
    description: 'Calculate Amazon FBA profit margins with a complete fee breakdown including referral fees, fulfillment fees, shipping, and COGS.',
    ogType: 'website',
  },
  '/tools/amazon-roi-calculator': {
    title: 'Amazon ROI Calculator — Estimate Return on Investment | NicheScout',
    description: 'Calculate ROI and payback period for Amazon product launches. Factor in inventory, launch costs, and monthly profit projections.',
    ogType: 'website',
  },
  '/tools/amazon-pricing-calculator': {
    title: 'Amazon Pricing Calculator — Calculate Target Selling Price | NicheScout',
    description: 'Determine optimal product pricing based on costs, target margins, Amazon fees, and competitor pricing analysis.',
    ogType: 'website',
  },
  '/tools/amazon-ip-check': {
    title: 'Amazon IP Risk Check — Evaluate Intellectual Property Risks | NicheScout',
    description: 'Screen products for trademark, patent, and IP risks before launching on Amazon, Etsy, or Shopify. Research-oriented risk assessment.',
    ogType: 'website',
  },
  '/tools/amazon-restriction-check': {
    title: 'Amazon Restriction Check — Check Category & Brand Restrictions | NicheScout',
    description: 'Check if your product category or brand requires approval on Amazon. Research signal for marketplace restrictions.',
    ogType: 'website',
  },
  '/tools/sourcing-risk-check': {
    title: 'Sourcing Risk Check — Assess Supplier Reliability | NicheScout',
    description: 'Evaluate supplier reliability and sourcing risks based on contract terms, communication, certifications, and payment terms.',
    ogType: 'website',
  },
  '/tools/amazon-listing-analyzer': {
    title: 'Amazon Listing Analyzer — Analyze Title, Bullets & Description | NicheScout',
    description: 'Analyze and score your Amazon product listing across title optimization, bullet points, description quality, SEO, and conversion factors.',
    ogType: 'website',
  },
  '/tools/amazon-title-checker': {
    title: 'Amazon Title Checker — Check Title Quality & Readability | NicheScout',
    description: 'Evaluate your Amazon product title for length, keyword relevance, readability, and platform-specific requirements.',
    ogType: 'website',
  },
  '/tools/amazon-bullet-checker': {
    title: 'Amazon Bullet Point Checker — Analyze Listing Bullets | NicheScout',
    description: 'Validate Amazon bullet points for clarity, length, benefit language, formatting, and keyword optimization.',
    ogType: 'website',
  },
  '/tools/product-research-checklist': {
    title: 'Product Research Checklist — Validate Before Launch | NicheScout',
    description: 'Step-by-step checklist covering market research, product validation, financial viability, risk assessment, and operational readiness.',
    ogType: 'website',
  },
  '/tools/niche-analysis': {
    title: 'Niche Analysis Tool — Evaluate Niche Viability & Competition | NicheScout',
    description: 'Deep dive into niche viability with demand scoring, competition analysis, profit potential, trend evaluation, and entry barrier assessment.',
    ogType: 'website',
  },
  '/tools/amazon-bulk-file-doctor': {
    title: 'Amazon Bulk File Doctor — Offline CSV Listing Preflight | NicheScout',
    description: 'Review an Amazon bulk listing CSV in your browser: formatting, missing values, duplicate SKUs and spreadsheet-formula risk, grouped by root cause. No upload, no compliance verdict.',
    ogType: 'website',
  },
  '/privacy': {
    title: 'Privacy Policy | NicheScout',
    description: 'NicheScout privacy policy. All research data is stored locally in your browser — we do not collect personal information.',
    ogType: 'website',
  },
  '/terms': {
    title: 'Terms of Service | NicheScout',
    description: 'NicheScout terms of service governing use of the platform and its tools.',
    ogType: 'website',
  },
  '/about': {
    title: 'About NicheScout — Free E-commerce Research Platform | NicheScout',
    description: 'NicheScout is a free e-commerce product & niche research platform built for Amazon, Etsy & Shopify sellers.',
    ogType: 'website',
  },
};

function getSEOForPath(pathname: string): SEOData & { isKnownPath: boolean } {
  if (SEO_MAP[pathname]) {
    return { ...SEO_MAP[pathname], isKnownPath: true };
  }
  return {
    title: `${SITE_NAME} — E-commerce Research Platform`,
    description: 'Free e-commerce product & niche research platform for Amazon, Etsy & Shopify sellers.',
    ogType: 'website',
    isKnownPath: false,
  };
}

export function useSEO(seoOverrides?: Partial<SEOData>) {
  const location = useLocation();
  const baseSEO = getSEOForPath(location.pathname);
  const unknownPath = !baseSEO.isKnownPath && !seoOverrides;
  const seo = { ...baseSEO, ...(unknownPath ? { noindex: true } : {}), ...seoOverrides };
  const canonicalUrl = `${SITE_URL}${location.pathname}`;

  useEffect(() => {
    document.title = seo.title;

    const setMeta = (name: string, content: string, property?: boolean) => {
      const attr = property ? 'property' : 'name';
      let el = document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement;
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attr, name);
        document.head.appendChild(el);
      }
      el.setAttribute('content', content);
    };

    setMeta('description', seo.description);
    setMeta('og:title', seo.title, true);
    setMeta('og:description', seo.description, true);
    setMeta('og:url', canonicalUrl, true);
    setMeta('og:type', seo.ogType || 'website', true);
    setMeta('og:site_name', SITE_NAME, true);
    setMeta('twitter:card', 'summary_large_image');
    setMeta('twitter:title', seo.title);
    setMeta('twitter:description', seo.description);

    if (seo.noindex) {
      setMeta('robots', 'noindex, nofollow');
    } else {
      setMeta('robots', 'index, follow');
    }

    let canonicalEl = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
    if (!canonicalEl) {
      canonicalEl = document.createElement('link');
      canonicalEl.setAttribute('rel', 'canonical');
      document.head.appendChild(canonicalEl);
    }
    canonicalEl.setAttribute('href', canonicalUrl);

    if (seo.jsonLd) {
      const scriptId = 'seo-jsonld';
      let scriptEl = document.getElementById(scriptId) as HTMLScriptElement;
      if (!scriptEl) {
        scriptEl = document.createElement('script');
        scriptEl.id = scriptId;
        scriptEl.type = 'application/ld+json';
        document.head.appendChild(scriptEl);
      }
      scriptEl.textContent = JSON.stringify(seo.jsonLd);
    }
  }, [seo.title, seo.description, canonicalUrl, seo.noindex, seo.ogType, seo.jsonLd]);
}
