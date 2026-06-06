-- Konuşmacı durumu ve iptal nedenlerini takip etmek için gerekli sütunları ekleme
ALTER TABLE public.event_speakers
ADD COLUMN IF NOT EXISTS status VARCHAR DEFAULT 'Bekliyor',
ADD COLUMN IF NOT EXISTS is_cancelled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS cancel_reason TEXT;
