import { Link } from 'react-router-dom';

export function AboutPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Link to="/" className="inline-flex items-center gap-2 text-orange-500 hover:text-orange-600 font-medium text-sm mb-8">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          Back to Home
        </Link>
        <h1 className="text-3xl font-bold text-gray-900 mb-6">About NicheScout</h1>
        <div className="prose prose-sm max-w-none text-gray-700 space-y-6">
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Our Mission</h2>
            <p>NicheScout is a free e-commerce product and niche research platform built for Amazon, Etsy, and Shopify sellers. Our goal is to democratize product research by providing powerful, deterministic tools that don't require expensive subscriptions or paid APIs.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">What We Offer</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Product Exploration:</strong> Browse and analyze products across categories</li>
              <li><strong>Research Tools:</strong> 11+ free tools for profit calculation, IP risk assessment, restriction checking, listing optimization, and more</li>
              <li><strong>AI Listing Generator:</strong> Create optimized product listings for Amazon, Etsy, or Shopify</li>
              <li><strong>Comparison:</strong> Side-by-side product comparison</li>
              <li><strong>Research Library:</strong> Save and organize all your research in one place</li>
              <li><strong>Learning Resources:</strong> Guides and tutorials for e-commerce success</li>
            </ul>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Our Approach</h2>
            <p>All our research tools use deterministic logic — no paid APIs, no scraping, no fake marketplace data. What you see is a transparent calculation based on the inputs you provide. We believe in giving you the tools to make informed decisions, not making decisions for you.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Built by ZuniTech</h2>
            <p>NicheScout is built and maintained by ZuniTech. We're passionate about building tools that help small business owners and entrepreneurs succeed in e-commerce.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Contact</h2>
            <p>Have questions, feedback, or suggestions? We'd love to hear from you. Reach out through our website or social media channels.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
