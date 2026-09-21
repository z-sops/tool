import { Link } from 'react-router-dom';

export function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Link to="/" className="inline-flex items-center gap-2 text-orange-500 hover:text-orange-600 font-medium text-sm mb-8">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          Back to Home
        </Link>
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Privacy Policy</h1>
        <p className="text-sm text-gray-500 mb-8">Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
        <div className="prose prose-sm max-w-none text-gray-700 space-y-6">
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">1. Information We Collect</h2>
            <p>NicheScout is a client-side application. We do not collect personal information through our website. All research data, saved products, and analyses are stored locally in your browser's localStorage and are never transmitted to our servers.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">2. AI Listing Generation</h2>
            <p>When you use the AI listing generator, your product details (name, category, features) are sent to OpenRouter's API for processing. This data is used solely to generate your listing and is not stored by NicheScout.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">3. Local Storage</h2>
            <p>All saved products, comparisons, analyses, listings, and notes are stored in your browser's localStorage. This data never leaves your device. You can clear this data at any time from the "My Research" page.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">4. Cookies</h2>
            <p>NicheScout does not use cookies or tracking technologies.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">5. Third-Party Services</h2>
            <p>We use the following third-party services:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Vercel:</strong> Hosting and deployment</li>
              <li><strong>OpenRouter:</strong> AI listing generation (only when you use the Create tool)</li>
              <li><strong>Google Fonts:</strong> Font loading</li>
            </ul>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">6. Data Security</h2>
            <p>Since all data is stored locally on your device, the security of your research data depends on your device's security. We recommend using a secure browser and keeping your system updated.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">7. Children's Privacy</h2>
            <p>NicheScout is not intended for use by children under 13. We do not knowingly collect information from children.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">8. Changes to This Policy</h2>
            <p>We may update this privacy policy from time to time. Changes will be posted on this page with an updated effective date.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">9. Contact</h2>
            <p>For questions about this privacy policy, please contact us through our website.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
