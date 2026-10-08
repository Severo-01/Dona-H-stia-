import React, { createContext, useContext, useState, useEffect } from 'react';

interface NavigationContextType {
  currentPath: string;
  searchQuery: string;
  selectedCategoryFilter: string | null;
  isSearchOpen: boolean;
  navigateTo: (path: string, options?: { category?: string; query?: string }) => void;
  openSearch: () => void;
  closeSearch: () => void;
  setSearchQuery: (query: string) => void;
  setSelectedCategoryFilter: (cat: string | null) => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export const NavigationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentPath, setCurrentPath] = useState<string>(() => {
    return window.location.pathname || '/';
  });
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('categoria');
  });
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname ? (window.location.pathname === '/' ? '/' : window.location.pathname.replace(/\/+$/, '')) : '/';
      setCurrentPath(path);
      const params = new URLSearchParams(window.location.search);
      setSelectedCategoryFilter(params.get('categoria') || null);
      setSearchQuery(params.get('q') || '');
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateTo = (path: string, options?: { category?: string; query?: string }) => {
    const cleanPath = path ? (path === '/' ? '/' : path.replace(/\/+$/, '')) : '/';
    let url = cleanPath;
    const params = new URLSearchParams();

    if (options && 'category' in options) {
      if (options.category) {
        params.set('categoria', options.category);
        setSelectedCategoryFilter(options.category);
      } else {
        setSelectedCategoryFilter(null);
      }
    } else {
      setSelectedCategoryFilter(null);
    }

    if (options && 'query' in options) {
      if (options.query) {
        params.set('q', options.query);
        setSearchQuery(options.query);
      } else {
        setSearchQuery('');
      }
    } else {
      setSearchQuery('');
    }

    const qs = params.toString();
    if (qs) {
      url = `${cleanPath}?${qs}`;
    }

    if (window.location.pathname + window.location.search !== url) {
      window.history.pushState({}, '', url);
    }
    setCurrentPath(cleanPath);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openSearch = () => setIsSearchOpen(true);
  const closeSearch = () => setIsSearchOpen(false);

  return (
    <NavigationContext.Provider
      value={{
        currentPath,
        searchQuery,
        selectedCategoryFilter,
        isSearchOpen,
        navigateTo,
        openSearch,
        closeSearch,
        setSearchQuery,
        setSelectedCategoryFilter,
      }}
    >
      {children}
    </NavigationContext.Provider>
  );
};

export const useNavigation = (): NavigationContextType => {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
};
