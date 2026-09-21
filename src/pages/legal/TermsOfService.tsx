import { Link } from 'react-router-dom';

export function TermsOfService() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Link to="/" className="inline-flex items-center gap-2 text-orange-500 hover:text-orange-600 font-medium text-sm mb-8">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          Back to Home
        </Link>
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Terms of Service</h1>
        <p className="text-sm text-gray-500 mb-8">Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
        <div className="prose prose-sm max-w-none text-gray-700 space-y-6">
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">1. Acceptance of Terms</h2>
            <p>By accessing or using NicheScout, you agree to be bound by these Terms of Service. If you do not agree, do not use the platform.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">2. Description of Service</h2>
            <p>NicheScout is a free e-commerce product and niche research platform. It provides tools for product analysis, profit calculation, listing optimization, and AI-powered listing generation.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">3. User Responsibilities</h2>
            <p>You are responsible for:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Ensuring the accuracy of data you input into our tools</li>
              <li>Conducting your own due diligence before making business decisions</li>
              <li>Complying with all applicable laws and marketplace policies</li>
              <li>Never using fake, counterfeit, copied, or unauthorized intellectual property</li>
            </ul>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">4. Intellectual Property</h2>
            <p><strong>CRITICAL:</strong> You must never use fake, counterfeit, copied, or unauthorized intellectual property. Always buy branded products from credible, legitimate suppliers and retain appropriate supplier/invoice documentation. Do not copy another brand's trademarks, logos, packaging, images, branding, or listing content without authorization. Do not use fake multi-IP browsers or deceptive IP setups to bypass marketplace restrictions, account controls, anti-abuse systems, or enforcement.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">5. Disclaimer of Warranties</h2>
            <p>NicheScout is provided "as is" without warranties of any kind. The tools and calculations are for informational purposes only and should not be considered financial, legal, or professional advice. Always verify calculations and consult professionals before making business decisions.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">6. Limitation of Liability</h2>
            <p>NicheScout and its creators shall not be liable for any direct, indirect, incidental, special, or consequential damages resulting from the use or inability to use the platform.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">7. Changes to Terms</h2>
            <p>We reserve the right to modify these terms at any time. Continued use of the platform constitutes acceptance of updated terms.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
