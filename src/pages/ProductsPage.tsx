import React, { useState, useMemo, useEffect } from 'react';
import { Product, SortOption } from '../types';
import { ProductGrid } from '../components/ProductGrid';
import { useNavigation } from '../context/NavigationContext';
import { useProducts } from '../context/ProductContext';
import { Filter, SlidersHorizontal, X } from 'lucide-react';

export const ProductsPage: React.FC = () => {
  const { selectedCategoryFilter, setSelectedCategoryFilter, searchQuery, setSearchQuery } = useNavigation();
  const { products, categories } = useProducts();

  const [selectedCategory, setSelectedCategory] = useState<string>(
    selectedCategoryFilter || 'all'
  );
  const [selectedBrand, setSelectedBrand] = useState<string>('all');
  const [selectedProductType, setSelectedProductType] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortOption>('relevance');
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  // Sync if navigation context changes category
  useEffect(() => {
    setSelectedCategory(selectedCategoryFilter || 'all');
  }, [selectedCategoryFilter]);

  // Unique product types and brands
  const productTypes = useMemo(() => {
    const types = new Set<string>();
    products.forEach((p) => {
      if (p.productType) types.add(p.productType);
    });
    return Array.from(types);
  }, [products]);

  const brands = useMemo(() => {
    const b = new Set<string>();
    products.forEach((p) => {
      if (p.brand) b.add(p.brand);
    });
    return Array.from(b);
  }, [products]);

  // Filter and sort products
  const filteredProducts = useMemo(() => {
    let list = [...products];

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.shortDescription.toLowerCase().includes(q) ||
          p.categoryLabel.toLowerCase().includes(q) ||
          p.brand.toLowerCase().includes(q)
      );
    }

    // Category filter
    if (selectedCategory !== 'all') {
      list = list.filter((p) => p.category === selectedCategory);
    }

    // Brand filter
    if (selectedBrand !== 'all') {
      list = list.filter((p) => p.brand.includes(selectedBrand));
    }

    // Product type filter
    if (selectedProductType !== 'all') {
      list = list.filter((p) => p.productType === selectedProductType);
    }

    // Sorting
    if (sortBy === 'rating') {
      list.sort((a, b) => (b.rating || 5) - (a.rating || 5));
    } else if (sortBy === 'name-asc') {
      list.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === 'newest') {
      list.reverse();
    }

    return list;
  }, [
    searchQuery,
    selectedCategory,
    selectedBrand,
    selectedProductType,
    sortBy,
  ]);

  const handleResetFilters = () => {
    setSelectedCategory('all');
    setSelectedCategoryFilter(null);
    setSelectedBrand('all');
    setSelectedProductType('all');
    setSearchQuery('');
    setSortBy('relevance');
  };

  const hasActiveFilters =
    selectedCategory !== 'all' ||
    selectedBrand !== 'all' ||
    selectedProductType !== 'all' ||
    searchQuery.trim().length > 0;

  return (
    <div className="pt-28 pb-24 px-4 sm:px-6 lg:px-8 bg-[#F5F0E8] min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="border-b border-[#071A2B]/10 pb-10 mb-10 text-center sm:text-left">
          <div className="inline-flex items-center gap-2 mb-2">
            <span className="w-5 h-[1px] bg-[#C89A4B]" />
            <span className="text-[10px] font-sans font-medium uppercase tracking-[0.28em] text-[#8A6726]">
              CATÁLOGO EXCLUSIVO
            </span>
          </div>

          <h1 className="font-serif text-3xl sm:text-5xl lg:text-6xl text-[#071A2B] font-light tracking-tight mb-3">
            PRODUTOS PARA O SEU LAR
          </h1>

          <p className="font-sans text-xs sm:text-sm text-[#1C242B]/75 font-light leading-relaxed max-w-2xl">
            Tecnologia, praticidade e design para diferentes momentos da sua casa.
          </p>

          {/* Search indicator if searching */}
          {searchQuery && (
            <div className="mt-4 inline-flex items-center gap-2 px-3 py-1 bg-white border border-[#C89A4B]/30 rounded-xs text-xs font-sans text-[#071A2B]">
              <span>Resultados para: “{searchQuery}”</span>
              <button
                onClick={() => setSearchQuery('')}
                className="hover:text-red-700"
                aria-label="Remover busca"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Filter Controls Bar */}
        <div className="bg-white p-4 sm:p-5 border border-[#071A2B]/10 rounded-xs mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Mobile Filter Toggle Button */}
          <div className="flex items-center justify-between md:hidden">
            <button
              onClick={() => setMobileFilterOpen(!mobileFilterOpen)}
              className="inline-flex items-center gap-2 text-xs font-sans uppercase tracking-[0.16em] text-[#071A2B] font-medium"
            >
              <SlidersHorizontal className="w-4 h-4 text-[#C89A4B]" />
              <span>Filtros ({filteredProducts.length} itens)</span>
            </button>

            {hasActiveFilters && (
              <button
                onClick={handleResetFilters}
                className="text-[11px] font-sans text-[#8A6726] hover:underline"
              >
                Limpar
              </button>
            )}
          </div>

          {/* Desktop Filter Row */}
          <div className="hidden md:flex flex-wrap items-center gap-3">
            <span className="text-xs font-sans uppercase tracking-wider text-[#1C242B]/60 flex items-center gap-1 mr-1">
              <Filter className="w-3.5 h-3.5 text-[#C89A4B]" />
              Filtros:
            </span>

            {/* Category Select */}
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setSelectedCategoryFilter(e.target.value === 'all' ? null : e.target.value);
              }}
              className="text-xs font-sans px-3 py-2 bg-[#F5F0E8] border border-[#071A2B]/15 text-[#071A2B] rounded-xs focus:outline-hidden focus:border-[#C89A4B]"
            >
              <option value="all">Todas as Categorias</option>
              {categories.map((c) => (
                <option key={c.id} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>

            {/* Brand Select */}
            <select
              value={selectedBrand}
              onChange={(e) => setSelectedBrand(e.target.value)}
              className="text-xs font-sans px-3 py-2 bg-[#F5F0E8] border border-[#071A2B]/15 text-[#071A2B] rounded-xs focus:outline-hidden focus:border-[#C89A4B]"
            >
              <option value="all">Todas as Linhas</option>
              {brands.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>

            {/* Product Type */}
            <select
              value={selectedProductType}
              onChange={(e) => setSelectedProductType(e.target.value)}
              className="text-xs font-sans px-3 py-2 bg-[#F5F0E8] border border-[#071A2B]/15 text-[#071A2B] rounded-xs focus:outline-hidden focus:border-[#C89A4B]"
            >
              <option value="all">Todos os Tipos</option>
              {productTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>

            {hasActiveFilters && (
              <button
                onClick={handleResetFilters}
                className="text-xs font-sans text-[#8A6726] hover:underline px-2 py-1"
              >
                Limpar filtros
              </button>
            )}
          </div>

          {/* Right: Sorting Selector */}
          <div className="flex items-center gap-2 self-end md:self-auto">
            <span className="text-xs font-sans text-[#1C242B]/60 shrink-0">
              Ordenar por:
            </span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="text-xs font-sans px-3 py-2 bg-[#F5F0E8] border border-[#071A2B]/15 text-[#071A2B] rounded-xs focus:outline-hidden focus:border-[#C89A4B]"
            >
              <option value="relevance">Mais relevantes</option>
              <option value="rating">Melhor avaliação</option>
              <option value="newest">Mais recentes</option>
              <option value="name-asc">Ordem alfabética (A-Z)</option>
            </select>
          </div>
        </div>

        {/* Mobile Filters Dropdown Container */}
        {mobileFilterOpen && (
          <div className="md:hidden bg-white p-5 border border-[#071A2B]/10 rounded-xs mb-6 space-y-4 shadow-xs">
            <div>
              <label className="text-xs font-sans text-[#1C242B]/70 block mb-1">
                Categoria
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  setSelectedCategoryFilter(e.target.value === 'all' ? null : e.target.value);
                }}
                className="w-full text-xs font-sans p-2.5 bg-[#F5F0E8] border border-[#071A2B]/15 text-[#071A2B]"
              >
                <option value="all">Todas as Categorias</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.slug}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-sans text-[#1C242B]/70 block mb-1">
                Linha
              </label>
              <select
                value={selectedBrand}
                onChange={(e) => setSelectedBrand(e.target.value)}
                className="w-full text-xs font-sans p-2.5 bg-[#F5F0E8] border border-[#071A2B]/15 text-[#071A2B]"
              >
                <option value="all">Todas as Linhas</option>
                {brands.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-sans text-[#1C242B]/70 block mb-1">
                Tipo de Produto
              </label>
              <select
                value={selectedProductType}
                onChange={(e) => setSelectedProductType(e.target.value)}
                className="w-full text-xs font-sans p-2.5 bg-[#F5F0E8] border border-[#071A2B]/15 text-[#071A2B]"
              >
                <option value="all">Todos os Tipos</option>
                {productTypes.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div className="pt-2 flex justify-between">
              <button
                onClick={handleResetFilters}
                className="text-xs text-[#8A6726] underline"
              >
                Limpar todos
              </button>
              <button
                onClick={() => setMobileFilterOpen(false)}
                className="px-4 py-1.5 bg-[#071A2B] text-white text-xs font-sans uppercase tracking-wider"
              >
                Aplicar
              </button>
            </div>
          </div>
        )}

        {/* Count Summary */}
        <div className="mb-6 flex justify-between items-center text-xs font-sans text-[#1C242B]/60">
          <span>Mostrando {filteredProducts.length} de {products.length} {products.length === 1 ? 'produto' : 'produtos'}</span>
          <span className="text-[11px] text-[#8A6726]">Catálogo oficial Dona Héstia</span>
        </div>

        {/* Products Grid */}
        <ProductGrid
          products={filteredProducts}
          emptyMessage="Nenhum eletrodoméstico coincide com os filtros selecionados. Tente ajustar os termos ou restaurar a seleção padrão."
        />
      </div>
    </div>
  );
};
