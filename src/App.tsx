import { useState } from 'react';

// Types
interface ListingOutput {
  title: string;
  bulletPoints: string[];
  description: string;
  searchTerms: string[];
}

// Main App Component
function App() {
  const [currentPage, setCurrentPage] = useState<'home' | 'privacy' | 'terms' | 'about'>('home');

  if (currentPage === 'privacy') return <PrivacyPolicy onBack={() => setCurrentPage('home')} />;
  if (currentPage === 'terms') return <TermsOfService onBack={() => setCurrentPage('home')} />;
  if (currentPage === 'about') return <AboutPage onBack={() => setCurrentPage('home')} />;

  return <HomePage onNavigate={setCurrentPage} />;
}

// Home Page
function HomePage({ onNavigate }: { onNavigate: (page: 'home' | 'privacy' | 'terms' | 'about') => void }) {
  return (
    <div className="min-h-screen bg-white">
      <Header onNavigate={onNavigate} />
      <HeroSection />
      <ThreePillarsSection />
      <AdBanner slot="top" />
      <ExploreSection />
      <LearnSection />
      <ToolSection />
      <AdBanner slot="middle" />
      <FeaturesSection />
      <PricingComparison />
      <HowItWorks />
      <FAQSection />
      <AdBanner slot="bottom" />
      <Footer onNavigate={onNavigate} />
    </div>
  );
}

// Header
function Header({ onNavigate }: { onNavigate: (page: 'home' | 'privacy' | 'terms' | 'about') => void }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-amber-500 rounded-lg flex items-center justify-center">
              <i className="fas fa-bolt text-white text-sm"></i>
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-xl font-bold text-gray-900">Listing<span className="text-orange-500">AI</span></span>
              <span className="text-[10px] text-gray-400 font-medium tracking-wider uppercase">by ZuniTech</span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-8">
            <a href="#explore" className="text-sm font-medium text-gray-600 hover:text-orange-500 transition-colors">Explore</a>
            <a href="#learn" className="text-sm font-medium text-gray-600 hover:text-orange-500 transition-colors">Learn</a>
            <a href="#tool" className="text-sm font-medium text-gray-600 hover:text-orange-500 transition-colors">Create</a>
            <a href="#how-it-works" className="text-sm font-medium text-gray-600 hover:text-orange-500 transition-colors">How It Works</a>
            <button onClick={() => onNavigate('about')} className="text-sm font-medium text-gray-600 hover:text-orange-500 transition-colors">About</button>
          </nav>

          <div className="hidden md:flex items-center gap-3">
            <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">
              <i className="fas fa-circle text-[8px] mr-1"></i> 100% Free
            </span>
          </div>

          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden p-2">
            <i className={`fas ${mobileMenuOpen ? 'fa-times' : 'fa-bars'} text-gray-600`}></i>
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-gray-100">
            <nav className="flex flex-col gap-3">
              <a href="#explore" onClick={() => setMobileMenuOpen(false)} className="text-sm font-medium text-gray-600 px-2 py-1">Explore</a>
              <a href="#learn" onClick={() => setMobileMenuOpen(false)} className="text-sm font-medium text-gray-600 px-2 py-1">Learn</a>
              <a href="#tool" onClick={() => setMobileMenuOpen(false)} className="text-sm font-medium text-gray-600 px-2 py-1">Create</a>
              <a href="#how-it-works" onClick={() => setMobileMenuOpen(false)} className="text-sm font-medium text-gray-600 px-2 py-1">How It Works</a>
              <button onClick={() => { onNavigate('about'); setMobileMenuOpen(false); }} className="text-sm font-medium text-gray-600 px-2 py-1 text-left">About</button>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}

// Hero Section
function HeroSection() {
  return (
    <section className="py-12 sm:py-16 lg:py-24 bg-gradient-to-b from-orange-50/50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-medium mb-4">
          <i className="fas fa-graduation-cap text-xs"></i>
          For Aspiring Sellers & Students
        </div>
        <div className="inline-flex items-center gap-1.5 text-xs text-gray-400 font-medium mb-6 block">
          <i className="fas fa-microchip"></i>
          Powered by <span className="font-semibold text-gray-600">ZuniTech</span>
        </div>
        <h1 className="text-3xl sm:text-4xl lg:text-6xl font-bold text-gray-900 leading-tight mb-4 sm:mb-6">
          Thinking About Starting an<br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-amber-500">
            E-commerce Business?
          </span>
        </h1>
        <p className="text-lg sm:text-xl lg:text-2xl text-gray-700 font-medium mb-3 sm:mb-4 px-2">
          Research before you invest.
        </p>
        <p className="text-base sm:text-lg text-gray-600 max-w-3xl mx-auto mb-6 sm:mb-8 px-2">
          Explore real marketplace examples, learn from successful sellers, 
          and create professional listings with AI — all in one place.
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4 mb-6 sm:mb-8 px-4">
          <a href="#explore" className="bg-orange-500 hover:bg-orange-600 text-white px-6 sm:px-8 py-3 rounded-lg font-semibold transition-all shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 text-center">
            <i className="fas fa-search mr-2"></i> Start Researching
          </a>
          <a href="#tool" className="border border-gray-300 hover:border-orange-300 text-gray-700 px-6 sm:px-8 py-3 rounded-lg font-semibold transition-all text-center">
            <i className="fas fa-magic mr-2"></i> Create Listing
          </a>
        </div>
        <p className="text-xs sm:text-sm text-gray-500 italic">
          Built for aspiring sellers, students & early-stage entrepreneurs.
        </p>
      </div>
    </section>
  );
}

// Ad Banner Placeholder
function AdBanner({ slot }: { slot: string }) {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
      <div className="bg-gray-50 border border-dashed border-gray-200 rounded-lg h-20 sm:h-24 flex items-center justify-center">
        <span className="text-xs text-gray-400 uppercase tracking-wider">Advertisement — {slot}</span>
      </div>
    </div>
  );
}

