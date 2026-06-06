ALTER TABLE public.users ADD COLUMN IF NOT EXISTS avatar_url text;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS poster_url text;
