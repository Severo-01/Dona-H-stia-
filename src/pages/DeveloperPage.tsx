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
  Download,
  LayoutGrid,
  List,
  Package,
  BarChart3,
  Link as LinkIcon,
  CheckCheck,
  Cloud,
  Grid,
  Radio,
  Wifi,
  DollarSign,
  Percent,
  CreditCard,
  HelpCircle,
  Calculator,
} from 'lucide-react';

import {
  saveDeveloperPasswordToSupabase,
  verifyDeveloperPasswordSecurely,
  DEFAULT_FALLBACK_PASSWORD,
  processImageFileForUpload,
} from '../lib/supabase';

const SESSION_AUTH_KEY = 'dona_hestia_dev_auth_v1';

function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

function parseCurrencyInput(val: string | number): number {
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  if (!val) return 0;
  let str = val.toString().replace(/[^\d.,]/g, '').trim();
  if (!str) return 0;
  if (str.includes('.') && str.includes(',')) {
    str = str.replace(/\./g, '').replace(',', '.');
  } else if (str.includes(',')) {
    str = str.replace(',', '.');
  }
  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
}

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
    importCatalog,
    syncWithCloud,
    isSyncingWithCloud,
    isAutoSavingToCloud,
    lastCloudSyncTime,
    isRealtimeActive,
    lastRealtimeEventTime,
  } = useProducts();

  const importFileInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const catFileInputRef = useRef<HTMLInputElement>(null);
  const [isImportingBackup, setIsImportingBackup] = useState(false);

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

  // Dynamic Conditional View Mode (Adicionar, Editar/Excluir, Catálogo/Categorias, Segurança/Backup)
  type MainAction = 'add_product' | 'manage_products' | 'catalog_categories' | 'security_backup';
  const [mainAction, setMainAction] = useState<MainAction>('manage_products');
  const [catalogSubTab, setCatalogSubTab] = useState<'products' | 'categories'>('products');
  const [catalogViewMode, setCatalogViewMode] = useState<'table' | 'grid'>('table');
  const [copiedAffiliateId, setCopiedAffiliateId] = useState<string | null>(null);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [searchCatalogQuery, setSearchCatalogQuery] = useState('');
  const [selectedCatalogCategory, setSelectedCatalogCategory] = useState<string>('all');
  const [selectedCatalogNiche, setSelectedCatalogNiche] = useState<string>('all');
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSavingProduct, setIsSavingProduct] = useState(false);

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
  const [slug, setSlug] = useState('');
  const [brand, setBrand] = useState('Dona Héstia');
  const [category, setCategory] = useState('cozinha');
  const [productType, setProductType] = useState('Eletrodomésticos');
  const [price, setPrice] = useState<string>('');
  const [originalPrice, setOriginalPrice] = useState<string>('');
  const [hasOriginalPrice, setHasOriginalPrice] = useState<boolean>(false);
  const [installmentText, setInstallmentText] = useState<string>('');
  const [priceRangeLabel, setPriceRangeLabel] = useState('');
  const [badge, setBadge] = useState('');
  const [customBadge, setCustomBadge] = useState('');
  const [rating, setRating] = useState<number>(4.9);
  const [reviewCount, setReviewCount] = useState<number>(120);
  const [shortDescription, setShortDescription] = useState('');
  const [fullDescription, setFullDescription] = useState('');
  const [platform, setPlatform] = useState('Shopee');
  const [customPlatform, setCustomPlatform] = useState('');
  const [buyUrl, setBuyUrl] = useState('');
  const [highlight, setHighlight] = useState(false);
  const [voltages, setVoltages] = useState<string[]>([]);

  // Images state
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [imageList, setImageList] = useState<string[]>([]);
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const [uploadProgressText, setUploadProgressText] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [showExternalUrlField, setShowExternalUrlField] = useState(false);
  const [isUploadingCatImage, setIsUploadingCatImage] = useState(false);

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
    setSlug(product.slug || generateSlug(product.name));
    setBrand(product.brand || 'Dona Héstia');
    setCategory(product.category);
    setProductType(product.productType || 'Eletrodomésticos');
    setPrice(product.price ? product.price.toString() : '');
    if (product.originalPrice && product.originalPrice > 0) {
      setOriginalPrice(product.originalPrice.toString());
      setHasOriginalPrice(true);
    } else {
      setOriginalPrice('');
      setHasOriginalPrice(false);
    }
    setInstallmentText(product.installmentText || '');
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

    setEditingProductId(product.id);
    setMainAction('manage_products');
    window.scrollTo({ top: 300, behavior: 'smooth' });
    showToast(
      'Produto Carregado',
      `O produto "${product.name}" está pronto para edição.`,
      'info'
    );
  };

  // Open Studio for new product
  const handleStartNewProduct = () => {
    handleClearForm();
    setEditingProductId(null);
    setMainAction('add_product');
    window.scrollTo({ top: 300, behavior: 'smooth' });
    showToast('Novo Produto', 'Preencha os campos para cadastrar e publicar um novo produto.', 'info');
  };

  // Quick copy affiliate URL
  const handleCopyAffiliateLink = (prod: Product) => {
    if (!prod.buyUrl) return;
    try {
      navigator.clipboard.writeText(prod.buyUrl);
      setCopiedAffiliateId(prod.id);
      showToast('Link Copiado!', `O link oficial de afiliado (${prod.platform || 'loja'}) foi copiado.`, 'info');
      setTimeout(() => setCopiedAffiliateId(null), 2500);
    } catch {
      // ignore
    }
  };

  // Reset/Clear form
  const handleClearForm = () => {
    setEditingProductId(null);
    setPickerProductId('');
    setName('');
    setSlug('');
    setBrand('Dona Héstia');
    setCategory(categories[0]?.slug || 'cozinha');
    setProductType('Eletrodomésticos');
    setPrice('');
    setOriginalPrice('');
    setHasOriginalPrice(false);
    setInstallmentText('');
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

  // Direct file upload with smart compression and preparation for Supabase
  const handleProcessFiles = async (files: FileList | File[]) => {
    if (!files || files.length === 0) return;
    setIsUploadingImages(true);
    setUploadProgressText(`Otimizando 0/${files.length} fotos...`);
    const newImages: string[] = [];
    let count = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith('image/')) continue;
      try {
        setUploadProgressText(`Otimizando ${i + 1}/${files.length}: ${file.name}...`);
        const result = await processImageFileForUpload(file, { maxWidth: 1200, maxHeight: 1200, quality: 0.85 });
        newImages.push(result.dataUrl);
        count++;
      } catch (err) {
        console.warn(`[Upload] Falha ao processar arquivo ${file.name}:`, err);
      }
    }

    if (newImages.length > 0) {
      setImageList((prev) => [...prev, ...newImages]);
      showToast(
        'Fotos Adicionadas!',
        `${count} foto(s) preparadas para salvar no Supabase!`,
        'success'
      );
    }
    setIsUploadingImages(false);
    setUploadProgressText('');
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleProcessFiles(e.target.files);
      e.target.value = '';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleProcessFiles(e.dataTransfer.files);
    }
  };

  // Direct file upload for Category
  const handleCategoryFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    if (!file.type.startsWith('image/')) return;

    try {
      setIsUploadingCatImage(true);
      const res = await processImageFileForUpload(file, { maxWidth: 1200, maxHeight: 800, quality: 0.85 });
      setNewCatImage(res.dataUrl);
      showToast('Imagem de Categoria Carregada!', 'Foto de capa da categoria preparada para o Supabase.', 'success');
    } catch (err) {
      console.warn('[Upload Categoria] Erro:', err);
    } finally {
      setIsUploadingCatImage(false);
      e.target.value = '';
    }
  };

  // Fallback direct upload reading via FileReader
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleProcessFiles(e.target.files);
    }
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
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setStatusMessage({ type: 'error', text: 'Por favor, preencha o Nome do Produto.' });
      return;
    }

    setIsSavingProduct(true);
    setStatusMessage(null);

    try {
      const numericPrice = parseCurrencyInput(price);
      if (numericPrice <= 0) {
        setStatusMessage({ type: 'error', text: 'Por favor, informe um Preço Atual válido (ex: 299,00).' });
        setIsSavingProduct(false);
        return;
      }
      const numericOriginalPrice = (hasOriginalPrice && originalPrice.trim())
        ? (parseCurrencyInput(originalPrice) > 0 ? parseCurrencyInput(originalPrice) : undefined)
        : undefined;

      const finalPlatform = customPlatform.trim() ? customPlatform.trim() : platform;
      const finalBadge = customBadge.trim() ? customBadge.trim() : badge;
      const finalSlug = slug.trim() ? generateSlug(slug.trim()) : generateSlug(name.trim());

      const selectedCategoryObj = categories.find((c) => c.slug === category || c.id === category);

      // Preserve existing product images if none provided in form so real photos are never lost
      const existingProduct = editingProductId ? products.find((p) => p.id === editingProductId || p.slug === editingProductId) : null;
      const finalImages = imageList.length > 0 ? imageList : (existingProduct?.images && existingProduct.images.length > 0 ? existingProduct.images : [
        '/images/kian_pressure_cooker_official_1790094832015.jpg',
      ]);

      const productPayload: Partial<Product> & { name: string; price: number } = {
        name: name.trim(),
        slug: finalSlug,
        brand: brand.trim() || 'Dona Héstia',
        category: category,
        categoryLabel: selectedCategoryObj?.name || 'Cozinha',
        productType: productType.trim() || 'Eletrodomésticos',
        price: numericPrice,
        originalPrice: numericOriginalPrice,
        installmentText: installmentText.trim() || undefined,
        priceRangeLabel: priceRangeLabel.trim() || undefined,
        badge: finalBadge || undefined,
        rating: rating,
        reviewCount: reviewCount,
        shortDescription: shortDescription.trim() || `${name.trim()} com excelente desempenho e acabamento premium.`,
        fullDescription: fullDescription.trim() || shortDescription.trim(),
        features: featuresList,
        images: finalImages,
        platform: finalPlatform,
        buyUrl: buyUrl.trim() || 'https://s.shopee.com.br/112vcBEklr',
        highlight: highlight,
        availableVoltages: voltages,
      };

      if (editingProductId) {
        const res = await updateProduct(editingProductId, productPayload);
        if (res.success && res.data) {
          showToast(
            'Alterações e URL Salvas na Nuvem!',
            `O produto "${res.data.name}", link oficial e URL (/produto/${res.data.slug}) foram salvos no Supabase para todos os visitantes!`,
            'success'
          );
          setEditingProductId(res.data.id);
          setPickerProductId(res.data.id);
          setSlug(res.data.slug);
        } else {
          showToast(
            res.success ? 'Produto Atualizado!' : 'Atenção ao Salvar na Nuvem',
            res.error
              ? `Salvo localmente. Aviso na nuvem: ${res.error}. Clique em Forçar Sincronização.`
              : 'Produto atualizado com sucesso.',
            res.success ? 'success' : 'info'
          );
        }
      } else {
        const res = await addProduct(productPayload);
        if (res.success && res.data) {
          showToast(
            'Produto Cadastrado e Salvo na Nuvem!',
            `O produto "${res.data.name}" foi publicado e sincronizado no Supabase para todos os visitantes!`,
            'success'
          );
          handleClearForm();
        } else {
          showToast(
            'Produto Cadastrado',
            res.error
              ? `Cadastrado localmente. Aviso na nuvem: ${res.error}.`
              : 'Produto cadastrado com sucesso.',
            'info'
          );
          handleClearForm();
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast('Erro ao Salvar Produto', msg, 'delete');
    } finally {
      setIsSavingProduct(false);
    }
  };

  // Add New Category Handler
  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    const res = await addCategory({
      name: newCatName.trim(),
      tagline: newCatTagline.trim(),
      description: newCatDesc.trim(),
      imageUrl: newCatImage.trim() || undefined,
    });

    if (res.data) {
      setCategory(res.data.slug);
    }
    setNewCatName('');
    setNewCatTagline('');
    setNewCatDesc('');
    setNewCatImage('');
    setShowNewCategoryModal(false);

    showToast(
      'Categoria Criada e Salva na Nuvem!',
      `A nova categoria foi criada e sincronizada automaticamente na nuvem Supabase!`,
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

  // Manual Cloud Sync Handler
  const handleSyncCloud = async () => {
    const res = await syncWithCloud();
    if (res.success) {
      showToast(
        'Nuvem Sincronizada!',
        'Todos os produtos e categorias foram sincronizados com a nuvem e estão ativos para todos os clientes da internet.',
        'success'
      );
    } else {
      showToast('Atenção ao Sincronizar', res.message, 'delete');
    }
  };

  // Export backup of full catalog (JSON)
  const handleExportBackup = () => {
    try {
      const backupData = {
        exportedAt: new Date().toISOString(),
        productsCount: products.length,
        categoriesCount: categories.length,
        products,
        categories,
      };

      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `dona_hestia_catalogo_backup_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      showToast(
        'Backup do Catálogo Baixado!',
        `O arquivo JSON com todos os ${products.length} produtos e ${categories.length} categorias foi salvo no seu computador.`,
        'success'
      );
    } catch {
      showToast('Erro ao Exportar', 'Não foi possível gerar o arquivo de backup.', 'delete');
    }
  };

  // Import backup file (JSON) and restore to store & Supabase cloud
  const handleImportBackupFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImportingBackup(true);
    const reader = new FileReader();

    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);

        let incomingProducts: Product[] = [];
        let incomingCategories: CategoryInfo[] | undefined;

        if (Array.isArray(parsed)) {
          incomingProducts = parsed;
        } else if (parsed && typeof parsed === 'object') {
          if (Array.isArray(parsed.products)) {
            incomingProducts = parsed.products;
          }
          if (Array.isArray(parsed.categories)) {
            incomingCategories = parsed.categories;
          }
        }

        if (!incomingProducts || incomingProducts.length === 0) {
          showToast(
            'Arquivo Inválido',
            'O arquivo selecionado não contém uma lista de produtos compatível.',
            'delete'
          );
          setIsImportingBackup(false);
          if (importFileInputRef.current) importFileInputRef.current.value = '';
          return;
        }

        const isValid = incomingProducts.every(
          (p) => typeof p === 'object' && p !== null && p.name && (p.price !== undefined || p.price === 0)
        );

        if (!isValid) {
          showToast(
            'Formato Inválido',
            'Os itens do arquivo não possuem os dados obrigatórios de produtos.',
            'delete'
          );
          setIsImportingBackup(false);
          if (importFileInputRef.current) importFileInputRef.current.value = '';
          return;
        }

        const res = await importCatalog(incomingProducts, incomingCategories);
        setIsImportingBackup(false);

        if (res.success) {
          showToast(
            'Backup Restaurado com Sucesso!',
            `${res.count} produtos foram importados e sincronizados com a nuvem Supabase em tempo real.`,
            'success'
          );
        } else {
          showToast('Atenção ao Importar', res.message, 'delete');
        }
      } catch {
        setIsImportingBackup(false);
        showToast(
          'Erro na Leitura do Arquivo',
          'Não foi possível interpretar o arquivo JSON. Certifique-se de que é um arquivo de backup válido.',
          'delete'
        );
      } finally {
        if (importFileInputRef.current) importFileInputRef.current.value = '';
      }
    };

    reader.onerror = () => {
      setIsImportingBackup(false);
      showToast('Erro ao Ler Arquivo', 'Ocorreu uma falha ao abrir o arquivo selecionado.', 'delete');
      if (importFileInputRef.current) importFileInputRef.current.value = '';
    };

    reader.readAsText(file);
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

  // Render Product Form & Real-time Live Preview (used in Add and Edit modes)
  const renderProductForm = (isEditing: boolean) => (
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
                isEditing
                  ? 'bg-amber-100 text-amber-900 border border-amber-300'
                  : 'bg-[#071A2B]/10 text-[#071A2B]'
              }`}>
                {isEditing ? 'Modo de Edição' : 'Novo Cadastro'}
              </span>
            </div>
            <h2 className="font-serif text-xl sm:text-2xl text-[#071A2B] font-normal">
              {isEditing ? `Editar: ${name || 'Produto'}` : 'Cadastrar Novo Produto'}
            </h2>
            <p className="font-sans text-xs text-[#1C242B]/60 mt-1">
              {isEditing
                ? 'Atualize os dados, fotos, links ou preço deste produto cadastrado na loja.'
                : 'Preencha os campos obrigatórios para publicar o item no catálogo da Dona Héstia.'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    const currentProd = products.find((p) => p.id === editingProductId);
                    if (currentProd) setProductToDelete(currentProd);
                  }}
                  className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 border border-rose-300 text-rose-700 text-xs font-sans uppercase tracking-wider rounded-xs flex items-center gap-1.5 transition-colors font-medium shadow-2xs cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Excluir Produto</span>
                </button>

                <button
                  type="button"
                  onClick={handleClearForm}
                  className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-sans uppercase tracking-wider rounded-xs transition-colors cursor-pointer"
                >
                  Cancelar Edição
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={handleClearForm}
                className="px-3.5 py-2 border border-[#071A2B]/20 text-[#071A2B] hover:bg-[#071A2B]/5 text-xs font-sans uppercase tracking-wider rounded-xs transition-colors font-medium cursor-pointer"
              >
                Limpar Campos
              </button>
            )}
          </div>
        </div>

        {/* SECTION 1: CATEGORY MANAGEMENT */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-sans uppercase tracking-[0.16em] text-[#071A2B] font-semibold">
              1. Gerenciamento de Categoria <span className="text-rose-500">*</span>
            </label>
            <button
              type="button"
              onClick={() => setShowNewCategoryModal(true)}
              className="text-xs font-sans text-[#8A6726] hover:text-[#071A2B] flex items-center gap-1 font-medium hover:underline cursor-pointer"
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
                Tipo de Produto (Subcategoria / Nicho)
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

        {/* SECTION 2: PRODUCT DETAILS */}
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

          {/* URL Amigável da Página do Produto (Slug) */}
          <div className="p-3 bg-[#071A2B]/5 border border-[#071A2B]/10 rounded-xs">
            <div className="flex items-center justify-between gap-2 mb-1">
              <label className="block text-[11px] font-sans text-[#071A2B] font-semibold flex items-center gap-1.5">
                <LinkIcon className="w-3.5 h-3.5 text-[#C89A4B]" />
                <span>URL Amigável da Página do Produto (Link no Site)</span>
              </label>
              <button
                type="button"
                onClick={() => setSlug(generateSlug(name))}
                className="text-[10px] font-sans text-[#8A6726] hover:text-[#071A2B] hover:underline font-medium cursor-pointer"
              >
                Gerar automático a partir do nome
              </button>
            </div>
            <div className="flex items-center rounded-xs overflow-hidden border border-[#071A2B]/20 bg-white">
              <span className="px-3 py-2 text-xs font-mono text-[#1C242B]/60 bg-[#F5F0E8]/70 border-r border-[#071A2B]/15 select-none">
                /produto/
              </span>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(generateSlug(e.target.value))}
                placeholder="ex-panela-pressao-eletrica-kian"
                className="flex-1 px-3 py-2 text-xs font-mono text-[#071A2B] focus:outline-hidden"
              />
            </div>
            <p className="text-[10px] font-sans text-[#1C242B]/55 mt-1">
              Link oficial no catálogo da loja: <span className="font-mono text-[#8A6726] font-semibold">/produto/{slug || generateSlug(name) || 'nome-do-produto'}</span>. Salvo no Supabase para todos os visitantes.
            </p>
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

          {/* Features */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[11px] font-sans text-[#1C242B]/70">
                Diferenciais &amp; Recursos Chave ({featuresList.length} adicionados)
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
                className="px-4 py-2 bg-[#071A2B] text-[#F5F0E8] text-xs font-sans uppercase tracking-wider rounded-xs hover:bg-[#C89A4B] transition-colors cursor-pointer"
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
                      className="text-rose-500 hover:text-rose-700 p-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* SECTION 3: IMAGE DIRECT UPLOAD & SUPABASE STORAGE */}
        <div className="space-y-4 pt-4 border-t border-[#071A2B]/10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
            <div>
              <label className="block text-xs font-sans uppercase tracking-[0.16em] text-[#071A2B] font-semibold flex items-center gap-1.5">
                <Upload className="w-3.5 h-3.5 text-[#C89A4B]" />
                3. Fotos do Produto &amp; Upload Direto no Supabase <span className="text-rose-500">*</span>
              </label>
              <p className="text-[11px] font-sans text-[#1C242B]/60 mt-0.5">
                Insira imagens por upload do seu dispositivo. Todas as fotos são salvas com segurança no banco de dados Supabase na nuvem.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-sans font-medium rounded-xs flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                Nuvem Supabase
              </span>
              <span className="text-[11px] font-sans text-[#1C242B]/60 font-medium">
                {imageList.length} {imageList.length === 1 ? 'foto' : 'fotos'}
              </span>
            </div>
          </div>

          {/* MAIN UPLOAD DROPZONE */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`relative p-6 sm:p-8 border-2 border-dashed rounded-xs text-center cursor-pointer transition-all ${
              isDragOver
                ? 'border-[#C89A4B] bg-[#C89A4B]/15 ring-4 ring-[#C89A4B]/20 scale-[1.01]'
                : 'border-[#C89A4B]/60 hover:border-[#C89A4B] bg-[#F5F0E8]/40 hover:bg-[#F5F0E8]/80'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileInputChange}
              className="hidden"
            />

            {isUploadingImages ? (
              <div className="flex flex-col items-center justify-center py-4 space-y-3">
                <div className="w-10 h-10 border-3 border-[#071A2B]/20 border-t-[#C89A4B] rounded-full animate-spin"></div>
                <div className="text-xs font-sans text-[#071A2B] font-medium">
                  {uploadProgressText || 'Processando fotos e preparando para o Supabase...'}
                </div>
                <p className="text-[10px] font-sans text-[#1C242B]/50">
                  Otimizando resolução e taxa de compressão WebP HD automaticamente.
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center space-y-2.5">
                <div className="w-12 h-12 rounded-full bg-[#071A2B] text-[#E0B866] flex items-center justify-center shadow-xs">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-sm font-sans font-semibold text-[#071A2B] block">
                    Clique para selecionar fotos ou arraste arquivos aqui
                  </span>
                  <span className="text-xs font-sans text-[#1C242B]/60 block mt-0.5">
                    Compatível com JPG, PNG, WebP e fotos direto da câmera do smartphone
                  </span>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-2 pt-1 text-[10px] font-sans text-[#8A6726]">
                  <span className="px-2 py-0.5 bg-white border border-[#071A2B]/10 rounded-xs">
                    ✓ Upload múltiplo simultâneo
                  </span>
                  <span className="px-2 py-0.5 bg-white border border-[#071A2B]/10 rounded-xs">
                    ✓ Compressão inteligente WebP HD
                  </span>
                  <span className="px-2 py-0.5 bg-white border border-[#071A2B]/10 rounded-xs">
                    ✓ Persistência permanente no banco Supabase
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Optional URL Toggle */}
          <div className="text-right">
            <button
              type="button"
              onClick={() => setShowExternalUrlField((prev) => !prev)}
              className="text-[11px] font-sans text-[#8A6726] hover:text-[#071A2B] underline cursor-pointer"
            >
              {showExternalUrlField
                ? '✕ Ocultar inserção por link URL externo'
                : '+ Prefere colar um link de imagem externo? (Opcional)'}
            </button>
          </div>

          {showExternalUrlField && (
            <div className="p-3.5 bg-[#F5F0E8]/50 border border-[#071A2B]/15 rounded-xs space-y-2">
              <span className="block text-xs font-sans font-medium text-[#071A2B] flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-[#C89A4B]" />
                Adicionar Foto por Link / URL da Web
              </span>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={imageUrlInput}
                  onChange={(e) => setImageUrlInput(e.target.value)}
                  placeholder="https://exemplo.com/foto-do-produto.jpg"
                  className="flex-1 bg-white border border-[#071A2B]/20 text-[#071A2B] px-3 py-2 rounded-xs text-xs focus:outline-hidden focus:border-[#C89A4B]"
                />
                <button
                  type="button"
                  onClick={handleAddImageUrl}
                  className="px-3.5 py-2 bg-[#071A2B] text-[#F5F0E8] text-xs font-sans uppercase tracking-wider rounded-xs hover:bg-[#C89A4B] transition-colors shrink-0 cursor-pointer"
                >
                  Adicionar
                </button>
              </div>
            </div>
          )}

          {/* Thumbnails Gallery */}
          {imageList.length > 0 ? (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-sans text-[#1C242B]/70">
                  A primeira foto será a <strong>foto principal (capa dos cards da loja)</strong>. Use o botão para definir a principal ou remover:
                </p>
                <button
                  type="button"
                  onClick={() => setImageList([])}
                  className="text-[11px] text-rose-600 hover:underline cursor-pointer"
                >
                  Limpar todas
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {imageList.map((imgSrc, idx) => (
                  <div
                    key={idx}
                    className={`relative border rounded-xs overflow-hidden group bg-white p-2.5 shadow-xs transition-all ${
                      idx === 0
                        ? 'border-[#C89A4B] ring-2 ring-[#C89A4B]/40 bg-[#FAF7F2]'
                        : 'border-[#071A2B]/15 hover:border-[#071A2B]/40'
                    }`}
                  >
                    <div className="aspect-square flex items-center justify-center overflow-hidden bg-white mb-2 rounded-xs border border-[#071A2B]/5">
                      <img
                        src={imgSrc}
                        alt={`Foto ${idx + 1}`}
                        className="w-full h-full object-contain"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5 text-[10px]">
                      <div className="flex items-center justify-between">
                        {idx === 0 ? (
                          <span className="px-2 py-0.5 bg-[#071A2B] text-[#E0B866] font-semibold rounded-xs uppercase tracking-wider text-[9px]">
                            ★ Principal (Capa)
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleSetMainImage(idx)}
                            className="px-2 py-0.5 bg-[#071A2B]/5 hover:bg-[#071A2B] text-[#8A6726] hover:text-[#E0B866] font-medium rounded-xs transition-colors cursor-pointer"
                          >
                            Tornar Principal
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleRemoveImage(idx)}
                          className="text-rose-500 hover:text-rose-700 p-1 cursor-pointer transition-colors"
                          title="Remover foto"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="flex items-center justify-between text-[9px] text-[#1C242B]/50 font-sans border-t border-[#071A2B]/5 pt-1">
                        <span>Foto #{idx + 1}</span>
                        <span className="text-emerald-700 font-medium flex items-center gap-0.5">
                          ✓ Banco Supabase
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-6 border border-dashed border-[#071A2B]/20 rounded-xs text-center text-xs text-[#1C242B]/50">
              Nenhuma foto cadastrada para este produto. Use a área de upload acima para enviar fotos do seu computador ou smartphone.
            </div>
          )}
        </div>

        {/* SECTION 4: STORE OF ORIGIN & REDIRECT AFFILIATE LINK */}
        <div className="space-y-4 pt-4 border-t border-[#071A2B]/10">
          <label className="block text-xs font-sans uppercase tracking-[0.16em] text-[#071A2B] font-semibold">
            4. Loja de Origem &amp; Link de Redirecionamento <span className="text-rose-500">*</span>
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

        {/* SECTION 5: RATING / EVALUATION */}
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
                      className="p-1 hover:scale-110 transition-transform cursor-pointer"
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

        {/* SECTION 6: PROMOTIONAL TAGS & BADGES */}
        <div className="space-y-4 pt-4 border-t border-[#071A2B]/10">
          <label className="block text-xs font-sans uppercase tracking-[0.16em] text-[#071A2B] font-semibold flex items-center gap-1.5">
            <Tag className="w-4 h-4 text-[#C89A4B]" />
            6. Tags / Elementos Promocionais &amp; Selos
          </label>

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
                    className={`px-3 py-1.5 text-xs rounded-xs font-sans uppercase tracking-wider transition-all border cursor-pointer ${
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

        {/* SECTION 7: PRICE & COMMERCIAL DETAILS REMODELED */}
        <div className="space-y-6 pt-5 border-t border-[#071A2B]/10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[#071A2B]/10">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#C89A4B]" />
                <label className="text-xs font-sans uppercase tracking-[0.16em] text-[#071A2B] font-bold">
                  7. Preço & Condições Comerciais
                </label>
              </div>
              <p className="text-xs font-sans text-[#1C242B]/60 mt-0.5">
                Defina o valor real de venda, escolha se haverá preço original riscado ("De R$ X") e informe as condições de parcelamento ou Pix.
              </p>
            </div>
            <div className="flex items-center gap-1.5 self-start sm:self-auto">
              <span className={`px-2.5 py-1 text-[10px] font-sans rounded-xs font-semibold uppercase tracking-wider ${
                hasOriginalPrice && parseCurrencyInput(originalPrice) > parseCurrencyInput(price)
                  ? 'bg-rose-100 text-rose-800 border border-rose-300'
                  : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
              }`}>
                {hasOriginalPrice && parseCurrencyInput(originalPrice) > parseCurrencyInput(price)
                  ? 'Oferta com Desconto ("De / Por")'
                  : 'Modo Preço Único'}
              </span>
            </div>
          </div>

          {/* MAIN PRICING GRID */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* CARD 1: PREÇO DE VENDA PRINCIPAL */}
            <div className="bg-white border-2 border-[#071A2B]/15 rounded-xs p-4 sm:p-5 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-sans uppercase tracking-wider text-[#071A2B] font-bold flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                    Preço de Venda / Preço Atual (R$) *
                  </label>
                  <span className="text-[10px] font-sans font-semibold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded-xs">
                    Obrigatório
                  </span>
                </div>
                <p className="text-[11px] font-sans text-[#1C242B]/60 mb-3">
                  Este é o valor real cobrado do cliente quando ele acessa o link oficial de afiliado.
                </p>

                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-sans font-bold text-[#071A2B]/60">
                    R$
                  </span>
                  <input
                    type="text"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="Ex: 249,90 ou 299.00"
                    required
                    className="w-full bg-[#F5F0E8]/40 border border-[#071A2B]/25 text-[#071A2B] pl-10 pr-3.5 py-3 rounded-xs text-base sm:text-lg font-bold font-sans focus:outline-hidden focus:border-[#C89A4B] focus:bg-white transition-all shadow-inner"
                  />
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-[#071A2B]/10 flex items-center justify-between">
                <span className="text-[11px] font-sans text-[#1C242B]/70">
                  Valor formatado na loja:
                </span>
                <span className="text-sm font-sans font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-xs border border-emerald-200">
                  {parseCurrencyInput(price) > 0
                    ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(parseCurrencyInput(price))
                    : 'R$ 0,00'}
                </span>
              </div>
            </div>

            {/* CARD 2: CONFIGURAÇÃO DE PREÇO ORIGINAL "DE" */}
            <div className={`border rounded-xs p-4 sm:p-5 transition-all flex flex-col justify-between ${
              hasOriginalPrice
                ? 'bg-[#FDFBF7] border-[#C89A4B]/40 shadow-xs'
                : 'bg-[#F5F0E8]/40 border-[#071A2B]/15'
            }`}>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-sans uppercase tracking-wider text-[#071A2B] font-bold flex items-center gap-1.5">
                    <Percent className="w-3.5 h-3.5 text-[#C89A4B]" />
                    Estratégia de Preço: Preço "De"
                  </label>
                  <span className="text-[10px] font-sans font-medium text-[#1C242B]/50 bg-white/80 px-1.5 py-0.5 rounded-xs border border-[#071A2B]/10">
                    100% Opcional
                  </span>
                </div>
                <p className="text-[11px] font-sans text-[#1C242B]/60 mb-3">
                  Escolha se este produto terá um valor anterior riscado ou apenas o preço único direto.
                </p>

                {/* SEGMENTED TOGGLE BUTTONS */}
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <button
                    type="button"
                    onClick={() => {
                      setHasOriginalPrice(false);
                      setOriginalPrice('');
                    }}
                    className={`py-2 px-3 text-xs font-sans rounded-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      !hasOriginalPrice
                        ? 'bg-[#071A2B] text-[#E0B866] font-semibold shadow-xs'
                        : 'bg-white text-[#1C242B]/70 border border-[#071A2B]/20 hover:bg-[#F5F0E8]'
                    }`}
                  >
                    {!hasOriginalPrice && <Check className="w-3.5 h-3.5" />}
                    <span>Preço Único (Sem "De")</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setHasOriginalPrice(true);
                      if (!originalPrice && parseCurrencyInput(price) > 0) {
                        // Preenche sugestão de +20% se vazio para facilitar
                        const suggested = Math.round(parseCurrencyInput(price) * 1.25);
                        setOriginalPrice(suggested.toString());
                      }
                    }}
                    className={`py-2 px-3 text-xs font-sans rounded-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      hasOriginalPrice
                        ? 'bg-[#071A2B] text-[#E0B866] font-semibold shadow-xs'
                        : 'bg-white text-[#1C242B]/70 border border-[#071A2B]/20 hover:bg-[#F5F0E8]'
                    }`}
                  >
                    {hasOriginalPrice && <Check className="w-3.5 h-3.5" />}
                    <span>Com Preço "De R$ X"</span>
                  </button>
                </div>

                {/* CONDITIONAL ORIGINAL PRICE INPUT */}
                {hasOriginalPrice ? (
                  <div className="space-y-2.5 pt-2 border-t border-[#071A2B]/10 animate-fadeIn">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-sans font-medium text-[#071A2B]">
                        Preço Original "De" (R$) — Digite qualquer valor:
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setHasOriginalPrice(false);
                          setOriginalPrice('');
                        }}
                        className="text-[10px] text-rose-600 hover:underline cursor-pointer"
                      >
                        Remover preço "De"
                      </button>
                    </div>

                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-sans font-bold text-[#071A2B]/60">
                        R$
                      </span>
                      <input
                        type="text"
                        value={originalPrice}
                        onChange={(e) => setOriginalPrice(e.target.value)}
                        placeholder="Ex: 349.00 ou qualquer valor X"
                        className="w-full bg-white border border-[#C89A4B]/50 text-[#071A2B] pl-10 pr-3.5 py-2.5 rounded-xs text-sm sm:text-base font-semibold focus:outline-hidden focus:border-[#C89A4B]"
                      />
                    </div>

                    {/* QUICK PERCENTAGE SHORTCUT BUTTONS */}
                    {parseCurrencyInput(price) > 0 && (
                      <div className="flex items-center flex-wrap gap-1.5 pt-1">
                        <span className="text-[10px] font-sans text-[#1C242B]/60 mr-1">
                          Atalhos rápidos:
                        </span>
                        {[15, 20, 30, 40, 50].map((pct) => {
                          const calculatedVal = Math.round(parseCurrencyInput(price) * (1 + pct / 100));
                          return (
                            <button
                              key={pct}
                              type="button"
                              onClick={() => setOriginalPrice(calculatedVal.toString())}
                              className="px-2 py-0.5 text-[10px] font-sans bg-white hover:bg-[#071A2B] hover:text-[#E0B866] text-[#071A2B] border border-[#071A2B]/20 rounded-xs transition-colors cursor-pointer"
                              title={`Calcular +${pct}% sobre o preço atual (R$ ${calculatedVal})`}
                            >
                              +{pct}% (R$ {calculatedVal})
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-3 bg-white/70 border border-emerald-200 rounded-xs text-[11px] font-sans text-emerald-800 leading-relaxed flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <strong>Modo Preço Único ativo:</strong> Este produto não exibirá nenhum valor riscado na loja. O cliente verá apenas o preço oficial de venda.
                    </div>
                  </div>
                )}
              </div>

              {/* DISCOUNT FEEDBACK BADGE */}
              {hasOriginalPrice && originalPrice && (
                <div className="mt-3 pt-3 border-t border-[#071A2B]/10">
                  {parseCurrencyInput(originalPrice) > parseCurrencyInput(price) && parseCurrencyInput(price) > 0 ? (
                    <div className="flex items-center justify-between text-[11px] font-sans bg-emerald-50 border border-emerald-200 text-emerald-800 p-2 rounded-xs">
                      <span>
                        Economia real: <strong>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(parseCurrencyInput(originalPrice) - parseCurrencyInput(price))}</strong>
                      </span>
                      <span className="font-bold bg-rose-600 text-white px-1.5 py-0.5 rounded-xs text-[10px]">
                        {Math.round(((parseCurrencyInput(originalPrice) - parseCurrencyInput(price)) / parseCurrencyInput(originalPrice)) * 100)}% OFF
                      </span>
                    </div>
                  ) : parseCurrencyInput(originalPrice) > 0 && parseCurrencyInput(price) > 0 ? (
                    <div className="text-[10px] font-sans text-amber-800 bg-amber-50 border border-amber-200 p-2 rounded-xs flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span>Para exibir desconto promocional, o preço "De" deve ser maior que o preço atual.</span>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          </div>

          {/* COMMERCIAL CONDITIONS & INSTALLMENTS ROW */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
            {/* CONDIÇÃO DE PARCELAMENTO */}
            <div className="bg-[#F5F0E8]/40 border border-[#071A2B]/15 rounded-xs p-4 sm:p-5">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-sans uppercase tracking-wider text-[#071A2B] font-bold flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-[#C89A4B]" />
                  Condição de Pagamento & Parcelamento (Opcional)
                </label>
                {installmentText && (
                  <button
                    type="button"
                    onClick={() => setInstallmentText('')}
                    className="text-[10px] text-rose-600 hover:underline cursor-pointer"
                  >
                    Limpar
                  </button>
                )}
              </div>
              <p className="text-[11px] font-sans text-[#1C242B]/60 mb-2.5">
                Texto exibido abaixo do preço no card e na página de detalhes.
              </p>

              <input
                type="text"
                value={installmentText}
                onChange={(e) => setInstallmentText(e.target.value)}
                placeholder="Ex: Em até 10x sem juros de R$ 29,90 ou À vista no Pix"
                className="w-full bg-white border border-[#071A2B]/20 text-[#071A2B] px-3.5 py-2.5 rounded-xs text-xs sm:text-sm focus:outline-hidden focus:border-[#C89A4B]"
              />

              {/* QUICK SUGGESTIONS */}
              <div className="flex items-center flex-wrap gap-1.5 mt-2.5">
                <span className="text-[10px] font-sans text-[#1C242B]/50 mr-1">Sugestões rápidas:</span>
                {parseCurrencyInput(price) > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      const par = (parseCurrencyInput(price) / 10).toFixed(2).replace('.', ',');
                      setInstallmentText(`Em até 10x de R$ ${par} sem juros`);
                    }}
                    className="px-2 py-1 text-[10px] font-sans bg-white hover:bg-[#071A2B] hover:text-[#E0B866] text-[#071A2B] border border-[#071A2B]/20 rounded-xs transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <Calculator className="w-3 h-3" />
                    <span>Calcular 10x sem juros</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setInstallmentText('Em até 12x no cartão de crédito')}
                  className="px-2 py-1 text-[10px] font-sans bg-white hover:bg-[#071A2B] hover:text-[#E0B866] text-[#071A2B] border border-[#071A2B]/20 rounded-xs transition-colors cursor-pointer"
                >
                  Em até 12x
                </button>
                <button
                  type="button"
                  onClick={() => setInstallmentText('À vista no Pix com 5% de desconto')}
                  className="px-2 py-1 text-[10px] font-sans bg-white hover:bg-[#071A2B] hover:text-[#E0B866] text-[#071A2B] border border-[#071A2B]/20 rounded-xs transition-colors cursor-pointer"
                >
                  À vista no Pix
                </button>
              </div>
            </div>

            {/* SELO / FAIXA DE PREÇO OPCIONAL */}
            <div className="bg-[#F5F0E8]/40 border border-[#071A2B]/15 rounded-xs p-4 sm:p-5">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-sans uppercase tracking-wider text-[#071A2B] font-bold flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-[#C89A4B]" />
                  Faixa de Preço ou Selo Adicional (Opcional)
                </label>
                {priceRangeLabel && (
                  <button
                    type="button"
                    onClick={() => setPriceRangeLabel('')}
                    className="text-[10px] text-rose-600 hover:underline cursor-pointer"
                  >
                    Remover selo
                  </button>
                )}
              </div>
              <p className="text-[11px] font-sans text-[#1C242B]/60 mb-2.5">
                Se preenchido, aparecerá como selo ao lado do preço (ex: "Oferta Relâmpago", "Menor Preço em 30 Dias").
              </p>

              <input
                type="text"
                value={priceRangeLabel}
                onChange={(e) => setPriceRangeLabel(e.target.value)}
                placeholder="Deixe vazio para usar apenas o preço exato da loja"
                className="w-full bg-white border border-[#071A2B]/20 text-[#071A2B] px-3.5 py-2.5 rounded-xs text-xs sm:text-sm focus:outline-hidden focus:border-[#C89A4B]"
              />

              <div className="flex items-center flex-wrap gap-1.5 mt-2.5">
                <span className="text-[10px] font-sans text-[#1C242B]/50 mr-1">Selos comuns:</span>
                {['Menor Preço em 30 dias', 'Oferta Relâmpago', 'Frete Grátis'].map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setPriceRangeLabel(tag)}
                    className="px-2 py-1 text-[10px] font-sans bg-white hover:bg-[#071A2B] hover:text-[#E0B866] text-[#071A2B] border border-[#071A2B]/20 rounded-xs transition-colors cursor-pointer"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* REAL-TIME COMMERCIAL SIMULATOR DISPLAY */}
          <div className="bg-white border-2 border-dashed border-[#C89A4B]/40 rounded-xs p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-sans uppercase tracking-wider text-[#071A2B] font-bold flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#C89A4B]" />
                Simulador do Bloco de Preço no Site:
              </span>
              <span className="text-[10px] font-sans text-[#1C242B]/50">
                Visualização exata de como o visitante verá
              </span>
            </div>

            <div className="bg-[#FDFBF7] border border-[#071A2B]/10 rounded-xs p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                {hasOriginalPrice && parseCurrencyInput(originalPrice) > 0 && (
                  <span className="block text-xs font-sans text-[#1C242B]/40 line-through">
                    De {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(parseCurrencyInput(originalPrice))}
                  </span>
                )}
                <div className="flex items-baseline flex-wrap gap-2.5 mt-0.5">
                  <span className="font-sans text-2xl font-bold text-[#071A2B] tracking-tight">
                    {parseCurrencyInput(price) > 0
                      ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(parseCurrencyInput(price))
                      : 'R$ 0,00'}
                  </span>
                  {hasOriginalPrice && parseCurrencyInput(originalPrice) > parseCurrencyInput(price) && parseCurrencyInput(price) > 0 && (
                    <span className="text-xs font-sans font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-xs border border-rose-200">
                      {Math.round(((parseCurrencyInput(originalPrice) - parseCurrencyInput(price)) / parseCurrencyInput(originalPrice)) * 100)}% OFF
                    </span>
                  )}
                  {priceRangeLabel && (
                    <span className="text-xs font-sans text-[#8A6726] bg-[#C89A4B]/10 px-2 py-0.5 rounded-xs font-medium">
                      {priceRangeLabel}
                    </span>
                  )}
                </div>
                <span className="block text-xs font-sans text-[#1C242B]/70 mt-1 font-medium">
                  {installmentText || (hasOriginalPrice ? 'À vista ou parcelado no cartão' : 'Valor promocional com cupons do dia')}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-3.5 py-1.5 bg-[#071A2B] text-[#E0B866] text-xs font-sans uppercase tracking-wider font-semibold rounded-xs shadow-xs">
                  Comprar na {customPlatform || platform}
                </span>
              </div>
            </div>
          </div>

          {/* VOLTAGEM & HIGHLIGHT ROW */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-[#071A2B]/10">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-[11px] font-sans text-[#1C242B]/70 font-medium">
                  Voltagens Disponíveis <span className="text-[#1C242B]/50 font-normal">(Opcional)</span>
                </label>
                {voltages.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setVoltages([])}
                    className="text-[10px] text-rose-600 hover:underline cursor-pointer"
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
                      className={`px-3 py-1.5 text-xs rounded-xs font-sans border transition-all cursor-pointer ${
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
                  className={`px-3 py-1.5 text-xs rounded-xs font-sans border transition-all cursor-pointer ${
                    voltages.length === 0
                      ? 'bg-[#071A2B]/10 text-[#071A2B] border-[#071A2B]/30 font-medium'
                      : 'bg-transparent text-[#1C242B]/50 border-dashed border-[#071A2B]/20 hover:text-[#071A2B]'
                  }`}
                >
                  {voltages.length === 0 ? '✓ Sem voltagem (Não se aplica)' : 'Sem voltagem'}
                </button>
              </div>
              <p className="text-[10px] font-sans text-[#1C242B]/50 mt-1.5">
                Deixe em branco para produtos não-elétricos, utensílios de mesa ou decoração.
              </p>
            </div>

            <div className="flex items-center">
              <label className="flex items-center gap-2.5 cursor-pointer mt-3 p-3 bg-white border border-[#071A2B]/15 rounded-xs w-full hover:border-[#C89A4B] transition-colors">
                <input
                  type="checkbox"
                  checked={highlight}
                  onChange={(e) => setHighlight(e.target.checked)}
                  className="w-4 h-4 rounded-xs border-[#C89A4B] text-[#071A2B] focus:ring-[#C89A4B]"
                />
                <div>
                  <span className="block text-xs font-sans text-[#071A2B] font-bold">
                    Destacar na Seção Especial da Página Inicial
                  </span>
                  <span className="block text-[10px] font-sans text-[#1C242B]/60">
                    O produto aparecerá no banner curado com grande destaque visual.
                  </span>
                </div>
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
              className="w-full sm:w-auto px-5 py-3 border border-[#071A2B]/20 text-[#071A2B] text-xs font-sans uppercase tracking-[0.16em] rounded-xs hover:bg-[#071A2B]/5 transition-colors font-medium cursor-pointer"
            >
              {isEditing ? 'Cancelar Edição' : 'Limpar Campos'}
            </button>

            {isEditing && (
              <button
                type="button"
                onClick={() => {
                  const currentProd = products.find((p) => p.id === editingProductId);
                  if (currentProd) setProductToDelete(currentProd);
                }}
                className="w-full sm:w-auto px-4 py-3 bg-rose-50 border border-rose-300 text-rose-700 hover:bg-rose-100 text-xs font-sans uppercase tracking-[0.16em] rounded-xs transition-colors flex items-center justify-center gap-1.5 font-medium cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Excluir Produto</span>
              </button>
            )}
          </div>

          <div className="w-full sm:w-auto flex items-center gap-3">
            <button
              type="submit"
              disabled={isSavingProduct}
              className="w-full sm:w-auto px-8 py-3.5 bg-[#071A2B] hover:bg-[#C89A4B] text-[#F5F0E8] hover:text-[#071A2B] text-xs font-sans tracking-[0.2em] uppercase font-semibold rounded-xs transition-colors duration-200 shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {isSavingProduct ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-[#E0B866]" />
                  <span>Salvando na Nuvem...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isEditing ? 'Salvar Alterações no Produto' : 'Publicar Produto no Site'}</span>
                </>
              )}
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

              <div className="pt-3 border-t border-[#071A2B]/10 flex items-center justify-between">
                <div>
                  <span className="block text-[10px] font-sans uppercase tracking-[0.14em] text-[#8A6726] font-semibold">
                    Curadoria Oficial
                  </span>
                  <span className="block text-[10px] font-sans text-[#1C242B]/50 mt-0.5">
                    Oferta {customPlatform || platform || 'Verificada'} &bull; Sem preço exposto
                  </span>
                </div>

                <span className="px-3 py-1.5 bg-[#071A2B] text-[#F5F0E8] text-[10px] font-sans tracking-wider uppercase rounded-xs font-semibold">
                  Ver oferta oficial
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
      </div>
    </div>
  );

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
        {/* ============================================================== */}
        {/* EXECUTIVE MANAGEMENT CONSOLE HEADER */}
        {/* ============================================================== */}
        <div className="bg-[#071A2B] text-[#F5F0E8] border border-[#C89A4B]/30 rounded-xs p-6 sm:p-8 mb-6 shadow-xl relative overflow-hidden">
          {/* Subtle warm ambient background glow */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-[#C89A4B]/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div>
              <h1 className="font-serif text-2xl sm:text-3xl lg:text-4xl text-[#F5F0E8] font-light tracking-tight">
                Painel de Gestão da Plataforma
              </h1>
              <p className="font-sans text-xs sm:text-sm text-[#F5F0E8]/70 mt-1 max-w-2xl leading-relaxed">
                Controle integral do catálogo Dona Héstia: gerencie produtos, links de afiliados, coleções e monitore a sincronização na nuvem em tempo real.
              </p>
            </div>

            {/* Top Action Buttons Group */}
            <div className="flex items-center flex-wrap gap-2.5">
              {/* Hidden file input for backup restoration */}
              <input
                type="file"
                ref={importFileInputRef}
                accept=".json,application/json"
                onChange={handleImportBackupFile}
                className="hidden"
              />

              <button
                type="button"
                onClick={handleStartNewProduct}
                className="px-4 py-2.5 bg-[#C89A4B] hover:bg-[#E0B866] text-[#071A2B] text-xs font-sans tracking-[0.14em] uppercase font-bold rounded-xs transition-all flex items-center gap-2 shadow-md hover:shadow-lg active:scale-98"
                title="Cadastrar e publicar um novo produto no catálogo"
              >
                <Plus className="w-4 h-4 text-[#071A2B]" />
                <span>+ Novo Produto</span>
              </button>

              <div className={`flex items-center gap-1.5 px-3 py-2 rounded-xs text-xs font-sans border ${
                isRealtimeActive
                  ? 'bg-emerald-950/70 border-emerald-500/50 text-emerald-300'
                  : 'bg-amber-950/70 border-amber-500/50 text-amber-300'
              }`}>
                <span className={`w-2 h-2 rounded-full ${isRealtimeActive ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`}></span>
                <span className="font-semibold">{isRealtimeActive ? 'Tempo Real Ativo' : 'Sincronizando...'}</span>
                <span className="opacity-60 hidden md:inline text-[10px]">(WebSocket Supabase)</span>
              </div>

              <button
                type="button"
                onClick={handleExportBackup}
                title="Baixar arquivo JSON com todos os produtos e categorias para backup"
                className="px-3.5 py-2.5 bg-white/10 hover:bg-white/20 text-[#F5F0E8] text-xs font-sans tracking-[0.12em] uppercase rounded-xs transition-colors flex items-center gap-1.5 border border-white/20"
              >
                <Download className="w-3.5 h-3.5 text-[#E0B866]" />
                <span>Backup</span>
              </button>

              <button
                type="button"
                onClick={() => importFileInputRef.current?.click()}
                disabled={isImportingBackup}
                title="Importar e restaurar produtos a partir de um arquivo JSON de backup"
                className="px-3.5 py-2.5 bg-white/10 hover:bg-white/20 text-[#F5F0E8] text-xs font-sans tracking-[0.12em] uppercase rounded-xs transition-colors flex items-center gap-1.5 border border-white/20 disabled:opacity-50"
              >
                {isImportingBackup ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Upload className="w-3.5 h-3.5 text-[#E0B866]" />
                )}
                <span>Importar</span>
              </button>

              <button
                type="button"
                onClick={() => navigateTo('/produtos')}
                className="px-3.5 py-2.5 bg-white/10 hover:bg-white/20 text-[#F5F0E8] text-xs font-sans tracking-[0.12em] uppercase rounded-xs transition-colors flex items-center gap-1.5 border border-white/20"
              >
                <ExternalLink className="w-3.5 h-3.5 text-[#E0B866]" />
                <span>Ver Loja</span>
              </button>

              <button
                type="button"
                onClick={handleLogout}
                className="px-3.5 py-2.5 bg-rose-950/80 hover:bg-rose-900 text-rose-200 hover:text-white text-xs font-sans tracking-[0.12em] uppercase rounded-xs transition-colors flex items-center gap-1.5 border border-rose-700/50 shadow-xs"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sair</span>
              </button>
            </div>
          </div>
        </div>

        {/* ============================================================== */}
        {/* DYNAMIC PRIMARY ACTION SELECTOR (Visualização Condicional) */}
        {/* ============================================================== */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
          {/* Action 1: Adicionar Produto */}
          <button
            type="button"
            onClick={() => {
              handleClearForm();
              setEditingProductId(null);
              setMainAction('add_product');
            }}
            className={`p-4 sm:p-5 rounded-xs border text-left transition-all flex flex-col justify-between cursor-pointer ${
              mainAction === 'add_product'
                ? 'bg-[#071A2B] text-[#F5F0E8] border-[#C89A4B] shadow-md ring-2 ring-[#C89A4B]/50'
                : 'bg-white hover:bg-[#FAF7F2] text-[#071A2B] border-[#071A2B]/10 hover:border-[#C89A4B]/40 shadow-xs'
            }`}
          >
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-[10px] font-sans font-semibold uppercase tracking-[0.16em] opacity-80">
                Ação 1
              </span>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                mainAction === 'add_product' ? 'bg-[#C89A4B] text-[#071A2B]' : 'bg-[#071A2B]/5 text-[#8A6726]'
              }`}>
                <Plus className="w-4 h-4" />
              </div>
            </div>
            <div>
              <h3 className="font-serif text-base sm:text-lg font-medium leading-tight">
                Adicionar Produto
              </h3>
              <p className="text-[11px] font-sans opacity-70 mt-1 line-clamp-1">
                Cadastrar novo item com fotos e links
              </p>
            </div>
            <div className={`mt-3 pt-2 border-t text-[10px] font-sans font-semibold uppercase tracking-wider ${
              mainAction === 'add_product' ? 'border-[#C89A4B]/30 text-[#E0B866]' : 'border-[#071A2B]/10 text-[#8A6726]'
            }`}>
              {mainAction === 'add_product' ? '● Selecionado' : 'Abrir Formulário &rarr;'}
            </div>
          </button>

          {/* Action 2: Editar ou Excluir Produto */}
          <button
            type="button"
            onClick={() => setMainAction('manage_products')}
            className={`p-4 sm:p-5 rounded-xs border text-left transition-all flex flex-col justify-between cursor-pointer ${
              mainAction === 'manage_products'
                ? 'bg-[#071A2B] text-[#F5F0E8] border-[#C89A4B] shadow-md ring-2 ring-[#C89A4B]/50'
                : 'bg-white hover:bg-[#FAF7F2] text-[#071A2B] border-[#071A2B]/10 hover:border-[#C89A4B]/40 shadow-xs'
            }`}
          >
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-[10px] font-sans font-semibold uppercase tracking-[0.16em] opacity-80">
                Ação 2
              </span>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                mainAction === 'manage_products' ? 'bg-[#C89A4B] text-[#071A2B]' : 'bg-[#071A2B]/5 text-[#8A6726]'
              }`}>
                <Edit3 className="w-4 h-4" />
              </div>
            </div>
            <div>
              <h3 className="font-serif text-base sm:text-lg font-medium leading-tight">
                Editar / Excluir
              </h3>
              <p className="text-[11px] font-sans opacity-70 mt-1 line-clamp-1">
                Modificar dados, trocar fotos ou excluir
              </p>
            </div>
            <div className={`mt-3 pt-2 border-t text-[10px] font-sans font-semibold uppercase tracking-wider ${
              mainAction === 'manage_products' ? 'border-[#C89A4B]/30 text-[#E0B866]' : 'border-[#071A2B]/10 text-[#8A6726]'
            }`}>
              {mainAction === 'manage_products' ? '● Selecionado' : 'Gerenciar Itens &rarr;'}
            </div>
          </button>

          {/* Action 3: Catálogo & Categorias */}
          <button
            type="button"
            onClick={() => setMainAction('catalog_categories')}
            className={`p-4 sm:p-5 rounded-xs border text-left transition-all flex flex-col justify-between cursor-pointer ${
              mainAction === 'catalog_categories'
                ? 'bg-[#071A2B] text-[#F5F0E8] border-[#C89A4B] shadow-md ring-2 ring-[#C89A4B]/50'
                : 'bg-white hover:bg-[#FAF7F2] text-[#071A2B] border-[#071A2B]/10 hover:border-[#C89A4B]/40 shadow-xs'
            }`}
          >
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-[10px] font-sans font-semibold uppercase tracking-[0.16em] opacity-80">
                Ação 3
              </span>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                mainAction === 'catalog_categories' ? 'bg-[#C89A4B] text-[#071A2B]' : 'bg-[#071A2B]/5 text-[#8A6726]'
              }`}>
                <ShoppingBag className="w-4 h-4" />
              </div>
            </div>
            <div>
              <h3 className="font-serif text-base sm:text-lg font-medium leading-tight">
                Catálogo / Categorias
              </h3>
              <p className="text-[11px] font-sans opacity-70 mt-1 line-clamp-1">
                Tabela geral ({products.length}) e coleções ({categories.length})
              </p>
            </div>
            <div className={`mt-3 pt-2 border-t text-[10px] font-sans font-semibold uppercase tracking-wider ${
              mainAction === 'catalog_categories' ? 'border-[#C89A4B]/30 text-[#E0B866]' : 'border-[#071A2B]/10 text-[#8A6726]'
            }`}>
              {mainAction === 'catalog_categories' ? '● Selecionado' : 'Explorar &rarr;'}
            </div>
          </button>

          {/* Action 4: Segurança & Backup */}
          <button
            type="button"
            onClick={() => setMainAction('security_backup')}
            className={`p-4 sm:p-5 rounded-xs border text-left transition-all flex flex-col justify-between cursor-pointer ${
              mainAction === 'security_backup'
                ? 'bg-[#071A2B] text-[#F5F0E8] border-[#C89A4B] shadow-md ring-2 ring-[#C89A4B]/50'
                : 'bg-white hover:bg-[#FAF7F2] text-[#071A2B] border-[#071A2B]/10 hover:border-[#C89A4B]/40 shadow-xs'
            }`}
          >
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-[10px] font-sans font-semibold uppercase tracking-[0.16em] opacity-80">
                Ação 4
              </span>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                mainAction === 'security_backup' ? 'bg-[#C89A4B] text-[#071A2B]' : 'bg-[#071A2B]/5 text-[#8A6726]'
              }`}>
                <ShieldCheck className="w-4 h-4" />
              </div>
            </div>
            <div>
              <h3 className="font-serif text-base sm:text-lg font-medium leading-tight">
                Segurança &amp; Backup
              </h3>
              <p className="text-[11px] font-sans opacity-70 mt-1 line-clamp-1">
                Backups JSON, banco Supabase e senha
              </p>
            </div>
            <div className={`mt-3 pt-2 border-t text-[10px] font-sans font-semibold uppercase tracking-wider ${
              mainAction === 'security_backup' ? 'border-[#C89A4B]/30 text-[#E0B866]' : 'border-[#071A2B]/10 text-[#8A6726]'
            }`}>
              {mainAction === 'security_backup' ? '● Selecionado' : 'Configurações &rarr;'}
            </div>
          </button>
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

        {/* ============================================================== */}
        {/* AÇÃO 1: ADICIONAR PRODUTO */}
        {/* ============================================================== */}
        {mainAction === 'add_product' && (
          <div className="space-y-6">
            <div className="bg-white border border-[#071A2B]/10 rounded-xs p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2.5 py-0.5 text-[10px] font-sans font-semibold uppercase tracking-[0.16em] rounded-xs bg-[#071A2B] text-[#E0B866]">
                    Ação 1 Selecionada
                  </span>
                  <span className="text-[11px] font-sans text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-xs font-medium">
                    Novo Cadastro
                  </span>
                </div>
                <h2 className="font-serif text-xl sm:text-2xl text-[#071A2B] font-normal">
                  Cadastrar Novo Produto
                </h2>
                <p className="font-sans text-xs text-[#1C242B]/70 mt-1 max-w-2xl">
                  Preencha os campos abaixo com fotos, especificações e link oficial de afiliado para publicar o produto na loja e sincronizar automaticamente na nuvem Supabase.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleClearForm}
                  className="px-3.5 py-2 border border-[#071A2B]/20 text-[#071A2B] hover:bg-[#071A2B]/5 text-xs font-sans uppercase tracking-wider rounded-xs font-medium transition-colors cursor-pointer"
                >
                  Limpar Campos
                </button>
              </div>
            </div>

            {renderProductForm(false)}
          </div>
        )}

        {/* ============================================================== */}
        {/* AÇÃO 2: EDITAR / EXCLUIR PRODUTO */}
        {/* ============================================================== */}
        {mainAction === 'manage_products' && (
          <div className="space-y-6">
            {/* Header info */}
            <div className="bg-white border border-[#071A2B]/10 rounded-xs p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2.5 py-0.5 text-[10px] font-sans font-semibold uppercase tracking-[0.16em] rounded-xs bg-[#071A2B] text-[#E0B866]">
                    Ação 2 Selecionada
                  </span>
                  <span className="text-[11px] font-sans text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-xs font-medium">
                    {editingProductId ? 'Modo de Edição Ativo' : 'Localizador & Gestão'}
                  </span>
                </div>
                <h2 className="font-serif text-xl sm:text-2xl text-[#071A2B] font-normal">
                  {editingProductId ? `Editando: ${name || 'Produto'}` : 'Editar ou Excluir Produtos do Catálogo'}
                </h2>
                <p className="font-sans text-xs text-[#1C242B]/70 mt-1 max-w-2xl">
                  {editingProductId
                    ? 'Faça as alterações desejadas no formulário abaixo e clique em "Salvar Alterações no Produto" para atualizar imediatamente na loja e na nuvem.'
                    : 'Filtre em 3 passos (Categoria -> Nicho -> Produto) ou utilize a busca rápida para localizar e gerenciar qualquer item do catálogo.'}
                </p>
              </div>

              {editingProductId && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleClearForm}
                    className="px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-sans uppercase tracking-wider rounded-xs font-medium transition-colors cursor-pointer"
                  >
                    Fechar Edição / Voltar à Busca
                  </button>
                </div>
              )}
            </div>
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
                      onClick={() => {
                        handleClearForm();
                        setEditingProductId(null);
                        setMainAction('add_product');
                      }}
                      className="px-3.5 py-2 bg-[#071A2B] hover:bg-[#C89A4B] text-[#F5F0E8] hover:text-[#071A2B] text-xs font-sans uppercase tracking-wider rounded-xs font-semibold transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
                      title="Sair do modo de edição e criar um novo produto"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Cadastrar Novo Produto</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setMainAction('catalog_categories')}
                      className="px-3.5 py-2 bg-[#071A2B]/5 hover:bg-[#071A2B]/10 text-[#071A2B] border border-[#071A2B]/20 text-xs font-sans uppercase tracking-wider rounded-xs font-medium transition-colors cursor-pointer"
                    >
                      Ver Catálogo Completo &rarr;
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
                        {p.name} {typeof p.price === 'number' && !isNaN(p.price) ? `- R$ ${p.price.toFixed(2).replace('.', ',')}` : ''}
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
                          Preço: <strong className="text-emerald-700 font-bold">R$ {typeof activeProd.price === 'number' && !isNaN(activeProd.price) ? activeProd.price.toFixed(2).replace('.', ',') : '0,00'}</strong>
                          {activeProd.priceRangeLabel && <span className="ml-1 text-[10px] text-[#8A6726]">({activeProd.priceRangeLabel})</span>} &bull; Loja: {activeProd.platform || 'Shopee'}
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
                              <span className="text-[11px] font-sans text-[#071A2B] font-bold block mt-0.5">
                                R$ {typeof p.price === 'number' && !isNaN(p.price) ? p.price.toFixed(2).replace('.', ',') : '0,00'}
                                {p.priceRangeLabel && (
                                  <span className="ml-1 text-[10px] text-[#8A6726] font-normal">
                                    ({p.priceRangeLabel})
                                  </span>
                                )}
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

            {/* CONDITIONAL: If a product is being edited -> show form! */}
            {editingProductId ? (
              <div className="space-y-4">
                <div className="p-3 bg-amber-50 border border-amber-300 rounded-xs flex items-center justify-between text-xs text-amber-900 shadow-2xs">
                  <span className="flex items-center gap-2 font-medium">
                    <Edit3 className="w-4 h-4 text-amber-700" />
                    Você está editando o produto: <strong>{name}</strong>
                  </span>
                  <button
                    type="button"
                    onClick={handleClearForm}
                    className="underline text-amber-800 hover:text-amber-950 font-semibold cursor-pointer"
                  >
                    Cancelar edição e voltar à lista
                  </button>
                </div>

                {renderProductForm(true)}
              </div>
            ) : null}
          </div>
        )}

        {/* ============================================================== */}
        {/* AÇÃO 3: CATÁLOGO & CATEGORIAS */}
        {/* ============================================================== */}
        {mainAction === 'catalog_categories' && (
          <div className="space-y-6">
            {/* Header & Sub-Navigation */}
            <div className="bg-white border border-[#071A2B]/10 rounded-xs p-6 sm:p-8 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#071A2B]/10">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 bg-[#C89A4B]/20 text-[#8A6726] text-[10px] font-sans uppercase tracking-widest font-semibold rounded-xs">
                      Ação 3 Selecionada
                    </span>
                  </div>
                  <h2 className="font-serif text-xl sm:text-2xl text-[#071A2B] font-normal">
                    Catálogo Completo &amp; Categorias
                  </h2>
                  <p className="font-sans text-xs text-[#1C242B]/60 mt-1">
                    Visualize todos os produtos ativos em tabela executiva ou gerencie as categorias e linhas oficiais.
                  </p>
                </div>

                {/* Sub-Tabs Selector */}
                <div className="inline-flex p-1 bg-[#F5F0E8] border border-[#071A2B]/15 rounded-xs gap-1">
                  <button
                    type="button"
                    onClick={() => setCatalogSubTab('products')}
                    className={`px-4 py-2 rounded-xs text-xs font-sans font-medium transition-all flex items-center gap-2 cursor-pointer ${
                      catalogSubTab === 'products'
                        ? 'bg-[#071A2B] text-[#F5F0E8] shadow-xs'
                        : 'text-[#071A2B]/70 hover:text-[#071A2B] hover:bg-white/50'
                    }`}
                  >
                    <ShoppingBag className="w-3.5 h-3.5 text-[#C89A4B]" />
                    <span>Produtos ({products.length})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCatalogSubTab('categories')}
                    className={`px-4 py-2 rounded-xs text-xs font-sans font-medium transition-all flex items-center gap-2 cursor-pointer ${
                      catalogSubTab === 'categories'
                        ? 'bg-[#071A2B] text-[#F5F0E8] shadow-xs'
                        : 'text-[#071A2B]/70 hover:text-[#071A2B] hover:bg-white/50'
                    }`}
                  >
                    <Grid className="w-3.5 h-3.5 text-[#C89A4B]" />
                    <span>Categorias ({categories.length})</span>
                  </button>
                </div>
              </div>

              {/* Sub-Option 1: Products Table */}
              {catalogSubTab === 'products' && (
                <div className="pt-6 space-y-6">
                  {/* Filters Bar */}
                  <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
                      {/* Categoria */}
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

                      {/* Tipo / Nicho */}
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

                      {/* Text Search */}
                      <div className="relative flex-1">
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

                    {/* View Mode Toggle: Table or Cards */}
                    <div className="flex items-center gap-2 justify-end">
                      <span className="text-[11px] text-[#1C242B]/60 font-sans">Visualização:</span>
                      <div className="inline-flex border border-[#071A2B]/20 rounded-xs overflow-hidden">
                        <button
                          type="button"
                          onClick={() => setCatalogViewMode('table')}
                          className={`px-2.5 py-1.5 text-xs flex items-center gap-1 cursor-pointer ${
                            catalogViewMode === 'table' ? 'bg-[#071A2B] text-white' : 'bg-white text-[#071A2B]/70 hover:bg-[#F5F0E8]'
                          }`}
                          title="Visualização em Tabela"
                        >
                          <List className="w-3.5 h-3.5" />
                          <span className="text-[10px]">Tabela</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setCatalogViewMode('grid')}
                          className={`px-2.5 py-1.5 text-xs flex items-center gap-1 cursor-pointer ${
                            catalogViewMode === 'grid' ? 'bg-[#071A2B] text-white' : 'bg-white text-[#071A2B]/70 hover:bg-[#F5F0E8]'
                          }`}
                          title="Visualização em Grade"
                        >
                          <LayoutGrid className="w-3.5 h-3.5" />
                          <span className="text-[10px]">Grade</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Mode 1: Table */}
                  {catalogViewMode === 'table' ? (
                    <div className="overflow-x-auto">
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

                              <td className="py-3.5 px-3">
                                <span className="block uppercase text-[11px] font-sans font-medium text-[#C89A4B]">
                                  {product.categoryLabel || product.category}
                                </span>
                                <span className="inline-block mt-0.5 px-1.5 py-0.5 bg-[#071A2B]/5 text-[#071A2B] text-[9px] font-sans uppercase rounded-xs font-semibold">
                                  {product.productType || 'Eletrodomésticos'}
                                </span>
                              </td>

                              <td className="py-3.5 px-3">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-xs bg-[#EE4D2D]/10 text-[#EE4D2D] font-medium text-[10px]">
                                  {product.platform || 'Shopee'}
                                </span>
                              </td>

                              <td className="py-3.5 px-3 font-semibold text-[#071A2B]">
                                <span className="text-emerald-700 font-bold">R$ {typeof product.price === 'number' && !isNaN(product.price) ? product.price.toFixed(2).replace('.', ',') : '0,00'}</span>
                                {product.originalPrice && typeof product.price === 'number' && product.originalPrice > product.price ? (
                                  <div className="text-[10px] text-gray-400 line-through">
                                    De R$ {product.originalPrice.toFixed(2).replace('.', ',')}
                                  </div>
                                ) : (
                                  <div className="text-[10px] text-emerald-600 font-normal">Preço Único</div>
                                )}
                                {product.priceRangeLabel && (
                                  <div className="text-[10px] text-[#8A6726] font-normal">{product.priceRangeLabel}</div>
                                )}
                              </td>

                              <td className="py-3.5 px-3">
                                <div className="flex items-center gap-1 text-[#C89A4B]">
                                  <Star className="w-3.5 h-3.5 fill-[#C89A4B]" />
                                  <span className="font-semibold text-xs text-[#071A2B]">
                                    {product.rating !== undefined ? product.rating.toFixed(1) : '5.0'}
                                  </span>
                                </div>
                              </td>

                              <td className="py-3.5 px-3">
                                {product.badge ? (
                                  <span className="inline-block px-2 py-0.5 bg-[#071A2B] text-[#E0B866] text-[9px] font-sans uppercase tracking-wider rounded-xs">
                                    {product.badge}
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-gray-400">-</span>
                                )}
                              </td>

                              <td className="py-3.5 px-3 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      handleStartEdit(product);
                                      setMainAction('manage_products');
                                    }}
                                    title="Editar informações e preço deste produto"
                                    className="px-3 py-1.5 bg-[#C89A4B]/20 hover:bg-[#C89A4B] text-[#8A6726] hover:text-[#071A2B] rounded-xs font-sans text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                    <span>Editar</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => setProductToDelete(product)}
                                    title="Excluir este produto da loja"
                                    className="px-3 py-1.5 bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white rounded-xs font-sans text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 transition-colors border border-rose-200 hover:border-rose-600 shadow-2xs cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    <span>Excluir</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      const dup = duplicateProduct(product.id);
                                      if (dup) {
                                        showToast(
                                          'Produto Duplicado e Salvo na Nuvem!',
                                          `O produto "${dup.name}" foi duplicado e sincronizado automaticamente na nuvem Supabase.`,
                                          'success'
                                        );
                                      }
                                    }}
                                    title="Duplicar produto"
                                    className="p-1.5 text-sky-700 hover:text-sky-900 hover:bg-sky-50 rounded-xs transition-colors cursor-pointer"
                                  >
                                    <Copy className="w-4 h-4" />
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => navigateTo(`/produto/${product.slug}`)}
                                    title="Ver no site"
                                    className="p-1.5 text-[#071A2B]/60 hover:text-[#071A2B] hover:bg-[#071A2B]/10 rounded-xs transition-colors cursor-pointer"
                                  >
                                    <ExternalLink className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    /* Mode 2: Grid Cards */
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {filteredCatalog.map((product) => (
                        <div
                          key={product.id}
                          className="bg-[#F5F0E8]/20 border border-[#071A2B]/15 rounded-xs overflow-hidden flex flex-col justify-between hover:border-[#C89A4B] transition-colors p-3"
                        >
                          <div>
                            <div className="aspect-square bg-white border border-[#071A2B]/10 rounded-xs overflow-hidden p-2 flex items-center justify-center mb-2">
                              {product.images[0] ? (
                                <img
                                  src={product.images[0]}
                                  alt={product.name}
                                  className="w-full h-full object-contain"
                                />
                              ) : (
                                <ImageIcon className="w-8 h-8 text-gray-300" />
                              )}
                            </div>
                            <span className="text-[10px] uppercase font-sans font-semibold text-[#C89A4B]">
                              {product.categoryLabel || product.category}
                            </span>
                            <h4 className="font-serif text-sm font-medium text-[#071A2B] line-clamp-2 mt-0.5">
                              {product.name}
                            </h4>
                            <div className="mt-2 flex items-center justify-between">
                              <div>
                                <span className="text-xs font-bold text-emerald-700">
                                  R$ {product.price.toFixed(2).replace('.', ',')}
                                </span>
                                {product.originalPrice && product.originalPrice > product.price ? (
                                  <span className="text-[10px] text-gray-400 line-through block">
                                    De R$ {product.originalPrice.toFixed(2).replace('.', ',')}
                                  </span>
                                ) : (
                                  <span className="text-[9px] text-emerald-600 font-medium block">
                                    Preço Único
                                  </span>
                                )}
                                {product.priceRangeLabel && (
                                  <span className="text-[10px] text-[#8A6726] font-normal block">
                                    {product.priceRangeLabel}
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] px-1.5 py-0.5 rounded-xs bg-[#071A2B]/5 font-medium text-[#071A2B]">
                                {product.platform || 'Shopee'}
                              </span>
                            </div>
                          </div>

                          <div className="mt-3 pt-2 border-t border-[#071A2B]/10 flex items-center justify-between gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                handleStartEdit(product);
                                setMainAction('manage_products');
                              }}
                              className="px-2.5 py-1 bg-[#C89A4B]/20 hover:bg-[#C89A4B] text-[#8A6726] hover:text-[#071A2B] rounded-xs text-[11px] font-sans font-semibold uppercase flex items-center gap-1 transition-colors cursor-pointer"
                            >
                              <Edit3 className="w-3 h-3" />
                              <span>Editar</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setProductToDelete(product)}
                              className="px-2.5 py-1 bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white rounded-xs text-[11px] font-sans font-semibold uppercase flex items-center gap-1 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>Excluir</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {filteredCatalog.length === 0 && (
                    <div className="py-12 text-center text-xs text-[#1C242B]/50">
                      Nenhum produto encontrado para os filtros selecionados.
                    </div>
                  )}

                  {/* Reset defaults button in footer */}
                  <div className="pt-6 border-t border-[#071A2B]/10 flex items-center justify-between">
                    <span className="text-[11px] font-sans text-[#1C242B]/50">
                      Exibindo {filteredCatalog.length} de {products.length} produtos cadastrados.
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowResetConfirmModal(true)}
                      className="text-xs font-sans text-[#8A6726] hover:text-[#071A2B] flex items-center gap-1.5 hover:underline cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Restaurar Catálogo Padrão</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Sub-Option 2: Categories Grid */}
              {catalogSubTab === 'categories' && (
                <div className="pt-6 space-y-6">
                  <div className="flex items-center justify-between pb-4 border-b border-[#071A2B]/10">
                    <div>
                      <h3 className="font-serif text-lg text-[#071A2B]">Linhas e Categorias Cadastradas</h3>
                      <p className="text-xs text-[#1C242B]/60">Organize os produtos em linhas para facilitar a navegação do cliente.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowNewCategoryModal(true)}
                      className="px-4 py-2 bg-[#071A2B] hover:bg-[#C89A4B] text-[#F5F0E8] hover:text-[#071A2B] text-xs font-sans uppercase tracking-[0.16em] font-medium rounded-xs transition-colors flex items-center gap-2 cursor-pointer shadow-xs"
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
                                className="text-[#8A6726] hover:text-[#071A2B] font-medium flex items-center gap-1 hover:underline cursor-pointer"
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
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* AÇÃO 4: SEGURANÇA, NUVEM & BACKUPS */}
        {/* ============================================================== */}
        {mainAction === 'security_backup' && (
          <div className="space-y-6">
            <div className="bg-white border border-[#071A2B]/10 rounded-xs p-6 sm:p-8 shadow-xs">
              <div className="pb-6 border-b border-[#071A2B]/10">
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 bg-[#C89A4B]/20 text-[#8A6726] text-[10px] font-sans uppercase tracking-widest font-semibold rounded-xs">
                    Ação 4 Selecionada
                  </span>
                </div>
                <h2 className="font-serif text-xl sm:text-2xl text-[#071A2B] font-normal">
                  Segurança, Nuvem &amp; Central de Backups
                </h2>
                <p className="font-sans text-xs text-[#1C242B]/60 mt-1">
                  Gerencie cópias de segurança do catálogo (JSON), verifique o status do Supabase e altere as credenciais de acesso.
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-6">
                {/* Panel 1: Backups JSON (Export & Import) */}
                <div className="bg-[#FAF7F2] border border-[#071A2B]/15 rounded-xs p-5 flex flex-col justify-between space-y-4">
                  <div>
                    <div className="w-10 h-10 rounded-full bg-[#071A2B] text-[#E0B866] flex items-center justify-center mb-3">
                      <Download className="w-5 h-5" />
                    </div>
                    <h3 className="font-serif text-base text-[#071A2B] font-medium">
                      Central de Backups do Catálogo
                    </h3>
                    <p className="font-sans text-xs text-[#1C242B]/70 mt-1">
                      Exporte o catálogo completo em arquivo JSON ou restaure um backup salvo no seu computador.
                    </p>
                  </div>

                  <div className="space-y-2.5 pt-2 border-t border-[#071A2B]/10">
                    <button
                      type="button"
                      onClick={handleExportBackup}
                      className="w-full px-4 py-2.5 bg-[#071A2B] hover:bg-[#C89A4B] text-[#F5F0E8] hover:text-[#071A2B] text-xs font-sans uppercase tracking-[0.14em] font-semibold rounded-xs transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                    >
                      <Download className="w-4 h-4" />
                      <span>Baixar Backup (.JSON)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => importFileInputRef.current?.click()}
                      disabled={isImportingBackup}
                      className="w-full px-4 py-2.5 bg-white hover:bg-[#071A2B]/5 border border-[#071A2B]/20 text-[#071A2B] text-xs font-sans uppercase tracking-[0.14em] font-semibold rounded-xs transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-2xs disabled:opacity-50"
                    >
                      <Upload className="w-4 h-4 text-[#8A6726]" />
                      <span>{isImportingBackup ? 'Processando Arquivo...' : 'Restaurar / Importar Backup'}</span>
                    </button>

                    <p className="text-[10px] text-[#1C242B]/50 font-sans text-center">
                      Inclui todos os {products.length} produtos e {categories.length} categorias.
                    </p>
                  </div>
                </div>

                {/* Panel 2: Cloud Sync & Status */}
                <div className="bg-[#FAF7F2] border border-[#071A2B]/15 rounded-xs p-5 flex flex-col justify-between space-y-4">
                  <div>
                    <div className="w-10 h-10 rounded-full bg-emerald-700 text-white flex items-center justify-center mb-3">
                      <Cloud className="w-5 h-5" />
                    </div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-serif text-base text-[#071A2B] font-medium">
                        Nuvem Supabase
                      </h3>
                      <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 text-[9px] font-sans font-semibold rounded-xs uppercase">
                        Sincronizado
                      </span>
                    </div>
                    <p className="font-sans text-xs text-[#1C242B]/70 mt-1">
                      Todas as adições, edições e exclusões são sincronizadas automaticamente na nuvem em tempo real.
                    </p>
                  </div>

                  <div className="space-y-3 pt-2 border-t border-[#071A2B]/10">
                    <div className="bg-white p-3 rounded-xs border border-[#071A2B]/10 text-xs space-y-1.5">
                      <div className="flex justify-between text-[#1C242B]/70 text-[11px]">
                        <span>Conexão em Tempo Real:</span>
                        <strong className="text-emerald-700 flex items-center gap-1 font-semibold">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                          WebSocket Ativo
                        </strong>
                      </div>
                      <div className="flex justify-between text-[#1C242B]/70 text-[11px]">
                        <span>Armazenamento de Imagens:</span>
                        <strong className="text-[#071A2B]">Banco Supabase (Nuvem)</strong>
                      </div>
                      <div className="flex justify-between text-[#1C242B]/70 text-[11px]">
                        <span>Produtos Sincronizados:</span>
                        <strong className="text-[#071A2B]">{products.length}</strong>
                      </div>
                      <div className="flex justify-between text-[#1C242B]/70 text-[11px]">
                        <span>Categorias Ativas:</span>
                        <strong className="text-[#071A2B]">{categories.length}</strong>
                      </div>
                      {lastCloudSyncTime && (
                        <div className="flex justify-between text-[#1C242B]/70 text-[10px] pt-1 border-t border-[#071A2B]/5">
                          <span>Última Sincronização:</span>
                          <span className="text-[#8A6726]">{new Date(lastCloudSyncTime).toLocaleTimeString('pt-BR')}</span>
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={handleSyncCloud}
                      disabled={isSyncingWithCloud}
                      className="w-full px-4 py-2.5 bg-[#C89A4B] hover:bg-[#8A6726] text-[#071A2B] hover:text-white text-xs font-sans uppercase tracking-[0.14em] font-semibold rounded-xs transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
                    >
                      <RefreshCw className={`w-4 h-4 ${isSyncingWithCloud ? 'animate-spin' : ''}`} />
                      <span>{isSyncingWithCloud ? 'Sincronizando Nuvem...' : 'Forçar Sincronização Agora'}</span>
                    </button>
                  </div>
                </div>

                {/* Panel 3: Master Access Password */}
                <div className="bg-[#FAF7F2] border border-[#071A2B]/15 rounded-xs p-5 flex flex-col justify-between space-y-4">
                  <div>
                    <div className="w-10 h-10 rounded-full bg-[#071A2B] text-[#E0B866] flex items-center justify-center mb-3">
                      <Key className="w-5 h-5" />
                    </div>
                    <h3 className="font-serif text-base text-[#071A2B] font-medium">
                      Senha de Acesso Master
                    </h3>
                    <p className="font-sans text-xs text-[#1C242B]/70 mt-1">
                      Defina uma nova senha para o Painel Desenvolvedor. A nova credencial passa a valer imediatamente na nuvem.
                    </p>
                  </div>

                  <form onSubmit={handleSaveNewPassword} className="space-y-3 pt-2 border-t border-[#071A2B]/10">
                    <div>
                      <input
                        type="password"
                        value={newDevPassword}
                        onChange={(e) => setNewDevPassword(e.target.value)}
                        placeholder="Nova senha desejada..."
                        required
                        className="w-full bg-white border border-[#071A2B]/20 text-[#071A2B] px-3.5 py-2.5 rounded-xs text-xs font-sans focus:outline-hidden focus:border-[#C89A4B]"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isSavingNewPassword || !newDevPassword.trim()}
                      className="w-full px-4 py-2.5 bg-[#071A2B] hover:bg-[#C89A4B] text-[#F5F0E8] hover:text-[#071A2B] text-xs font-sans uppercase tracking-[0.14em] font-semibold rounded-xs transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
                    >
                      <Key className="w-4 h-4" />
                      <span>{isSavingNewPassword ? 'Atualizando...' : 'Salvar Nova Senha'}</span>
                    </button>
                  </form>
                </div>
              </div>
            </div>
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
                  <label className="block text-[11px] font-sans text-[#1C242B]/70 mb-1 flex items-center justify-between">
                    <span>Foto de Capa da Categoria</span>
                    {newCatImage && (
                      <span className="text-[10px] text-emerald-700 font-medium">✓ Imagem carregada</span>
                    )}
                  </label>

                  <div className="space-y-2">
                    <input
                      ref={catFileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleCategoryFileUpload}
                      className="hidden"
                    />

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => catFileInputRef.current?.click()}
                        disabled={isUploadingCatImage}
                        className="px-3 py-2 bg-[#071A2B] hover:bg-[#C89A4B] text-[#F5F0E8] hover:text-[#071A2B] text-xs font-sans rounded-xs flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 disabled:opacity-50"
                      >
                        <Upload className="w-3.5 h-3.5 text-[#E0B866]" />
                        <span>{isUploadingCatImage ? 'Processando...' : 'Upload do Dispositivo'}</span>
                      </button>

                      <input
                        type="url"
                        value={newCatImage}
                        onChange={(e) => setNewCatImage(e.target.value)}
                        placeholder="Ou cole uma URL (https://...)"
                        className="flex-1 bg-[#F5F0E8]/50 border border-[#071A2B]/20 text-[#071A2B] px-3.5 py-2 rounded-xs text-xs focus:outline-hidden focus:border-[#C89A4B]"
                      />
                    </div>

                    {newCatImage && (
                      <div className="relative w-24 h-16 rounded-xs overflow-hidden border border-[#071A2B]/20 mt-1">
                        <img src={newCatImage} alt="Preview" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setNewCatImage('')}
                          className="absolute top-1 right-1 bg-black/60 text-white p-0.5 rounded-full hover:bg-rose-600"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
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
                    Preço: <strong className="text-emerald-700">R$ {productToDelete.price.toFixed(2).replace('.', ',')}</strong>
                    {productToDelete.priceRangeLabel && <span className="ml-1 text-[10px] text-[#8A6726]">({productToDelete.priceRangeLabel})</span>} &bull; {productToDelete.platform || 'Shopee'}
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
                      'Produto Excluído e Sincronizado!',
                      `O produto "${deletedName}" foi excluído do catálogo e a nuvem Supabase já foi atualizada automaticamente.`,
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
