import React from 'react';
import { NavigationProvider, useNavigation } from './context/NavigationContext';
import { ProductProvider } from './context/ProductContext';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { SearchModal } from './components/SearchModal';
import { HomePage } from './pages/HomePage';
import { ProductsPage } from './pages/ProductsPage';
import { CategoriesPage } from './pages/CategoriesPage';
import { ProductDetailPage } from './pages/ProductDetailPage';
import { AboutPage } from './pages/AboutPage';
import { ContactPage } from './pages/ContactPage';
import { PrivacyPolicyPage } from './pages/PrivacyPolicyPage';
import { TermsPage } from './pages/TermsPage';
import { DeveloperPage } from './pages/DeveloperPage';

const AppContent: React.FC = () => {
  const { currentPath } = useNavigation();

  // Normalize path by removing query string, hashes and trailing slashes
  const cleanPath = (currentPath || '/').split('?')[0].split('#')[0].replace(/\/+$/, '') || '/';

  // Render current view based on path
  const renderCurrentView = () => {
    if (cleanPath === '/' || cleanPath === '') {
      return <HomePage />;
    }
    if (cleanPath === '/produtos') {
      return <ProductsPage />;
    }
    if (cleanPath === '/categorias') {
      return <CategoriesPage />;
    }
    if (cleanPath.startsWith('/produto/')) {
      const slug = cleanPath.replace('/produto/', '');
      return <ProductDetailPage slug={slug} />;
    }
    if (cleanPath.startsWith('/desenvolvedor') || cleanPath.startsWith('/developer')) {
      return <DeveloperPage />;
    }
    if (cleanPath === '/sobre') {
      return <AboutPage />;
    }
    if (cleanPath === '/contato') {
      return <ContactPage />;
    }
    if (cleanPath === '/politica-de-privacidade') {
      return <PrivacyPolicyPage />;
    }
    if (cleanPath === '/termos') {
      return <TermsPage />;
    }
    return <HomePage />;
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F5F0E8] text-[#1C242B]">
      {/* Sticky Top Header */}
      <Header />

      {/* Main Content Area */}
      <main className="flex-1">
        {renderCurrentView()}
      </main>

      {/* Search Overlay Modal */}
      <SearchModal />

      {/* Brand Footer */}
      <Footer />
    </div>
  );
};

export default function App() {
  return (
    <ProductProvider>
      <NavigationProvider>
        <AppContent />
      </NavigationProvider>
    </ProductProvider>
  );
}

