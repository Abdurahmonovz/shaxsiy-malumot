-- ========================================================================
-- SHAXSIY SEYF: Barcha jadvallar, xavfsizlik qoidalari va storage
-- Ushbu SQL kodni Supabase Dashboard -> SQL Editor ga qo'yib, RUN tugmasini bosing!
-- ========================================================================

-- 1. Sections (Bo'limlar) jadvali
CREATE TABLE IF NOT EXISTS public.sections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
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

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sections TO authenticated;
GRANT ALL ON public.sections TO service_role;
ALTER TABLE public.sections ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'sections' AND policyname = 'Owner manages sections'
  ) THEN
    CREATE POLICY "Owner manages sections" ON public.sections FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- 2. Items (Ma'lumotlar / Parollar / Fayllar) jadvali
CREATE TABLE IF NOT EXISTS public.items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
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

GRANT SELECT, INSERT, UPDATE, DELETE ON public.items TO authenticated;
GRANT ALL ON public.items TO service_role;
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'items' AND policyname = 'Owner manages items'
  ) THEN
    CREATE POLICY "Owner manages items" ON public.items FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS items_section_idx ON public.items(section_id);
CREATE INDEX IF NOT EXISTS items_user_idx ON public.items(user_id);

-- 3. Updated_at avtomatik yangilash triggerlari
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

-- 4. Vault Storage (Fayllar va rasmlar uchun xotira)
INSERT INTO storage.buckets (id, name, public)
VALUES ('vault', 'vault', false)
ON CONFLICT (id) DO NOTHING;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Owner reads own vault files') THEN
    CREATE POLICY "Owner reads own vault files" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'vault' AND auth.uid()::text = (storage.foldername(name))[1]);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Owner uploads own vault files') THEN
    CREATE POLICY "Owner uploads own vault files" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'vault' AND auth.uid()::text = (storage.foldername(name))[1]);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Owner updates own vault files') THEN
    CREATE POLICY "Owner updates own vault files" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'vault' AND auth.uid()::text = (storage.foldername(name))[1]);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Owner deletes own vault files') THEN
    CREATE POLICY "Owner deletes own vault files" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'vault' AND auth.uid()::text = (storage.foldername(name))[1]);
  END IF;
END $$;
