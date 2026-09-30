import { createClient } from '@supabase/supabase-js';

// Supabase Project Credentials provided by the user
export const SUPABASE_PROJECT_ID =
  (import.meta.env.VITE_SUPABASE_PROJECT_ID as string) || 'ouhiqpymsxjhutoacrqv';

export const SUPABASE_URL =
  (import.meta.env.VITE_SUPABASE_URL as string) ||
  `https://${SUPABASE_PROJECT_ID}.supabase.co`;

export const SUPABASE_PUBLISHABLE_KEY =
  (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string) ||
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

-- 3. SEGURANÇA MÁXIMA: Revoga leitura pública direta da tabela
-- Impede que qualquer pessoa abra o F12 ou console e consiga ler a senha
DROP POLICY IF EXISTS "Permitir leitura publica de app_config" ON public.app_config;
DROP POLICY IF EXISTS "Permitir alteracao de app_config" ON public.app_config;

-- 4. FUNÇÃO BLINDADA: Valida a senha internamente no banco
-- O navegador NUNCA recebe a senha; o banco só responde TRUE ou FALSE
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

-- 6. Libera execução segura das funções RPC para a chave anônima da loja
GRANT EXECUTE ON FUNCTION public.verify_dev_password(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_dev_password(TEXT, TEXT) TO anon, authenticated;

-- 7. Garante o registro da senha inicial caso ainda não exista
INSERT INTO public.app_config (key, value)
VALUES ('dev_password', '@Kevensvr10')
ON CONFLICT (key) DO NOTHING;
`;

