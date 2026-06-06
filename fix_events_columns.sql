-- Etkinlikler (events) tablosuna yönetici notu sütununu ekleme
ALTER TABLE public.events
ADD COLUMN IF NOT EXISTS admin_notes TEXT;
