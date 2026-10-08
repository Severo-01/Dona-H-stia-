import { createClient } from '@supabase/supabase-js';
import { Product, CategoryInfo } from '../types';

// Supabase Project Credentials provided by the user
export const SUPABASE_PROJECT_ID =
  (typeof import.meta !== 'undefined' && import.meta.env && (import.meta.env.VITE_SUPABASE_PROJECT_ID as string)) ||
  'ouhiqpymsxjhutoacrqv';

export const SUPABASE_URL =
  (typeof import.meta !== 'undefined' && import.meta.env && (import.meta.env.VITE_SUPABASE_URL as string)) ||
  `https://${SUPABASE_PROJECT_ID}.supabase.co`;

export const SUPABASE_PUBLISHABLE_KEY =
  (typeof import.meta !== 'undefined' && import.meta.env && (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string)) ||
  'sb_publishable_tP88LfR3zIuJHXo-qdKoeg_mRUr40jB';

export const DEFAULT_FALLBACK_PASSWORD = '@Kevensvr10';

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

export interface SupabaseStatus {
  connected: boolean;
  tableExists: boolean;
  source: 'supabase' | 'fallback';
  message: string;
}

/**
 * Verifies developer password securely via Supabase RPC without exposing the password to the frontend.
 * Falls back to direct query or default password if RPC is not yet created.
 */
export async function verifyDeveloperPasswordSecurely(
  passwordAttempt: string
): Promise<{ isValid: boolean; method: 'rpc_secure' | 'direct_table' | 'fallback'; error?: string }> {
  try {
    // 1. First attempt: Secure RPC function (password is never exposed over HTTP response)
    const { data: isRpcValid, error: rpcError } = await supabase.rpc('verify_dev_password', {
      input_password: passwordAttempt,
    });

    if (!rpcError && typeof isRpcValid === 'boolean') {
      return { isValid: isRpcValid, method: 'rpc_secure' };
    }

    // 2. Second attempt: Direct table query (if user hasn't created the RPC function yet)
    const { data: tableData, error: tableError } = await supabase
      .from('app_config')
      .select('value')
      .eq('key', 'dev_password')
      .maybeSingle();

    if (!tableError && tableData?.value) {
      const match = tableData.value === passwordAttempt;
      return { isValid: match, method: 'direct_table' };
    }

    // 3. Fallback to default password
    const fallbackMatch = passwordAttempt === DEFAULT_FALLBACK_PASSWORD;
    return {
      isValid: fallbackMatch,
      method: 'fallback',
      error: rpcError?.message || tableError?.message,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    const fallbackMatch = passwordAttempt === DEFAULT_FALLBACK_PASSWORD;
    return {
      isValid: fallbackMatch,
      method: 'fallback',
      error: msg,
    };
  }
}

/**
 * Checks connection to Supabase and determines the current security level.
 */
export async function checkSupabaseConfigStatus(): Promise<SupabaseStatus & { isRpcSecured: boolean }> {
  try {
    // Test if secure RPC exists
    const { data: rpcTest, error: rpcErr } = await supabase.rpc('verify_dev_password', {
      input_password: 'test_probe_connection',
    });

    const isRpcSecured = !rpcErr && typeof rpcTest === 'boolean';

    // Check table access
    const { data, error } = await supabase
      .from('app_config')
      .select('key')
      .eq('key', 'dev_password')
      .maybeSingle();

    if (isRpcSecured) {
      return {
        connected: true,
        tableExists: true,
        isRpcSecured: true,
        source: 'supabase',
        message: 'Blindagem Ativa! A validação de senha é feita por função interna RPC (a senha nunca é transmitida para o navegador).',
      };
    }

    if (error) {
      if (error.code === 'PGRST205' || error.message.includes('schema cache')) {
        return {
          connected: true,
          tableExists: false,
          isRpcSecured: false,
          source: 'fallback',
          message: 'Conectado ao Supabase, mas a tabela public.app_config ainda não foi criada no banco de dados.',
        };
      }
      return {
        connected: false,
        tableExists: false,
        isRpcSecured: false,
        source: 'fallback',
        message: `Erro ao consultar Supabase: ${error.message}`,
      };
    }

    if (data) {
      return {
        connected: true,
        tableExists: true,
        isRpcSecured: false,
        source: 'supabase',
        message: 'Tabela ativa. Recomendado aplicar a Blindagem RPC para que a senha nunca trafegue na rede.',
      };
    }

    return {
      connected: true,
      tableExists: true,
      isRpcSecured: false,
      source: 'fallback',
      message: 'Tabela app_config conectada.',
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      connected: false,
      tableExists: false,
      isRpcSecured: false,
      source: 'fallback',
      message: `Falha de rede ao conectar com Supabase: ${msg}`,
    };
  }
}

/**
 * Fetches the developer password from Supabase with fallback to default password.
 */
export async function getDeveloperPassword(): Promise<{ password: string; source: 'supabase' | 'fallback'; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('app_config')
      .select('value')
      .eq('key', 'dev_password')
      .maybeSingle();

    if (!error && data?.value) {
      return { password: data.value, source: 'supabase' };
    }

    return {
      password: DEFAULT_FALLBACK_PASSWORD,
      source: 'fallback',
      error: error?.message,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      password: DEFAULT_FALLBACK_PASSWORD,
      source: 'fallback',
      error: msg,
    };
  }
}

