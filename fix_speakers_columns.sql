-- Konuşmacılar (speakers) tablosuna eksik olan sütunları ekleme
ALTER TABLE public.speakers 
ADD COLUMN IF NOT EXISTS about TEXT,
ADD COLUMN IF NOT EXISTS social_links TEXT[];
