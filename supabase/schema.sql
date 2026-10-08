-- ==============================================================================
-- DONA HÉSTIA - ESQUEMA OFICIAL SUPABASE
-- Este arquivo documenta e configura toda a estrutura do banco de dados na nuvem Supabase.
-- Você pode salvar esta pasta e arquivo no seu repositório do GitHub.
-- ==============================================================================

-- 1. CRIAÇÃO DA TABELA DE CONFIGURAÇÃO E CATÁLOGO
CREATE TABLE IF NOT EXISTS public.app_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. HABILITAR ROW LEVEL SECURITY (RLS)
ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;

-- 3. POLÍTICA DE LEITURA PÚBLICA DO CATÁLOGO
-- Permite que qualquer visitante do site leia os produtos e categorias em tempo real
DROP POLICY IF EXISTS "Permitir leitura publica de catalogo" ON public.app_config;
CREATE POLICY "Permitir leitura publica de catalogo" ON public.app_config
FOR SELECT TO anon, authenticated
USING (key IN ('catalog_products', 'catalog_categories'));

-- 4. POLÍTICA DE ESCRITA DO CATÁLOGO
-- Permite salvar alterações no catálogo a partir do painel de desenvolvedor
DROP POLICY IF EXISTS "Permitir escrita de catalogo" ON public.app_config;
CREATE POLICY "Permitir escrita de catalogo" ON public.app_config
FOR ALL TO anon, authenticated
USING (key IN ('catalog_products', 'catalog_categories'))
WITH CHECK (key IN ('catalog_products', 'catalog_categories'));

-- 5. FUNÇÃO RPC: SALVAR PRODUTOS DO CATÁLOGO (SECURITY DEFINER)
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

-- 6. FUNÇÃO RPC: BUSCAR PRODUTOS DO CATÁLOGO
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

-- 7. FUNÇÃO RPC: SALVAR CATEGORIAS
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

-- 8. FUNÇÃO RPC: BUSCAR CATEGORIAS
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

-- 9. FUNÇÃO RPC: VERIFICAR SENHA DO MODO DESENVOLVEDOR COM BLINDAGEM
CREATE OR REPLACE FUNCTION public.verify_dev_password(input_password TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  stored_hash TEXT;
BEGIN
  SELECT value INTO stored_hash FROM public.app_config WHERE key = 'dev_password';
  IF stored_hash IS NULL THEN
    RETURN input_password = '@Kevensvr10';
  END IF;
  RETURN input_password = stored_hash;
END;
$$;

-- 10. LIBERAR PERMISSÕES DE EXECUÇÃO RPC
GRANT EXECUTE ON FUNCTION public.save_catalog_products(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_catalog_products() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_catalog_categories(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_catalog_categories() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_dev_password(TEXT) TO anon, authenticated;

-- 11. HABILITAR TEMPO REAL (SUPABASE REALTIME)
-- Permite que mudanças de preço reflitam instantaneamente nas telas abertas dos clientes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'app_config'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.app_config;
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;
