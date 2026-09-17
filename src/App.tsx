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
      <AdBanner slot="top" />
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
            <span className="text-xl font-bold text-gray-900">Listing<span className="text-orange-500">AI</span></span>
          </div>

          <nav className="hidden md:flex items-center gap-8">
            <a href="#tool" className="text-sm font-medium text-gray-600 hover:text-orange-500 transition-colors">Generator</a>
            <a href="#features" className="text-sm font-medium text-gray-600 hover:text-orange-500 transition-colors">Features</a>
            <a href="#pricing" className="text-sm font-medium text-gray-600 hover:text-orange-500 transition-colors">vs Paid Tools</a>
            <a href="#faq" className="text-sm font-medium text-gray-600 hover:text-orange-500 transition-colors">FAQ</a>
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
              <a href="#tool" className="text-sm font-medium text-gray-600 px-2 py-1">Generator</a>
              <a href="#features" className="text-sm font-medium text-gray-600 px-2 py-1">Features</a>
              <a href="#pricing" className="text-sm font-medium text-gray-600 px-2 py-1">vs Paid Tools</a>
              <a href="#faq" className="text-sm font-medium text-gray-600 px-2 py-1">FAQ</a>
              <button onClick={() => onNavigate('about')} className="text-sm font-medium text-gray-600 px-2 py-1 text-left">About</button>
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
    <section className="py-16 sm:py-24 bg-gradient-to-b from-orange-50/50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="inline-flex items-center gap-2 bg-orange-100 text-orange-700 px-4 py-2 rounded-full text-sm font-medium mb-6">
          <i className="fas fa-star text-xs"></i>
          Trusted by 10,000+ Amazon Sellers
        </div>
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight mb-6">
          Free AI Amazon<br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-amber-500">
            Listing Generator
          </span>
        </h1>
        <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto mb-8">
          Generate professional product titles, bullet points & descriptions in seconds. 
          No signup required. No credit card. 100% free forever.
        </p>
        <div className="flex flex-wrap justify-center gap-4 mb-8">
          <a href="#tool" className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-3 rounded-lg font-semibold transition-all shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40">
            <i className="fas fa-rocket mr-2"></i> Generate Free Listing
          </a>
          <a href="#pricing" className="border border-gray-300 hover:border-orange-300 text-gray-700 px-8 py-3 rounded-lg font-semibold transition-all">
            See vs $99/mo Tools
          </a>
        </div>
        <div className="flex flex-wrap justify-center gap-6 text-sm text-gray-500">
          <span><i className="fas fa-check text-green-500 mr-1"></i> No Login</span>
          <span><i className="fas fa-check text-green-500 mr-1"></i> No Limits</span>
          <span><i className="fas fa-check text-green-500 mr-1"></i> Amazon + Etsy + Shopify</span>
          <span><i className="fas fa-check text-green-500 mr-1"></i> SEO Optimized</span>
        </div>
      </div>
    </section>
  );
}

