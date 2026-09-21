import { Link } from 'react-router-dom';

export function Footer() {
  const currentYear = new Date().getFullYear();

  const footerLinks = {
    product: [
      { label: 'Explore', to: '/explore' },
      { label: 'Compare', to: '/compare' },
      { label: 'Create Listing', to: '/create' },
      { label: 'Learn', to: '/learn' },
    ],
    tools: [
      { label: 'Profit Calculator', to: '/tools/amazon-profit-calculator' },
      { label: 'ROI Calculator', to: '/tools/amazon-roi-calculator' },
      { label: 'Pricing Calculator', to: '/tools/amazon-pricing-calculator' },
      { label: 'IP Risk Check', to: '/tools/amazon-ip-check' },
      { label: 'Restriction Check', to: '/tools/amazon-restriction-check' },
      { label: 'Listing Analyzer', to: '/tools/amazon-listing-analyzer' },
      { label: 'Title Checker', to: '/tools/amazon-title-checker' },
      { label: 'Bullet Checker', to: '/tools/amazon-bullet-checker' },
    ],
    resources: [
      { label: 'Niche Analysis', to: '/tools/niche-analysis' },
      { label: 'Sourcing Risk Check', to: '/tools/sourcing-risk-check' },
      { label: 'Research Checklist', to: '/tools/product-research-checklist' },
      { label: 'About', to: '/about' },
    ],
    legal: [
      { label: 'Privacy Policy', to: '/privacy' },
      { label: 'Terms of Service', to: '/terms' },
    ],
  };

  const socialLinks = [
    { icon: 'twitter', label: 'Twitter', href: '#' },
    { icon: 'linkedin', label: 'LinkedIn', href: '#' },
    { icon: 'youtube', label: 'YouTube', href: '#' },
    { icon: 'reddit', label: 'Reddit', href: '#' },
  ];

  return (
    <footer className="bg-gray-900 text-white py-12 sm:py-16" role="contentinfo">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-6 sm:gap-8 mb-10 sm:mb-12">
          <div className="col-span-2 sm:col-span-1 lg:col-span-2">
            <Link to="/" className="flex items-center gap-2 mb-3 sm:mb-4" aria-label="NicheScout Home">
              <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-amber-500 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div className="flex flex-col leading-tight">
                <span className="text-lg sm:text-xl font-bold">Niche<span className="text-orange-400">Scout</span></span>
                <span className="text-[10px] text-gray-500 font-medium tracking-wider uppercase">E-commerce Research Platform</span>
              </div>
            </Link>
            <p className="text-gray-400 text-xs sm:text-sm leading-relaxed max-w-xs">
              Free AI-powered product & niche research platform for Amazon, Etsy & Shopify sellers. 
              Explore, analyze, calculate, learn, and create — all in one place.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-sm sm:text-base mb-3 sm:mb-4">Product</h4>
            <ul className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm text-gray-400">
              {footerLinks.product.map(link => (
                <li key={link.to}>
                  <Link to={link.to} className="hover:text-orange-400 transition-colors">{link.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-sm sm:text-base mb-3 sm:mb-4">Tools</h4>
            <ul className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm text-gray-400">
              {footerLinks.tools.map(link => (
                <li key={link.to}>
                  <Link to={link.to} className="hover:text-orange-400 transition-colors">{link.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-sm sm:text-base mb-3 sm:mb-4">Resources</h4>
            <ul className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm text-gray-400">
              {footerLinks.resources.map(link => (
                <li key={link.to}>
                  <Link to={link.to} className="hover:text-orange-400 transition-colors">{link.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-sm sm:text-base mb-3 sm:mb-4">Legal</h4>
            <ul className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm text-gray-400">
              {footerLinks.legal.map(link => (
                <li key={link.to}>
                  <Link to={link.to} className="hover:text-orange-400 transition-colors">{link.label}</Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 pt-6 sm:pt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-xs sm:text-sm text-gray-500">
            © {currentYear} NicheScout. All rights reserved.
          </p>
          <div className="flex gap-6">
            {socialLinks.map(social => (
              <a
                key={social.icon}
                href={social.href}
                className="text-gray-500 hover:text-orange-400 transition-colors"
                aria-label={social.label}
                target="_blank"
                rel="noopener noreferrer"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  {social.icon === 'twitter' && (
                    <path d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z" />
                  )}
                  {social.icon === 'linkedin' && (
                    <path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6zM2 9h4v12H2zM4 6a2 2 0 100-4 2 2 0 000 4z" />
                  )}
                  {social.icon === 'youtube' && (
                    <path d="M22.54 6.42a2.78 2.78 0 00-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 00-1.94 2A29 29 0 00.46 12a29 29 0 000 4c0 .46.06.92.18 1.38a2.78 2.78 0 001.94 2C5.12 20 12 20 12 20s6.88 0 8.6-.46a2.78 2.78 0 001.94-2 29 29 0 000-4c0-.46-.06-.92-.18-1.38zM10 15v-6l6 3-6 3z" />
                  )}
                  {social.icon === 'reddit' && (
                    <path d="M22.16 4.89a5.33 5.33 0 00-5.8-2.4c-.74 0-1.51.17-2.24.48a5.5 5.5 0 00-.18 11h.77a1 1 0 00.9-.54 4 4 0 017.84 0 1 1 0 00.9.54h.77a5.5 5.5 0 00-.18-11 6.5 6.5 0 00-2.24-.48zM5.83 19.5a3 3 0 01.95-2.25c.52-.4.9-.84 1.12-1.33.57-1.04 2.5-1.6 4.1-1.6s3.53.56 4.1 1.6c.22.49.6.93 1.12 1.33a3 3 0 01.96 2.25c.5 1.5-.5 3.5-2.5 3.5H8.33c-2 0-3-2-2.5-3.5zm8.84-7.9l.02-.31c0-1.8 1.5-3.2 3.2-3.2s3.2 1.5 3.2 3.2v.31l-.02.37a6 6 0 01-6.4 0zM10 15a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zm8 0a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
                  )}
                </svg>
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}