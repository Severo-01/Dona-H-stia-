import React from 'react';
import cookerKitchenImg from '../assets/images/kian_pressure_cooker_open_1790094855163.jpg';
import { useNavigation } from '../context/NavigationContext';
import { useProducts } from '../context/ProductContext';
import { ArrowRight } from 'lucide-react';

export const FeaturedProduct: React.FC = () => {
  const { navigateTo } = useNavigation();
  const { products } = useProducts();

  // Find the featured product dynamically from context (highlighted or pressure cooker or first product)
  const product =
    products.find((p) => p.highlight) ||
    products.find((p) => p.id === 'prod-panela-pressao-eletrica-5l-preta') ||
    products[0];

  if (!product) return null;

  const formattedPrice = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(product.price);

  const formattedOriginalPrice = product.originalPrice
    ? new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      }).format(product.originalPrice)
    : null;

  const imageSrc = product.images?.[1] || product.images?.[0] || cookerKitchenImg;

  return (
    <section className="bg-[#F5F0E8] py-20 sm:py-28 px-4 sm:px-6 lg:px-8 border-b border-[#071A2B]/10">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          {/* Left: Large Editorial Product Photograph */}
          <div className="lg:col-span-7 relative">
            <div className="relative aspect-4/3 sm:aspect-16/11 rounded-xs overflow-hidden shadow-xl border border-[#071A2B]/10 bg-white">
              <img
                src={imageSrc}
                alt={product.name}
                className="w-full h-full object-cover object-center"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#071A2B]/30 via-transparent to-transparent pointer-events-none" />
            </div>

            {/* Floating editorial caption badge */}
            <div className="hidden sm:block absolute -bottom-5 -right-5 bg-white p-5 border border-[#C89A4B]/30 shadow-lg max-w-xs rounded-xs">
              <span className="text-[9px] font-sans tracking-[0.24em] uppercase text-[#C89A4B] block mb-1 font-semibold">
                {product.badge || 'DESTAQUE OFICIAL'}
              </span>
              <p className="font-serif text-sm text-[#071A2B] leading-snug">
                {product.name} &bull; Linha {product.productType || 'Eletrodomésticos'}.
              </p>
            </div>
          </div>

          {/* Right: Editorial Content */}
          <div className="lg:col-span-5 flex flex-col justify-center">
            <div className="inline-flex items-center gap-2 mb-4">
              <span className="w-6 h-[1px] bg-[#C89A4B]" />
              <span className="text-[10px] font-sans tracking-[0.26em] uppercase text-[#8A6726] font-medium">
                MARCA {product.brand.toUpperCase()} &bull; {product.categoryLabel.toUpperCase()}
              </span>
            </div>

            <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl text-[#071A2B] font-light leading-[1.12] mb-4">
              {product.name}
            </h2>

            <p className="font-sans text-sm sm:text-base text-[#1C242B]/80 font-light leading-relaxed mb-6">
              {product.shortDescription}
            </p>

            {/* Features bullet points */}
            {product.features && product.features.length > 0 && (
              <div className="space-y-3 mb-6 border-y border-[#071A2B]/10 py-5">
                {product.features.slice(0, 3).map((feat, idx) => (
                  <div key={idx} className="flex items-center gap-3 text-xs font-sans text-[#071A2B]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#C89A4B] shrink-0" />
                    <span>{feat}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Real Synchronized Price Callout */}
            <div className="mb-6">
              {formattedOriginalPrice && (
                <span className="block text-xs font-sans text-[#1C242B]/40 line-through mb-0.5">
                  De {formattedOriginalPrice}
                </span>
              )}
              <div className="flex items-baseline flex-wrap gap-3">
                <span className="font-sans text-2xl sm:text-3xl font-bold text-[#071A2B] tracking-tight">
                  {formattedPrice}
                </span>
                {product.priceRangeLabel && (
                  <span className="text-xs font-sans text-[#8A6726] bg-[#C89A4B]/10 px-2 py-0.5 rounded-xs font-medium">
                    {product.priceRangeLabel}
                  </span>
                )}
                <span className="text-xs font-sans text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-xs font-medium border border-emerald-200">
                  À vista ou parcelado
                </span>
              </div>
              <span className="block text-[11px] font-sans text-[#1C242B]/50 mt-1">
                Valor promocional atualizado com as ofertas oficiais
              </span>
            </div>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => navigateTo(`/produto/${product.slug}`)}
                className="inline-flex items-center justify-center gap-2.5 px-8 py-3.5 bg-[#071A2B] hover:bg-[#C89A4B] text-[#F5F0E8] hover:text-[#071A2B] text-xs font-sans tracking-[0.2em] uppercase font-semibold transition-all duration-200 rounded-xs shadow-md border border-[#C89A4B]/30 group"
              >
                <span>Ver Produto</span>
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
