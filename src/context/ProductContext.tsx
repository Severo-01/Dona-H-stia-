import React, { createContext, useContext, useState, useEffect } from 'react';
import { Product, CategoryInfo } from '../types';
import { PRODUCTS as DEFAULT_PRODUCTS } from '../data/products';
import { CATEGORIES as DEFAULT_CATEGORIES } from '../data/categories';

interface ProductContextType {
  products: Product[];
  categories: CategoryInfo[];
  getProductBySlug: (slug: string) => Product | undefined;
  getProductById: (id: string) => Product | undefined;
  addProduct: (productData: Partial<Product> & { name: string; price: number }) => Product;
  updateProduct: (id: string, updatedData: Partial<Product>) => Product | null;
  deleteProduct: (id: string) => void;
  duplicateProduct: (id: string) => Product | null;
  addCategory: (categoryData: Partial<CategoryInfo> & { name: string }) => CategoryInfo;
  resetToDefaults: () => void;
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

  // Keep localStorage in sync
  useEffect(() => {
    try {
      localStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(products));
    } catch {
      // storage full or disabled
    }
  }, [products]);

  useEffect(() => {
    try {
      localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(categories));
    } catch {
      // ignore
    }
  }, [categories]);

  const getProductBySlug = (slug: string) => {
    return products.find((p) => p.slug === slug);
  };

  const getProductById = (id: string) => {
    return products.find((p) => p.id === id);
  };

  const addCategory = (categoryData: Partial<CategoryInfo> & { name: string }): CategoryInfo => {
    const slug = categoryData.slug || generateSlug(categoryData.name);
    const existing = categories.find((c) => c.slug === slug || c.id === slug);
    if (existing) {
      return existing;
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

    setCategories((prev) => [...prev, newCategory]);
    return newCategory;
  };

  const addProduct = (data: Partial<Product> & { name: string; price: number }): Product => {
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
      priceRangeLabel: data.priceRangeLabel || undefined,
      originalPrice: data.originalPrice ? Number(data.originalPrice) : undefined,
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

    setProducts((prev) => [newProduct, ...prev]);

    // Update category product count
    setCategories((prev) =>
      prev.map((c) =>
        c.slug === categorySlug || c.id === categorySlug
          ? { ...c, productCount: c.productCount + 1 }
          : c
      )
    );

    return newProduct;
  };

  const updateProduct = (id: string, updatedData: Partial<Product>): Product | null => {
    let result: Product | null = null;
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id === id) {
          const updated: Product = {
            ...p,
            ...updatedData,
            price: updatedData.price !== undefined ? Number(updatedData.price) : p.price,
            rating: updatedData.rating !== undefined ? Number(updatedData.rating) : p.rating,
            reviewCount: updatedData.reviewCount !== undefined ? Number(updatedData.reviewCount) : p.reviewCount,
            updatedAt: new Date().toISOString(),
          };
          result = updated;
          return updated;
        }
        return p;
      })
    );
    return result;
  };

  const deleteProduct = (id: string) => {
    const toDelete = products.find((p) => p.id === id);
    setProducts((prev) => prev.filter((p) => p.id !== id));
    if (toDelete) {
      setCategories((prev) =>
        prev.map((c) =>
          (c.slug === toDelete.category || c.id === toDelete.category) && c.productCount > 0
            ? { ...c, productCount: c.productCount - 1 }
            : c
        )
      );
    }
  };

  const duplicateProduct = (id: string): Product | null => {
    const original = products.find((p) => p.id === id);
    if (!original) return null;

    const timestamp = Date.now();
    const duplicated: Product = {
      ...original,
      id: `prod-copy-${timestamp}`,
      slug: `${original.slug}-copia-${timestamp.toString().slice(-4)}`,
      name: `${original.name} (Cópia)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setProducts((prev) => [duplicated, ...prev]);
    return duplicated;
  };

  const resetToDefaults = () => {
    setProducts(DEFAULT_PRODUCTS);
    setCategories(DEFAULT_CATEGORIES);
    localStorage.removeItem(PRODUCTS_STORAGE_KEY);
    localStorage.removeItem(CATEGORIES_STORAGE_KEY);
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
