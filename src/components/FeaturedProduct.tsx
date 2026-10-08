import React, { useState } from 'react';
import cookerMainImg from '../assets/images/kian_pressure_cooker_official_1790094832015.jpg';
import { useNavigation } from '../context/NavigationContext';
import { useProducts } from '../context/ProductContext';
import { ArrowRight, ShieldCheck, CheckCircle2, Sparkles, Award } from 'lucide-react';

export const FeaturedProduct: React.FC = () => {
  const { navigateTo } = useNavigation();
  const { products } = useProducts();
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  // Find the featured product dynamically from context (highlighted or pressure cooker or first product)
  const product =
    products.find((p) => p.highlight) ||
    products.find((p) => p.id === 'prod-panela-pressao-eletrica-5l-preta') ||
    products[0];

  if (!product) return null;

  const imagesList =
    product.images && product.images.length > 0
      ? product.images
      : [cookerMainImg];

  const currentImage = imagesList[selectedImageIndex] || imagesList[0] || cookerMainImg;

  // Descriptive angle labels for gallery navigation
  const angleLabels = [
    'Vista Oficial Studio',
    'Cuba Interna Aberta',
    'Em Uso na Cozinha',
    'Painel Digital Frontal',
  ];

  return (
    <section className="bg-[#F5F0E8] py-16 sm:py-24 px-4 sm:px-6 lg:px-8 border-b border-[#071A2B]/10">
      <div className="max-w-7xl mx-auto">
        {/* Section Pre-heading */}
        <div className="flex flex-col items-center text-center mb-10 sm:mb-14">
          <div className="inline-flex items-center gap-2 mb-2">
            <span className="w-8 h-[1px] bg-[#C89A4B]" />
            <span className="text-[10px] font-sans tracking-[0.28em] uppercase text-[#8A6726] font-semibold">
              DESTAQUE EDITORIAL DA SEMANA
            </span>
            <span className="w-8 h-[1px] bg-[#C89A4B]" />
          </div>
          <h2 className="font-serif text-3xl sm:text-4xl text-[#071A2B] font-light tracking-tight">
            Excelência &amp; Alta Performance Culinária
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
          {/* Left: Optimized Product Presentation Canvas with Interactive Gallery */}
          <div className="lg:col-span-7 flex flex-col items-center">
            {/* Main Showcase Frame */}
            <div className="w-full relative group/showcase bg-gradient-to-b from-white via-[#FAF7F2] to-[#ECE5D8] rounded-xs border border-[#071A2B]/15 shadow-xl overflow-hidden p-6 sm:p-10 transition-all duration-300 hover:shadow-2xl">
              {/* Top Bar Badges */}
              <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#071A2B] text-[#E0B866] text-[10px] font-sans font-semibold uppercase tracking-[0.2em] rounded-xs shadow-xs border border-[#C89A4B]/40">
                  <Sparkles className="w-3 h-3 text-[#E0B866]" />
                  {product.badge || 'DESTAQUE OFICIAL'}
                </span>
              </div>

              <div className="absolute top-4 right-4 z-10">
                <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 bg-white/90 backdrop-blur-xs text-[#071A2B] text-[10px] font-sans font-medium uppercase tracking-[0.15em] rounded-xs border border-[#071A2B]/10 shadow-2xs">
                  <Award className="w-3 h-3 text-[#C89A4B]" />
                  Cuba 5L &bull; 900W
                </span>
              </div>

              {/* Centered Image with Full Visibility (no aggressive cropping) */}
              <div
                onClick={() => navigateTo(`/produto/${product.slug}`)}
                className="relative aspect-square max-w-[440px] mx-auto flex items-center justify-center cursor-pointer group/img"
                title="Clique para ver os detalhes completos deste produto"
              >
                {/* Radial ambient lighting behind product */}
                <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-[#C89A4B]/15 via-white/40 to-transparent blur-2xl scale-90 pointer-events-none" />

                <img
                  src={currentImage}
                  alt={`${product.name} - ${angleLabels[selectedImageIndex] || 'Visualização'}`}
                  className="relative z-10 max-w-full max-h-full w-auto h-auto object-contain drop-shadow-[0_20px_25px_rgba(7,26,43,0.18)] transform transition-transform duration-500 ease-out group-hover/img:scale-105"
                  referrerPolicy="no-referrer"
                />
              </div>

              {/* Studio Pedestal Base Shadow */}
              <div className="w-3/4 h-4 mx-auto bg-gradient-to-r from-transparent via-[#071A2B]/15 to-transparent blur-sm rounded-full -mt-2 pointer-events-none" />

              {/* Current View Caption */}
              <div className="mt-4 pt-3 border-t border-[#071A2B]/10 flex items-center justify-between text-[11px] font-sans text-[#1C242B]/70">
                <span className="font-medium text-[#071A2B]">
                  {angleLabels[selectedImageIndex] || `Ângulo ${selectedImageIndex + 1}`}
                </span>
                <span className="tracking-wider uppercase text-[10px] text-[#8A6726] font-semibold">
                  Foto {selectedImageIndex + 1} de {imagesList.length}
                </span>
              </div>
            </div>

            {/* Interactive Thumbnail Gallery Strip */}
            {imagesList.length > 1 && (
              <div className="w-full mt-4 flex items-center justify-center gap-3 sm:gap-4 overflow-x-auto py-2">
                {imagesList.map((img, idx) => {
                  const isSelected = selectedImageIndex === idx;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setSelectedImageIndex(idx)}
                      className={`group relative flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 bg-white rounded-xs p-1.5 transition-all duration-200 border cursor-pointer ${
                        isSelected
                          ? 'border-[#C89A4B] ring-2 ring-[#C89A4B]/50 shadow-md scale-105 bg-[#FAF7F2]'
                          : 'border-[#071A2B]/15 hover:border-[#C89A4B]/60 hover:shadow-sm opacity-80 hover:opacity-100'
                      }`}
                      aria-label={`Ver imagem ${idx + 1}: ${angleLabels[idx] || 'Detalhe'}`}
                    >
                      <img
                        src={img}
                        alt={`Miniatura ${idx + 1}`}
                        className="w-full h-full object-contain"
                        referrerPolicy="no-referrer"
                      />
                      {isSelected && (
                        <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-1 bg-[#C89A4B] rounded-full" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Quick Spec Pills */}
            <div className="w-full mt-4 grid grid-cols-3 gap-2 text-center">
              <div className="p-2.5 bg-white/80 border border-[#071A2B]/10 rounded-xs">
                <span className="block text-[9px] font-sans uppercase tracking-widest text-[#8A6726] font-semibold">
                  Capacidade
                </span>
                <span className="font-serif text-xs text-[#071A2B] font-medium">
                  5 Litros Família
                </span>
              </div>
              <div className="p-2.5 bg-white/80 border border-[#071A2B]/10 rounded-xs">
                <span className="block text-[9px] font-sans uppercase tracking-widest text-[#8A6726] font-semibold">
                  Painel
                </span>
                <span className="font-serif text-xs text-[#071A2B] font-medium">
                  Digital Inteligente
                </span>
              </div>
              <div className="p-2.5 bg-white/80 border border-[#071A2B]/10 rounded-xs">
                <span className="block text-[9px] font-sans uppercase tracking-widest text-[#8A6726] font-semibold">
                  Potência
                </span>
                <span className="font-serif text-xs text-[#071A2B] font-medium">
                  900W de Eficiência
                </span>
              </div>
            </div>
          </div>

          {/* Right: Editorial Content */}
          <div className="lg:col-span-5 flex flex-col justify-center">
            <div className="inline-flex items-center gap-2 mb-3">
              <span className="w-6 h-[1px] bg-[#C89A4B]" />
              <span className="text-[10px] font-sans tracking-[0.26em] uppercase text-[#8A6726] font-semibold">
                MARCA {product.brand.toUpperCase()} &bull; {product.categoryLabel.toUpperCase()}
              </span>
            </div>

            <h3 className="font-serif text-2xl sm:text-3xl lg:text-4xl text-[#071A2B] font-light leading-[1.15] mb-4">
              {product.name}
            </h3>

            <p className="font-sans text-sm sm:text-base text-[#1C242B]/80 font-light leading-relaxed mb-6">
              {product.shortDescription}
            </p>

            {/* Features bullet points */}
            {product.features && product.features.length > 0 && (
              <div className="space-y-3 mb-6 border-y border-[#071A2B]/10 py-5">
                {product.features.slice(0, 4).map((feat, idx) => (
                  <div key={idx} className="flex items-start gap-3 text-xs font-sans text-[#071A2B]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#C89A4B] shrink-0 mt-1.5" />
                    <span className="leading-relaxed">{feat}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Curated Trust & Quality Highlight */}
            <div className="mb-6 p-4 bg-white/80 border border-[#071A2B]/10 rounded-xs flex items-center justify-between gap-4 shadow-2xs">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#071A2B]/5 rounded-xs text-[#8A6726]">
                  <ShieldCheck className="w-5 h-5 text-[#C89A4B]" />
                </div>
                <div>
                  <span className="block text-xs font-serif font-medium text-[#071A2B]">
                    Curadoria Exclusiva Dona Héstia
                  </span>
                  <span className="block text-[11px] font-sans text-[#1C242B]/65 font-light">
                    Redirecionamento seguro para a loja parceira oficial
                  </span>
                </div>
              </div>
              <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-sans text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-xs font-medium">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Verificado
              </span>
            </div>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => navigateTo(`/produto/${product.slug}`)}
                className="inline-flex items-center justify-center gap-2.5 px-8 py-3.5 bg-[#071A2B] hover:bg-[#C89A4B] text-[#F5F0E8] hover:text-[#071A2B] text-xs font-sans tracking-[0.2em] uppercase font-semibold transition-all duration-200 rounded-xs shadow-md border border-[#C89A4B]/30 group cursor-pointer"
              >
                <span>Ver oferta oficial</span>
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
