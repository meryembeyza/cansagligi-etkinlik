-- Kullanıcılar (users) tablosuna eksik olan sütunları ekleme
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS department TEXT,
ADD COLUMN IF NOT EXISTS grade TEXT,
ADD COLUMN IF NOT EXISTS club_duty TEXT,
ADD COLUMN IF NOT EXISTS nsosyal_account TEXT;
