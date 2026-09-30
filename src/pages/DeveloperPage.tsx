import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigation } from '../context/NavigationContext';
import { useProducts } from '../context/ProductContext';
import { Product, CategoryInfo } from '../types';
import { Logo } from '../components/Logo';
import {
  Lock,
  Unlock,
  Eye,
  EyeOff,
  LogOut,
  Plus,
  Edit3,
  Trash2,
  Copy,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Upload,
  Image as ImageIcon,
  Star,
  Tag,
  Store,
  Layers,
  ShoppingBag,
  Sparkles,
  ArrowRight,
  RefreshCw,
  Search,
  X,
  SlidersHorizontal,
  Filter,
  Database,
  Key,
  ShieldCheck,
  Check,
} from 'lucide-react';

import {
  saveDeveloperPasswordToSupabase,
  verifyDeveloperPasswordSecurely,
  DEFAULT_FALLBACK_PASSWORD,
} from '../lib/supabase';

const SESSION_AUTH_KEY = 'dona_hestia_dev_auth_v1';

export const DeveloperPage: React.FC = () => {
  const { navigateTo } = useNavigation();
  const {
    products,
    categories,
    addProduct,
    updateProduct,
    deleteProduct,
    duplicateProduct,
    addCategory,
    resetToDefaults,
  } = useProducts();

  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem(SESSION_AUTH_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSubmittingAuth, setIsSubmittingAuth] = useState(false);
  const passwordInputRef = useRef<HTMLInputElement>(null);

  // Active View / Tab inside Panel
  const [activeTab, setActiveTab] = useState<'editor' | 'catalog' | 'categories' | 'security'>('editor');
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [searchCatalogQuery, setSearchCatalogQuery] = useState('');
  const [selectedCatalogCategory, setSelectedCatalogCategory] = useState<string>('all');
  const [selectedCatalogNiche, setSelectedCatalogNiche] = useState<string>('all');
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Developer Password States
  const [newDevPassword, setNewDevPassword] = useState('');
  const [isSavingNewPassword, setIsSavingNewPassword] = useState(false);

  // Floating Toast Notification for Immediate Feedback on Screen
  const [toastMessage, setToastMessage] = useState<{
    id: number;
    title: string;
    text: string;
    type: 'success' | 'delete' | 'info';
  } | null>(null);

  const showToast = (title: string, text: string, type: 'success' | 'delete' | 'info' = 'success') => {
    const id = Date.now();
    setToastMessage({ id, title, text, type });
    setStatusMessage({ type: type === 'delete' ? 'error' : 'success', text: `${title}: ${text}` });
    setTimeout(() => {
      setToastMessage((current) => (current?.id === id ? null : current));
    }, 5500);
  };

  // 3-Step Cascading Product Selector State (Passo 1: Categoria -> Passo 2: Tipo/Nicho -> Passo 3: Produto)
  const [pickerCategory, setPickerCategory] = useState<string>('all');
  const [pickerNiche, setPickerNiche] = useState<string>('all');
  const [pickerProductId, setPickerProductId] = useState<string>('');

  // Available Niches/ProductTypes for filtering (Always includes Eletrodomésticos)
  const pickerAvailableNiches = useMemo(() => {
    const prods = pickerCategory === 'all'
      ? products
      : products.filter((p) => p.category === pickerCategory);
    const set = new Set<string>();
    // Always include Eletrodomésticos as stressed by user
    set.add('Eletrodomésticos');
    prods.forEach((p) => {
      const type = (p.productType && p.productType.trim()) || 'Eletrodomésticos';
      set.add(type);
    });
    return Array.from(set);
  }, [products, pickerCategory]);

  // Available Niches/ProductTypes for Catalog Tab
  const catalogAvailableNiches = useMemo(() => {
    const prods = selectedCatalogCategory === 'all'
      ? products
      : products.filter((p) => p.category === selectedCatalogCategory);
    const set = new Set<string>();
    set.add('Eletrodomésticos');
    prods.forEach((p) => {
      const type = (p.productType && p.productType.trim()) || 'Eletrodomésticos';
      set.add(type);
    });
    return Array.from(set);
  }, [products, selectedCatalogCategory]);

  // Available Products based on Step 1 (Category) and Step 2 (Niche)
  const pickerAvailableProducts = useMemo(() => {
    return products.filter((p) => {
      const matchCategory = pickerCategory === 'all' || p.category === pickerCategory;
      const pNiche = (p.productType && p.productType.trim()) || 'Eletrodomésticos';
      const matchNiche = pickerNiche === 'all' || pNiche.toLowerCase() === pickerNiche.toLowerCase();
      return matchCategory && matchNiche;
    });
  }, [products, pickerCategory, pickerNiche]);

  // Keep picker state synced when a product is being edited
  useEffect(() => {
    if (editingProductId) {
      setPickerProductId(editingProductId);
      const current = products.find((p) => p.id === editingProductId);
      if (current) {
        setPickerCategory(current.category);
        setPickerNiche(current.productType || 'Eletrodomésticos');
      }
    }
  }, [editingProductId, products]);

  // In-App Confirmation Modals
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [showResetConfirmModal, setShowResetConfirmModal] = useState(false);

  // Category Modal / Inline Form
  const [showNewCategoryModal, setShowNewCategoryModal] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatTagline, setNewCatTagline] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');
  const [newCatImage, setNewCatImage] = useState('');

  // Form State for Product
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('Kian');
  const [category, setCategory] = useState('cozinha');
  const [productType, setProductType] = useState('Eletrodomésticos');
  const [price, setPrice] = useState<string>('299.00');
  const [originalPrice, setOriginalPrice] = useState<string>('349.00');
  const [priceRangeLabel, setPriceRangeLabel] = useState('R$ 299,00 a R$ 349,00');
  const [badge, setBadge] = useState('Destaque Oficial');
  const [customBadge, setCustomBadge] = useState('');
  const [rating, setRating] = useState<number>(4.9);
  const [reviewCount, setReviewCount] = useState<number>(348);
  const [shortDescription, setShortDescription] = useState('');
  const [fullDescription, setFullDescription] = useState('');
  const [platform, setPlatform] = useState('Shopee');
  const [customPlatform, setCustomPlatform] = useState('');
  const [buyUrl, setBuyUrl] = useState('https://s.shopee.com.br/112vcBEklr');
  const [highlight, setHighlight] = useState(false);
  const [voltages, setVoltages] = useState<string[]>([]);

  // Images state
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [imageList, setImageList] = useState<string[]>([]);

  // Features list
  const [featuresList, setFeaturesList] = useState<string[]>([
    'Qualidade certificada com garantia de satisfação',
    'Design sofisticado e acabamento premium para seu lar',
  ]);
  const [featureInput, setFeatureInput] = useState('');

  // Auto-focus password input on mount if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      passwordInputRef.current?.focus();
    }
  }, [isAuthenticated]);

  // Load product to edit if specified in URL query (e.g. /developer?edit=prodId)
  useEffect(() => {
    if (isAuthenticated) {
      try {
        const params = new URLSearchParams(window.location.search);
        const editId = params.get('edit');
        if (editId) {
          const prod = products.find((p) => p.id === editId || p.slug === editId);
          if (prod) {
            handleStartEdit(prod);
          }
        }
      } catch {
        // ignore
      }
    }
  }, [isAuthenticated, products]);

  // Handle Authentication Submission via Supabase Database (Secure RPC first, fallback to table/default)
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingAuth(true);
    setAuthError(null);

    try {
      const { isValid, method } = await verifyDeveloperPasswordSecurely(passwordInput);

      if (isValid) {
        setAuthError(null);
        setIsAuthenticated(true);
        try {
          sessionStorage.setItem(SESSION_AUTH_KEY, 'true');
        } catch {
          // ignore
        }
        showToast(
          'Acesso Autorizado!',
          'Autenticado com sucesso no painel de desenvolvedor.',
          'success'
        );
      } else {
        setAuthError('Senha incorreta. Acesso negado.');
        setPasswordInput('');
      }
    } catch {
      // Offline fallback
      if (passwordInput === DEFAULT_FALLBACK_PASSWORD) {
        setAuthError(null);
        setIsAuthenticated(true);
        try {
          sessionStorage.setItem(SESSION_AUTH_KEY, 'true');
        } catch {
          // ignore
        }
        showToast('Acesso Autorizado!', 'Autenticado no painel de desenvolvedor.', 'success');
      } else {
        setAuthError('Senha incorreta. Acesso negado.');
        setPasswordInput('');
      }
    } finally {
      setIsSubmittingAuth(false);
    }
  };

  // Logout handler
  const handleLogout = () => {
    setIsAuthenticated(false);
    setPasswordInput('');
    setAuthError(null);
    try {
      sessionStorage.removeItem(SESSION_AUTH_KEY);
    } catch {
      // ignore
    }
  };

  // Populate form with existing product for editing
  const handleStartEdit = (product: Product) => {
    setEditingProductId(product.id);
    setName(product.name);
    setBrand(product.brand || 'Dona Héstia');
    setCategory(product.category);
    setProductType(product.productType || 'Eletrodomésticos');
    setPrice(product.price ? product.price.toString() : '');
    setOriginalPrice(product.originalPrice ? product.originalPrice.toString() : '');
    setPriceRangeLabel(product.priceRangeLabel || '');
    setBadge(product.badge || '');
    setCustomBadge('');
    setRating(product.rating !== undefined ? product.rating : 4.9);
    setReviewCount(product.reviewCount !== undefined ? product.reviewCount : 150);
    setShortDescription(product.shortDescription || '');
    setFullDescription(product.fullDescription || '');
    setPlatform(product.platform || 'Shopee');
    setCustomPlatform('');
    setBuyUrl(product.buyUrl || '');
    setHighlight(!!product.highlight);
    setVoltages(product.availableVoltages || []);
    setImageList(product.images || []);
    setFeaturesList(product.features || []);

    // Set cascading picker values
    setPickerCategory(product.category);
    setPickerNiche(product.productType || 'Eletrodomésticos');
    setPickerProductId(product.id);

    setActiveTab('editor');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    showToast(
      'Produto Carregado',
      `O produto "${product.name}" está pronto para edição no formulário.`,
      'info'
    );
  };

  // Reset/Clear form
  const handleClearForm = () => {
    setEditingProductId(null);
    setPickerProductId('');
    setName('');
    setBrand('Dona Héstia');
    setCategory(categories[0]?.slug || 'cozinha');
    setProductType('Eletrodomésticos');
    setPrice('');
    setOriginalPrice('');
    setPriceRangeLabel('');
    setBadge('');
    setCustomBadge('');
    setRating(4.9);
    setReviewCount(120);
    setShortDescription('');
    setFullDescription('');
    setPlatform('Shopee');
    setCustomPlatform('');
    setBuyUrl('');
    setHighlight(false);
    setVoltages([]);
    setImageList([]);
    setFeaturesList([
      'Qualidade certificada com garantia de satisfação',
      'Design sofisticado e acabamento premium para seu lar',
    ]);
  };

  // Add Image from URL
  const handleAddImageUrl = () => {
    if (!imageUrlInput.trim()) return;
    setImageList((prev) => [...prev, imageUrlInput.trim()]);
    setImageUrlInput('');
  };

  // File Upload reading via FileReader
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        const result = uploadEvent.target?.result as string;
        if (result) {
          setImageList((prev) => [...prev, result]);
        }
      };
      reader.readAsDataURL(file);
    }
    // reset input
    e.target.value = '';
  };

  const handleRemoveImage = (indexToRemove: number) => {
    setImageList((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSetMainImage = (index: number) => {
    if (index === 0) return;
    setImageList((prev) => {
      const copy = [...prev];
      const selected = copy.splice(index, 1)[0];
      return [selected, ...copy];
    });
  };

  // Features handling
  const handleAddFeature = () => {
    if (!featureInput.trim()) return;
    setFeaturesList((prev) => [...prev, featureInput.trim()]);
    setFeatureInput('');
  };

  const handleRemoveFeature = (index: number) => {
    setFeaturesList((prev) => prev.filter((_, i) => i !== index));
  };

  // Save Product (Create or Update)
  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setStatusMessage({ type: 'error', text: 'Por favor, preencha o Nome do Produto.' });
      return;
    }

    const numericPrice = parseFloat(price.replace(',', '.')) || 0;
    const numericOriginalPrice = originalPrice ? parseFloat(originalPrice.replace(',', '.')) : undefined;

    const finalPlatform = customPlatform.trim() ? customPlatform.trim() : platform;
    const finalBadge = customBadge.trim() ? customBadge.trim() : badge;

    const selectedCategoryObj = categories.find((c) => c.slug === category || c.id === category);

    const productPayload: Partial<Product> & { name: string; price: number } = {
      name: name.trim(),
      brand: brand.trim() || 'Dona Héstia',
      category: category,
      categoryLabel: selectedCategoryObj?.name || 'Cozinha',
      productType: productType.trim() || 'Eletrodomésticos',
      price: numericPrice,
      originalPrice: numericOriginalPrice,
      priceRangeLabel: priceRangeLabel.trim() || undefined,
      badge: finalBadge || undefined,
      rating: rating,
      reviewCount: reviewCount,
      shortDescription: shortDescription.trim() || `${name.trim()} com excelente desempenho e acabamento premium.`,
      fullDescription: fullDescription.trim() || shortDescription.trim(),
      features: featuresList,
      images: imageList.length > 0 ? imageList : [
        'https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?auto=format&fit=crop&w=800&q=80',
      ],
      platform: finalPlatform,
      buyUrl: buyUrl.trim() || 'https://s.shopee.com.br/112vcBEklr',
      highlight: highlight,
      availableVoltages: voltages,
    };

    if (editingProductId) {
      const updated = updateProduct(editingProductId, productPayload);
      if (updated) {
        showToast(
          'Edição Concluída!',
          `As alterações do produto "${updated.name}" foram salvas com sucesso na loja.`,
          'success'
        );
      }
    } else {
      const created = addProduct(productPayload);
      showToast(
        'Produto Cadastrado!',
        `O novo produto "${created.name}" foi publicado com sucesso no catálogo.`,
        'success'
      );
      handleClearForm();
    }
  };

  // Add New Category Handler
  const handleCreateCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    const created = addCategory({
      name: newCatName.trim(),
      tagline: newCatTagline.trim(),
      description: newCatDesc.trim(),
      imageUrl: newCatImage.trim() || undefined,
    });

    setCategory(created.slug);
    setNewCatName('');
    setNewCatTagline('');
    setNewCatDesc('');
    setNewCatImage('');
    setShowNewCategoryModal(false);

    showToast(
      'Categoria Criada!',
      `A nova categoria "${created.name}" foi criada com sucesso!`,
      'success'
    );
  };

  // Save or Update Developer Password in Supabase app_config
  const handleSaveNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDevPassword.trim()) {
      setStatusMessage({ type: 'error', text: 'Por favor, digite a nova senha desejada.' });
      return;
    }

    setIsSavingNewPassword(true);
    const result = await saveDeveloperPasswordToSupabase(newDevPassword.trim());
    if (result.success) {
      showToast(
        'Senha Atualizada!',
        'A nova credencial de acesso foi alterada com sucesso.',
        'success'
      );
      setNewDevPassword('');
    } else {
      showToast(
        'Erro ao Atualizar',
        'Não foi possível salvar a nova senha no momento. Tente novamente.',
        'delete'
      );
    }
    setIsSavingNewPassword(false);
  };

  // Filtered catalog list (supports Category, Niche/ProductType, and Search Query)
  const filteredCatalog = products.filter((p) => {
    const q = searchCatalogQuery.toLowerCase();
    const matchesQuery =
      !q ||
      p.name.toLowerCase().includes(q) ||
      p.brand.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q) ||
      (p.platform && p.platform.toLowerCase().includes(q));

    const matchesCategory =
      selectedCatalogCategory === 'all' ||
      p.category === selectedCatalogCategory;

    const pNiche = (p.productType && p.productType.trim()) || 'Eletrodomésticos';
    const matchesNiche =
      selectedCatalogNiche === 'all' ||
      pNiche.toLowerCase() === selectedCatalogNiche.toLowerCase();

    return matchesQuery && matchesCategory && matchesNiche;
  });

  // -------------------------------------------------------------
  // VIEW 1: AUTHENTICATION SCREEN (if not authenticated)
  // -------------------------------------------------------------
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen pt-28 pb-20 px-4 sm:px-6 lg:px-8 bg-[#071A2B] text-[#F5F0E8] flex items-center justify-center relative overflow-hidden">
        {/* Ambient background glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-[#C89A4B]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 right-10 w-72 h-72 bg-[#0D263D] rounded-full blur-2xl pointer-events-none" />

        <div className="w-full max-w-md bg-[#0D263D]/90 border border-[#C89A4B]/30 rounded-xs p-8 sm:p-10 shadow-2xl relative z-10 backdrop-blur-md">
          {/* Logo & Lock Header */}
          <div className="flex flex-col items-center text-center mb-8">
            <Logo variant="dark" size="lg" />

            <div className="mt-6 w-14 h-14 rounded-full bg-[#071A2B] border border-[#C89A4B]/40 flex items-center justify-center text-[#E0B866] shadow-inner mb-4">
              <Lock className="w-6 h-6" strokeWidth={1.75} />
            </div>

            <h1 className="font-serif text-2xl text-[#F5F0E8] tracking-wide font-normal">
              Acesso ao Desenvolvedor
            </h1>
            <p className="font-sans text-xs text-[#F5F0E8]/70 mt-2 leading-relaxed">
              Área restrita para administração e gerenciamento do catálogo da plataforma Dona Héstia.
            </p>
          </div>

          {/* Error Message Box */}
          {authError && (
            <div className="mb-6 p-3.5 bg-rose-950/60 border border-rose-500/50 rounded-xs flex items-center gap-3 text-rose-200 text-xs animate-shake">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span className="font-medium">{authError}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handlePasswordSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="dev-password"
                className="block text-[11px] font-sans uppercase tracking-[0.2em] text-[#C89A4B] mb-2 font-medium"
              >
                Senha de Acesso
              </label>

              <div className="relative">
                <input
                  ref={passwordInputRef}
                  id="dev-password"
                  type={showPassword ? 'text' : 'password'}
                  value={passwordInput}
                  onChange={(e) => {
                    setPasswordInput(e.target.value);
                    if (authError) setAuthError(null);
                  }}
                  placeholder="Digite a senha..."
                  required
                  autoComplete="current-password"
                  className="w-full bg-[#071A2B] border border-[#C89A4B]/40 text-[#F5F0E8] px-4 py-3 rounded-xs text-sm focus:outline-hidden focus:border-[#E0B866] focus:ring-1 focus:ring-[#E0B866] transition-colors pr-11"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Ocultar senha' : 'Exibir senha'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#F5F0E8]/60 hover:text-[#E0B866] transition-colors p-1"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmittingAuth}
              className="w-full py-3.5 bg-[#C89A4B] hover:bg-[#E0B866] text-[#071A2B] font-sans text-xs tracking-[0.2em] uppercase font-semibold rounded-xs transition-colors duration-200 flex items-center justify-center gap-2 shadow-md disabled:opacity-50"
            >
              <Unlock className="w-4 h-4" />
              <span>Entrar no Painel</span>
            </button>
          </form>

          {/* Footer note */}
          <div className="mt-8 pt-6 border-t border-white/10 text-center">
            <button
              type="button"
              onClick={() => navigateTo('/')}
              className="text-xs text-[#F5F0E8]/60 hover:text-[#E0B866] transition-colors"
            >
              &larr; Voltar para a Loja Oficial
            </button>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // VIEW 2: AUTHENTICATED DEVELOPER PANEL & PLATFORM CMS
  // -------------------------------------------------------------
  return (
    <div className="pt-24 pb-28 px-4 sm:px-6 lg:px-8 bg-[#F5F0E8] min-h-screen text-[#1C242B] relative">
      {/* Floating Toast Notification for Immediate Feedback on Screen */}
      {toastMessage && (
        <div className={`fixed top-6 right-4 sm:right-8 z-[9999] max-w-md w-[calc(100%-2rem)] bg-white border border-[#071A2B]/15 rounded-xs shadow-2xl p-4 sm:p-5 flex items-start gap-3.5 animate-fadeIn border-l-4 ${
          toastMessage.type === 'delete'
            ? 'border-l-rose-600'
            : toastMessage.type === 'info'
            ? 'border-l-amber-500'
            : 'border-l-emerald-600'
        }`}>
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
              toastMessage.type === 'delete'
                ? 'bg-rose-100 text-rose-700'
                : toastMessage.type === 'info'
                ? 'bg-amber-100 text-amber-800'
                : 'bg-emerald-100 text-emerald-800'
            }`}
          >
            {toastMessage.type === 'delete' ? (
              <Trash2 className="w-5 h-5 text-rose-600" />
            ) : toastMessage.type === 'info' ? (
              <RefreshCw className="w-5 h-5 text-amber-700" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-1">
              <h4 className="font-serif text-sm font-semibold text-[#071A2B] flex items-center gap-1.5">
                <span>{toastMessage.title}</span>
                <span className="text-[10px] font-sans uppercase tracking-wider px-1.5 py-0.2 rounded-xs font-medium text-emerald-700 bg-emerald-50">
                  {toastMessage.type === 'delete' ? 'Removido' : toastMessage.type === 'info' ? 'Aviso' : 'Concluído'}
                </span>
              </h4>
              <button
                type="button"
                onClick={() => setToastMessage(null)}
                className="text-gray-400 hover:text-gray-700 p-0.5 transition-colors"
                title="Fechar notificação"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="font-sans text-xs text-[#1C242B]/85 leading-relaxed font-medium">
              {toastMessage.text}
            </p>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto">
        {/* Top Control Bar */}
        <div className="bg-[#071A2B] text-[#F5F0E8] border border-[#C89A4B]/30 rounded-xs p-6 sm:p-8 mb-8 shadow-md">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2.5 mb-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-xs bg-[#C89A4B]/20 border border-[#C89A4B]/40 text-[#E0B866] text-[10px] font-sans font-medium uppercase tracking-[0.2em]">
                  <Sparkles className="w-3 h-3" />
                  Painel Administrativo
                </span>
                <span className="text-[10px] font-sans text-emerald-400 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  Sessão Ativa
                </span>
              </div>
              <h1 className="font-serif text-2xl sm:text-3xl text-[#F5F0E8] font-light">
                Editor da Plataforma Dona Héstia
              </h1>
              <p className="font-sans text-xs text-[#F5F0E8]/70 mt-1 max-w-2xl">
                Gerencie todos os itens do site, adicione novos produtos com link de afiliado, defina fotos, avaliações, lojas e categorias.
              </p>
            </div>

            {/* Top Action Buttons */}
            <div className="flex items-center flex-wrap gap-3">
              <button
                type="button"
                onClick={() => navigateTo('/produtos')}
                className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-[#F5F0E8] text-xs font-sans tracking-[0.15em] uppercase rounded-xs transition-colors flex items-center gap-2 border border-white/20"
              >
                <ExternalLink className="w-3.5 h-3.5 text-[#E0B866]" />
                <span>Ver Loja</span>
              </button>

              <button
                type="button"
                onClick={handleLogout}
                className="px-4 py-2.5 bg-rose-950/80 hover:bg-rose-900 text-rose-200 hover:text-white text-xs font-sans tracking-[0.15em] uppercase rounded-xs transition-colors flex items-center gap-2 border border-rose-700/50 shadow-xs"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sair / Logout</span>
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex gap-2 sm:gap-4 mt-8 pt-6 border-t border-white/10 overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab('editor')}
              className={`px-4 py-2.5 text-xs font-sans uppercase tracking-[0.16em] font-medium rounded-xs transition-all flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'editor'
                  ? 'bg-[#C89A4B] text-[#071A2B] shadow-sm font-semibold'
                  : 'bg-white/5 text-[#F5F0E8]/80 hover:bg-white/10 hover:text-[#E0B866]'
              }`}
            >
              {editingProductId ? <Edit3 className="w-4 h-4 text-[#071A2B]" /> : <Plus className="w-4 h-4" />}
              <span>{editingProductId ? 'Editando Produto Selecionado' : 'Cadastrar Novo Produto'}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('catalog')}
              className={`px-4 py-2.5 text-xs font-sans uppercase tracking-[0.16em] font-medium rounded-xs transition-all flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'catalog'
                  ? 'bg-[#C89A4B] text-[#071A2B] shadow-sm font-semibold'
                  : 'bg-white/5 text-[#F5F0E8]/80 hover:bg-white/10 hover:text-[#E0B866]'
              }`}
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Gerenciar Produtos (Editar / Excluir) ({products.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('categories')}
              className={`px-4 py-2.5 text-xs font-sans uppercase tracking-[0.16em] font-medium rounded-xs transition-all flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'categories'
                  ? 'bg-[#C89A4B] text-[#071A2B] shadow-sm font-semibold'
                  : 'bg-white/5 text-[#F5F0E8]/80 hover:bg-white/10 hover:text-[#E0B866]'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Categorias ({categories.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('security')}
              className={`px-4 py-2.5 text-xs font-sans uppercase tracking-[0.16em] font-medium rounded-xs transition-all flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'security'
                  ? 'bg-[#C89A4B] text-[#071A2B] shadow-sm font-semibold'
                  : 'bg-white/5 text-[#F5F0E8]/80 hover:bg-white/10 hover:text-[#E0B866]'
              }`}
            >
              <Key className="w-4 h-4" />
              <span>Alterar Senha</span>
            </button>
          </div>
        </div>

        {/* Global Toast / Status Banner */}
        {statusMessage && (
          <div
            className={`mb-6 p-4 rounded-xs border flex items-center justify-between gap-3 text-xs font-medium shadow-md transition-all ${
              statusMessage.type === 'success'
                ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                : 'bg-rose-50 border-rose-300 text-rose-900'
            }`}
          >
            <div className="flex items-center gap-2.5">
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              )}
              <span>{statusMessage.text}</span>
            </div>
            <button
              onClick={() => setStatusMessage(null)}
              className="text-xs uppercase font-sans tracking-wider opacity-60 hover:opacity-100"
            >
              Fechar
            </button>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 1: DYNAMIC PRODUCT FORM (ADD / EDIT) */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'editor' && (
          <div className="space-y-6">
            {/* 3-STEP CASCADING PRODUCT SELECTOR (Categoria -> Tipo/Nicho -> Produto) */}
            <div className="p-5 sm:p-6 bg-white border border-[#071A2B]/15 rounded-xs shadow-xs space-y-5">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-[#071A2B]/10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#071A2B] text-[#E0B866] flex items-center justify-center shrink-0 shadow-xs">
                    <SlidersHorizontal className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-serif text-base text-[#071A2B] font-medium flex items-center gap-2">
                      <span>Selecionar Produto para Edição ou Exclusão</span>
                      {editingProductId && (
                        <span className="px-2 py-0.5 bg-amber-100 border border-amber-300 text-amber-900 text-[10px] font-sans font-semibold rounded-xs uppercase tracking-wider">
                          Modo de Edição Ativo
                        </span>
                      )}
                    </h3>
                    <p className="font-sans text-xs text-[#1C242B]/70 mt-0.5">
                      Filtre em 3 passos: selecione a <strong>1ª Categoria</strong> &rarr; o <strong>2º Tipo de Produto / Nicho</strong> &rarr; e o <strong>3º Produto</strong> para editar ou excluir:
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {editingProductId ? (
                    <button
                      type="button"
                      onClick={handleClearForm}
                      className="px-3.5 py-2 bg-[#071A2B] hover:bg-[#C89A4B] text-[#F5F0E8] hover:text-[#071A2B] text-xs font-sans uppercase tracking-wider rounded-xs font-semibold transition-colors flex items-center gap-1.5 shadow-xs"
                      title="Sair do modo de edição e criar um novo produto"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Cadastrar Novo Produto</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setActiveTab('catalog')}
                      className="px-3.5 py-2 bg-[#071A2B]/5 hover:bg-[#071A2B]/10 text-[#071A2B] border border-[#071A2B]/20 text-xs font-sans uppercase tracking-wider rounded-xs font-medium transition-colors"
                    >
                      Ver Tabela Completa
                    </button>
                  )}
                </div>
              </div>

              {/* Informative notice about existing products niche */}
              <div className="p-3 bg-[#C89A4B]/10 border border-[#C89A4B]/30 rounded-xs flex items-center gap-2.5 text-xs text-[#8A6726]">
                <Sparkles className="w-4 h-4 shrink-0 text-[#C89A4B]" />
                <span className="font-sans leading-relaxed">
                  <strong>Importante:</strong> Todos os produtos adicionados até agora na loja pertencem ao Tipo de produto/nicho: <strong className="underline decoration-[#C89A4B]">Eletrodomésticos</strong>.
                </span>
              </div>

              {/* 3 Step Selectors Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Step 1: Categoria */}
                <div className="bg-[#F5F0E8]/40 p-3.5 rounded-xs border border-[#071A2B]/10">
                  <label className="block text-[11px] font-sans uppercase tracking-wider text-[#8A6726] font-semibold mb-1.5 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <span className="w-4 h-4 rounded-full bg-[#8A6726] text-white flex items-center justify-center text-[10px] font-bold">1</span>
                      Passo 1: Categoria
                    </span>
                    <span className="text-[10px] text-[#1C242B]/50 font-normal">
                      {pickerCategory === 'all' ? `${products.length} itens` : `${pickerAvailableProducts.length} itens`}
                    </span>
                  </label>
                  <select
                    value={pickerCategory}
                    onChange={(e) => {
                      setPickerCategory(e.target.value);
                      setPickerProductId('');
                    }}
                    className="w-full bg-white border border-[#071A2B]/20 text-[#071A2B] px-3.5 py-2.5 rounded-xs text-xs font-sans focus:outline-hidden focus:border-[#C89A4B] font-medium shadow-2xs"
                  >
                    <option value="all">Todas as Categorias ({products.length})</option>
                    {categories.map((c) => (
                      <option key={c.slug} value={c.slug}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Step 2: Tipo de Produto / Nicho */}
                <div className="bg-[#F5F0E8]/40 p-3.5 rounded-xs border border-[#071A2B]/10">
                  <label className="block text-[11px] font-sans uppercase tracking-wider text-[#8A6726] font-semibold mb-1.5 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <span className="w-4 h-4 rounded-full bg-[#8A6726] text-white flex items-center justify-center text-[10px] font-bold">2</span>
                      Passo 2: Tipo / Nicho
                    </span>
                    <span className="text-[10px] font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-xs">
                      Eletrodomésticos
                    </span>
                  </label>
                  <select
                    value={pickerNiche}
                    onChange={(e) => {
                      setPickerNiche(e.target.value);
                      setPickerProductId('');
                    }}
                    className="w-full bg-white border border-[#071A2B]/20 text-[#071A2B] px-3.5 py-2.5 rounded-xs text-xs font-sans focus:outline-hidden focus:border-[#C89A4B] font-medium shadow-2xs"
                  >
                    <option value="all">Todos os Tipos / Nichos</option>
                    {pickerAvailableNiches.map((niche) => (
                      <option key={niche} value={niche}>
                        {niche} {niche === 'Eletrodomésticos' ? '(Padrão Atual de Todos)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Step 3: Produto */}
                <div className="bg-[#F5F0E8]/40 p-3.5 rounded-xs border border-[#071A2B]/10">
                  <label className="block text-[11px] font-sans uppercase tracking-wider text-[#8A6726] font-semibold mb-1.5 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <span className="w-4 h-4 rounded-full bg-[#8A6726] text-white flex items-center justify-center text-[10px] font-bold">3</span>
                      Passo 3: Produto
                    </span>
                    <span className="text-[10px] text-[#1C242B]/50 font-normal">
                      {pickerAvailableProducts.length} encontrados
                    </span>
                  </label>
                  <select
                    value={pickerProductId}
                    onChange={(e) => {
                      const selId = e.target.value;
                      setPickerProductId(selId);
                      const prod = products.find((p) => p.id === selId);
                      if (prod) {
                        handleStartEdit(prod);
                      }
                    }}
                    className="w-full bg-white border border-[#071A2B]/20 text-[#071A2B] px-3.5 py-2.5 rounded-xs text-xs font-sans focus:outline-hidden focus:border-[#C89A4B] font-medium shadow-2xs"
                  >
                    <option value="">
                      {pickerAvailableProducts.length > 0
                        ? `-- Escolha um produto (${pickerAvailableProducts.length} disponíveis) --`
                        : '-- Nenhum produto com este filtro --'}
                    </option>
                    {pickerAvailableProducts.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} - R$ {p.price.toFixed(2).replace('.', ',')}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Selected Product Action Panel */}
              {(() => {
                const activeProd = products.find((p) => p.id === (pickerProductId || editingProductId));
                if (!activeProd) return null;

                return (
                  <div className="p-4 bg-amber-50/70 border border-amber-300/80 rounded-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-14 h-14 bg-white border border-[#071A2B]/15 rounded-xs overflow-hidden shrink-0 flex items-center justify-center p-1 shadow-2xs">
                        {activeProd.images[0] ? (
                          <img
                            src={activeProd.images[0]}
                            alt={activeProd.name}
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <ImageIcon className="w-6 h-6 text-gray-400" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="px-2 py-0.5 bg-[#071A2B] text-[#E0B866] text-[9px] font-sans font-medium uppercase tracking-wider rounded-xs">
                            {activeProd.productType || 'Eletrodomésticos'}
                          </span>
                          <span className="text-[10px] font-sans text-[#8A6726] uppercase font-semibold">
                            {activeProd.categoryLabel || activeProd.category}
                          </span>
                        </div>
                        <h4 className="font-serif text-sm font-semibold text-[#071A2B] truncate">
                          {activeProd.name}
                        </h4>
                        <span className="text-xs font-sans text-[#1C242B]/75 block font-medium">
                          {activeProd.priceRangeLabel || `R$ ${activeProd.price.toFixed(2).replace('.', ',')}`} &bull; Loja: {activeProd.platform || 'Shopee'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleStartEdit(activeProd)}
                        className="px-4 py-2.5 bg-[#071A2B] hover:bg-[#C89A4B] text-[#F5F0E8] hover:text-[#071A2B] text-xs font-sans uppercase tracking-wider rounded-xs font-semibold transition-colors flex items-center gap-1.5 shadow-xs"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>{editingProductId === activeProd.id ? 'Editando no Formulário' : 'Editar Produto'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setProductToDelete(activeProd)}
                        className="px-4 py-2.5 bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white border border-rose-300 hover:border-rose-600 text-xs font-sans uppercase tracking-wider rounded-xs font-semibold transition-colors flex items-center gap-1.5 shadow-2xs"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Excluir</span>
                      </button>
                    </div>
                  </div>
                );
              })()}

              {/* Visual Card List of Matching Products based on Category & Niche */}
              <div className="pt-3 border-t border-[#071A2B]/10">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-sans font-semibold uppercase tracking-wider text-[#071A2B] flex items-center gap-1.5">
                    <Filter className="w-3.5 h-3.5 text-[#C89A4B]" />
                    Produtos Encontrados neste Nicho ({pickerAvailableProducts.length})
                  </span>
                  <span className="text-[11px] font-sans text-[#1C242B]/60">
                    Clique em <strong>Editar</strong> ou <strong>Excluir</strong> diretamente no card:
                  </span>
                </div>

                {pickerAvailableProducts.length === 0 ? (
                  <div className="p-6 text-center bg-[#F5F0E8]/50 border border-dashed border-[#071A2B]/20 rounded-xs text-xs text-[#1C242B]/60">
                    Nenhum produto cadastrado para os filtros selecionados de Categoria e Nicho.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-72 overflow-y-auto pr-1">
                    {pickerAvailableProducts.map((p) => {
                      const isBeingEdited = editingProductId === p.id;
                      return (
                        <div
                          key={p.id}
                          className={`p-3 rounded-xs border transition-all flex flex-col justify-between gap-3 ${
                            isBeingEdited
                              ? 'bg-amber-50/80 border-amber-400 ring-2 ring-amber-400/50 shadow-sm'
                              : 'bg-white border-[#071A2B]/10 hover:border-[#C89A4B]/50 hover:shadow-xs'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className="w-12 h-12 bg-[#F5F0E8]/40 border border-[#071A2B]/10 rounded-xs overflow-hidden shrink-0 flex items-center justify-center p-1">
                              {p.images[0] ? (
                                <img src={p.images[0]} alt={p.name} className="w-full h-full object-contain" />
                              ) : (
                                <ImageIcon className="w-5 h-5 text-gray-400" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 mb-1">
                                <span className="px-1.5 py-0.2 bg-[#071A2B]/5 text-[#071A2B] text-[8px] font-sans uppercase font-bold rounded-xs">
                                  {p.productType || 'Eletrodomésticos'}
                                </span>
                                {isBeingEdited && (
                                  <span className="px-1.5 py-0.2 bg-amber-200 text-amber-900 text-[8px] font-sans uppercase font-bold rounded-xs">
                                    Editando
                                  </span>
                                )}
                              </div>
                              <h5 className="font-serif text-xs font-semibold text-[#071A2B] line-clamp-1" title={p.name}>
                                {p.name}
                              </h5>
                              <span className="text-[11px] font-sans text-[#8A6726] font-semibold block mt-0.5">
                                {p.priceRangeLabel || `R$ ${p.price.toFixed(2).replace('.', ',')}`}
                              </span>
                            </div>
                          </div>

                          <div className="pt-2 border-t border-[#071A2B]/10 flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => handleStartEdit(p)}
                              className={`px-3 py-1.5 rounded-xs text-[11px] font-sans uppercase font-semibold tracking-wider flex items-center gap-1 transition-colors ${
                                isBeingEdited
                                  ? 'bg-[#071A2B] text-[#E0B866]'
                                  : 'bg-[#071A2B]/5 hover:bg-[#071A2B] text-[#071A2B] hover:text-[#F5F0E8]'
                              }`}
                            >
                              <Edit3 className="w-3 h-3" />
                              <span>{isBeingEdited ? 'No Formulário' : 'Editar'}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setProductToDelete(p)}
                              className="px-3 py-1.5 bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white border border-rose-200 hover:border-rose-600 rounded-xs text-[11px] font-sans uppercase font-semibold tracking-wider flex items-center gap-1 transition-colors"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>Excluir</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Form Left (col-span-8) */}
              <form
                onSubmit={handleSaveProduct}
                className="lg:col-span-8 bg-white border border-[#071A2B]/10 rounded-xs p-6 sm:p-8 shadow-xs space-y-8"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#071A2B]/10">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2.5 py-0.5 text-[10px] font-sans font-medium uppercase tracking-[0.16em] rounded-xs ${
                        editingProductId
                          ? 'bg-amber-100 text-amber-900 border border-amber-300'
                          : 'bg-[#071A2B]/10 text-[#071A2B]'
                      }`}>
                        {editingProductId ? 'Modo de Edição' : 'Novo Cadastro'}
                      </span>
                    </div>
                    <h2 className="font-serif text-xl sm:text-2xl text-[#071A2B] font-normal">
                      {editingProductId ? `Editar: ${name || 'Produto'}` : 'Cadastrar Novo Produto'}
                    </h2>
                    <p className="font-sans text-xs text-[#1C242B]/60 mt-1">
                      {editingProductId
                        ? 'Atualize os dados, fotos, links ou preço deste produto cadastrado na loja.'
                        : 'Preencha os campos obrigatórios para publicar o item no catálogo da Dona Héstia.'}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {editingProductId && (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            const currentProd = products.find((p) => p.id === editingProductId);
                            if (currentProd) setProductToDelete(currentProd);
                          }}
                          className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 border border-rose-300 text-rose-700 text-xs font-sans uppercase tracking-wider rounded-xs flex items-center gap-1.5 transition-colors font-medium shadow-2xs"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Excluir Produto</span>
                        </button>

                        <button
                          type="button"
                          onClick={handleClearForm}
                          className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-sans uppercase tracking-wider rounded-xs transition-colors"
                        >
                          Cancelar Edição
                        </button>
                      </>
                    )}
                  </div>
                </div>

              {/* SECTION: CATEGORY MANAGEMENT */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-sans uppercase tracking-[0.16em] text-[#071A2B] font-semibold">
                    1. Gerenciamento de Categoria <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowNewCategoryModal(true)}
                    className="text-xs font-sans text-[#8A6726] hover:text-[#071A2B] flex items-center gap-1 font-medium hover:underline"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Criar Nova Categoria</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-sans text-[#1C242B]/70 mb-1">
                      Selecionar Categoria Existente
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full bg-[#F5F0E8]/50 border border-[#071A2B]/20 text-[#071A2B] px-3.5 py-2.5 rounded-xs text-xs sm:text-sm focus:outline-hidden focus:border-[#C89A4B]"
                    >
                      {categories.map((cat) => (
                        <option key={cat.slug} value={cat.slug}>
                          {cat.name} ({cat.slug})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-sans text-[#1C242B]/70 mb-1">
                      Tipo de Produto (Subcategoria)
                    </label>
                    <input
                      type="text"
                      value={productType}
                      onChange={(e) => setProductType(e.target.value)}
                      placeholder="Ex: Panela de Pressão Elétrica, Cafeteira, Fritadeira..."
                      className="w-full bg-[#F5F0E8]/50 border border-[#071A2B]/20 text-[#071A2B] px-3.5 py-2.5 rounded-xs text-xs sm:text-sm focus:outline-hidden focus:border-[#C89A4B]"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION: PRODUCT DETAILS */}
              <div className="space-y-4 pt-4 border-t border-[#071A2B]/10">
                <label className="block text-xs font-sans uppercase tracking-[0.16em] text-[#071A2B] font-semibold">
                  2. Dados do Produto <span className="text-rose-500">*</span>
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-sans text-[#1C242B]/70 mb-1">
                      Nome do Produto <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Ex: Panela de Pressão Elétrica Digital 5 Litros Kian Preta"
                      required
                      className="w-full bg-[#F5F0E8]/50 border border-[#071A2B]/20 text-[#071A2B] px-3.5 py-2.5 rounded-xs text-xs sm:text-sm focus:outline-hidden focus:border-[#C89A4B]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-sans text-[#1C242B]/70 mb-1">
                      Marca do Fabricante
                    </label>
                    <input
                      type="text"
                      value={brand}
                      onChange={(e) => setBrand(e.target.value)}
                      placeholder="Ex: Kian, Dona Héstia, Multilaser"
                      className="w-full bg-[#F5F0E8]/50 border border-[#071A2B]/20 text-[#071A2B] px-3.5 py-2.5 rounded-xs text-xs sm:text-sm focus:outline-hidden focus:border-[#C89A4B]"
                    />
                  </div>
                </div>

                {/* Descriptions */}
                <div>
                  <label className="block text-[11px] font-sans text-[#1C242B]/70 mb-1">
                    Descrição Curta (Exibida nos cards de produtos e resumos)
                  </label>
                  <textarea
                    rows={2}
                    value={shortDescription}
                    onChange={(e) => setShortDescription(e.target.value)}
                    placeholder="Breve resumo comercial com os principais diferenciais do produto..."
                    className="w-full bg-[#F5F0E8]/50 border border-[#071A2B]/20 text-[#071A2B] px-3.5 py-2.5 rounded-xs text-xs sm:text-sm focus:outline-hidden focus:border-[#C89A4B]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-sans text-[#1C242B]/70 mb-1">
                    Descrição Detalhada do Produto (Página oficial de presell)
                  </label>
                  <textarea
                    rows={4}
                    value={fullDescription}
                    onChange={(e) => setFullDescription(e.target.value)}
                    placeholder="Descrição aprofundada com os detalhes de uso, acabamento, segurança, tecnologia e valor para a rotina do lar..."
                    className="w-full bg-[#F5F0E8]/50 border border-[#071A2B]/20 text-[#071A2B] px-3.5 py-2.5 rounded-xs text-xs sm:text-sm focus:outline-hidden focus:border-[#C89A4B]"
                  />
                </div>

                {/* Features (Diferenciais) */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-sans text-[#1C242B]/70">
                      Diferenciais & Recursos Chave ({featuresList.length} adicionados)
                    </label>
                  </div>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={featureInput}
                      onChange={(e) => setFeatureInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddFeature();
                        }
                      }}
                      placeholder="Adicione um diferencial (ex: Cuba antiaderente removível de fácil limpeza)..."
                      className="flex-1 bg-[#F5F0E8]/50 border border-[#071A2B]/20 text-[#071A2B] px-3.5 py-2 rounded-xs text-xs focus:outline-hidden focus:border-[#C89A4B]"
                    />
                    <button
                      type="button"
                      onClick={handleAddFeature}
                      className="px-4 py-2 bg-[#071A2B] text-[#F5F0E8] text-xs font-sans uppercase tracking-wider rounded-xs hover:bg-[#C89A4B] transition-colors"
                    >
                      + Incluir
                    </button>
                  </div>
                  {featuresList.length > 0 && (
                    <ul className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                      {featuresList.map((item, idx) => (
                        <li
                          key={idx}
                          className="flex items-center justify-between gap-2 p-2 bg-[#F5F0E8]/40 border border-[#071A2B]/10 rounded-xs text-xs text-[#071A2B]"
                        >
                          <span className="truncate">&bull; {item}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveFeature(idx)}
                            className="text-rose-500 hover:text-rose-700 p-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              {/* SECTION: IMAGE UPLOAD / URL & PREVIEW */}
              <div className="space-y-4 pt-4 border-t border-[#071A2B]/10">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-sans uppercase tracking-[0.16em] text-[#071A2B] font-semibold">
                    3. Fotos do Produto & Visualização Prévia <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[11px] font-sans text-[#1C242B]/50">
                    {imageList.length} {imageList.length === 1 ? 'imagem cadastrada' : 'imagens cadastradas'}
                  </span>
                </div>

                {/* Upload or URL tabs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Option A: URL */}
                  <div className="p-4 bg-[#F5F0E8]/40 border border-[#071A2B]/15 rounded-xs space-y-2">
                    <span className="block text-xs font-sans font-medium text-[#071A2B] flex items-center gap-1.5">
                      <ImageIcon className="w-3.5 h-3.5 text-[#C89A4B]" />
                      Adicionar por Link / URL
                    </span>
                    <div className="flex gap-2">
                      <input
                        type="url"
                        value={imageUrlInput}
                        onChange={(e) => setImageUrlInput(e.target.value)}
                        placeholder="https://exemplo.com/foto.jpg"
                        className="flex-1 bg-white border border-[#071A2B]/20 text-[#071A2B] px-3 py-2 rounded-xs text-xs focus:outline-hidden focus:border-[#C89A4B]"
                      />
                      <button
                        type="button"
                        onClick={handleAddImageUrl}
                        className="px-3 py-2 bg-[#071A2B] text-[#F5F0E8] text-xs font-sans uppercase tracking-wider rounded-xs hover:bg-[#C89A4B] transition-colors shrink-0"
                      >
                        Adicionar
                      </button>
                    </div>
                  </div>

                  {/* Option B: Local File Upload */}
                  <div className="p-4 bg-[#F5F0E8]/40 border border-[#071A2B]/15 rounded-xs space-y-2">
                    <span className="block text-xs font-sans font-medium text-[#071A2B] flex items-center gap-1.5">
                      <Upload className="w-3.5 h-3.5 text-[#C89A4B]" />
                      Upload do Computador
                    </span>
                    <label className="block w-full py-2 px-3 border border-dashed border-[#C89A4B] hover:bg-[#C89A4B]/10 rounded-xs text-center cursor-pointer transition-colors text-xs text-[#8A6726] font-medium">
                      <span>Clique para selecionar foto local</span>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                {/* Thumbnails Gallery with preview */}
                {imageList.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-[11px] font-sans text-[#1C242B]/60">
                      A primeira foto será a <strong>imagem principal</strong> exibida nos cards do site. Clique em "Definir Principal" ou remova imagens indesejadas:
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {imageList.map((imgSrc, idx) => (
                        <div
                          key={idx}
                          className={`relative border rounded-xs overflow-hidden group bg-white p-2 shadow-xs ${
                            idx === 0 ? 'border-[#C89A4B] ring-2 ring-[#C89A4B]/30' : 'border-[#071A2B]/15'
                          }`}
                        >
                          <div className="aspect-square flex items-center justify-center overflow-hidden bg-[#F5F0E8]/30 mb-2">
                            <img
                              src={imgSrc}
                              alt={`Foto ${idx + 1}`}
                              className="w-full h-full object-contain"
                            />
                          </div>

                          <div className="flex items-center justify-between text-[10px]">
                            {idx === 0 ? (
                              <span className="px-1.5 py-0.5 bg-[#071A2B] text-[#E0B866] font-medium rounded-xs uppercase tracking-wider">
                                Principal
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleSetMainImage(idx)}
                                className="text-[#8A6726] hover:underline"
                              >
                                Tornar Principal
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => handleRemoveImage(idx)}
                              className="text-rose-500 hover:text-rose-700 p-1"
                              title="Remover foto"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="p-6 border border-dashed border-[#071A2B]/20 rounded-xs text-center text-xs text-[#1C242B]/50">
                    Nenhuma foto adicionada ainda. Adicione uma imagem por link ou faça upload direto para habilitar a pré-visualização.
                  </div>
                )}
              </div>

              {/* SECTION: STORE OF ORIGIN & REDIRECT AFFILIATE LINK */}
              <div className="space-y-4 pt-4 border-t border-[#071A2B]/10">
                <label className="block text-xs font-sans uppercase tracking-[0.16em] text-[#071A2B] font-semibold">
                  4. Loja de Origem & Link de Redirecionamento <span className="text-rose-500">*</span>
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[11px] font-sans text-[#1C242B]/70 mb-1 flex items-center gap-1.5">
                      <Store className="w-3.5 h-3.5 text-[#C89A4B]" />
                      Loja de Origem do Produto
                    </label>
                    <select
                      value={platform}
                      onChange={(e) => setPlatform(e.target.value)}
                      className="w-full bg-[#F5F0E8]/50 border border-[#071A2B]/20 text-[#071A2B] px-3.5 py-2.5 rounded-xs text-xs sm:text-sm focus:outline-hidden focus:border-[#C89A4B]"
                    >
                      <option value="Shopee">Shopee (Oficial)</option>
                      <option value="Amazon">Amazon Brasil</option>
                      <option value="Mercado Livre">Mercado Livre</option>
                      <option value="Magalu">Magazine Luiza</option>
                      <option value="AliExpress">AliExpress</option>
                      <option value="Dona Héstia">Loja Oficial Dona Héstia</option>
                      <option value="Outra">Outra Loja...</option>
                    </select>

                    {platform === 'Outra' && (
                      <input
                        type="text"
                        value={customPlatform}
                        onChange={(e) => setCustomPlatform(e.target.value)}
                        placeholder="Nome da loja personalizada..."
                        className="mt-2 w-full bg-[#F5F0E8]/50 border border-[#071A2B]/20 text-[#071A2B] px-3 py-2 rounded-xs text-xs"
                      />
                    )}
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-sans text-[#1C242B]/70 mb-1 flex items-center justify-between">
                      <span>Link de Redirecionamento (Afiliado ou Compra Direta) *</span>
                      {buyUrl && (
                        <a
                          href={buyUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#8A6726] hover:underline flex items-center gap-1 font-medium"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>Testar link</span>
                        </a>
                      )}
                    </label>
                    <input
                      type="url"
                      value={buyUrl}
                      onChange={(e) => setBuyUrl(e.target.value)}
                      placeholder="https://s.shopee.com.br/112vcBEklr"
                      required
                      className="w-full bg-[#F5F0E8]/50 border border-[#071A2B]/20 text-[#071A2B] px-3.5 py-2.5 rounded-xs text-xs sm:text-sm focus:outline-hidden focus:border-[#C89A4B]"
                    />
                    <p className="text-[10px] font-sans text-[#1C242B]/50 mt-1">
                      Ao clicar em "Comprar na Loja Oficial" na página do produto, o visitante será encaminhado diretamente para esta URL.
                    </p>
                  </div>
                </div>
              </div>

              {/* SECTION: RATING / EVALUATION */}
              <div className="space-y-4 pt-4 border-t border-[#071A2B]/10">
                <label className="block text-xs font-sans uppercase tracking-[0.16em] text-[#071A2B] font-semibold flex items-center gap-1.5">
                  <Star className="w-4 h-4 text-[#C89A4B] fill-[#C89A4B]" />
                  5. Pontuação / Avaliação do Produto
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                  <div>
                    <label className="block text-[11px] font-sans text-[#1C242B]/70 mb-1">
                      Nota de Avaliação (1 a 5 estrelas)
                    </label>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1 bg-[#F5F0E8] p-2 rounded-xs border border-[#071A2B]/15">
                        {[1, 2, 3, 4, 5].map((starVal) => (
                          <button
                            key={starVal}
                            type="button"
                            onClick={() => setRating(starVal)}
                            className="p-1 hover:scale-110 transition-transform"
                          >
                            <Star
                              className={`w-5 h-5 ${
                                rating >= starVal
                                  ? 'text-[#C89A4B] fill-[#C89A4B]'
                                  : rating >= starVal - 0.5
                                  ? 'text-[#C89A4B] fill-[#C89A4B]/50'
                                  : 'text-gray-300'
                              }`}
                            />
                          </button>
                        ))}
                      </div>

                      <input
                        type="number"
                        min="1"
                        max="5"
                        step="0.1"
                        value={rating}
                        onChange={(e) => setRating(parseFloat(e.target.value) || 5.0)}
                        className="w-20 bg-[#F5F0E8]/50 border border-[#071A2B]/20 text-[#071A2B] px-3 py-2 rounded-xs text-sm font-semibold text-center focus:outline-hidden focus:border-[#C89A4B]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-sans text-[#1C242B]/70 mb-1">
                      Quantidade de Avaliações / Avaliadores
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={reviewCount}
                      onChange={(e) => setReviewCount(parseInt(e.target.value, 10) || 0)}
                      placeholder="Ex: 348"
                      className="w-full bg-[#F5F0E8]/50 border border-[#071A2B]/20 text-[#071A2B] px-3.5 py-2.5 rounded-xs text-xs sm:text-sm focus:outline-hidden focus:border-[#C89A4B]"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION: PROMOTIONAL TAGS & BADGES */}
              <div className="space-y-4 pt-4 border-t border-[#071A2B]/10">
                <label className="block text-xs font-sans uppercase tracking-[0.16em] text-[#071A2B] font-semibold flex items-center gap-1.5">
                  <Tag className="w-4 h-4 text-[#C89A4B]" />
                  6. Tags / Elementos Promocionais & Selos
                </label>

                {/* Pre-made quick tags */}
                <div>
                  <span className="block text-[11px] font-sans text-[#1C242B]/70 mb-2">
                    Selos rápidos utilizados na plataforma:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {[
                      'Mais Vendido',
                      'Oferta Limitada',
                      'Destaque Oficial',
                      'Novo Lançamento',
                      'Praticidade Diária',
                      'Oferta Shopee',
                      'Frete Grátis',
                      'Melhor Avaliado',
                    ].map((tagItem) => {
                      const isSelected = badge === tagItem;
                      return (
                        <button
                          key={tagItem}
                          type="button"
                          onClick={() => {
                            setBadge(isSelected ? '' : tagItem);
                            setCustomBadge('');
                          }}
                          className={`px-3 py-1.5 text-xs rounded-xs font-sans uppercase tracking-wider transition-all border ${
                            isSelected
                              ? 'bg-[#071A2B] text-[#E0B866] border-[#C89A4B] font-semibold shadow-xs'
                              : 'bg-white hover:bg-[#F5F0E8] text-[#1C242B]/80 border-[#071A2B]/15'
                          }`}
                        >
                          {isSelected && '✓ '}
                          {tagItem}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-sans text-[#1C242B]/70 mb-1">
                    Ou digite uma Tag Personalizada
                  </label>
                  <input
                    type="text"
                    value={customBadge}
                    onChange={(e) => {
                      setCustomBadge(e.target.value);
                      if (e.target.value) setBadge('');
                    }}
                    placeholder="Ex: 40% OFF, Black Friday, Edição Especial..."
                    className="w-full bg-[#F5F0E8]/50 border border-[#071A2B]/20 text-[#071A2B] px-3.5 py-2 rounded-xs text-xs sm:text-sm focus:outline-hidden focus:border-[#C89A4B]"
                  />
                </div>
              </div>

              {/* SECTION: PRICE & COMMERCIAL DETAILS */}
              <div className="space-y-4 pt-4 border-t border-[#071A2B]/10">
                <label className="block text-xs font-sans uppercase tracking-[0.16em] text-[#071A2B] font-semibold">
                  7. Preço e Condições Comerciais
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[11px] font-sans text-[#1C242B]/70 mb-1">
                      Preço Atual / Promocional (R$) *
                    </label>
                    <input
                      type="text"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      placeholder="299.00"
                      required
                      className="w-full bg-[#F5F0E8]/50 border border-[#071A2B]/20 text-[#071A2B] px-3.5 py-2.5 rounded-xs text-xs sm:text-sm font-semibold focus:outline-hidden focus:border-[#C89A4B]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-sans text-[#1C242B]/70 mb-1">
                      Preço Original "De" (R$)
                    </label>
                    <input
                      type="text"
                      value={originalPrice}
                      onChange={(e) => setOriginalPrice(e.target.value)}
                      placeholder="349.00"
                      className="w-full bg-[#F5F0E8]/50 border border-[#071A2B]/20 text-[#071A2B] px-3.5 py-2.5 rounded-xs text-xs sm:text-sm focus:outline-hidden focus:border-[#C89A4B]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-sans text-[#1C242B]/70 mb-1">
                      Faixa de Preço (Opcional)
                    </label>
                    <input
                      type="text"
                      value={priceRangeLabel}
                      onChange={(e) => setPriceRangeLabel(e.target.value)}
                      placeholder="R$ 299,00 a R$ 349,00"
                      className="w-full bg-[#F5F0E8]/50 border border-[#071A2B]/20 text-[#071A2B] px-3.5 py-2.5 rounded-xs text-xs sm:text-sm focus:outline-hidden focus:border-[#C89A4B]"
                    />
                  </div>
                </div>

                {/* Voltagem & Highlight */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-[11px] font-sans text-[#1C242B]/70 font-medium">
                        Voltagens Disponíveis <span className="text-[#1C242B]/50 font-normal">(Opcional)</span>
                      </label>
                      {voltages.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setVoltages([])}
                          className="text-[10px] text-rose-600 hover:underline"
                        >
                          Limpar seleção
                        </button>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {['127V', '220V', 'Bivolt'].map((volt) => {
                        const isChecked = voltages.includes(volt);
                        return (
                          <button
                            key={volt}
                            type="button"
                            onClick={() => {
                              if (isChecked) {
                                setVoltages(voltages.filter((v) => v !== volt));
                              } else {
                                setVoltages([...voltages, volt]);
                              }
                            }}
                            className={`px-3 py-1.5 text-xs rounded-xs font-sans border transition-all ${
                              isChecked
                                ? 'bg-[#071A2B] text-[#E0B866] border-[#071A2B] font-medium shadow-xs'
                                : 'bg-white text-[#1C242B]/70 border-[#071A2B]/20 hover:border-[#071A2B]/40'
                            }`}
                          >
                            {isChecked && '✓ '}
                            {volt}
                          </button>
                        );
                      })}

                      <button
                        type="button"
                        onClick={() => setVoltages([])}
                        className={`px-3 py-1.5 text-xs rounded-xs font-sans border transition-all ${
                          voltages.length === 0
                            ? 'bg-[#071A2B]/10 text-[#071A2B] border-[#071A2B]/30 font-medium'
                            : 'bg-transparent text-[#1C242B]/50 border-dashed border-[#071A2B]/20 hover:text-[#071A2B]'
                        }`}
                      >
                        {voltages.length === 0 ? '✓ Sem voltagem (Não se aplica)' : 'Sem voltagem'}
                      </button>
                    </div>
                    <p className="text-[10px] font-sans text-[#1C242B]/50 mt-1.5">
                      O preenchimento da voltagem é totalmente opcional. Deixe em branco para produtos não-elétricos, utensílios ou decorativos.
                    </p>
                  </div>

                  <div className="flex items-center">
                    <label className="flex items-center gap-2 cursor-pointer mt-4">
                      <input
                        type="checkbox"
                        checked={highlight}
                        onChange={(e) => setHighlight(e.target.checked)}
                        className="w-4 h-4 rounded-xs border-[#C89A4B] text-[#071A2B] focus:ring-[#C89A4B]"
                      />
                      <span className="text-xs font-sans text-[#071A2B] font-medium">
                        Destacar na Seção Especial da Página Inicial
                      </span>
                    </label>
                  </div>
                </div>
              </div>

              {/* SUBMIT BUTTONS */}
              <div className="pt-6 border-t border-[#071A2B]/10 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={handleClearForm}
                    className="w-full sm:w-auto px-5 py-3 border border-[#071A2B]/20 text-[#071A2B] text-xs font-sans uppercase tracking-[0.16em] rounded-xs hover:bg-[#071A2B]/5 transition-colors font-medium"
                  >
                    {editingProductId ? 'Cancelar Edição' : 'Limpar Campos'}
                  </button>

                  {editingProductId && (
                    <button
                      type="button"
                      onClick={() => {
                        const currentProd = products.find((p) => p.id === editingProductId);
                        if (currentProd) setProductToDelete(currentProd);
                      }}
                      className="w-full sm:w-auto px-4 py-3 bg-rose-50 border border-rose-300 text-rose-700 hover:bg-rose-100 text-xs font-sans uppercase tracking-[0.16em] rounded-xs transition-colors flex items-center justify-center gap-1.5 font-medium"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Excluir Produto</span>
                    </button>
                  )}
                </div>

                <div className="w-full sm:w-auto flex items-center gap-3">
                  <button
                    type="submit"
                    className="w-full sm:w-auto px-8 py-3.5 bg-[#071A2B] hover:bg-[#C89A4B] text-[#F5F0E8] hover:text-[#071A2B] text-xs font-sans tracking-[0.2em] uppercase font-semibold rounded-xs transition-colors duration-200 shadow-md flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{editingProductId ? 'Salvar Alterações no Produto' : 'Publicar Produto no Site'}</span>
                  </button>
                </div>
              </div>
            </form>

            {/* Live Interactive Preview Card Right (col-span-4) */}
            <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-28">
              <div className="bg-white border border-[#071A2B]/10 rounded-xs p-6 shadow-xs">
                <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#071A2B]/10">
                  <span className="text-[10px] font-sans font-medium uppercase tracking-[0.2em] text-[#C89A4B] flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" />
                    Pré-visualização em Tempo Real
                  </span>
                  <span className="text-[10px] font-sans text-[#1C242B]/40">Card da Loja</span>
                </div>

                {/* Simulated Product Card */}
                <div className="flex flex-col bg-white border border-[#071A2B]/15 rounded-xs overflow-hidden shadow-xs">
                  {/* Image container */}
                  <div className="relative aspect-square bg-[#F5F0E8]/50 overflow-hidden flex items-center justify-center p-6">
                    {imageList[0] ? (
                      <img
                        src={imageList[0]}
                        alt={name || 'Produto'}
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <div className="text-center text-xs text-[#1C242B]/40">
                        <ImageIcon className="w-10 h-10 mx-auto mb-2 text-[#C89A4B]/40" />
                        <span>Sem imagem definida</span>
                      </div>
                    )}

                    {(customBadge || badge) && (
                      <div className="absolute top-3 left-3">
                        <span className="inline-block px-2.5 py-1 bg-[#071A2B] text-[#E0B866] text-[9px] font-sans font-medium uppercase tracking-[0.2em] rounded-xs border border-[#C89A4B]/30">
                          {customBadge || badge}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-5 flex flex-col justify-between bg-white">
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className="text-[10px] font-sans font-medium uppercase tracking-[0.2em] text-[#C89A4B]">
                          {categories.find((c) => c.slug === category)?.name || 'COZINHA'}
                        </span>
                        <span className="text-[10px] font-sans text-[#1C242B]/50 truncate">
                          {brand || 'Dona Héstia'}
                        </span>
                      </div>

                      <h3 className="font-serif text-base text-[#071A2B] font-medium leading-snug line-clamp-2 mb-2">
                        {name || 'Nome do Produto Aparecerá Aqui'}
                      </h3>

                      {/* Rating row */}
                      <div className="flex items-center gap-1.5 mb-2">
                        <div className="flex items-center">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star
                              key={s}
                              className={`w-3 h-3 ${
                                rating >= s ? 'text-[#C89A4B] fill-[#C89A4B]' : 'text-gray-300'
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-[11px] font-sans font-semibold text-[#071A2B]">
                          {rating.toFixed(1)}
                        </span>
                        <span className="text-[10px] font-sans text-[#1C242B]/50">
                          ({reviewCount})
                        </span>
                      </div>

                      <p className="font-sans text-xs text-[#1C242B]/65 line-clamp-2 leading-relaxed mb-4 font-light">
                        {shortDescription || 'A descrição detalhada e resumida será exibida nesta área.'}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-[#071A2B]/10 flex items-end justify-between">
                      <div>
                        {priceRangeLabel ? (
                          <>
                            <span className="block text-[9px] font-sans uppercase text-[#8A6726]">
                              Preço aproximado
                            </span>
                            <span className="font-sans text-base font-semibold text-[#071A2B]">
                              {priceRangeLabel}
                            </span>
                          </>
                        ) : (
                          <>
                            {originalPrice && (
                              <span className="block text-[10px] font-sans text-[#1C242B]/40 line-through">
                                R$ {originalPrice}
                              </span>
                            )}
                            <span className="font-sans text-lg font-semibold text-[#071A2B]">
                              R$ {price || '0,00'}
                            </span>
                          </>
                        )}
                        <span className="block text-[9px] font-sans text-[#1C242B]/50">
                          Oferta {customPlatform || platform}
                        </span>
                      </div>

                      <span className="px-3 py-1.5 bg-[#071A2B] text-[#F5F0E8] text-[10px] font-sans tracking-wider uppercase rounded-xs font-medium">
                        Ver
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-[#071A2B]/10 text-center">
                  <p className="text-[11px] font-sans text-[#1C242B]/60 leading-relaxed">
                    Link de redirecionamento configurado:
                    <br />
                    <span className="text-[#8A6726] font-medium break-all">{buyUrl || 'Nenhum'}</span>
                  </p>
                </div>
              </div>

              {/* Quick Products List for Direct Edit / Delete */}
              <div className="bg-white border border-[#071A2B]/10 rounded-xs p-5 shadow-xs">
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#071A2B]/10">
                  <span className="text-[11px] font-sans font-semibold uppercase tracking-[0.16em] text-[#071A2B] flex items-center gap-1.5">
                    <ShoppingBag className="w-3.5 h-3.5 text-[#C89A4B]" />
                    Produtos na Loja ({products.length})
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveTab('catalog')}
                    className="text-[10px] font-sans text-[#8A6726] hover:underline font-medium"
                  >
                    Ver tabela &rarr;
                  </button>
                </div>

                <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                  {products.map((p) => {
                    const isSelected = editingProductId === p.id;
                    return (
                      <div
                        key={p.id}
                        className={`p-2.5 rounded-xs border transition-all flex items-center justify-between gap-3 ${
                          isSelected
                            ? 'bg-[#C89A4B]/10 border-[#C89A4B] ring-1 ring-[#C89A4B]'
                            : 'bg-[#F5F0E8]/30 border-[#071A2B]/10 hover:border-[#071A2B]/25'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-10 h-10 bg-white border border-[#071A2B]/10 rounded-xs overflow-hidden shrink-0 flex items-center justify-center p-0.5">
                            {p.images[0] ? (
                              <img src={p.images[0]} alt={p.name} className="w-full h-full object-contain" />
                            ) : (
                              <ImageIcon className="w-4 h-4 text-gray-400" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <span className="font-serif text-xs font-medium text-[#071A2B] block truncate">
                              {p.name}
                            </span>
                            <span className="text-[10px] font-sans text-[#1C242B]/60">
                              R$ {p.price.toFixed(2).replace('.', ',')} &bull; {p.platform || 'Shopee'}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleStartEdit(p)}
                            title="Editar este produto"
                            className={`p-1.5 rounded-xs transition-colors flex items-center gap-1 text-[11px] font-sans font-medium ${
                              isSelected
                                ? 'bg-[#071A2B] text-[#E0B866]'
                                : 'text-[#8A6726] hover:bg-[#C89A4B]/20'
                            }`}
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Editar</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setProductToDelete(p)}
                            title="Excluir este produto"
                            className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-xs transition-colors flex items-center gap-1 text-[11px] font-sans font-medium"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Excluir</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 2: REGISTERED PRODUCTS CATALOG */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'catalog' && (
          <div className="bg-white border border-[#071A2B]/10 rounded-xs p-6 sm:p-8 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#071A2B]/10">
              <div>
                <h2 className="font-serif text-xl sm:text-2xl text-[#071A2B] font-normal">
                  Gerenciamento de Produtos Cadastrados ({products.length})
                </h2>
                <p className="font-sans text-xs text-[#1C242B]/60 mt-1">
                  Selecione qualquer produto para <strong>editar informações e fotos</strong> ou <strong>excluí-lo permanentemente</strong> da loja.
                </p>
              </div>

              {/* Search, Category and Niche Filters */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                {/* 1. Categoria */}
                <select
                  value={selectedCatalogCategory}
                  onChange={(e) => setSelectedCatalogCategory(e.target.value)}
                  className="bg-[#F5F0E8]/50 border border-[#071A2B]/20 text-[#071A2B] px-3 py-2 rounded-xs text-xs font-sans focus:outline-hidden focus:border-[#C89A4B] font-medium"
                >
                  <option value="all">Todas as Categorias ({products.length})</option>
                  {categories.map((c) => (
                    <option key={c.slug} value={c.slug}>
                      {c.name}
                    </option>
                  ))}
                </select>

                {/* 2. Tipo de Produto / Nicho */}
                <select
                  value={selectedCatalogNiche}
                  onChange={(e) => setSelectedCatalogNiche(e.target.value)}
                  className="bg-[#F5F0E8]/50 border border-[#071A2B]/20 text-[#071A2B] px-3 py-2 rounded-xs text-xs font-sans focus:outline-hidden focus:border-[#C89A4B] font-medium"
                >
                  <option value="all">Todos os Nichos</option>
                  {catalogAvailableNiches.map((niche) => (
                    <option key={niche} value={niche}>
                      {niche} {niche === 'Eletrodomésticos' ? '(Padrão Atual)' : ''}
                    </option>
                  ))}
                </select>

                {/* 3. Busca */}
                <div className="relative w-full sm:w-60">
                  <Search className="w-4 h-4 text-[#1C242B]/40 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchCatalogQuery}
                    onChange={(e) => setSearchCatalogQuery(e.target.value)}
                    placeholder="Filtrar por nome, marca ou loja..."
                    className="w-full bg-[#F5F0E8]/50 border border-[#071A2B]/20 text-[#071A2B] pl-9 pr-3.5 py-2 rounded-xs text-xs focus:outline-hidden focus:border-[#C89A4B]"
                  />
                </div>
              </div>
            </div>

            {/* Catalog Grid / Table */}
            <div className="mt-6 overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#071A2B]/15 text-[10px] font-sans uppercase tracking-[0.16em] text-[#8A6726]">
                    <th className="py-3 px-3">Produto</th>
                    <th className="py-3 px-3">Categoria &amp; Nicho</th>
                    <th className="py-3 px-3">Loja</th>
                    <th className="py-3 px-3">Preço</th>
                    <th className="py-3 px-3">Avaliação</th>
                    <th className="py-3 px-3">Selo / Tag</th>
                    <th className="py-3 px-3 text-right">Ações Rápidas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#071A2B]/10 text-xs">
                  {filteredCatalog.map((product) => (
                    <tr key={product.id} className="hover:bg-[#F5F0E8]/40 transition-colors">
                      {/* Product thumbnail & Name */}
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-white border border-[#071A2B]/10 rounded-xs overflow-hidden shrink-0 flex items-center justify-center p-1">
                            {product.images[0] ? (
                              <img
                                src={product.images[0]}
                                alt={product.name}
                                className="w-full h-full object-contain"
                              />
                            ) : (
                              <ImageIcon className="w-5 h-5 text-gray-400" />
                            )}
                          </div>
                          <div>
                            <span className="font-serif text-sm font-medium text-[#071A2B] block line-clamp-1">
                              {product.name}
                            </span>
                            <span className="text-[10px] font-sans text-[#1C242B]/50">
                              Marca: {product.brand} &bull; Slug: {product.slug}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Category & Niche */}
                      <td className="py-3.5 px-3">
                        <span className="block uppercase text-[11px] font-sans font-medium text-[#C89A4B]">
                          {product.categoryLabel || product.category}
                        </span>
                        <span className="inline-block mt-0.5 px-1.5 py-0.5 bg-[#071A2B]/5 text-[#071A2B] text-[9px] font-sans uppercase rounded-xs font-semibold">
                          {product.productType || 'Eletrodomésticos'}
                        </span>
                      </td>

                      {/* Store */}
                      <td className="py-3.5 px-3">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-xs bg-[#EE4D2D]/10 text-[#EE4D2D] font-medium text-[10px]">
                          {product.platform || 'Shopee'}
                        </span>
                      </td>

                      {/* Price */}
                      <td className="py-3.5 px-3 font-semibold text-[#071A2B]">
                        {product.priceRangeLabel || `R$ ${product.price.toFixed(2).replace('.', ',')}`}
                      </td>

                      {/* Rating */}
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-1 text-[#C89A4B]">
                          <Star className="w-3.5 h-3.5 fill-[#C89A4B]" />
                          <span className="font-semibold text-xs text-[#071A2B]">
                            {product.rating !== undefined ? product.rating.toFixed(1) : '5.0'}
                          </span>
                        </div>
                      </td>

                      {/* Badge */}
                      <td className="py-3.5 px-3">
                        {product.badge ? (
                          <span className="inline-block px-2 py-0.5 bg-[#071A2B] text-[#E0B866] text-[9px] font-sans uppercase tracking-wider rounded-xs">
                            {product.badge}
                          </span>
                        ) : (
                          <span className="text-[10px] text-gray-400">-</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* Edit button */}
                          <button
                            type="button"
                            onClick={() => handleStartEdit(product)}
                            title="Editar informações e preço deste produto"
                            className="px-3 py-1.5 bg-[#C89A4B]/20 hover:bg-[#C89A4B] text-[#8A6726] hover:text-[#071A2B] rounded-xs font-sans text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 transition-colors shadow-2xs"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Editar</span>
                          </button>

                          {/* Delete button */}
                          <button
                            type="button"
                            onClick={() => setProductToDelete(product)}
                            title="Excluir este produto da loja"
                            className="px-3 py-1.5 bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white rounded-xs font-sans text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 transition-colors border border-rose-200 hover:border-rose-600 shadow-2xs"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Excluir</span>
                          </button>

                          {/* Duplicate */}
                          <button
                            type="button"
                            onClick={() => {
                              const dup = duplicateProduct(product.id);
                              if (dup) {
                                setStatusMessage({
                                  type: 'success',
                                  text: `Produto "${dup.name}" duplicado com sucesso!`,
                                });
                                setTimeout(() => setStatusMessage(null), 3000);
                              }
                            }}
                            title="Duplicar produto"
                            className="p-1.5 text-sky-700 hover:text-sky-900 hover:bg-sky-50 rounded-xs transition-colors"
                          >
                            <Copy className="w-4 h-4" />
                          </button>

                          {/* Preview on live site */}
                          <button
                            type="button"
                            onClick={() => navigateTo(`/produto/${product.slug}`)}
                            title="Ver no site"
                            className="p-1.5 text-[#071A2B]/60 hover:text-[#071A2B] hover:bg-[#071A2B]/10 rounded-xs transition-colors"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredCatalog.length === 0 && (
                <div className="py-12 text-center text-xs text-[#1C242B]/50">
                  Nenhum produto encontrado para os filtros selecionados.
                </div>
              )}
            </div>

            {/* Reset to defaults helper */}
            <div className="mt-8 pt-6 border-t border-[#071A2B]/10 flex items-center justify-between">
              <span className="text-[11px] font-sans text-[#1C242B]/50">
                Os dados adicionados são preservados no armazenamento da plataforma.
              </span>
              <button
                type="button"
                onClick={() => setShowResetConfirmModal(true)}
                className="text-xs font-sans text-[#8A6726] hover:text-[#071A2B] flex items-center gap-1.5 hover:underline"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Restaurar Catálogo Padrão</span>
              </button>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 3: CATEGORIES MANAGER */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'categories' && (
          <div className="bg-white border border-[#071A2B]/10 rounded-xs p-6 sm:p-8 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#071A2B]/10">
              <div>
                <h2 className="font-serif text-xl sm:text-2xl text-[#071A2B] font-normal">
                  Gerenciamento de Categorias de Produtos
                </h2>
                <p className="font-sans text-xs text-[#1C242B]/60 mt-1">
                  Crie novas linhas e departamentos para organizar seus produtos na Dona Héstia.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowNewCategoryModal(true)}
                className="px-4 py-2.5 bg-[#071A2B] hover:bg-[#C89A4B] text-[#F5F0E8] hover:text-[#071A2B] text-xs font-sans uppercase tracking-[0.16em] font-medium rounded-xs transition-colors flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>Nova Categoria</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {categories.map((cat) => {
                const count = products.filter((p) => p.category === cat.slug).length;
                return (
                  <div
                    key={cat.slug}
                    className="border border-[#071A2B]/15 rounded-xs overflow-hidden bg-[#F5F0E8]/20 flex flex-col justify-between"
                  >
                    <div className="relative aspect-16/9 bg-[#071A2B] overflow-hidden">
                      <img
                        src={cat.imageUrl}
                        alt={cat.name}
                        className="w-full h-full object-cover opacity-80"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#071A2B] via-transparent to-transparent" />
                      <div className="absolute bottom-3 left-4 right-4">
                        <span className="text-[10px] font-sans font-medium uppercase tracking-[0.2em] text-[#E0B866]">
                          Linha de Produtos
                        </span>
                        <h3 className="font-serif text-lg text-white font-medium">
                          {cat.name}
                        </h3>
                      </div>
                    </div>

                    <div className="p-4 flex-1 flex flex-col justify-between">
                      <div>
                        <p className="text-xs font-sans text-[#1C242B]/80 font-light line-clamp-2 mb-2">
                          {cat.tagline || cat.description}
                        </p>
                      </div>

                      <div className="pt-3 border-t border-[#071A2B]/10 flex items-center justify-between text-xs">
                        <span className="font-sans text-[11px] text-[#1C242B]/60">
                          {count} {count === 1 ? 'produto associado' : 'produtos associados'}
                        </span>
                        <button
                          type="button"
                          onClick={() => navigateTo('/produtos', { category: cat.slug })}
                          className="text-[#8A6726] hover:text-[#071A2B] font-medium flex items-center gap-1 hover:underline"
                        >
                          <span>Ver na loja</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 4: SECURITY & ACCESS PASSWORD */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'security' && (
          <div className="bg-white border border-[#071A2B]/10 rounded-xs p-6 sm:p-8 shadow-xs max-w-2xl mx-auto space-y-6">
            <div className="flex items-center gap-3 pb-5 border-b border-[#071A2B]/10">
              <div className="w-10 h-10 rounded-full bg-[#071A2B] text-[#E0B866] flex items-center justify-center shrink-0">
                <Key className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-serif text-xl sm:text-2xl text-[#071A2B] font-normal">
                  Segurança &amp; Senha de Acesso
                </h2>
                <p className="font-sans text-xs text-[#1C242B]/60 mt-0.5">
                  Atualize a senha de acesso ao painel do desenvolvedor a qualquer momento.
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveNewPassword} className="space-y-5">
              <div>
                <label className="block text-xs font-sans uppercase tracking-wider text-[#071A2B] font-semibold mb-2">
                  Nova Senha de Acesso
                </label>
                <input
                  type="password"
                  value={newDevPassword}
                  onChange={(e) => setNewDevPassword(e.target.value)}
                  placeholder="Digite a nova senha desejada"
                  required
                  className="w-full bg-[#F5F0E8]/40 border border-[#071A2B]/20 text-[#071A2B] px-4 py-3 rounded-xs text-sm font-sans focus:outline-hidden focus:border-[#C89A4B] font-medium"
                />
                <p className="text-[11px] text-[#1C242B]/60 mt-2 font-sans">
                  A nova credencial entrará em vigor imediatamente para todos os acessos futuros.
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSavingNewPassword || !newDevPassword.trim()}
                  className="w-full sm:w-auto px-8 py-3 bg-[#071A2B] hover:bg-[#C89A4B] text-[#F5F0E8] hover:text-[#071A2B] text-xs font-sans uppercase tracking-[0.16em] rounded-xs font-semibold transition-colors flex items-center justify-center gap-2 shadow-xs disabled:opacity-50"
                >
                  <Key className="w-4 h-4" />
                  <span>{isSavingNewPassword ? 'Atualizando...' : 'Salvar Nova Senha'}</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* MODAL: CREATE NEW CATEGORY */}
        {/* ------------------------------------------------------------- */}
        {showNewCategoryModal && (
          <div className="fixed inset-0 z-50 bg-[#071A2B]/80 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white border border-[#071A2B]/20 rounded-xs p-6 sm:p-8 max-w-lg w-full shadow-2xl relative">
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#071A2B]/10">
                <h3 className="font-serif text-xl text-[#071A2B]">Criar Nova Categoria</h3>
                <button
                  type="button"
                  onClick={() => setShowNewCategoryModal(false)}
                  className="text-gray-400 hover:text-gray-700 text-lg leading-none"
                >
                  &times;
                </button>
              </div>

              <form onSubmit={handleCreateCategory} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-sans text-[#1C242B]/70 mb-1">
                    Nome da Categoria <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    placeholder="Ex: Sala de Estar, Cama & Banho, Iluminação, Café..."
                    required
                    className="w-full bg-[#F5F0E8]/50 border border-[#071A2B]/20 text-[#071A2B] px-3.5 py-2.5 rounded-xs text-xs sm:text-sm focus:outline-hidden focus:border-[#C89A4B]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-sans text-[#1C242B]/70 mb-1">
                    Frase de Destaque / Tagline
                  </label>
                  <input
                    type="text"
                    value={newCatTagline}
                    onChange={(e) => setNewCatTagline(e.target.value)}
                    placeholder="Ex: Conforto e elegância pensados para transformar seu lar."
                    className="w-full bg-[#F5F0E8]/50 border border-[#071A2B]/20 text-[#071A2B] px-3.5 py-2 rounded-xs text-xs sm:text-sm focus:outline-hidden focus:border-[#C89A4B]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-sans text-[#1C242B]/70 mb-1">
                    Descrição Detalhada
                  </label>
                  <textarea
                    rows={2}
                    value={newCatDesc}
                    onChange={(e) => setNewCatDesc(e.target.value)}
                    placeholder="Descrição da proposta dos produtos desta categoria..."
                    className="w-full bg-[#F5F0E8]/50 border border-[#071A2B]/20 text-[#071A2B] px-3.5 py-2 rounded-xs text-xs sm:text-sm focus:outline-hidden focus:border-[#C89A4B]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-sans text-[#1C242B]/70 mb-1">
                    URL da Imagem de Capa (Opcional)
                  </label>
                  <input
                    type="url"
                    value={newCatImage}
                    onChange={(e) => setNewCatImage(e.target.value)}
                    placeholder="https://images.unsplash.com/..."
                    className="w-full bg-[#F5F0E8]/50 border border-[#071A2B]/20 text-[#071A2B] px-3.5 py-2 rounded-xs text-xs sm:text-sm focus:outline-hidden focus:border-[#C89A4B]"
                  />
                </div>

                <div className="pt-4 border-t border-[#071A2B]/10 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowNewCategoryModal(false)}
                    className="px-4 py-2 border border-[#071A2B]/20 text-xs font-sans uppercase tracking-wider rounded-xs hover:bg-gray-50"
                  >
                    Cancelar
                  </button>

                  <button
                    type="submit"
                    className="px-6 py-2 bg-[#071A2B] hover:bg-[#C89A4B] text-[#F5F0E8] hover:text-[#071A2B] text-xs font-sans uppercase tracking-wider rounded-xs font-semibold transition-colors"
                  >
                    Salvar Categoria
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* MODAL: CONFIRM PRODUCT DELETION */}
        {/* ------------------------------------------------------------- */}
        {productToDelete && (
          <div className="fixed inset-0 z-50 bg-[#071A2B]/80 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white border border-[#071A2B]/20 rounded-xs p-6 sm:p-8 max-w-md w-full shadow-2xl relative">
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#071A2B]/10">
                <div className="flex items-center gap-2.5 text-rose-600">
                  <div className="w-9 h-9 rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center shrink-0">
                    <Trash2 className="w-5 h-5 text-rose-600" />
                  </div>
                  <div>
                    <h3 className="font-serif text-lg text-[#071A2B] font-medium">Excluir Produto</h3>
                    <span className="text-[11px] text-rose-600 font-sans block">Ação definitiva na loja</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setProductToDelete(null)}
                  className="text-gray-400 hover:text-gray-700 p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Product Info Card Preview */}
              <div className="p-3.5 bg-[#F5F0E8]/60 border border-[#071A2B]/15 rounded-xs mb-5 flex items-center gap-3">
                <div className="w-14 h-14 bg-white border border-[#071A2B]/10 rounded-xs overflow-hidden shrink-0 flex items-center justify-center p-1">
                  {productToDelete.images[0] ? (
                    <img
                      src={productToDelete.images[0]}
                      alt={productToDelete.name}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <ImageIcon className="w-6 h-6 text-gray-400" />
                  )}
                </div>
                <div className="min-w-0">
                  <span className="text-[9px] font-sans uppercase tracking-wider text-[#C89A4B] font-semibold block">
                    {productToDelete.categoryLabel || productToDelete.category}
                  </span>
                  <h4 className="font-serif text-xs font-semibold text-[#071A2B] line-clamp-1">
                    {productToDelete.name}
                  </h4>
                  <span className="text-[11px] font-sans text-[#1C242B]/70 block mt-0.5 font-medium">
                    {productToDelete.priceRangeLabel || `R$ ${productToDelete.price.toFixed(2).replace('.', ',')}`} &bull; {productToDelete.platform || 'Shopee'}
                  </span>
                </div>
              </div>

              <p className="text-xs text-[#1C242B]/75 font-sans leading-relaxed mb-6">
                Tem certeza de que deseja <strong>remover permanentemente</strong> o produto <strong className="text-[#071A2B]">"{productToDelete.name}"</strong>?
                Ele deixará de ser exibido na vitrine da loja, na busca e na página de detalhes.
              </p>

              <div className="pt-4 border-t border-[#071A2B]/10 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setProductToDelete(null)}
                  className="px-4 py-2.5 border border-[#071A2B]/20 text-[#071A2B] text-xs font-sans uppercase tracking-wider rounded-xs hover:bg-gray-50 font-medium transition-colors"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const deletedName = productToDelete.name;
                    const deletedId = productToDelete.id;
                    deleteProduct(deletedId);
                    if (editingProductId === deletedId) {
                      handleClearForm();
                    }
                    if (pickerProductId === deletedId) {
                      setPickerProductId('');
                    }
                    showToast(
                      'Produto Excluído com Sucesso!',
                      `O produto "${deletedName}" foi excluído e removido definitivamente do catálogo da loja.`,
                      'delete'
                    );
                    setProductToDelete(null);
                  }}
                  className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-sans uppercase tracking-wider rounded-xs font-semibold transition-colors flex items-center gap-1.5 shadow-sm"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Sim, Excluir Produto</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* MODAL: CONFIRM RESET TO DEFAULTS */}
        {/* ------------------------------------------------------------- */}
        {showResetConfirmModal && (
          <div className="fixed inset-0 z-50 bg-[#071A2B]/80 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white border border-[#071A2B]/20 rounded-xs p-6 sm:p-8 max-w-md w-full shadow-2xl relative">
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#071A2B]/10">
                <div className="flex items-center gap-2.5 text-amber-600">
                  <div className="w-9 h-9 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0">
                    <RefreshCw className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <h3 className="font-serif text-lg text-[#071A2B] font-medium">Restaurar Catálogo Padrão</h3>
                    <span className="text-[11px] text-amber-700 font-sans block">Reiniciar dados da loja</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowResetConfirmModal(false)}
                  className="text-gray-400 hover:text-gray-700 p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-xs text-[#1C242B]/75 font-sans leading-relaxed mb-6">
                Esta ação reverterá todos os produtos e categorias para a configuração inicial da Dona Héstia. Quaisquer novos produtos adicionados ou alterações manuais serão resetados. Deseja prosseguir?
              </p>

              <div className="pt-4 border-t border-[#071A2B]/10 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowResetConfirmModal(false)}
                  className="px-4 py-2.5 border border-[#071A2B]/20 text-[#071A2B] text-xs font-sans uppercase tracking-wider rounded-xs hover:bg-gray-50 font-medium transition-colors"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  onClick={() => {
                    resetToDefaults();
                    handleClearForm();
                    setStatusMessage({
                      type: 'success',
                      text: 'Catálogo restaurado com sucesso para as configurações originais da Dona Héstia.',
                    });
                    setTimeout(() => setStatusMessage(null), 3500);
                    setShowResetConfirmModal(false);
                  }}
                  className="px-5 py-2.5 bg-[#071A2B] hover:bg-[#C89A4B] text-[#F5F0E8] hover:text-[#071A2B] text-xs font-sans uppercase tracking-wider rounded-xs font-semibold transition-colors"
                >
                  Restaurar Agora
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