// Main Tool Section
function ToolSection() {
  const [productName, setProductName] = useState('');
  const [category, setCategory] = useState('');
  const [keyFeatures, setKeyFeatures] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [tone, setTone] = useState('professional');
  const [platform, setPlatform] = useState('amazon');
  const [isGenerating, setIsGenerating] = useState(false);
  const [output, setOutput] = useState<ListingOutput | null>(null);
  const [creditsUsed, setCreditsUsed] = useState(0);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const categories = [
    'Electronics & Gadgets',
    'Home & Kitchen',
    'Beauty & Personal Care',
    'Sports & Outdoors',
    'Clothing & Fashion',
    'Toys & Games',
    'Books & Media',
    'Health & Wellness',
    'Pet Supplies',
    'Automotive',
    'Office & Stationery',
    'Baby Products',
  ];

  const tones = [
    { value: 'professional', label: 'Professional', icon: '💼' },
    { value: 'friendly', label: 'Friendly', icon: '😊' },
    { value: 'luxury', label: 'Luxury', icon: '✨' },
    { value: 'urgent', label: 'Urgent/Sales', icon: '🔥' },
  ];

  const platforms = [
    { value: 'amazon', label: 'Amazon', icon: '📦' },
    { value: 'etsy', label: 'Etsy', icon: '🎨' },
    { value: 'shopify', label: 'Shopify', icon: '🛍️' },
  ];

  const generateListing = async () => {
    if (!productName.trim()) {
      setError('Please enter a product name');
      return;
    }

    setError(null);
    setIsGenerating(true);
    setOutput(null);

    try {
      // Try calling the real API first
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productName,
          category,
          keyFeatures,
          targetAudience,
          tone,
          platform,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setOutput(data);
      } else {
        // Fallback to mock data if API fails
        console.warn('API call failed, using mock data');
        const mockOutput = generateMockListing();
        setOutput(mockOutput);
      }
    } catch (err) {
      // Fallback to mock data on network error
      console.warn('Network error, using mock data:', err);
      const mockOutput = generateMockListing();
      setOutput(mockOutput);
    }

    setIsGenerating(false);
    setCreditsUsed(prev => prev + 1);
  };

  // Mock listing generator (fallback)
  const generateMockListing = (): ListingOutput => {
    const prefixes: Record<string, string> = {
      amazon: '【2026 Upgraded】',
      etsy: '✨ Handcrafted',
      shopify: 'Premium',
    };
    const suffixes: Record<string, string> = {
      amazon: '- Perfect Gift for Men & Women | Fast Shipping',
      etsy: '| Unique Gift Idea | Made with Love',
      shopify: '| Free Shipping | 30-Day Returns',
    };

    const prefix = prefixes[platform] || prefixes.amazon;
    const suffix = suffixes[platform] || suffixes.amazon;
    const catTag = category ? `| ${category}` : '';

    const featureList = keyFeatures ? keyFeatures.split(',').map(f => f.trim()).filter(Boolean) : ['Premium quality', 'Easy to use', 'Durable design'];
    const toneOpeners: Record<string, string[]> = {
      professional: ['ENGINEERED FOR', 'DESIGNED WITH', 'BUILT TO', 'CERTIFIED', 'BACKED BY'],
      friendly: ['You\'ll love how', 'Perfect for', 'Great news —', 'We made sure', 'Enjoy the'],
      luxury: ['EXQUISITE', 'PREMIUM', 'CRAFTED WITH', 'EXCEPTIONAL', 'DISTINGUISHED'],
      urgent: ['⚡ LIMITED:', '🔥 HOT:', '✅ MUST-HAVE:', '💎 BEST:', '🎯 TOP'],
    };
    const openers = toneOpeners[tone] || toneOpeners.professional;
    const audienceTag = targetAudience ? ` — ideal for ${targetAudience}` : '';

    const bullets = featureList.slice(0, 5).map((feature, idx) => {
      const opener = openers[idx % openers.length];
      return `${opener} ${feature.toUpperCase()}${audienceTag}. Experience the difference with ${productName} — trusted by thousands of satisfied customers worldwide.`;
    });
    while (bullets.length < 5) {
      bullets.push(`${openers[bullets.length % openers.length]} QUALITY GUARANTEE — Every ${productName} undergoes rigorous testing. If you're not 100% satisfied, our support team is here.`);
    }

    const audienceText = targetAudience ? `Designed specifically for ${targetAudience}` : 'Designed for everyone who values quality';
    const featureText = keyFeatures ? `Featuring ${keyFeatures.slice(0, 100)}` : 'Featuring premium materials and innovative design';
    const description = `${audienceText}, the ${productName} sets a new standard in ${category || 'its category'}. ${featureText}, this product delivers exceptional performance that exceeds expectations.\n\nWhether you're upgrading from a basic model or discovering this category for the first time, ${productName} combines cutting-edge technology with user-friendly design.\n\nJoin thousands of satisfied customers who have made the switch. Order today and experience the difference.`;

    const words = productName.toLowerCase().split(' ');
    const searchTerms = [
      `${productName.toLowerCase()} gift`,
      `best ${productName.toLowerCase()} 2026`,
      `${productName.toLowerCase()} for sale`,
      `cheap ${productName.toLowerCase()}`,
      `${productName.toLowerCase()} review`,
      ...(category ? [`${category.toLowerCase()} ${words[0]}`, `top rated ${category.toLowerCase()}`] : []),
    ].slice(0, 8);

    return {
      title: `${prefix} ${productName} ${catTag} ${suffix}`.slice(0, 200),
      bulletPoints: bullets,
      description,
      searchTerms,
    };
  };

  // Copy to clipboard function
  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    }
  };

  // Copy all content
  const copyAll = () => {
    if (!output) return;
    const allContent = `PRODUCT TITLE:\n${output.title}\n\nBULLET POINTS:\n${output.bulletPoints.map((b, i) => `${i + 1}. ${b}`).join('\n')}\n\nDESCRIPTION:\n${output.description}\n\nSEARCH TERMS:\n${output.searchTerms.join(', ')}`;
    copyToClipboard(allContent, 'all');
  };

  // Download as text file
  const downloadAsText = () => {
    if (!output) return;
    const content = `PRODUCT LISTING - Generated by ListingAI (by ZuniTech)\n${'='.repeat(50)}\n\nPRODUCT TITLE:\n${output.title}\n\nBULLET POINTS:\n${output.bulletPoints.map((b, i) => `${i + 1}. ${b}`).join('\n\n')}\n\nDESCRIPTION:\n${output.description}\n\nSEARCH TERMS:\n${output.searchTerms.join(', ')}\n\n${'='.repeat(50)}\nGenerated at: ${new Date().toLocaleString()}`;
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${productName.replace(/\s+/g, '-').toLowerCase()}-listing.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <section id="tool" className="py-12 sm:py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8 sm:mb-12">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-3 sm:mb-4">
            Generate Your Listing Now
          </h2>
          <p className="text-sm sm:text-base text-gray-600 max-w-xl mx-auto px-2">
            Fill in your product details below and get a complete, SEO-optimized listing in seconds.
          </p>
          <div className="mt-4 inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full text-xs sm:text-sm">
            <i className="fas fa-coins"></i>
            <span>Credits used today: <strong>{creditsUsed}</strong> / 5 free</span>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6 lg:gap-8">
          {/* Input Form */}
          <div className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-6 lg:p-8 shadow-sm">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4 sm:mb-6 flex items-center gap-2">
              <i className="fas fa-edit text-orange-500"></i>
              Product Details
            </h3>

            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                <i className="fas fa-exclamation-circle mr-2"></i> {error}
              </div>
            )}

            <div className="space-y-4 sm:space-y-5">
              {/* Product Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Product Name *
                </label>
                <input
                  type="text"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  placeholder="e.g., Wireless Bluetooth Earbuds"
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all text-gray-900 placeholder:text-gray-400 text-sm sm:text-base"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all text-gray-900 bg-white text-sm sm:text-base"
                >
                  <option value="">Select a category</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* Platform */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Platform
                </label>
                <div className="grid grid-cols-3 gap-2 sm:gap-3">
                  {platforms.map(p => (
                    <button
                      key={p.value}
                      onClick={() => setPlatform(p.value)}
                      className={`px-2 sm:px-4 py-2.5 sm:py-3 rounded-lg border-2 text-xs sm:text-sm font-medium transition-all ${
                        platform === p.value
                          ? 'border-orange-500 bg-orange-50 text-orange-700'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      <span className="mr-1">{p.icon}</span> {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Key Features */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Key Features / Specifications
                </label>
                <textarea
                  value={keyFeatures}
                  onChange={(e) => setKeyFeatures(e.target.value)}
                  placeholder="e.g., 40hr battery, noise cancelling, IPX7 waterproof..."
                  rows={3}
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all text-gray-900 placeholder:text-gray-400 resize-none text-sm sm:text-base"
                />
              </div>

              {/* Target Audience */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Target Audience
                </label>
                <input
                  type="text"
                  value={targetAudience}
                  onChange={(e) => setTargetAudience(e.target.value)}
                  placeholder="e.g., fitness enthusiasts, commuters"
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all text-gray-900 placeholder:text-gray-400 text-sm sm:text-base"
                />
              </div>

              {/* Tone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Writing Tone
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {tones.map(t => (
                    <button
                      key={t.value}
                      onClick={() => setTone(t.value)}
                      className={`px-2 sm:px-3 py-2 sm:py-2.5 rounded-lg border-2 text-xs sm:text-sm font-medium transition-all ${
                        tone === t.value
                          ? 'border-orange-500 bg-orange-50 text-orange-700'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      <span className="mr-1">{t.icon}</span> {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Generate Button */}
              <button
                onClick={generateListing}
                disabled={isGenerating}
                className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 disabled:from-gray-400 disabled:to-gray-400 text-white py-3 sm:py-4 rounded-lg font-semibold text-base sm:text-lg transition-all shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 disabled:shadow-none flex items-center justify-center gap-2"
              >
                {isGenerating ? (
                  <>
                    <i className="fas fa-spinner fa-spin"></i>
                    Generating...
                  </>
                ) : (
                  <>
                    <i className="fas fa-magic"></i>
                    Generate Free Listing
                  </>
                )}
              </button>

              <p className="text-xs text-gray-500 text-center">
                <i className="fas fa-lock mr-1"></i> Your data is not stored. 100% private.
              </p>
            </div>
          </div>

          {/* Output Section */}
          <div className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-6 lg:p-8 shadow-sm">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4 sm:mb-6 flex items-center gap-2">
              <i className="fas fa-file-alt text-orange-500"></i>
              Generated Listing
            </h3>

            {isGenerating && (
              <div className="flex flex-col items-center justify-center py-12 sm:py-16">
                <div className="w-14 h-14 sm:w-16 sm:h-16 bg-orange-100 rounded-full flex items-center justify-center mb-4 animate-pulse">
                  <i className="fas fa-robot text-orange-500 text-xl sm:text-2xl"></i>
                </div>
                <p className="text-gray-600 font-medium text-sm sm:text-base">AI is writing your listing...</p>
                <p className="text-xs sm:text-sm text-gray-400 mt-1">Optimizing for {platform} SEO</p>
              </div>
            )}

            {!isGenerating && !output && (
              <div className="flex flex-col items-center justify-center py-12 sm:py-16 text-center">
                <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <i className="fas fa-arrow-left text-gray-400 text-lg sm:text-xl"></i>
                </div>
                <p className="text-gray-500 font-medium text-sm sm:text-base">Your listing will appear here</p>
                <p className="text-xs sm:text-sm text-gray-400 mt-1">Fill in product details and click Generate</p>
              </div>
            )}

            {!isGenerating && output && (
              <div className="space-y-4 sm:space-y-6">
                {/* Title */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs sm:text-sm font-semibold text-gray-700">Product Title</label>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">{output.title.length}/200</span>
                      <button
                        onClick={() => copyToClipboard(output.title, 'title')}
                        className="text-xs text-orange-500 hover:text-orange-600 font-medium flex items-center gap-1"
                      >
                        <i className={`fas ${copiedField === 'title' ? 'fa-check text-green-500' : 'fa-copy'}`}></i>
                        {copiedField === 'title' ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                  </div>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 sm:p-4 text-sm sm:text-base text-gray-900 font-medium">
                    {output.title}
                  </div>
                </div>

                {/* Bullet Points */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs sm:text-sm font-semibold text-gray-700">Bullet Points</label>
                    <button
                      onClick={() => copyToClipboard(output.bulletPoints.join('\n'), 'bullets')}
                      className="text-xs text-orange-500 hover:text-orange-600 font-medium flex items-center gap-1"
                    >
                      <i className={`fas ${copiedField === 'bullets' ? 'fa-check text-green-500' : 'fa-copy'}`}></i>
                      {copiedField === 'bullets' ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                  <div className="space-y-2">
                    {output.bulletPoints.map((point, idx) => (
                      <div key={idx} className="bg-gray-50 border border-gray-200 rounded-lg p-2.5 sm:p-3 text-xs sm:text-sm text-gray-700">
                        <span className="font-semibold text-orange-600 mr-2">•</span>
                        {point}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Description */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs sm:text-sm font-semibold text-gray-700">Product Description</label>
                    <button
                      onClick={() => copyToClipboard(output.description, 'description')}
                      className="text-xs text-orange-500 hover:text-orange-600 font-medium flex items-center gap-1"
                    >
                      <i className={`fas ${copiedField === 'description' ? 'fa-check text-green-500' : 'fa-copy'}`}></i>
                      {copiedField === 'description' ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 sm:p-4 text-xs sm:text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                    {output.description}
                  </div>
                </div>

                {/* Search Terms */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs sm:text-sm font-semibold text-gray-700">Backend Search Terms</label>
                    <button
                      onClick={() => copyToClipboard(output.searchTerms.join(', '), 'terms')}
                      className="text-xs text-orange-500 hover:text-orange-600 font-medium flex items-center gap-1"
                    >
                      <i className={`fas ${copiedField === 'terms' ? 'fa-check text-green-500' : 'fa-copy'}`}></i>
                      {copiedField === 'terms' ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-2.5 sm:p-3 flex flex-wrap gap-1.5 sm:gap-2">
                    {output.searchTerms.map((term, idx) => (
                      <span key={idx} className="bg-orange-100 text-orange-700 text-[10px] sm:text-xs px-2 py-1 rounded-full">
                        {term}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-4 border-t border-gray-100">
                  <button
                    onClick={copyAll}
                    className="flex-1 bg-orange-500 hover:bg-orange-600 text-white py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2"
                  >
                    <i className={`fas ${copiedField === 'all' ? 'fa-check' : 'fa-copy'}`}></i>
                    {copiedField === 'all' ? 'Copied!' : 'Copy All'}
                  </button>
                  <button
                    onClick={downloadAsText}
                    className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2"
                  >
                    <i className="fas fa-download"></i> Download .txt
                  </button>
                  <button
                    onClick={generateListing}
                    className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2"
                  >
                    <i className="fas fa-redo"></i> Regenerate
                  </button>
                </div>

                {/* Rewarded Ad CTA */}
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-3 sm:p-4 text-center">
                  <p className="text-xs sm:text-sm text-green-800 font-medium">
                    <i className="fas fa-video mr-1"></i> Watch a 30-sec ad for 5 more free generations
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

// Three Pillars Section
function ThreePillarsSection() {
  const pillars = [
    {
      icon: 'fa-search',
      title: 'EXPLORE',
      subtitle: 'Market Research',
      description: 'Browse curated product examples from real marketplaces. See what\'s selling, at what price, with what competition.',
      features: [
        'Real product examples',
        'Price & rating data',
        'Category insights',
        'Competitor analysis',
      ],
      cta: 'Explore Examples',
      href: '#explore',
      color: 'blue',
    },
    {
      icon: 'fa-graduation-cap',
      title: 'LEARN',
      subtitle: 'Educational Guides',
      description: 'Understand what makes listings successful. Learn from real examples with detailed breakdowns and analysis.',
      features: [
        'Listing breakdowns',
        'Success patterns',
        'Common mistakes',
        'Best practices',
      ],
      cta: 'Start Learning',
      href: '#learn',
      color: 'green',
    },
    {
      icon: 'fa-magic',
      title: 'CREATE',
      subtitle: 'AI Listing Generator',
      description: 'Generate professional product listings in seconds. Optimized for Amazon, Etsy & Shopify with AI assistance.',
      features: [
        'AI-powered titles',
        '5 bullet points',
        'Product descriptions',
        'SEO keywords',
      ],
      cta: 'Create Listing',
      href: '#tool',
      color: 'orange',
    },
  ];

  const colorMap: Record<string, { bg: string; text: string; border: string }> = {
    blue: { bg: 'bg-blue-100', text: 'text-blue-600', border: 'border-blue-200' },
    green: { bg: 'bg-green-100', text: 'text-green-600', border: 'border-green-200' },
    orange: { bg: 'bg-orange-100', text: 'text-orange-600', border: 'border-orange-200' },
  };

  return (
    <section className="py-16 sm:py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10 sm:mb-14">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-3 sm:mb-4">
            Your E-commerce Journey Starts Here
          </h2>
          <p className="text-sm sm:text-base text-gray-600 max-w-2xl mx-auto px-2">
            Three simple steps to go from idea to launch. No expensive tools. No learning curve.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
          {pillars.map((pillar, idx) => {
            const colors = colorMap[pillar.color];
            return (
              <div key={idx} className={`bg-white rounded-2xl p-6 sm:p-8 border-2 ${colors.border} hover:shadow-lg transition-all`}>
                <div className={`w-14 h-14 sm:w-16 sm:h-16 ${colors.bg} rounded-2xl flex items-center justify-center mb-4 sm:mb-6`}>
                  <i className={`fas ${pillar.icon} ${colors.text} text-2xl sm:text-3xl`}></i>
                </div>
                <div className="text-xs font-bold text-gray-400 mb-1">STEP {idx + 1}</div>
                <h3 className={`text-xl sm:text-2xl font-bold ${colors.text} mb-2`}>{pillar.title}</h3>
                <p className="text-sm font-semibold text-gray-700 mb-3">{pillar.subtitle}</p>
                <p className="text-gray-600 text-sm leading-relaxed mb-4">{pillar.description}</p>
                <ul className="space-y-2 mb-6">
                  {pillar.features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-gray-600">
                      <i className={`fas fa-check ${colors.text} text-xs`}></i>
                      {feature}
                    </li>
                  ))}
                </ul>
                <a
                  href={pillar.href}
                  className={`inline-flex items-center gap-2 ${colors.bg} ${colors.text} px-4 py-2 rounded-lg font-semibold text-sm hover:opacity-80 transition-opacity`}
                >
                  {pillar.cta}
                  <i className="fas fa-arrow-right text-xs"></i>
                </a>
              </div>
            );
          })}
        </div>

        <div className="mt-10 sm:mt-12 text-center">
          <div className="inline-flex items-center gap-3 bg-gray-50 px-6 py-3 rounded-full">
            <span className="text-sm text-gray-600">Your Journey:</span>
            <span className="text-sm font-semibold text-blue-600">Explore</span>
            <i className="fas fa-arrow-right text-gray-400 text-xs"></i>
            <span className="text-sm font-semibold text-green-600">Learn</span>
            <i className="fas fa-arrow-right text-gray-400 text-xs"></i>
            <span className="text-sm font-semibold text-orange-600">Create</span>
            <i className="fas fa-arrow-right text-gray-400 text-xs"></i>
            <span className="text-sm font-semibold text-gray-900">Launch</span>
          </div>
        </div>
      </div>
    </section>
  );
}

// Features Section
function FeaturesSection() {
  const features = [
    { icon: 'fa-bolt', title: 'Beginner Friendly', description: 'No complex features. No overwhelming dashboards. Just what you need to start.', color: 'orange' },
    { icon: 'fa-shield-alt', title: '100% Free', description: 'No credit card. No subscription. No hidden costs. Completely free to use.', color: 'green' },
    { icon: 'fa-graduation-cap', title: 'Educational Focus', description: 'Learn from real examples. Understand what works. Build confidence before investing.', color: 'blue' },
    { icon: 'fa-globe', title: 'Multi-Platform', description: 'Works for Amazon, Etsy, Shopify and more. One tool for all marketplaces.', color: 'purple' },
    { icon: 'fa-eye', title: 'Transparent Data', description: 'We clearly label all data sources. No fake estimates. Honest and trustworthy.', color: 'pink' },
    { icon: 'fa-users', title: 'Community Driven', description: 'Join thousands of aspiring sellers. Share insights. Learn together.', color: 'amber' },
  ];

  const colorMap: Record<string, string> = {
    orange: 'bg-orange-100 text-orange-600',
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    purple: 'bg-purple-100 text-purple-600',
    pink: 'bg-pink-100 text-pink-600',
    amber: 'bg-amber-100 text-amber-600',
  };

  return (
    <section id="features" className="py-16 sm:py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10 sm:mb-14">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-3 sm:mb-4">
            Why Aspiring Sellers Choose ListingAI
          </h2>
          <p className="text-sm sm:text-base text-gray-600 max-w-xl mx-auto px-2">
            We're not Helium 10. We're what comes before Helium 10. Start smart, grow big.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {features.map((feature, idx) => (
            <div key={idx} className="bg-white rounded-xl p-5 sm:p-6 border border-gray-100 hover:border-orange-200 hover:shadow-md transition-all">
              <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg ${colorMap[feature.color]} flex items-center justify-center mb-3 sm:mb-4`}>
                <i className={`fas ${feature.icon} text-base sm:text-lg`}></i>
              </div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
              <p className="text-gray-600 text-xs sm:text-sm leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// Explore Section
function ExploreSection() {
  const [selectedCategory, setSelectedCategory] = useState('all');

  const categories = [
    { id: 'all', name: 'All Products', icon: 'fa-th' },
    { id: 'electronics', name: 'Electronics', icon: 'fa-laptop' },
    { id: 'home', name: 'Home & Kitchen', icon: 'fa-home' },
    { id: 'beauty', name: 'Beauty', icon: 'fa-spa' },
    { id: 'sports', name: 'Sports', icon: 'fa-running' },
    { id: 'pets', name: 'Pet Supplies', icon: 'fa-paw' },
  ];

  const products = [
    {
      id: 1,
      name: 'Wireless Bluetooth Earbuds',
      category: 'electronics',
      price: 29.99,
      rating: 4.3,
      reviews: 8421,
      bsr: 1234,
      image: '🎧',
      highlights: ['40hr battery', 'IPX7 waterproof', 'Noise cancelling'],
    },
    {
      id: 2,
      name: 'Stainless Steel Water Bottle',
      category: 'home',
      price: 24.99,
      rating: 4.5,
      reviews: 5182,
      bsr: 2567,
      image: '🍶',
      highlights: ['1L capacity', 'BPA free', '24hr cold'],
    },
    {
      id: 3,
      name: 'Yoga Mat with Carrying Strap',
      category: 'sports',
      price: 34.99,
      rating: 4.4,
      reviews: 3847,
      bsr: 3891,
      image: '🧘',
      highlights: ['6mm thick', 'Non-slip', 'Eco-friendly'],
    },
    {
      id: 4,
      name: 'Organic Face Serum',
      category: 'beauty',
      price: 19.99,
      rating: 4.2,
      reviews: 6234,
      bsr: 1876,
      image: '✨',
      highlights: ['Vitamin C', 'Anti-aging', 'All skin types'],
    },
    {
      id: 5,
      name: 'Automatic Pet Feeder',
      category: 'pets',
      price: 49.99,
      rating: 4.1,
      reviews: 2156,
      bsr: 4523,
      image: '🐕',
      highlights: ['4L capacity', 'Timer', 'Voice recording'],
    },
    {
      id: 6,
      name: 'LED Desk Lamp',
      category: 'electronics',
      price: 32.99,
      rating: 4.6,
      reviews: 4521,
      bsr: 2134,
      image: '💡',
      highlights: ['5 brightness levels', 'USB charging', 'Touch control'],
    },
  ];

  const filteredProducts = selectedCategory === 'all' 
    ? products 
    : products.filter(p => p.category === selectedCategory);

  return (
    <section id="explore" className="py-16 sm:py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10 sm:mb-14">
          <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 px-3 py-1.5 rounded-full text-xs font-medium mb-4">
            <i className="fas fa-search"></i>
            EXPLORE
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-3 sm:mb-4">
            Real Marketplace Examples
          </h2>
          <p className="text-sm sm:text-base text-gray-600 max-w-2xl mx-auto px-2">
            Browse curated product examples from Amazon. See what's selling, at what price, with what competition.
          </p>
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap justify-center gap-2 sm:gap-3 mb-8 sm:mb-10">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                selectedCategory === cat.id
                  ? 'bg-orange-500 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <i className={`fas ${cat.icon} mr-1.5`}></i>
              {cat.name}
            </button>
          ))}
        </div>

        {/* Products Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {filteredProducts.map(product => (
            <div key={product.id} className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5 hover:shadow-lg transition-all">
              <div className="text-4xl sm:text-5xl mb-3 text-center">{product.image}</div>
              <h3 className="font-semibold text-gray-900 mb-2 text-sm sm:text-base line-clamp-2">{product.name}</h3>
              <div className="flex items-center justify-between mb-3">
                <span className="text-lg sm:text-xl font-bold text-orange-600">${product.price}</span>
                <div className="flex items-center gap-1 text-xs sm:text-sm text-gray-600">
                  <i className="fas fa-star text-yellow-400"></i>
                  <span>{product.rating}</span>
                  <span className="text-gray-400">({product.reviews.toLocaleString()})</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {product.highlights.map((highlight, idx) => (
                  <span key={idx} className="bg-gray-100 text-gray-700 text-[10px] sm:text-xs px-2 py-1 rounded">
                    {highlight}
                  </span>
                ))}
              </div>
              <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                <span className="text-[10px] sm:text-xs text-gray-500">BSR: #{product.bsr}</span>
                <button className="text-xs sm:text-sm text-orange-500 hover:text-orange-600 font-medium">
                  Analyze <i className="fas fa-arrow-right ml-1"></i>
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 sm:mt-10 text-center">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-2xl mx-auto mb-6">
            <p className="text-xs sm:text-sm text-blue-900">
              <i className="fas fa-shield-alt text-blue-600 mr-2"></i>
              <strong>Transparent Data:</strong> Product examples shown are curated for educational purposes. 
              Prices, ratings, and metrics are snapshots and may not reflect current marketplace data. 
              We clearly label all data sources — no fake estimates.
            </p>
          </div>
          
          <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-xl p-5 sm:p-6 max-w-3xl mx-auto mb-6">
            <h3 className="font-semibold text-gray-900 mb-3 text-sm sm:text-base">
              <i className="fas fa-lightbulb text-yellow-500 mr-2"></i>
              What Can You Learn from These Examples?
            </h3>
            <div className="grid sm:grid-cols-2 gap-3 text-left">
              <div className="flex items-start gap-2">
                <i className="fas fa-check text-green-500 mt-1 text-xs"></i>
                <span className="text-xs sm:text-sm text-gray-700">How successful products are priced</span>
              </div>
              <div className="flex items-start gap-2">
                <i className="fas fa-check text-green-500 mt-1 text-xs"></i>
                <span className="text-xs sm:text-sm text-gray-700">What ratings and reviews look like</span>
              </div>
              <div className="flex items-start gap-2">
                <i className="fas fa-check text-green-500 mt-1 text-xs"></i>
                <span className="text-xs sm:text-sm text-gray-700">Common features in each category</span>
              </div>
              <div className="flex items-start gap-2">
                <i className="fas fa-check text-green-500 mt-1 text-xs"></i>
                <span className="text-xs sm:text-sm text-gray-700">How BSR indicates popularity</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-center gap-3">
            <a href="#learn" className="inline-flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg font-semibold transition-all">
              <i className="fas fa-graduation-cap"></i>
              Learn from Examples
            </a>
            <a href="#tool" className="inline-flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-lg font-semibold transition-all">
              <i className="fas fa-magic"></i>
              Create Your Own Listing
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

// Learn Section
function LearnSection() {
  const guides = [
    {
      title: 'How to Read an Amazon Listing',
      description: 'Break down what each part of a listing means — title, bullets, description, images, reviews. Learn to spot what works.',
      icon: 'fa-book-open',
      duration: '5 min read',
      level: 'Beginner',
      color: 'blue',
    },
    {
      title: 'What Makes a Good Title?',
      description: 'Title structure, keyword placement, character limits, and common mistakes new sellers make.',
      icon: 'fa-heading',
      duration: '4 min read',
      level: 'Beginner',
      color: 'green',
    },
    {
      title: 'How Bullet Points Work',
      description: 'Feature vs benefit format, keyword integration, and how to write bullets that convert browsers into buyers.',
      icon: 'fa-list',
      duration: '6 min read',
      level: 'Beginner',
      color: 'orange',
    },
    {
      title: 'Understanding BSR (Best Sellers Rank)',
      description: 'What BSR means, how it\'s calculated, and how to use it for product research. Lower is better — but what\'s "good"?',
      icon: 'fa-chart-line',
      duration: '7 min read',
      level: 'Beginner',
      color: 'purple',
    },
    {
      title: 'What is Competition?',
      description: 'How to evaluate if a market is too crowded. Review counts, ratings, and what they tell you about opportunity.',
      icon: 'fa-users',
      duration: '6 min read',
      level: 'Beginner',
      color: 'blue',
    },
    {
      title: 'Amazon vs Shopify: Which to Choose?',
      description: 'Pros and cons of each platform. Traffic, fees, control, and which is right for your situation.',
      icon: 'fa-balance-scale',
      duration: '8 min read',
      level: 'Beginner',
      color: 'green',
    },
    {
      title: 'Product Research Basics',
      description: 'How to find product ideas, validate demand, and assess if a product is worth pursuing.',
      icon: 'fa-search',
      duration: '10 min read',
      level: 'Intermediate',
      color: 'orange',
    },
    {
      title: 'Pricing Strategies for New Sellers',
      description: 'How to price competitively while maintaining margins. Understanding fees, FBA costs, and profit calculations.',
      icon: 'fa-dollar-sign',
      duration: '7 min read',
      level: 'Intermediate',
      color: 'purple',
    },
  ];

  const colorMap: Record<string, string> = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    orange: 'bg-orange-100 text-orange-600',
    purple: 'bg-purple-100 text-purple-600',
  };

  return (
    <section id="learn" className="py-16 sm:py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10 sm:mb-14">
          <div className="inline-flex items-center gap-2 bg-green-100 text-green-700 px-3 py-1.5 rounded-full text-xs font-medium mb-4">
            <i className="fas fa-graduation-cap"></i>
            LEARN
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-3 sm:mb-4">
            Practical Guides for New Sellers
          </h2>
          <p className="text-sm sm:text-base text-gray-600 max-w-2xl mx-auto px-2">
            Learn e-commerce using real examples. Understand what makes listings successful. Build confidence before investing.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-4 sm:gap-6">
          {guides.map((guide, idx) => {
            const colors = colorMap[guide.color];
            return (
              <div key={idx} className="bg-white rounded-xl p-5 sm:p-6 border border-gray-200 hover:shadow-lg transition-all cursor-pointer">
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 ${colors} rounded-lg flex items-center justify-center flex-shrink-0`}>
                    <i className={`fas ${guide.icon} text-lg`}></i>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-2 text-sm sm:text-base">{guide.title}</h3>
                    <p className="text-gray-600 text-xs sm:text-sm mb-3 leading-relaxed">{guide.description}</p>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span><i className="fas fa-clock mr-1"></i> {guide.duration}</span>
                      <span className={`px-2 py-0.5 rounded-full ${colors} text-[10px] font-medium`}>
                        {guide.level}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-8 sm:mt-10 text-center">
          <p className="text-xs sm:text-sm text-gray-500 mb-4">
            <i className="fas fa-info-circle mr-1"></i>
            More guides added weekly. Learn at your own pace.
          </p>
          <a href="#explore" className="inline-flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg font-semibold text-sm sm:text-base transition-all">
            Start Learning Now
            <i className="fas fa-arrow-right"></i>
          </a>
        </div>
      </div>
    </section>
  );
}

// Pricing Comparison
function PricingComparison() {
  return (
    <section id="pricing" className="py-16 sm:py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10 sm:mb-14">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-3 sm:mb-4">
            Start Free. Grow When Ready.
          </h2>
          <p className="text-sm sm:text-base text-gray-600 max-w-2xl mx-auto px-2">
            No expensive tools until you need them. Start with ListingAI, upgrade when you're ready.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 lg:gap-8 max-w-4xl mx-auto">
          {/* Free Tier */}
          <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl p-6 sm:p-8 border-2 border-orange-500 shadow-lg">
            <div className="bg-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full inline-block mb-4">
              START HERE
            </div>
            <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">FREE</h3>
            <p className="text-4xl sm:text-5xl font-bold text-orange-600 mb-4">$0<span className="text-lg text-gray-500">/month</span></p>
            <p className="text-gray-600 text-sm mb-6">Everything you need to start your e-commerce journey.</p>
            <ul className="space-y-3 mb-6">
              <li className="flex items-start gap-2 text-sm text-gray-700">
                <i className="fas fa-check text-orange-500 mt-0.5"></i>
                <span>Explore marketplace examples</span>
              </li>
              <li className="flex items-start gap-2 text-sm text-gray-700">
                <i className="fas fa-check text-orange-500 mt-0.5"></i>
                <span>Analyze 5 products per day</span>
              </li>
              <li className="flex items-start gap-2 text-sm text-gray-700">
                <i className="fas fa-check text-orange-500 mt-0.5"></i>
                <span>3 AI listings per day</span>
              </li>
              <li className="flex items-start gap-2 text-sm text-gray-700">
                <i className="fas fa-check text-orange-500 mt-0.5"></i>
                <span>Educational guides & resources</span>
              </li>
              <li className="flex items-start gap-2 text-sm text-gray-700">
                <i className="fas fa-check text-orange-500 mt-0.5"></i>
                <span>Community support</span>
              </li>
            </ul>
            <a href="#tool" className="block w-full bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-lg font-semibold text-center transition-all">
              Start Free Now
            </a>
            <p className="text-xs text-gray-500 text-center mt-3">No credit card required</p>
          </div>

          {/* Pro Tier */}
          <div className="bg-white rounded-2xl p-6 sm:p-8 border-2 border-gray-200">
            <div className="bg-gray-200 text-gray-700 text-xs font-bold px-3 py-1 rounded-full inline-block mb-4">
              COMING SOON
            </div>
            <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">PRO</h3>
            <p className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">$19<span className="text-lg text-gray-500">/month</span></p>
            <p className="text-gray-600 text-sm mb-6">For when you're ready to scale your business.</p>
            <ul className="space-y-3 mb-6">
              <li className="flex items-start gap-2 text-sm text-gray-700">
                <i className="fas fa-check text-green-500 mt-0.5"></i>
                <span>Everything in Free</span>
              </li>
              <li className="flex items-start gap-2 text-sm text-gray-700">
                <i className="fas fa-check text-green-500 mt-0.5"></i>
                <span>Unlimited product analysis</span>
              </li>
              <li className="flex items-start gap-2 text-sm text-gray-700">
                <i className="fas fa-check text-green-500 mt-0.5"></i>
                <span>Unlimited AI listings</span>
              </li>
              <li className="flex items-start gap-2 text-sm text-gray-700">
                <i className="fas fa-check text-green-500 mt-0.5"></i>
                <span>Advanced market data</span>
              </li>
              <li className="flex items-start gap-2 text-sm text-gray-700">
                <i className="fas fa-check text-green-500 mt-0.5"></i>
                <span>Export reports & history</span>
              </li>
            </ul>
            <button className="block w-full bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold text-center cursor-not-allowed">
              Join Waitlist
            </button>
            <p className="text-xs text-gray-500 text-center mt-3">Cancel anytime</p>
          </div>
        </div>

        <div className="mt-10 sm:mt-12 text-center">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 sm:p-6 max-w-2xl mx-auto">
            <p className="text-sm sm:text-base text-blue-900 font-medium mb-2">
              <i className="fas fa-lightbulb text-blue-600 mr-2"></i>
              Our Recommendation
            </p>
            <p className="text-xs sm:text-sm text-blue-800 leading-relaxed">
              Start with the free tier. Learn the market. Build confidence. When you're generating consistent sales and ready for advanced analytics, 
              then consider upgrading to Helium 10, Jungle Scout, or our Pro tier.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

// How It Works
function HowItWorks() {
  const steps = [
    { step: '1', title: 'Explore the Market', desc: 'Browse curated product examples. See what\'s selling, at what price, with what competition.', icon: 'fa-search' },
    { step: '2', title: 'Learn from Examples', desc: 'Read practical guides. Understand what makes listings successful. Build your knowledge.', icon: 'fa-graduation-cap' },
    { step: '3', title: 'Create Your Listing', desc: 'Use AI to generate professional titles, bullets, and descriptions optimized for your marketplace.', icon: 'fa-magic' },
    { step: '4', title: 'Launch with Confidence', desc: 'You understand the market. You have a great listing. You\'re ready to start your business.', icon: 'fa-rocket' },
  ];

  return (
    <section id="how-it-works" className="py-16 sm:py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10 sm:mb-14">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-3 sm:mb-4">
            How It Works
          </h2>
          <p className="text-sm sm:text-base text-gray-600">3 simple steps to a professional listing</p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
          {steps.map((s, idx) => (
            <div key={idx} className="text-center">
              <div className="w-14 h-14 sm:w-16 sm:h-16 bg-orange-100 rounded-2xl flex items-center justify-center mx-auto mb-3 sm:mb-4">
                <i className={`fas ${s.icon} text-orange-500 text-xl sm:text-2xl`}></i>
              </div>
              <div className="text-xs font-bold text-orange-500 mb-1">STEP {s.step}</div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">{s.title}</h3>
              <p className="text-gray-600 text-xs sm:text-sm">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// FAQ Section
function FAQSection() {
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  const faqs = [
    { q: 'Is ListingAI really free?', a: 'Yes! You get 5 free listing generations per day. No credit card, no signup required. If you need more, you can watch a 30-second ad for additional credits.' },
    { q: 'How is this different from Helium 10 or Jungle Scout?', a: 'Those tools charge $39-$99/month and include many features you might not need. ListingAI focuses specifically on generating high-quality product listings using AI — for free.' },
    { q: 'Will Amazon accept AI-generated listings?', a: 'Yes. Amazon allows AI-assisted content as long as it\'s accurate and not misleading. Our listings are optimized for Amazon\'s A9 algorithm and follow all marketplace guidelines.' },
    { q: 'What AI model do you use?', a: 'We use state-of-the-art language models fine-tuned specifically for e-commerce copywriting. The models are trained on millions of successful product listings across all major marketplaces.' },
    { q: 'Is my product data safe?', a: 'Absolutely. We don\'t store any of your product information. Everything is processed in real-time and immediately discarded after generation.' },
    { q: 'Can I use this for Etsy and Shopify too?', a: 'Yes! Select your platform (Amazon, Etsy, or Shopify) and we\'ll optimize the listing format, character limits, and keywords specifically for that marketplace.' },
  ];

  return (
    <section id="faq" className="py-16 sm:py-20 bg-white">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10 sm:mb-14">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-3 sm:mb-4">
            Frequently Asked Questions
          </h2>
        </div>

        <div className="space-y-2 sm:space-y-3">
          {faqs.map((faq, idx) => (
            <div key={idx} className="border border-gray-200 rounded-xl overflow-hidden">
              <button
                onClick={() => setOpenIdx(openIdx === idx ? null : idx)}
                className="w-full flex items-center justify-between p-4 sm:p-5 text-left hover:bg-gray-50 transition-colors"
              >
                <span className="font-medium text-gray-900 text-sm sm:text-base pr-4">{faq.q}</span>
                <i className={`fas fa-chevron-down text-gray-400 transition-transform flex-shrink-0 ${openIdx === idx ? 'rotate-180' : ''}`}></i>
              </button>
              {openIdx === idx && (
                <div className="px-4 sm:px-5 pb-4 sm:pb-5 text-gray-600 text-xs sm:text-sm leading-relaxed">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// Footer
function Footer({ onNavigate }: { onNavigate: (page: 'home' | 'privacy' | 'terms' | 'about') => void }) {
  return (
    <footer className="bg-gray-900 text-white py-12 sm:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 mb-10 sm:mb-12">
          <div className="col-span-2 sm:col-span-1">
            <div className="flex items-center gap-2 mb-3 sm:mb-4">
              <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-amber-500 rounded-lg flex items-center justify-center">
                <i className="fas fa-bolt text-white text-sm"></i>
              </div>
              <div className="flex flex-col leading-tight">
                <span className="text-lg sm:text-xl font-bold">Listing<span className="text-orange-400">AI</span></span>
                <span className="text-[10px] text-gray-500 font-medium tracking-wider uppercase">by ZuniTech</span>
              </div>
            </div>
            <p className="text-gray-400 text-xs sm:text-sm leading-relaxed">
              Free AI-powered product listing generator for Amazon, Etsy & Shopify sellers worldwide. A ZuniTech product.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-sm sm:text-base mb-3 sm:mb-4">Product</h4>
            <ul className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm text-gray-400">
              <li><a href="#explore" className="hover:text-orange-400 transition-colors">Explore</a></li>
              <li><a href="#learn" className="hover:text-orange-400 transition-colors">Learn</a></li>
              <li><a href="#tool" className="hover:text-orange-400 transition-colors">Create</a></li>
              <li><a href="#how-it-works" className="hover:text-orange-400 transition-colors">How It Works</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-sm sm:text-base mb-3 sm:mb-4">Resources</h4>
            <ul className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm text-gray-400">
              <li><a href="#faq" className="hover:text-orange-400 transition-colors">FAQ</a></li>
              <li><a href="#learn" className="hover:text-orange-400 transition-colors">Guides</a></li>
              <li><a href="#pricing" className="hover:text-orange-400 transition-colors">Pricing</a></li>
              <li><a href="#" className="hover:text-orange-400 transition-colors">Blog</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-sm sm:text-base mb-3 sm:mb-4">Legal</h4>
            <ul className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm text-gray-400">
              <li><button onClick={() => onNavigate('privacy')} className="hover:text-orange-400 transition-colors">Privacy Policy</button></li>
              <li><button onClick={() => onNavigate('terms')} className="hover:text-orange-400 transition-colors">Terms of Service</button></li>
              <li><button onClick={() => onNavigate('about')} className="hover:text-orange-400 transition-colors">About Us</button></li>
              <li><a href="#" className="hover:text-orange-400 transition-colors">Contact</a></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 pt-6 sm:pt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-xs sm:text-sm text-gray-500">© 2026 ListingAI. Powered by <span className="text-orange-400 font-medium">ZuniTech</span>. All rights reserved.</p>
          <div className="flex gap-4">
            <a href="#" className="text-gray-500 hover:text-orange-400 transition-colors"><i className="fab fa-twitter"></i></a>
            <a href="#" className="text-gray-500 hover:text-orange-400 transition-colors"><i className="fab fa-linkedin"></i></a>
            <a href="#" className="text-gray-500 hover:text-orange-400 transition-colors"><i className="fab fa-youtube"></i></a>
            <a href="#" className="text-gray-500 hover:text-orange-400 transition-colors"><i className="fab fa-reddit"></i></a>
          </div>
        </div>
      </div>
    </footer>
  );
}

// Privacy Policy Page
function PrivacyPolicy({ onBack }: { onBack: () => void }) {
  return (
    <div className="min-h-screen bg-white py-8 sm:py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <button onClick={onBack} className="text-orange-500 hover:text-orange-600 font-medium mb-6 sm:mb-8 flex items-center gap-2 text-sm sm:text-base">
          <i className="fas fa-arrow-left"></i> Back to Home
        </button>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4 sm:mb-6">Privacy Policy</h1>
        <div className="prose prose-gray max-w-none text-gray-600 space-y-4 text-sm sm:text-base">
          <p><strong>Last Updated:</strong> January 2026</p>
          <p>At ListingAI, we take your privacy seriously. This policy explains how we handle your data.</p>
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mt-6">Data We Collect</h2>
          <p>We do NOT store any product information you enter. All data is processed in real-time and immediately discarded after generation.</p>
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mt-6">Cookies & Analytics</h2>
          <p>We use minimal cookies for site functionality and anonymous analytics to improve our service. No personal data is tracked.</p>
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mt-6">Third-Party Services</h2>
          <p>We use advertising services (Google AdSense) that may collect anonymous usage data. These services have their own privacy policies.</p>
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mt-6">Contact</h2>
          <p>For privacy inquiries, email us at privacy@listingai.com</p>
        </div>
      </div>
    </div>
  );
}

// Terms of Service Page
function TermsOfService({ onBack }: { onBack: () => void }) {
  return (
    <div className="min-h-screen bg-white py-8 sm:py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <button onClick={onBack} className="text-orange-500 hover:text-orange-600 font-medium mb-6 sm:mb-8 flex items-center gap-2 text-sm sm:text-base">
          <i className="fas fa-arrow-left"></i> Back to Home
        </button>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4 sm:mb-6">Terms of Service</h1>
        <div className="prose prose-gray max-w-none text-gray-600 space-y-4 text-sm sm:text-base">
          <p><strong>Last Updated:</strong> January 2026</p>
          <p>By using ListingAI, you agree to these terms.</p>
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mt-6">Service Description</h2>
          <p>ListingAI provides free AI-generated product listings for e-commerce marketplaces. We do not guarantee specific sales results.</p>
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mt-6">Fair Usage</h2>
          <p>Free tier includes 5 generations per day. Abuse or automated usage may result in temporary restrictions.</p>
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mt-6">Content Responsibility</h2>
          <p>You are responsible for ensuring generated content complies with marketplace policies and is accurate for your products.</p>
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mt-6">Limitation of Liability</h2>
          <p>ListingAI is provided "as is" without warranties. We are not liable for any damages resulting from use of our service.</p>
        </div>
      </div>
    </div>
  );
}

// About Page
function AboutPage({ onBack }: { onBack: () => void }) {
  return (
    <div className="min-h-screen bg-white py-8 sm:py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <button onClick={onBack} className="text-orange-500 hover:text-orange-600 font-medium mb-6 sm:mb-8 flex items-center gap-2 text-sm sm:text-base">
          <i className="fas fa-arrow-left"></i> Back to Home
        </button>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">About ListingAI</h1>
        <p className="text-xs sm:text-sm text-orange-500 font-semibold mb-4 sm:mb-6 uppercase tracking-wider">Powered by ZuniTech</p>
        <div className="prose prose-gray max-w-none text-gray-600 space-y-4 text-sm sm:text-base">
          <p>
            ListingAI is a product of <strong className="text-gray-900">ZuniTech</strong> — built with one mission: <strong>make professional product listings accessible to every seller, regardless of budget.</strong>
          </p>
          <p>
            At ZuniTech, we believe that powerful AI tools shouldn't be locked behind expensive paywalls. We noticed that Amazon, Etsy, and Shopify sellers were paying $40-$100/month for AI listing tools. Small sellers, newcomers, and part-time sellers couldn't afford these prices.
          </p>
          <p>
            So we built ListingAI: a free, fast, and powerful AI listing generator that rivals the best paid tools — without the price tag. This is just the beginning. ZuniTech is building a suite of AI-powered tools to help entrepreneurs and businesses succeed online.
          </p>
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mt-6">Our Numbers</h2>
          <div className="grid grid-cols-3 gap-3 sm:gap-4 my-6">
            <div className="text-center p-3 sm:p-4 bg-orange-50 rounded-lg">
              <div className="text-xl sm:text-2xl font-bold text-orange-600">10K+</div>
              <div className="text-xs sm:text-sm text-gray-600">Sellers</div>
            </div>
            <div className="text-center p-3 sm:p-4 bg-orange-50 rounded-lg">
              <div className="text-xl sm:text-2xl font-bold text-orange-600">50K+</div>
              <div className="text-xs sm:text-sm text-gray-600">Listings</div>
            </div>
            <div className="text-center p-3 sm:p-4 bg-orange-50 rounded-lg">
              <div className="text-xl sm:text-2xl font-bold text-orange-600">$0</div>
              <div className="text-xs sm:text-sm text-gray-600">Cost</div>
            </div>
          </div>
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mt-6">Contact Us</h2>
          <p>Have questions or feedback? Email us at hello@listingai.com</p>
        </div>
      </div>
    </div>
  );
}

export default App;
