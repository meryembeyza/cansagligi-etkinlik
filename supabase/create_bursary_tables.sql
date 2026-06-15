-- Bursiyer zorunlu etkinlikleri tablosu
CREATE TABLE IF NOT EXISTS public.bursary_events (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    event_date TIMESTAMP WITH TIME ZONE NOT NULL,
    location VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Bursiyer etkinlik katılım (RSVP ve Yoklama) tablosu
CREATE TABLE IF NOT EXISTS public.bursary_attendances (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    event_id UUID REFERENCES public.bursary_events(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    rsvp_status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'attending', 'not_attending'
    excuse_text TEXT,
    has_attended BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(event_id, user_id) -- Bir kullanıcı bir etkinliğe sadece bir kez kayıt açabilir
);

-- RLS (Row Level Security) Aktifleştirme
ALTER TABLE public.bursary_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bursary_attendances ENABLE ROW LEVEL SECURITY;

-- Politikalar: Herkes etkinlikleri görebilir (Bursiyerler için)
CREATE POLICY "Everyone can view bursary_events" 
ON public.bursary_events FOR SELECT USING (true);

-- Politikalar: Bursiyerler kendi katılımlarını görebilir ve yönetebilir
CREATE POLICY "Users can view their own attendances" 
ON public.bursary_attendances FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own attendances" 
ON public.bursary_attendances FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own attendances" 
ON public.bursary_attendances FOR UPDATE USING (auth.uid() = user_id);

-- Yönetici Politikaları (Genel Yetkililer için tam erişim)
CREATE POLICY "Admins can manage bursary_events" 
ON public.bursary_events 
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE users.id = auth.uid() AND users.role = 'general_admin'
  )
);

CREATE POLICY "Admins can manage all attendances" 
ON public.bursary_attendances 
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE users.id = auth.uid() AND users.role = 'general_admin'
  )
);
