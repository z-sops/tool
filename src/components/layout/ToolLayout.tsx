import { Link, useLocation } from 'react-router-dom';

interface ToolLayoutProps {
  children: React.ReactNode;
  title: string;
  description?: string;
  backLink?: string;
  backLabel?: string;
  actions?: React.ReactNode;
}

export function ToolLayout({ 
  children, 
  title, 
  description, 
  backLink = '/explore', 
  backLabel = 'Back to Explore',
  actions 
}: ToolLayoutProps) {
  const location = useLocation();
  const isToolPage = location.pathname.startsWith('/tools/');

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Breadcrumb / Back Navigation */}
        <div className="mb-6 sm:mb-8">
          <Link
            to={backLink}
            className="inline-flex items-center gap-2 text-orange-500 hover:text-orange-600 font-medium text-sm sm:text-base transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            {backLabel}
          </Link>
        </div>

        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-3 sm:mb-4">
            {title}
          </h1>
          {description && (
            <p className="text-sm sm:text-base text-gray-600 max-w-2xl mx-auto px-2">
              {description}
            </p>
          )}
          {actions && (
            <div className="mt-4 flex flex-wrap gap-2">
              {actions}
            </div>
          )}
        </div>

        {/* Tool Content */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {children}
        </div>

        {/* Footer CTA for tool pages */}
        {isToolPage && (
          <div className="mt-8 text-center">
            <Link
              to="/my-research"
              className="inline-flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium text-sm transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              View in My Research
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

// Tool Card Component for landing pages
export function ToolCard({ 
  title, 
  description, 
  icon: IconComponent, 
  color, 
  href, 
  badge,
  comingSoon = false 
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  href: string;
  badge?: string;
  comingSoon?: boolean;
}) {
  const colorMap: Record<string, { bg: string; text: string; border: string }> = {
    orange: { bg: 'bg-orange-100', text: 'text-orange-600', border: 'border-orange-200' },
    blue: { bg: 'bg-blue-100', text: 'text-blue-600', border: 'border-blue-200' },
    green: { bg: 'bg-green-100', text: 'text-green-600', border: 'border-green-200' },
    purple: { bg: 'bg-purple-100', text: 'text-purple-600', border: 'border-purple-200' },
    pink: { bg: 'bg-pink-100', text: 'text-pink-600', border: 'border-pink-200' },
    amber: { bg: 'bg-amber-100', text: 'text-amber-600', border: 'border-amber-200' },
  };

  const colors = colorMap[color] || colorMap.orange;

  return (
    <Link
      to={href}
      className={`group block bg-white rounded-xl p-5 sm:p-6 border-2 ${colors.border} hover:shadow-lg hover:border-orange-300 transition-all ${comingSoon ? 'opacity-70' : ''}`}
    >
      {badge && (
        <span className="inline-block px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-gray-100 text-gray-600 rounded mb-3">
          {badge}
        </span>
      )}
      <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg ${colors.bg} flex items-center justify-center mb-3 sm:mb-4 group-hover:scale-105 transition-transform`}>
        {IconComponent}
      </div>
      <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600 text-xs sm:text-sm leading-relaxed">{description}</p>
      <div className="mt-4 inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-orange-500 group-hover:gap-2 transition-all">
        <span>Open Tool</span>
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
        </svg>
      </div>
    </Link>
  );
}

// Section Header Component
export function SectionHeader({ 
  title, 
  subtitle, 
  badge,
  badgeColor = 'blue',
  action,
  as = 'h2'
}: {
  title: string;
  subtitle?: string;
  badge?: string;
  badgeColor?: 'blue' | 'green' | 'orange';
  action?: React.ReactNode;
  as?: 'h1' | 'h2';
}) {
  const badgeColors = {
    blue: 'bg-blue-100 text-blue-700',
    green: 'bg-green-100 text-green-700',
    orange: 'bg-orange-100 text-orange-700',
  };

  const HeadingTag = as;

  return (
    <div className="text-center mb-10 sm:mb-14">
      {badge && (
        <div className={`inline-flex items-center gap-2 ${badgeColors[badgeColor]} px-3 py-1.5 rounded-full text-xs font-medium mb-4`}>
          {badge}
        </div>
      )}
      <HeadingTag className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-3 sm:mb-4">
        {title}
      </HeadingTag>
      {subtitle && (
        <p className="text-sm sm:text-base text-gray-600 max-w-2xl mx-auto px-2">
          {subtitle}
        </p>
      )}
      {action && (
        <div className="mt-6">
          {action}
        </div>
      )}
    </div>
  );
}