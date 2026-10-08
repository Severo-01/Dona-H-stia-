import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Product, CategoryInfo } from '../types';
import { PRODUCTS as DEFAULT_PRODUCTS } from '../data/products';
import { CATEGORIES as DEFAULT_CATEGORIES } from '../data/categories';
import {
  fetchCatalogFromSupabase,
  saveCatalogToSupabase,
  fetchCategoriesFromSupabase,
  saveCategoriesToSupabase,
  supabase,
} from '../lib/supabase';

interface MutationResult<T = void> {
  success: boolean;
  error?: string;
  data?: T;
}

interface ProductContextType {
  products: Product[];
  categories: CategoryInfo[];
  getProductBySlug: (slug: string) => Product | undefined;
  getProductById: (id: string) => Product | undefined;
  addProduct: (
    productData: Partial<Product> & { name: string; price: number }
  ) => Promise<MutationResult<Product>>;
  updateProduct: (
    id: string,
    updatedData: Partial<Product>
  ) => Promise<MutationResult<Product>>;
  deleteProduct: (id: string) => Promise<MutationResult>;
  duplicateProduct: (id: string) => Promise<MutationResult<Product>>;
  addCategory: (
    categoryData: Partial<CategoryInfo> & { name: string }
  ) => Promise<MutationResult<CategoryInfo>>;
  resetToDefaults: () => Promise<MutationResult>;
  importCatalog: (
    importedProducts: Product[],
    importedCategories?: CategoryInfo[]
  ) => Promise<{ success: boolean; message: string; count: number }>;
  syncWithCloud: () => Promise<{ success: boolean; message: string }>;
  isSyncingWithCloud: boolean;
  isAutoSavingToCloud: boolean;
  isLoadingCloud: boolean;
  lastCloudSyncTime: Date | null;
  isRealtimeActive: boolean;
  lastRealtimeEventTime: Date | null;
}

const ProductContext = createContext<ProductContextType | undefined>(undefined);

const PRODUCTS_STORAGE_KEY = 'dona_hestia_custom_products_v2';
const CATEGORIES_STORAGE_KEY = 'dona_hestia_custom_categories_v2';

function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