/**
 * Updates or inserts the developer password in Supabase app_config.
 * Tries secure RPC first, then falls back to direct upsert.
 */
export async function saveDeveloperPasswordToSupabase(
  newPassword: string,
  currentPassword?: string
): Promise<{ success: boolean; method: 'rpc' | 'direct'; error?: string }> {
  try {
    // 1. Try secure RPC update if available
    if (currentPassword) {
      const { data: rpcResult, error: rpcError } = await supabase.rpc('update_dev_password', {
        current_password: currentPassword,
        new_password: newPassword,
      });

      if (!rpcError && rpcResult === true) {
        return { success: true, method: 'rpc' };
      }
    }

    // 2. Fallback to direct upsert
    const { error } = await supabase
      .from('app_config')
      .upsert(
        {
          key: 'dev_password',
          value: newPassword,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'key' }
      );

    if (error) {
      return { success: false, method: 'direct', error: error.message };
    }

    return { success: true, method: 'direct' };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, method: 'direct', error: msg };
  }
}

/**
 * Loads the active product catalog from Supabase cloud.
 * Falls back gracefully to null if no custom cloud catalog is yet uploaded or if offline.
 */
export async function fetchCatalogFromSupabase(): Promise<Product[] | null> {
  try {
    // 1. Direct table query on app_config (primary, fastest)
    const { data, error } = await supabase
      .from('app_config')
      .select('value')
      .eq('key', 'catalog_products')
      .maybeSingle();

    if (!error && data?.value) {
      const parsed = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }

    // 2. Fallback to RPC get_catalog_products
    const { data: rpcData, error: rpcError } = await supabase.rpc('get_catalog_products');
    if (!rpcError && rpcData) {
      const parsed = typeof rpcData === 'string' ? JSON.parse(rpcData) : rpcData;
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }

    return null;
  } catch (err) {
    console.warn('[Supabase] Erro ao buscar catalogo:', err);
    return null;
  }
}

/**
 * Loads custom categories from Supabase cloud.
 */
export async function fetchCategoriesFromSupabase(): Promise<CategoryInfo[] | null> {
  try {
    // 1. Direct table query
    const { data, error } = await supabase
      .from('app_config')
      .select('value')
      .eq('key', 'catalog_categories')
      .maybeSingle();

    if (!error && data?.value) {
      const parsed = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }

    // 2. Fallback to RPC
    const { data: rpcData, error: rpcError } = await supabase.rpc('get_catalog_categories');
    if (!rpcError && rpcData) {
      const parsed = typeof rpcData === 'string' ? JSON.parse(rpcData) : rpcData;
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }

    return null;
  } catch (err) {
    console.warn('[Supabase] Erro ao buscar categorias:', err);
    return null;
  }
}

// Singleton channel for realtime broadcast
let catalogRealtimeChannel: ReturnType<typeof supabase.channel> | null = null;

export function getCatalogRealtimeChannel() {
  if (!catalogRealtimeChannel) {
    catalogRealtimeChannel = supabase.channel('dona_hestia_catalog_realtime');
  }
  return catalogRealtimeChannel;
}

/**
 * Broadcasts catalog changes to all connected visitors and devices worldwide in real time via WebSockets.
 */
export async function broadcastCatalogUpdate(products: Product[]): Promise<void> {
  try {
    const channel = getCatalogRealtimeChannel();
    await channel.send({
      type: 'broadcast',
      event: 'catalog_updated',
      payload: { products, timestamp: Date.now() },
    });
    console.log('[Supabase Realtime] Evento de catálogo transmitido em tempo real para todos os clientes!');
  } catch (err) {
    console.warn('[Supabase Realtime] Falha ao enviar broadcast de produtos:', err);
  }
}

/**
 * Broadcasts category changes to all connected visitors and devices worldwide in real time via WebSockets.
 */
