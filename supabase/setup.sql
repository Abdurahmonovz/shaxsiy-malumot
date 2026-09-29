-- ========================================================================
-- SHAXSIY SEYF: AUTH-SIZ (HECH QANDAY PAROLSIZ VA LOGINSIZ) SOZLASH
-- Ushbu SQL kodni Supabase Dashboard -> SQL Editor ga qo'yib, RUN tugmasini bosing!
-- ========================================================================

-- 1. Sections jadvali
CREATE TABLE IF NOT EXISTS public.sections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT NOT NULL DEFAULT 'amber',
  allow_images BOOLEAN NOT NULL DEFAULT false,
  allow_files BOOLEAN NOT NULL DEFAULT false,
  allow_notes BOOLEAN NOT NULL DEFAULT false,
  allow_secrets BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User_id cheklovlarini olib tashlash
ALTER TABLE public.sections ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.sections DROP CONSTRAINT IF EXISTS sections_user_id_fkey;

-- RLS (xavfsizlik qoidalari) ni o'chirish — har kim erkin o'qib-yozishi uchun
ALTER TABLE public.sections DISABLE ROW LEVEL SECURITY;
GRANT ALL ON public.sections TO anon, authenticated, service_role;

-- 2. Items jadvali
CREATE TABLE IF NOT EXISTS public.items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  section_id UUID NOT NULL REFERENCES public.sections(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  login TEXT,
  secret TEXT,
  file_path TEXT,
  file_name TEXT,
  file_type TEXT,
  file_size BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User_id cheklovlarini olib tashlash
ALTER TABLE public.items ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.items DROP CONSTRAINT IF EXISTS items_user_id_fkey;

-- RLS ni o'chirish
ALTER TABLE public.items DISABLE ROW LEVEL SECURITY;
GRANT ALL ON public.items TO anon, authenticated, service_role;

CREATE INDEX IF NOT EXISTS items_section_idx ON public.items(section_id);

-- 3. Updated_at triggerlari
CREATE OR REPLACE FUNCTION public.update_updated_at_column() 
RETURNS TRIGGER AS $$ 
BEGIN 
  NEW.updated_at = now(); 
  RETURN NEW; 
END; 
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS sections_updated_at ON public.sections;
CREATE TRIGGER sections_updated_at BEFORE UPDATE ON public.sections FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS items_updated_at ON public.items;
CREATE TRIGGER items_updated_at BEFORE UPDATE ON public.items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Storage (Vault bucket)
INSERT INTO storage.buckets (id, name, public)
VALUES ('vault', 'vault', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Storage RLS siyosatlari (hamma uchun ochiq)
DROP POLICY IF EXISTS "Public vault all" ON storage.objects;
CREATE POLICY "Public vault all" ON storage.objects FOR ALL TO anon, authenticated, service_role USING (bucket_id = 'vault') WITH CHECK (bucket_id = 'vault');