export const ProductProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [products, setProducts] = useState<Product[]>(() => {
    try {
      const saved = localStorage.getItem(PRODUCTS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((p) => ({
            ...p,
            productType: p.productType && p.productType !== 'Panela de Pressão Elétrica' && p.productType !== 'Sanduicheira e Grill' && p.productType !== 'Omeleteira Elétrica' && p.productType !== 'Fritadeira Elétrica Sem Óleo'
              ? p.productType
              : 'Eletrodomésticos',
          }));
        }
      }
    } catch {
      // ignore
    }
    return DEFAULT_PRODUCTS;
  });

  const [categories, setCategories] = useState<CategoryInfo[]>(() => {
    try {
      const saved = localStorage.getItem(CATEGORIES_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // ignore
    }
    return DEFAULT_CATEGORIES;
  });

  const [isSyncingWithCloud, setIsSyncingWithCloud] = useState(false);
  const [isAutoSavingToCloud, setIsAutoSavingToCloud] = useState(false);
  const [isLoadingCloud, setIsLoadingCloud] = useState(true);
  const [lastCloudSyncTime, setLastCloudSyncTime] = useState<Date | null>(null);
  const [isRealtimeActive, setIsRealtimeActive] = useState(true);
  const [lastRealtimeEventTime, setLastRealtimeEventTime] = useState<Date | null>(null);

  // Helper to safely persist to local storage
  const persistLocally = (prods: Product[], cats?: CategoryInfo[]) => {
    try {
      localStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(prods));
      notifyLocalTabs('PRODUCTS_UPDATED', prods);
    } catch (e) {
      console.warn('[LocalStorage] Nao foi possivel salvar produtos no cache local:', e);
    }
    if (cats) {
      try {
        localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(cats));
        notifyLocalTabs('CATEGORIES_UPDATED', cats);
      } catch (e) {
        console.warn('[LocalStorage] Nao foi possivel salvar categorias no cache local:', e);
      }
    }
  };

  // Instant notification across browser tabs on the same device
  const notifyLocalTabs = (type: 'PRODUCTS_UPDATED' | 'CATEGORIES_UPDATED', data: Product[] | CategoryInfo[]) => {
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        const bc = new BroadcastChannel('dona_hestia_live_store');
        bc.postMessage({ type, [type === 'PRODUCTS_UPDATED' ? 'products' : 'categories']: data });
        bc.close();
      }
    } catch {
      // ignore
    }
  };

  // Initial cloud catalog fetch so visitors worldwide see the real-time catalog
  useEffect(() => {
    let isMounted = true;
    async function initCloudCatalog() {
      setIsLoadingCloud(true);
      try {
        const [cloudProducts, cloudCategories] = await Promise.all([
          fetchCatalogFromSupabase(),
          fetchCategoriesFromSupabase(),
        ]);

        if (isMounted) {
          if (cloudProducts && cloudProducts.length > 0) {
            setProducts(cloudProducts);
            setLastCloudSyncTime(new Date());
            persistLocally(cloudProducts);
          } else {
            console.log('[Supabase] Catálogo na nuvem não carregado ou vazio. Mantendo catálogo atual sem sobrescrever.');
          }

          if (cloudCategories && cloudCategories.length > 0) {
            setCategories(cloudCategories);
            persistLocally(cloudProducts || products, cloudCategories);
          }
        }
      } catch (err) {
        console.warn('[Supabase] Aviso ao buscar catalogo inicial da nuvem:', err);
      } finally {
        if (isMounted) {
          setIsLoadingCloud(false);
        }
      }
    }

    initCloudCatalog();

    // 1. Cross-tab synchronization via BroadcastChannel (zero latency between tabs on same device)
    let broadcastChannel: BroadcastChannel | null = null;
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        broadcastChannel = new BroadcastChannel('dona_hestia_live_store');
        broadcastChannel.onmessage = (event) => {
          if (event.data?.type === 'PRODUCTS_UPDATED' && Array.isArray(event.data.products)) {
            console.log('[BroadcastChannel] Produtos atualizados instantaneamente em outra aba!');
            setProducts(event.data.products);
            setLastRealtimeEventTime(new Date());
          } else if (event.data?.type === 'CATEGORIES_UPDATED' && Array.isArray(event.data.categories)) {
            console.log('[BroadcastChannel] Categorias atualizadas instantaneamente em outra aba!');
            setCategories(event.data.categories);
            setLastRealtimeEventTime(new Date());
          }
        };
      } catch (err) {
        console.warn('[BroadcastChannel] Falha ao inicializar:', err);
      }
    }

    // 2. Cross-tab synchronization fallback via storage event
    const handleStorage = (e: StorageEvent) => {
      if (e.key === PRODUCTS_STORAGE_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setProducts(parsed);
          }
        } catch {
          // ignore
        }
      }
      if (e.key === CATEGORIES_STORAGE_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setCategories(parsed);
          }
        } catch {
          // ignore
        }
      }
    };
    window.addEventListener('storage', handleStorage);

    // 3. Real-time background sync when browser tab regains visibility or focus
    const handleSyncFromCloud = async () => {
      try {
        const [cloudProds, cloudCats] = await Promise.all([
          fetchCatalogFromSupabase(),
          fetchCategoriesFromSupabase(),
        ]);
        if (!isMounted) return;
        if (cloudProds && cloudProds.length > 0) {
          const currentLocal = localStorage.getItem(PRODUCTS_STORAGE_KEY);
          const newCloudJson = JSON.stringify(cloudProds);
          if (currentLocal !== newCloudJson) {
            console.log('[Supabase Cloud] Novo catálogo recebido da nuvem em background!');
            setProducts(cloudProds);
            persistLocally(cloudProds);
            setLastCloudSyncTime(new Date());
            setLastRealtimeEventTime(new Date());
          }
        }
        if (cloudCats && cloudCats.length > 0) {
          const currentCats = localStorage.getItem(CATEGORIES_STORAGE_KEY);
          const newCatsJson = JSON.stringify(cloudCats);
          if (currentCats !== newCatsJson) {
            setCategories(cloudCats);
            persistLocally(cloudProds || products, cloudCats);
            setLastRealtimeEventTime(new Date());
          }
        }
      } catch {
        // ignore
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        handleSyncFromCloud();
      }
    };
    const handleWindowFocus = () => {
      handleSyncFromCloud();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleWindowFocus);

    // 4. Periodic background polling every 10 seconds so all users/tabs stay 100% in sync
    const pollInterval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        handleSyncFromCloud();
      }
    }, 10000);

    // 5. Supabase Realtime WebSocket subscription (Broadcast + Postgres CDC)
    const realtimeChannel = supabase
      .channel('dona_hestia_catalog_realtime')
      .on(
        'broadcast',
        { event: 'catalog_updated' },
        (response) => {
          try {
            const incoming = response.payload?.products;
            if (Array.isArray(incoming) && incoming.length > 0) {
              console.log('[Supabase Realtime Broadcast] Catálogo atualizado instantaneamente via WebSocket!');
              setProducts(incoming);
              persistLocally(incoming);
              setLastCloudSyncTime(new Date());
              setLastRealtimeEventTime(new Date());
            }
          } catch (e) {
            console.warn('[Supabase Realtime Broadcast] Erro ao processar:', e);
          }
        }
      )
      .on(
        'broadcast',
        { event: 'categories_updated' },
        (response) => {
          try {
            const incoming = response.payload?.categories;
            if (Array.isArray(incoming) && incoming.length > 0) {
              console.log('[Supabase Realtime Broadcast] Categorias atualizadas via WebSocket!');
              setCategories(incoming);
              setLastRealtimeEventTime(new Date());
            }
          } catch (e) {
            console.warn('[Supabase Realtime Broadcast] Erro categorias:', e);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'app_config', filter: 'key=eq.catalog_products' },
        (payload) => {
          try {
            const row = payload.new as { value?: string } | undefined;
            if (row?.value) {
              const parsed = JSON.parse(row.value);
              if (Array.isArray(parsed) && parsed.length > 0) {
                console.log('[Supabase Realtime Postgres] Atualizacao de catalogo recebida em tempo real!');
                setProducts(parsed);
                persistLocally(parsed);
                setLastCloudSyncTime(new Date());
                setLastRealtimeEventTime(new Date());
              }
            }
          } catch (e) {
            console.warn('[Supabase Realtime] Erro ao processar evento realtime:', e);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'app_config', filter: 'key=eq.catalog_categories' },
        (payload) => {
          try {
            const row = payload.new as { value?: string } | undefined;
            if (row?.value) {
              const parsed = JSON.parse(row.value);
              if (Array.isArray(parsed) && parsed.length > 0) {
                console.log('[Supabase Realtime Postgres] Atualizacao de categorias recebida em tempo real!');
                setCategories(parsed);
                setLastRealtimeEventTime(new Date());
              }
            }
          } catch (e) {
            console.warn('[Supabase Realtime] Erro ao processar evento realtime de categorias:', e);
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setIsRealtimeActive(true);
          console.log('[Supabase Realtime] Conectado e ativo via WebSocket!');
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          setIsRealtimeActive(false);
        }
      });

    return () => {
      isMounted = false;
      clearInterval(pollInterval);
      if (broadcastChannel) {
        broadcastChannel.close();
      }
      window.removeEventListener('storage', handleStorage);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleWindowFocus);
      supabase.removeChannel(realtimeChannel);
    };
  }, []);

  const syncWithCloud = async (): Promise<{ success: boolean; message: string }> => {
    setIsSyncingWithCloud(true);
    try {
      const [prodRes, catRes] = await Promise.all([
        saveCatalogToSupabase(products),
        saveCategoriesToSupabase(categories),
      ]);

      setIsSyncingWithCloud(false);
      if (prodRes.success) {
        setLastCloudSyncTime(new Date());
        return {
          success: true,
          message: 'Catálogo sincronizado com sucesso na nuvem Supabase! Todos os usuários já podem ver os produtos e links atualizados.',
        };
      } else {
        return {
          success: false,
          message: prodRes.error || catRes.error || 'Erro ao sincronizar com Supabase',
        };
      }
    } catch (err: unknown) {
      setIsSyncingWithCloud(false);
      return { success: false, message: err instanceof Error ? err.message : String(err) };
    }
  };

  const getProductBySlug = (slug: string) => {
    if (!slug) return undefined;
    const clean = slug.toLowerCase().trim();
    return products.find(
      (p) =>
        p.slug?.toLowerCase() === clean ||
        p.id?.toLowerCase() === clean ||
        generateSlug(p.name).toLowerCase() === clean
    );
  };

  const getProductById = (id: string) => {
    if (!id) return undefined;
    return products.find((p) => p.id === id || p.slug === id);
  };

  const addCategory = async (
    categoryData: Partial<CategoryInfo> & { name: string }
  ): Promise<MutationResult<CategoryInfo>> => {
    const slug = categoryData.slug || generateSlug(categoryData.name);
    const existing = categories.find((c) => c.slug === slug || c.id === slug);
    if (existing) {
      return { success: true, data: existing };
    }

    const newCategory: CategoryInfo = {
      id: slug,
      slug,
      name: categoryData.name.toUpperCase(),
      tagline: categoryData.tagline || 'Elegância, qualidade e acolhimento para o seu lar.',
      description: categoryData.description || `Produtos e utilidades selecionadas da linha ${categoryData.name}.`,
      imageUrl: categoryData.imageUrl || 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=1200&q=80',
      productCount: 0,
    };

    const updatedCats = [...categories, newCategory];
    setCategories(updatedCats);
    persistLocally(products, updatedCats);

    setIsAutoSavingToCloud(true);
    const res = await saveCategoriesToSupabase(updatedCats);
    setIsAutoSavingToCloud(false);

    if (res.success) {
      setLastCloudSyncTime(new Date());
      return { success: true, data: newCategory };
    } else {
      return { success: false, error: res.error, data: newCategory };
    }
  };

  const addProduct = async (
    data: Partial<Product> & { name: string; price: number }
  ): Promise<MutationResult<Product>> => {
    const timestamp = Date.now();
    const slugBase = generateSlug(data.name || 'novo-produto');
    // Ensure unique slug
    let finalSlug = slugBase;
    let count = 1;
    while (products.some((p) => p.slug === finalSlug)) {
      count++;
      finalSlug = `${slugBase}-${count}`;
    }

    const id = data.id || `prod-custom-${timestamp}`;
    const categorySlug = data.category || 'cozinha';

    // Find category label
    const cat = categories.find((c) => c.slug === categorySlug || c.id === categorySlug);
    const categoryLabel = cat?.name || data.categoryLabel || 'Cozinha';

    const newProduct: Product = {
      id,
      slug: finalSlug,
      name: data.name,
      brand: data.brand || 'Dona Héstia',
      category: categorySlug,
      categoryLabel,
      productType: data.productType || 'Eletrodomésticos',
      price: Number(data.price) || 0,
      priceMax: data.priceMax ? Number(data.priceMax) : undefined,
      priceRangeLabel: data.priceRangeLabel?.trim() || undefined,
      originalPrice: data.originalPrice && Number(data.originalPrice) > 0 ? Number(data.originalPrice) : undefined,
      installmentText: data.installmentText?.trim() || undefined,
      badge: data.badge || undefined,
      rating: data.rating !== undefined ? Number(data.rating) : 5.0,
      reviewCount: data.reviewCount !== undefined ? Number(data.reviewCount) : 1,
      shortDescription: data.shortDescription || '',
      fullDescription: data.fullDescription || data.shortDescription || '',
      features: data.features && data.features.length > 0 ? data.features : [
        'Qualidade certificada e garantia de procedência',
        'Design refinado para harmonizar com a estética do seu lar',
        'Facilidade de uso e máxima eficiência energética',
      ],
      specifications: data.specifications || {
        'Marca': data.brand || 'Dona Héstia',
        'Categoria': categoryLabel,
        'Garantia': 'Garantia oficial do fabricante',
      },
      dimensions: data.dimensions || {
        width: 'Padronizado',
        height: 'Padronizado',
        depth: 'Padronizado',
        weight: 'Sob consulta',
      },
      images: data.images && data.images.length > 0 ? data.images : [
        'https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?auto=format&fit=crop&w=800&q=80',
      ],
      availableVoltages: data.availableVoltages !== undefined ? data.availableVoltages : [],
      highlight: data.highlight ?? false,
      buyUrl: data.buyUrl || 'https://s.shopee.com.br/112vcBEklr',
      platform: data.platform || 'Shopee',
      isDemo: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const updatedProducts = [newProduct, ...products];
    setProducts(updatedProducts);

    // Update category product count
    const updatedCatsWithCount = categories.map((c) =>
      c.slug === categorySlug || c.id === categorySlug
        ? { ...c, productCount: c.productCount + 1 }
        : c
    );
    setCategories(updatedCatsWithCount);
    persistLocally(updatedProducts, updatedCatsWithCount);

    setIsAutoSavingToCloud(true);
    const [prodRes, catRes] = await Promise.all([
      saveCatalogToSupabase(updatedProducts),
      saveCategoriesToSupabase(updatedCatsWithCount),
    ]);
    setIsAutoSavingToCloud(false);

    if (prodRes.success) {
      setLastCloudSyncTime(new Date());
      return { success: true, data: newProduct };
    } else {
      return { success: false, error: prodRes.error || catRes.error, data: newProduct };
    }
  };

  const updateProduct = async (
    id: string,
    updatedData: Partial<Product>
  ): Promise<MutationResult<Product>> => {
    let targetUpdated: Product | null = null;
    let oldCategory: string | null = null;

    const cleanSlug = updatedData.slug?.trim() ? generateSlug(updatedData.slug.trim()) : undefined;
    const cleanBuyUrl = updatedData.buyUrl !== undefined ? updatedData.buyUrl.trim() : undefined;

    const updatedProducts = products.map((p) => {
      if (p.id === id || p.slug === id) {
        oldCategory = p.category;
        const updated: Product = {
          ...p,
          ...updatedData,
          slug: cleanSlug || p.slug,
          buyUrl: cleanBuyUrl !== undefined ? cleanBuyUrl : p.buyUrl,
          price: updatedData.price !== undefined ? Number(updatedData.price) : p.price,
          originalPrice: 'originalPrice' in updatedData
            ? (updatedData.originalPrice && Number(updatedData.originalPrice) > 0 ? Number(updatedData.originalPrice) : undefined)
            : p.originalPrice,
          priceRangeLabel: 'priceRangeLabel' in updatedData
            ? (updatedData.priceRangeLabel && updatedData.priceRangeLabel.trim() ? updatedData.priceRangeLabel.trim() : undefined)
            : p.priceRangeLabel,
          installmentText: 'installmentText' in updatedData
            ? (updatedData.installmentText && updatedData.installmentText.trim() ? updatedData.installmentText.trim() : undefined)
            : p.installmentText,
          rating: updatedData.rating !== undefined ? Number(updatedData.rating) : p.rating,
          reviewCount: updatedData.reviewCount !== undefined ? Number(updatedData.reviewCount) : p.reviewCount,
          updatedAt: new Date().toISOString(),
        };
        targetUpdated = updated;
        return updated;
      }
      return p;
    });

    if (!targetUpdated) {
      return { success: false, error: 'Produto não encontrado para atualização.' };
    }

    // 1. Instant local state update
    setProducts(updatedProducts);

    // Update categories count if category changed
    let updatedCats = categories;
    if (oldCategory && targetUpdated.category && oldCategory !== targetUpdated.category) {
      updatedCats = categories.map((c) => {
        if (c.slug === oldCategory || c.id === oldCategory) {
          return { ...c, productCount: Math.max(0, c.productCount - 1) };
        }
        if (c.slug === targetUpdated?.category || c.id === targetUpdated?.category) {
          return { ...c, productCount: c.productCount + 1 };
        }
        return c;
      });
      setCategories(updatedCats);
      saveCategoriesToSupabase(updatedCats).catch(() => {});
    }

    persistLocally(updatedProducts, updatedCats);

    // 2. Direct cloud persistence to Supabase
    setIsAutoSavingToCloud(true);
    const cloudRes = await saveCatalogToSupabase(updatedProducts);
    setIsAutoSavingToCloud(false);

    if (cloudRes.success) {
      setLastCloudSyncTime(new Date());
      console.log(`[Supabase] Produto "${(targetUpdated as Product).name}" e URL (${(targetUpdated as Product).buyUrl}) salvos com sucesso na nuvem!`);
      return { success: true, data: targetUpdated };
    } else {
      console.error(`[Supabase] Erro ao persistir atualização do produto "${(targetUpdated as Product).name}":`, cloudRes.error);
      return {
        success: false,
        error: cloudRes.error || 'Falha ao sincronizar alteração com o banco de dados Supabase.',
        data: targetUpdated,
      };
    }
  };

  const deleteProduct = async (id: string): Promise<MutationResult> => {
    const toDelete = products.find((p) => p.id === id);
    if (!toDelete) {
      return { success: false, error: 'Produto não encontrado para exclusão.' };
    }

    const updatedProducts = products.filter((p) => p.id !== id);
    setProducts(updatedProducts);

    const updatedCats = categories.map((c) =>
      (c.slug === toDelete.category || c.id === toDelete.category) && c.productCount > 0
        ? { ...c, productCount: c.productCount - 1 }
        : c
    );
    setCategories(updatedCats);
    persistLocally(updatedProducts, updatedCats);

    setIsAutoSavingToCloud(true);
    const [prodRes, catRes] = await Promise.all([
      saveCatalogToSupabase(updatedProducts),
      saveCategoriesToSupabase(updatedCats),
    ]);
    setIsAutoSavingToCloud(false);

    if (prodRes.success) {
      setLastCloudSyncTime(new Date());
      return { success: true };
    } else {
      return { success: false, error: prodRes.error || catRes.error };
    }
  };

  const duplicateProduct = async (id: string): Promise<MutationResult<Product>> => {
    const original = products.find((p) => p.id === id);
    if (!original) {
      return { success: false, error: 'Produto original não encontrado.' };
    }

    const timestamp = Date.now();
    const duplicated: Product = {
      ...original,
      id: `prod-copy-${timestamp}`,
      slug: `${original.slug}-copia-${timestamp.toString().slice(-4)}`,
      name: `${original.name} (Cópia)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const updatedProducts = [duplicated, ...products];
    setProducts(updatedProducts);
    persistLocally(updatedProducts);

    setIsAutoSavingToCloud(true);
    const res = await saveCatalogToSupabase(updatedProducts);
    setIsAutoSavingToCloud(false);

    if (res.success) {
      setLastCloudSyncTime(new Date());
      return { success: true, data: duplicated };
    } else {
      return { success: false, error: res.error, data: duplicated };
    }
  };

  const importCatalog = async (
    importedProducts: Product[],
    importedCategories?: CategoryInfo[]
  ): Promise<{ success: boolean; message: string; count: number }> => {
    if (!Array.isArray(importedProducts) || importedProducts.length === 0) {
      return { success: false, message: 'O arquivo não contém uma lista válida de produtos.', count: 0 };
    }

    setProducts(importedProducts);

    let finalCategories = categories;
    if (Array.isArray(importedCategories) && importedCategories.length > 0) {
      finalCategories = importedCategories;
      setCategories(importedCategories);
    }
    persistLocally(importedProducts, finalCategories);

    setIsAutoSavingToCloud(true);
    try {
      const [prodRes, catRes] = await Promise.all([
        saveCatalogToSupabase(importedProducts),
        saveCategoriesToSupabase(finalCategories),
      ]);
      setIsAutoSavingToCloud(false);
      if (prodRes.success) {
        setLastCloudSyncTime(new Date());
        return {
          success: true,
          message: `${importedProducts.length} produtos importados e sincronizados com a nuvem com sucesso!`,
          count: importedProducts.length,
        };
      } else {
        return {
          success: false,
          message: prodRes.error || catRes.error || 'Erro ao sincronizar produtos importados com a nuvem.',
          count: importedProducts.length,
        };
      }
    } catch (err: unknown) {
      setIsAutoSavingToCloud(false);
      return {
        success: false,
        message: err instanceof Error ? err.message : String(err),
        count: importedProducts.length,
      };
    }
  };

  const resetToDefaults = async (): Promise<MutationResult> => {
    setProducts(DEFAULT_PRODUCTS);
    setCategories(DEFAULT_CATEGORIES);
    persistLocally(DEFAULT_PRODUCTS, DEFAULT_CATEGORIES);

    setIsAutoSavingToCloud(true);
    const [prodRes, catRes] = await Promise.all([
      saveCatalogToSupabase(DEFAULT_PRODUCTS),
      saveCategoriesToSupabase(DEFAULT_CATEGORIES),
    ]);
    setIsAutoSavingToCloud(false);

    if (prodRes.success) {
      setLastCloudSyncTime(new Date());
      return { success: true };
    } else {
      return { success: false, error: prodRes.error || catRes.error };
    }
  };

  return (
    <ProductContext.Provider
      value={{
        products,
        categories,
        getProductBySlug,
        getProductById,
        addProduct,
        updateProduct,
        deleteProduct,
        duplicateProduct,
        addCategory,
        resetToDefaults,
        importCatalog,
        syncWithCloud,
        isSyncingWithCloud,
        isAutoSavingToCloud,
        isLoadingCloud,
        lastCloudSyncTime,
        isRealtimeActive,
        lastRealtimeEventTime,
      }}
    >
      {children}
    </ProductContext.Provider>
  );
};

export const useProducts = () => {
  const context = useContext(ProductContext);
  if (!context) {
    throw new Error('useProducts must be used within a ProductProvider');
  }
  return context;
};