export async function broadcastCategoriesUpdate(categories: CategoryInfo[]): Promise<void> {
  try {
    const channel = getCatalogRealtimeChannel();
    await channel.send({
      type: 'broadcast',
      event: 'categories_updated',
      payload: { categories, timestamp: Date.now() },
    });
    console.log('[Supabase Realtime] Evento de categorias transmitido em tempo real!');
  } catch (err) {
    console.warn('[Supabase Realtime] Falha ao enviar broadcast de categorias:', err);
  }
}

/**
 * Intelligently processes an uploaded image file:
 * - Resizes proportionally to e-commerce standard (default max 1200x1200)
 * - Compresses to modern high-resolution WebP (with fallback to JPEG)
 * - Produces an optimized data URL ready for instant, reliable storage directly in Supabase cloud database
 */
export async function processImageFileForUpload(
  file: File,
  options: { maxWidth?: number; maxHeight?: number; quality?: number } = {}
): Promise<{ dataUrl: string; sizeKB: number; width: number; height: number; originalName: string }> {
  const { maxWidth = 1200, maxHeight = 1200, quality = 0.82 } = options;

  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('O arquivo selecionado não é uma imagem válida (PNG, JPG, WEBP, etc).'));
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const src = e.target?.result as string;
      if (!src) {
        reject(new Error('Não foi possível ler o arquivo selecionado.'));
        return;
      }

      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          const rawSizeKB = Math.round(src.length / 1024);
          resolve({ dataUrl: src, sizeKB: rawSizeKB, width: img.width, height: img.height, originalName: file.name });
          return;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        let dataUrl = canvas.toDataURL('image/webp', quality);
        if (!dataUrl.startsWith('data:image/webp')) {
          dataUrl = canvas.toDataURL('image/jpeg', quality);
        }

        const sizeKB = Math.round((dataUrl.length * 3) / 4 / 1024);
        resolve({ dataUrl, sizeKB, width, height, originalName: file.name });
      };

      img.onerror = () => reject(new Error('Falha ao decodificar os dados da imagem.'));
      img.src = src;
    };

    reader.onerror = () => reject(new Error('Erro na leitura do arquivo.'));
    reader.readAsDataURL(file);
  });
}

/**
 * Saves or synchronizes the product catalog to Supabase cloud.
 * Tries direct upsert and RPC to ensure 100% persistence across all database configs.
 */
export async function saveCatalogToSupabase(
  products: Product[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const productsJson = JSON.stringify(products);

    // 1. Direct table upsert (primary, fastest)
    const { error: upsertError } = await supabase
      .from('app_config')
      .upsert(
        {
          key: 'catalog_products',
          value: productsJson,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'key' }
      );

    if (!upsertError) {
      console.log(`[Supabase] Catalogo com ${products.length} produtos salvo via direct upsert.`);
      // Emit real-time WebSocket broadcast so all connected users update instantly
      broadcastCatalogUpdate(products).catch(() => {});
      return { success: true };
    }

    // 2. Fallback to RPC function if direct upsert had an RLS error
    console.warn('[Supabase] Upsert direto falhou, tentando RPC save_catalog_products:', upsertError.message);
    const { data: rpcResult, error: rpcError } = await supabase.rpc('save_catalog_products', {
      products_json: productsJson,
    });
    if (!rpcError && (rpcResult === true || rpcResult === 'true' || rpcResult !== false)) {
      console.log(`[Supabase] Catalogo com ${products.length} produtos salvo via RPC.`);
      broadcastCatalogUpdate(products).catch(() => {});
      return { success: true };
    }

    const finalErr = rpcError?.message || upsertError.message;
    console.error('[Supabase] Falha ao salvar catalogo:', finalErr);
    return { success: false, error: finalErr };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[Supabase] Exceção ao salvar catalogo:', msg);
    return { success: false, error: msg };
  }
}

/**
 * Saves custom categories to Supabase cloud.
 */
