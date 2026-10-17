import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { StockLotPage } from './pages/StockLotPage';
import { Header, Footer } from './components/layout';
import { HomePage } from './pages/HomePage';
import { ExplorePage } from './pages/ExplorePage';
import { LearnPage } from './pages/LearnPage';
import { CreatePage } from './pages/CreatePage';
import { ComparePage } from './pages/ComparePage';
import { MyResearchPage } from './pages/MyResearchPage';
import { PrivacyPolicy } from './pages/legal/PrivacyPolicy';
import { TermsOfService } from './pages/legal/TermsOfService';
import { AboutPage } from './pages/legal/AboutPage';
import { NotFound } from './pages/NotFound';
import { useSEO } from './hooks/useSEO';
import { useEffect } from 'react';

// Tool Pages
import { ProfitCalculatorPage } from './pages/tools/ProfitCalculatorPage';
import { ROICalculatorPage } from './pages/tools/ROICalculatorPage';
import { PricingCalculatorPage } from './pages/tools/PricingCalculatorPage';
import { IPRiskCheckPage } from './pages/tools/IPRiskCheckPage';
import { RestrictionCheckPage } from './pages/tools/RestrictionCheckPage';
import { SourcingRiskCheckPage } from './pages/tools/SourcingRiskCheckPage';
import { ListingAnalyzerPage } from './pages/tools/ListingAnalyzerPage';
import { TitleCheckerPage } from './pages/tools/TitleCheckerPage';
import { BulletCheckerPage } from './pages/tools/BulletCheckerPage';
import { ProductResearchChecklistPage } from './pages/tools/ProductResearchChecklistPage';
import { NicheAnalysisPage } from './pages/tools/NicheAnalysisPage';

function NotFoundPage() {
  useSEO({ title: 'Page Not Found | NicheScout', description: 'The page you are looking for does not exist.', noindex: true });
  return <NotFound />;
}

function AppContent() {
  const isStockLot = useLocation().pathname.startsWith('/stock-lots');
  return (
    <div className="min-h-screen bg-white flex flex-col">
      {!isStockLot && <Header />}
          <main className="flex-1">
            <Routes>
              {/* Home */}
              <Route path="/" element={<HomePage />} />
              
              {/* Main Pages */}
              <Route path="/stock-lots" element={<StockLotPage />} />
              <Route path="/explore" element={<ExplorePage />} />
              <Route path="/learn" element={<LearnPage />} />
              <Route path="/create" element={<CreatePage />} />
              <Route path="/compare" element={<ComparePage />} />
              <Route path="/my-research" element={<MyResearchPage />} />
              
              {/* Tool Pages */}
              <Route path="/tools/amazon-profit-calculator" element={<ProfitCalculatorPage />} />
              <Route path="/tools/amazon-roi-calculator" element={<ROICalculatorPage />} />
              <Route path="/tools/amazon-pricing-calculator" element={<PricingCalculatorPage />} />
              <Route path="/tools/amazon-ip-check" element={<IPRiskCheckPage />} />
              <Route path="/tools/amazon-restriction-check" element={<RestrictionCheckPage />} />
              <Route path="/tools/sourcing-risk-check" element={<SourcingRiskCheckPage />} />
              <Route path="/tools/amazon-listing-analyzer" element={<ListingAnalyzerPage />} />
              <Route path="/tools/amazon-title-checker" element={<TitleCheckerPage />} />
              <Route path="/tools/amazon-bullet-checker" element={<BulletCheckerPage />} />
              <Route path="/tools/product-research-checklist" element={<ProductResearchChecklistPage />} />
              <Route path="/tools/niche-analysis" element={<NicheAnalysisPage />} />
              
              {/* Legal Pages */}
              <Route path="/privacy" element={<PrivacyPolicy />} />
              <Route path="/terms" element={<TermsOfService />} />
              <Route path="/about" element={<AboutPage />} />
              
              {/* 404 */}
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </main>
      {!isStockLot && <Footer />}
    </div>
  );
}

function App() {
  return <BrowserRouter><SEOApp><AppContent /></SEOApp></BrowserRouter>;
}

function SEOApp({ children }: { children: React.ReactNode }) {
  useSEO();
  return <>{children}</>;
}

export default App;