// Ad Banner Placeholder
function AdBanner({ slot }: { slot: string }) {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
      <div className="bg-gray-50 border border-dashed border-gray-200 rounded-lg h-24 flex items-center justify-center">
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
      alert('Please enter a product name');
      return;
    }

    setIsGenerating(true);
    setOutput(null);

    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 2500));

    // Generate mock output (later this will be connected to OpenRouter API)
    const generatedOutput: ListingOutput = {
      title: generateTitle(productName, category, platform),
      bulletPoints: generateBulletPoints(productName, keyFeatures, targetAudience, tone),
      description: generateDescription(productName, keyFeatures, targetAudience, tone, category),
      searchTerms: generateSearchTerms(productName, category),
    };

    setOutput(generatedOutput);
    setIsGenerating(false);
    setCreditsUsed(prev => prev + 1);
  };

  return (
    <section id="tool" className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Generate Your Listing Now
          </h2>
          <p className="text-gray-600 max-w-xl mx-auto">
            Fill in your product details below and get a complete, SEO-optimized listing in seconds.
          </p>
          <div className="mt-4 inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full text-sm">
            <i className="fas fa-coins"></i>
            <span>Credits used today: <strong>{creditsUsed}</strong> / 5 free</span>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Input Form */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 sm:p-8 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
              <i className="fas fa-edit text-orange-500"></i>
              Product Details
            </h3>

            <div className="space-y-5">
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
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all text-gray-900 placeholder:text-gray-400"
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
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all text-gray-900 bg-white"
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
                <div className="grid grid-cols-3 gap-3">
                  {platforms.map(p => (
                    <button
                      key={p.value}
                      onClick={() => setPlatform(p.value)}
                      className={`px-4 py-3 rounded-lg border-2 text-sm font-medium transition-all ${
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
                  placeholder="e.g., 40hr battery, noise cancelling, IPX7 waterproof, touch controls..."
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all text-gray-900 placeholder:text-gray-400 resize-none"
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
                  placeholder="e.g., fitness enthusiasts, commuters, students"
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all text-gray-900 placeholder:text-gray-400"
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
                      className={`px-3 py-2.5 rounded-lg border-2 text-sm font-medium transition-all ${
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
                className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 disabled:from-gray-400 disabled:to-gray-400 text-white py-4 rounded-lg font-semibold text-lg transition-all shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 disabled:shadow-none flex items-center justify-center gap-2"
              >
                {isGenerating ? (
                  <>
                    <i className="fas fa-spinner fa-spin"></i>
                    Generating Your Listing...
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
          <div className="bg-white border border-gray-200 rounded-2xl p-6 sm:p-8 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
              <i className="fas fa-file-alt text-orange-500"></i>
              Generated Listing
            </h3>

            {isGenerating && (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mb-4 animate-pulse">
                  <i className="fas fa-robot text-orange-500 text-2xl"></i>
                </div>
                <p className="text-gray-600 font-medium">AI is writing your listing...</p>
                <p className="text-sm text-gray-400 mt-1">Optimizing for {platform} SEO</p>
              </div>
            )}

            {!isGenerating && !output && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <i className="fas fa-arrow-left text-gray-400 text-xl"></i>
                </div>
                <p className="text-gray-500 font-medium">Your listing will appear here</p>
                <p className="text-sm text-gray-400 mt-1">Fill in product details and click Generate</p>
              </div>
            )}

            {!isGenerating && output && (
              <div className="space-y-6">
                {/* Title */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-semibold text-gray-700">Product Title</label>
                    <span className="text-xs text-gray-400">{output.title.length}/200 chars</span>
                  </div>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-gray-900 font-medium">
                    {output.title}
                  </div>
                </div>

                {/* Bullet Points */}
                <div>
                  <label className="text-sm font-semibold text-gray-700 mb-2 block">Bullet Points</label>
                  <div className="space-y-2">
                    {output.bulletPoints.map((point, idx) => (
                      <div key={idx} className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm text-gray-700">
                        <span className="font-semibold text-orange-600 mr-2">•</span>
                        {point}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="text-sm font-semibold text-gray-700 mb-2 block">Product Description</label>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm text-gray-700 leading-relaxed">
                    {output.description}
                  </div>
                </div>

                {/* Search Terms */}
                <div>
                  <label className="text-sm font-semibold text-gray-700 mb-2 block">Backend Search Terms</label>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 flex flex-wrap gap-2">
                    {output.searchTerms.map((term, idx) => (
                      <span key={idx} className="bg-orange-100 text-orange-700 text-xs px-2 py-1 rounded-full">
                        {term}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4 border-t border-gray-100">
                  <button className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-lg text-sm font-medium transition-all">
                    <i className="fas fa-copy mr-1"></i> Copy All
                  </button>
                  <button className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-lg text-sm font-medium transition-all">
                    <i className="fas fa-download mr-1"></i> Download .txt
                  </button>
                  <button className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-lg text-sm font-medium transition-all">
                    <i className="fas fa-redo mr-1"></i> Regenerate
                  </button>
                </div>

                {/* Rewarded Ad CTA */}
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4 text-center">
                  <p className="text-sm text-green-800 font-medium">
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

// Features Section
function FeaturesSection() {
  const features = [
    {
      icon: 'fa-bolt',
      title: 'Lightning Fast',
      description: 'Get a complete listing in under 10 seconds. No waiting, no queues.',
      color: 'orange',
    },
    {
      icon: 'fa-search',
      title: 'SEO Optimized',
      description: 'Every listing is optimized with high-ranking keywords for your category.',
      color: 'blue',
    },
    {
      icon: 'fa-shield-alt',
      title: '100% Private',
      description: 'Your product data is never stored. Processed in real-time and forgotten.',
      color: 'green',
    },
    {
      icon: 'fa-globe',
      title: 'Multi-Platform',
      description: 'Works for Amazon, Etsy, Shopify, eBay and any marketplace.',
      color: 'purple',
    },
    {
      icon: 'fa-language',
      title: 'Multiple Tones',
      description: 'Professional, friendly, luxury, or urgent — match your brand voice.',
      color: 'pink',
    },
    {
      icon: 'fa-infinity',
      title: 'Unlimited Use',
      description: '5 free generations daily. Watch an ad for more. No credit card needed.',
      color: 'amber',
    },
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
    <section id="features" className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Why Sellers Choose ListingAI
          </h2>
          <p className="text-gray-600 max-w-xl mx-auto">
            Built by Amazon sellers, for Amazon sellers. Every feature designed to save you time and boost sales.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, idx) => (
            <div key={idx} className="bg-white rounded-xl p-6 border border-gray-100 hover:border-orange-200 hover:shadow-md transition-all">
              <div className={`w-12 h-12 rounded-lg ${colorMap[feature.color]} flex items-center justify-center mb-4`}>
                <i className={`fas ${feature.icon} text-lg`}></i>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
              <p className="text-gray-600 text-sm leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// Pricing Comparison
function PricingComparison() {
  const competitors = [
    { name: 'Helium 10', price: '$39-$99/mo', features: ['AI Listing', 'Keyword Research', 'Analytics'], highlight: false },
    { name: 'Jungle Scout', price: '$49/mo', features: ['AI Listing', 'Product Research', 'Supplier DB'], highlight: false },
    { name: 'Jasper AI', price: '$49/mo', features: ['AI Copywriting', 'Templates', 'Brand Voice'], highlight: false },
    { name: 'ListingAI', price: 'FREE', features: ['AI Listing', 'SEO Optimized', 'Multi-Platform'], highlight: true },
  ];

  return (
    <section id="pricing" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Stop Paying $99/month for Listings
          </h2>
          <p className="text-gray-600 max-w-xl mx-auto">
            See how ListingAI compares to expensive tools — at zero cost.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {competitors.map((comp, idx) => (
            <div
              key={idx}
              className={`rounded-2xl p-6 border-2 transition-all ${
                comp.highlight
                  ? 'border-orange-500 bg-orange-50 shadow-lg shadow-orange-500/10 scale-105'
                  : 'border-gray-200 bg-white'
              }`}
            >
              {comp.highlight && (
                <div className="bg-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full inline-block mb-3">
                  BEST VALUE
                </div>
              )}
              <h3 className="text-xl font-bold text-gray-900 mb-1">{comp.name}</h3>
              <p className={`text-2xl font-bold mb-4 ${comp.highlight ? 'text-orange-600' : 'text-gray-900'}`}>
                {comp.price}
              </p>
              <ul className="space-y-2">
                {comp.features.map((f, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-gray-600">
                    <i className={`fas fa-check ${comp.highlight ? 'text-orange-500' : 'text-green-500'} text-xs`}></i>
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 text-center">
          <p className="text-gray-500 text-sm">
            💡 Save $588-$1,188/year by using ListingAI instead of paid alternatives
          </p>
        </div>
      </div>
    </section>
  );
}

// How It Works
function HowItWorks() {
  const steps = [
    { step: '1', title: 'Enter Product Details', desc: 'Type your product name, features, and target audience', icon: 'fa-keyboard' },
    { step: '2', title: 'AI Writes Your Listing', desc: 'Our AI creates SEO-optimized titles, bullets & descriptions', icon: 'fa-robot' },
    { step: '3', title: 'Copy & Paste', desc: 'Copy the listing directly to your Amazon/Etsy/Shopify dashboard', icon: 'fa-copy' },
  ];

  return (
    <section className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            How It Works
          </h2>
          <p className="text-gray-600">3 simple steps to a professional listing</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {steps.map((s, idx) => (
            <div key={idx} className="text-center">
              <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <i className={`fas ${s.icon} text-orange-500 text-2xl`}></i>
              </div>
              <div className="text-xs font-bold text-orange-500 mb-1">STEP {s.step}</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{s.title}</h3>
              <p className="text-gray-600 text-sm">{s.desc}</p>
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
    {
      q: 'Is ListingAI really free?',
      a: 'Yes! You get 5 free listing generations per day. No credit card, no signup required. If you need more, you can watch a 30-second ad for additional credits.',
    },
    {
      q: 'How is this different from Helium 10 or Jungle Scout?',
      a: 'Those tools charge $39-$99/month and include many features you might not need. ListingAI focuses specifically on generating high-quality product listings using AI — for free. If you need keyword research or analytics, those tools are great. But for listings alone, we\'re the better (free) choice.',
    },
    {
      q: 'Will Amazon accept AI-generated listings?',
      a: 'Yes. Amazon allows AI-assisted content as long as it\'s accurate and not misleading. Our listings are optimized for Amazon\'s A9 algorithm and follow all marketplace guidelines.',
    },
    {
      q: 'What AI model do you use?',
      a: 'We use state-of-the-art language models fine-tuned specifically for e-commerce copywriting. The models are trained on millions of successful product listings across all major marketplaces.',
    },
    {
      q: 'Is my product data safe?',
      a: 'Absolutely. We don\'t store any of your product information. Everything is processed in real-time and immediately discarded after generation. Your data never leaves the session.',
    },
    {
      q: 'Can I use this for Etsy and Shopify too?',
      a: 'Yes! Select your platform (Amazon, Etsy, or Shopify) and we\'ll optimize the listing format, character limits, and keywords specifically for that marketplace.',
    },
  ];

  return (
    <section id="faq" className="py-20 bg-white">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Frequently Asked Questions
          </h2>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, idx) => (
            <div key={idx} className="border border-gray-200 rounded-xl overflow-hidden">
              <button
                onClick={() => setOpenIdx(openIdx === idx ? null : idx)}
                className="w-full flex items-center justify-between p-5 text-left hover:bg-gray-50 transition-colors"
              >
                <span className="font-medium text-gray-900">{faq.q}</span>
                <i className={`fas fa-chevron-down text-gray-400 transition-transform ${openIdx === idx ? 'rotate-180' : ''}`}></i>
              </button>
              {openIdx === idx && (
                <div className="px-5 pb-5 text-gray-600 text-sm leading-relaxed">
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
    <footer className="bg-gray-900 text-white py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-amber-500 rounded-lg flex items-center justify-center">
                <i className="fas fa-bolt text-white text-sm"></i>
              </div>
              <span className="text-xl font-bold">Listing<span className="text-orange-400">AI</span></span>
            </div>
            <p className="text-gray-400 text-sm leading-relaxed">
              Free AI-powered product listing generator for Amazon, Etsy & Shopify sellers worldwide.
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Tools</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><a href="#tool" className="hover:text-orange-400 transition-colors">Listing Generator</a></li>
              <li><a href="#tool" className="hover:text-orange-400 transition-colors">Bullet Points</a></li>
              <li><a href="#tool" className="hover:text-orange-400 transition-colors">Title Optimizer</a></li>
              <li><a href="#tool" className="hover:text-orange-400 transition-colors">Description Writer</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Resources</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><a href="#faq" className="hover:text-orange-400 transition-colors">FAQ</a></li>
              <li><a href="#" className="hover:text-orange-400 transition-colors">Amazon SEO Guide</a></li>
              <li><a href="#" className="hover:text-orange-400 transition-colors">Listing Tips</a></li>
              <li><a href="#" className="hover:text-orange-400 transition-colors">Blog</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Legal</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><button onClick={() => onNavigate('privacy')} className="hover:text-orange-400 transition-colors">Privacy Policy</button></li>
              <li><button onClick={() => onNavigate('terms')} className="hover:text-orange-400 transition-colors">Terms of Service</button></li>
              <li><button onClick={() => onNavigate('about')} className="hover:text-orange-400 transition-colors">About Us</button></li>
              <li><a href="#" className="hover:text-orange-400 transition-colors">Contact</a></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-sm text-gray-500">© 2026 ListingAI. All rights reserved.</p>
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
    <div className="min-h-screen bg-white py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <button onClick={onBack} className="text-orange-500 hover:text-orange-600 font-medium mb-8 flex items-center gap-2">
          <i className="fas fa-arrow-left"></i> Back to Home
        </button>
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Privacy Policy</h1>
        <div className="prose prose-gray max-w-none text-gray-600 space-y-4">
          <p><strong>Last Updated:</strong> January 2026</p>
          <p>At ListingAI, we take your privacy seriously. This policy explains how we handle your data.</p>
          <h2 className="text-xl font-semibold text-gray-900 mt-6">Data We Collect</h2>
          <p>We do NOT store any product information you enter. All data is processed in real-time and immediately discarded after generation.</p>
          <h2 className="text-xl font-semibold text-gray-900 mt-6">Cookies & Analytics</h2>
          <p>We use minimal cookies for site functionality and anonymous analytics to improve our service. No personal data is tracked.</p>
          <h2 className="text-xl font-semibold text-gray-900 mt-6">Third-Party Services</h2>
          <p>We use advertising services (Google AdSense) that may collect anonymous usage data. These services have their own privacy policies.</p>
          <h2 className="text-xl font-semibold text-gray-900 mt-6">Contact</h2>
          <p>For privacy inquiries, email us at privacy@listingai.com</p>
        </div>
      </div>
    </div>
  );
}

// Terms of Service Page
function TermsOfService({ onBack }: { onBack: () => void }) {
  return (
    <div className="min-h-screen bg-white py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <button onClick={onBack} className="text-orange-500 hover:text-orange-600 font-medium mb-8 flex items-center gap-2">
          <i className="fas fa-arrow-left"></i> Back to Home
        </button>
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Terms of Service</h1>
        <div className="prose prose-gray max-w-none text-gray-600 space-y-4">
          <p><strong>Last Updated:</strong> January 2026</p>
          <p>By using ListingAI, you agree to these terms.</p>
          <h2 className="text-xl font-semibold text-gray-900 mt-6">Service Description</h2>
          <p>ListingAI provides free AI-generated product listings for e-commerce marketplaces. We do not guarantee specific sales results.</p>
          <h2 className="text-xl font-semibold text-gray-900 mt-6">Fair Usage</h2>
          <p>Free tier includes 5 generations per day. Abuse or automated usage may result in temporary restrictions.</p>
          <h2 className="text-xl font-semibold text-gray-900 mt-6">Content Responsibility</h2>
          <p>You are responsible for ensuring generated content complies with marketplace policies and is accurate for your products.</p>
          <h2 className="text-xl font-semibold text-gray-900 mt-6">Limitation of Liability</h2>
          <p>ListingAI is provided "as is" without warranties. We are not liable for any damages resulting from use of our service.</p>
        </div>
      </div>
    </div>
  );
}

// About Page
function AboutPage({ onBack }: { onBack: () => void }) {
  return (
    <div className="min-h-screen bg-white py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <button onClick={onBack} className="text-orange-500 hover:text-orange-600 font-medium mb-8 flex items-center gap-2">
          <i className="fas fa-arrow-left"></i> Back to Home
        </button>
        <h1 className="text-3xl font-bold text-gray-900 mb-6">About ListingAI</h1>
        <div className="prose prose-gray max-w-none text-gray-600 space-y-4">
          <p className="text-lg">
            ListingAI was built with one mission: <strong>make professional product listings accessible to every seller, regardless of budget.</strong>
          </p>
          <p>
            We noticed that Amazon, Etsy, and Shopify sellers were paying $40-$100/month for AI listing tools. Small sellers, newcomers, and part-time sellers couldn't afford these prices — even though they needed quality listings just as much.
          </p>
          <p>
            So we built ListingAI: a free, fast, and powerful AI listing generator that rivals the best paid tools — without the price tag.
          </p>
          <h2 className="text-xl font-semibold text-gray-900 mt-6">Our Numbers</h2>
          <div className="grid grid-cols-3 gap-4 my-6">
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">10K+</div>
              <div className="text-sm text-gray-600">Sellers</div>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">50K+</div>
              <div className="text-sm text-gray-600">Listings Generated</div>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">$0</div>
              <div className="text-sm text-gray-600">Cost to You</div>
            </div>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mt-6">Contact Us</h2>
          <p>Have questions or feedback? Email us at hello@listingai.com</p>
        </div>
      </div>
    </div>
  );
}

// ===== HELPER FUNCTIONS (Mock AI Generation) =====

function generateTitle(name: string, category: string, platform: string): string {
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

  return `${prefix} ${name} ${catTag} ${suffix}`.slice(0, 200);
}

function generateBulletPoints(name: string, features: string, audience: string, tone: string): string[] {
  const featureList = features ? features.split(',').map(f => f.trim()).filter(Boolean) : ['Premium quality', 'Easy to use', 'Durable design'];

  const toneOpeners: Record<string, string[]> = {
    professional: ['ENGINEERED FOR', 'DESIGNED WITH', 'BUILT TO', 'CERTIFIED', 'BACKED BY'],
    friendly: ['You\'ll love how', 'Perfect for', 'Great news —', 'We made sure', 'Enjoy the'],
    luxury: ['EXQUISITE', 'PREMIUM', 'CRAFTED WITH', 'EXCEPTIONAL', 'DISTINGUISHED'],
    urgent: ['⚡ LIMITED:', '🔥 HOT:', '✅ MUST-HAVE:', '💎 BEST:', '🎯 TOP'],
  };

  const openers = toneOpeners[tone] || toneOpeners.professional;
  const audienceTag = audience ? ` — ideal for ${audience}` : '';

  const bullets = featureList.slice(0, 5).map((feature, idx) => {
    const opener = openers[idx % openers.length];
    return `${opener} ${feature.toUpperCase()}${audienceTag}. Experience the difference with ${name.toLowerCase()} — trusted by thousands of satisfied customers worldwide.`;
  });

  // Ensure at least 5 bullets
  while (bullets.length < 5) {
    bullets.push(`${openers[bullets.length % openers.length]} QUALITY GUARANTEE — Every ${name} undergoes rigorous testing. If you're not 100% satisfied, our dedicated support team is here to help.`);
  }

  return bullets;
}

function generateDescription(name: string, features: string, audience: string, tone: string, category: string): string {
  const audienceText = audience ? `Designed specifically for ${audience}` : 'Designed for everyone who values quality';
  const featureText = features ? `Featuring ${features.slice(0, 100)}` : 'Featuring premium materials and innovative design';

  return `${audienceText}, the ${name} sets a new standard in ${category || 'its category'}. ${featureText}, this product delivers exceptional performance that exceeds expectations.\n\nWhether you're upgrading from a basic model or discovering this category for the first time, ${name} combines cutting-edge technology with user-friendly design. Every detail has been carefully considered — from the premium build quality to the intuitive functionality.\n\nJoin thousands of satisfied customers who have made the switch to ${name}. Order today and experience the difference that quality makes.`;
}

function generateSearchTerms(name: string, category: string): string[] {
  const words = name.toLowerCase().split(' ');
  const baseTerms = [
    `${name.toLowerCase()} gift`,
    `best ${name.toLowerCase()} 2026`,
    `${name.toLowerCase()} for sale`,
    `cheap ${name.toLowerCase()}`,
    `${name.toLowerCase()} review`,
  ];

  if (category) {
    baseTerms.push(`${category.toLowerCase()} ${words[0]}`);
    baseTerms.push(`top rated ${category.toLowerCase()}`);
  }

  return baseTerms.slice(0, 8);
}

export default App;