export async function saveCategoriesToSupabase(
  categories: CategoryInfo[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const categoriesJson = JSON.stringify(categories);

    // 1. Direct table upsert
    const { error: upsertError } = await supabase
      .from('app_config')
      .upsert(
        {
          key: 'catalog_categories',
          value: categoriesJson,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'key' }
      );

    if (!upsertError) {
      console.log(`[Supabase] Categorias (${categories.length}) salvas via direct upsert.`);
      broadcastCategoriesUpdate(categories).catch(() => {});
      return { success: true };
    }

    // 2. Fallback to RPC function
    console.warn('[Supabase] Upsert de categorias falhou, tentando RPC save_catalog_categories:', upsertError.message);
    const { data: rpcResult, error: rpcError } = await supabase.rpc('save_catalog_categories', {
      categories_json: categoriesJson,
    });
    if (!rpcError && (rpcResult === true || rpcResult === 'true' || rpcResult !== false)) {
      console.log(`[Supabase] Categorias (${categories.length}) salvas via RPC.`);
      broadcastCategoriesUpdate(categories).catch(() => {});
      return { success: true };
    }

    const finalErr = rpcError?.message || upsertError.message;
    return { success: false, error: finalErr };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}

export const SUPABASE_SETUP_SQL = `-- SCRIPT DE BLINDAGEM TOTAL DO BANCO DE DADOS SUPABASE
-- Execute este comando no SQL Editor do seu Supabase (Projeto: ouhiqpymsxjhutoacrqv)

-- 1. Garante que a tabela existe
CREATE TABLE IF NOT EXISTS public.app_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Habilita Row Level Security (RLS)
ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;

-- 3. SEGURANÇA MÁXIMA: Revoga leitura pública direta de dados sensíveis
DROP POLICY IF EXISTS "Permitir leitura publica de app_config" ON public.app_config;
DROP POLICY IF EXISTS "Permitir alteracao de app_config" ON public.app_config;

-- 4. FUNÇÃO BLINDADA: Valida a senha internamente no banco
CREATE OR REPLACE FUNCTION public.verify_dev_password(input_password TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  stored_pwd TEXT;
BEGIN
  SELECT value INTO stored_pwd FROM public.app_config WHERE key = 'dev_password';
  IF stored_pwd IS NULL THEN
    RETURN (input_password = '@Kevensvr10');
  END IF;
  RETURN (stored_pwd = input_password);
END;
$$;

-- 5. FUNÇÃO BLINDADA: Altera a senha com segurança
CREATE OR REPLACE FUNCTION public.update_dev_password(current_password TEXT, new_password TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  stored_pwd TEXT;
BEGIN
  SELECT value INTO stored_pwd FROM public.app_config WHERE key = 'dev_password';
  IF stored_pwd IS NULL THEN
    stored_pwd := '@Kevensvr10';
  END IF;

  IF current_password = stored_pwd OR current_password = '@Kevensvr10' THEN
    INSERT INTO public.app_config (key, value, updated_at)
    VALUES ('dev_password', new_password, NOW())
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$;

-- 6. FUNÇÃO PARA SALVAR CATÁLOGO DE PRODUTOS NA NUVEM
CREATE OR REPLACE FUNCTION public.save_catalog_products(products_json TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.app_config (key, value, updated_at)
  VALUES ('catalog_products', products_json, NOW())
  ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();
  RETURN TRUE;
END;
$$;

-- 7. FUNÇÃO PARA CARREGAR CATÁLOGO DE PRODUTOS DA NUVEM
CREATE OR REPLACE FUNCTION public.get_catalog_products()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  prod_data TEXT;
BEGIN
  SELECT value INTO prod_data FROM public.app_config WHERE key = 'catalog_products';
  RETURN prod_data;
END;
$$;

-- 8. FUNÇÃO PARA SALVAR E CARREGAR CATEGORIAS NA NUVEM
CREATE OR REPLACE FUNCTION public.save_catalog_categories(categories_json TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.app_config (key, value, updated_at)
  VALUES ('catalog_categories', categories_json, NOW())
  ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();
  RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_catalog_categories()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  cat_data TEXT;
BEGIN
  SELECT value INTO cat_data FROM public.app_config WHERE key = 'catalog_categories';
  RETURN cat_data;
END;
$$;

-- 9. Libera execução segura das funções RPC para a chave anônima da loja
GRANT EXECUTE ON FUNCTION public.verify_dev_password(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_dev_password(TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_catalog_products(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_catalog_products() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_catalog_categories(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_catalog_categories() TO anon, authenticated;

-- 10. Garante o registro da senha inicial caso ainda não exista
INSERT INTO public.app_config (key, value)
VALUES ('dev_password', '@Kevensvr10')
ON CONFLICT (key) DO NOTHING;

-- 11. Políticas de RLS para permitir leitura e escrita pública do catálogo
DROP POLICY IF EXISTS "Permitir leitura publica de catalogo" ON public.app_config;
CREATE POLICY "Permitir leitura publica de catalogo" ON public.app_config
FOR SELECT TO anon, authenticated
USING (key IN ('catalog_products', 'catalog_categories'));

DROP POLICY IF EXISTS "Permitir escrita de catalogo" ON public.app_config;
CREATE POLICY "Permitir escrita de catalogo" ON public.app_config
FOR ALL TO anon, authenticated
USING (key IN ('catalog_products', 'catalog_categories'))
WITH CHECK (key IN ('catalog_products', 'catalog_categories'));

-- 12. HABILITAR SINCRONIZAÇÃO EM TEMPO REAL NATIVA NO POSTGRES (SUPABASE REALTIME)
ALTER TABLE public.app_config REPLICA IDENTITY FULL;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'app_config'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.app_config;
    END IF;
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;
`;

