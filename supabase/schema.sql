-- Cansağlığı Vakfı Etkinlik Yönetim Sistemi Veritabanı Şeması
-- Bu scripti Supabase kontrol panelindeki "SQL Editor" bölümüne yapıştırıp çalıştırınız.

-- ÖNCEKİ TABLOLARI VE TİPLERİ SIFIRLAMA (Hataları önlemek için)
DROP TABLE IF EXISTS public.envanter_requests CASCADE;
DROP TABLE IF EXISTS public.representative_recommendations CASCADE;
DROP TABLE IF EXISTS public.rep_communications CASCADE;
DROP TABLE IF EXISTS public.representative_profiles CASCADE;
DROP TABLE IF EXISTS public.audit_logs CASCADE;
DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.post_event_reports CASCADE;
DROP TABLE IF EXISTS public.poster_requests CASCADE;
DROP TABLE IF EXISTS public.resource_reservations CASCADE;
DROP TABLE IF EXISTS public.resources CASCADE;
DROP TABLE IF EXISTS public.event_speakers CASCADE;
DROP TABLE IF EXISTS public.speakers CASCADE;
DROP TABLE IF EXISTS public.event_revisions CASCADE;
DROP TABLE IF EXISTS public.events CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

DROP TYPE IF EXISTS rep_status_enum CASCADE;
DROP TYPE IF EXISTS poster_status CASCADE;
DROP TYPE IF EXISTS reservation_status CASCADE;
DROP TYPE IF EXISTS resource_type CASCADE;
DROP TYPE IF EXISTS event_status CASCADE;
DROP TYPE IF EXISTS region_enum CASCADE;
DROP TYPE IF EXISTS user_role CASCADE;

-- ENUMLAR (Veri Tipleri)
CREATE TYPE user_role AS ENUM ('unit_head', 'region_manager', 'general_admin', 'design_team', 'resource_manager', 'rep_head', 'rep_region_manager', 'rep_coordinator', 'representative', 'bursary_student');
CREATE TYPE region_enum AS ENUM ('İstanbul Anadolu', 'İstanbul Avrupa', 'Marmara', 'Ege', 'İç Anadolu', 'Ankara', 'Doğu Anadolu', 'Güneydoğu Anadolu', 'Akdeniz', 'Karadeniz');
CREATE TYPE event_status AS ENUM ('Taslak', 'Onay Bekliyor', 'Onaylandı', 'Reddedildi', 'Yeniden Onay Bekliyor', 'Revizyon Bekleniyor', 'Ertelendi', 'İptal Edildi', 'Gerçekleşti');
CREATE TYPE resource_type AS ENUM ('Maket', 'Projeksiyon', 'Araç', 'Eşantiyon', 'Serbest');
CREATE TYPE reservation_status AS ENUM ('Talep Edildi', 'Onaylandı', 'Reddedildi');
CREATE TYPE poster_status AS ENUM ('Bekliyor', 'Hazırlanıyor', 'Tamamlandı', 'Revizyon Gerekli');

-- 1. KULLANICILAR (Supabase Auth ile senkronize çalışır)
CREATE TABLE public.users (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    student_id TEXT,
    role user_role NOT NULL,
    region region_enum,
    university TEXT,
    unit_name TEXT,
    phone_number TEXT NOT NULL,
    department TEXT,
    grade TEXT,
    club_duty TEXT,
    nsosyal_account TEXT,
    kvkk_approved BOOLEAN DEFAULT false,
    is_approved BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    -- Birim sorumluları (unit_head) ve temsilciler (representative) için üniversite ve bölge zorunludur
    CONSTRAINT check_university_region_required CHECK (
        (role NOT IN ('unit_head', 'representative')) OR (
            university IS NOT NULL AND university <> '' AND
            region IS NOT NULL
        )
    )
);

-- 2. ETKİNLİKLER
CREATE TABLE public.events (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    created_by UUID REFERENCES public.users(id),
    unit_name TEXT NOT NULL,
    university TEXT NOT NULL,
    region region_enum NOT NULL,
    
    event_name TEXT NOT NULL,
    event_type TEXT NOT NULL, -- Panel, Konferans vb.
    target_audience TEXT[], -- ['kulüp üyeleri', 'dış katılımcılar']
    event_purpose TEXT,
    program_flow JSONB, -- Saat bazlı akış [{time: '10:00', desc: 'Açılış'}]
    location TEXT,
    event_date TIMESTAMP WITH TIME ZONE NOT NULL,
    expected_participants INTEGER,
    budget_request TEXT,
    prereg_required BOOLEAN DEFAULT false,
    admin_notes TEXT,
    
    status event_status DEFAULT 'Taslak' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ETKİNLİK REVİZYON GEÇMİŞİ (Önceki veriyi tutmak için)
CREATE TABLE public.event_revisions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
    revision_data JSONB NOT NULL, -- Etkinliğin o anki tam kopyası
    requested_by UUID REFERENCES public.users(id),
    revision_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. KONUŞMACILAR
CREATE TABLE public.speakers (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    full_name TEXT NOT NULL,
    title TEXT NOT NULL,
    cv_file_url TEXT,
    linkedin_url TEXT,
    about TEXT,
    social_links TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ETKİNLİK - KONUŞMACI İLİŞKİSİ
CREATE TABLE public.event_speakers (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
    speaker_id UUID REFERENCES public.speakers(id),
    select_reason TEXT,
    contact_method TEXT,
    status VARCHAR DEFAULT 'Bekliyor',
    is_cancelled BOOLEAN DEFAULT false,
    cancel_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. KAYNAKLAR (Lojistik)
CREATE TABLE public.resources (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    type resource_type NOT NULL,
    manager_id UUID REFERENCES public.users(id),
    total_count INTEGER DEFAULT 1,
    is_consumable BOOLEAN DEFAULT false, -- Eşantiyon gibi stoktan düşecekler için true, maket için false
    is_available BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- KAYNAK REZERVASYONLARI
CREATE TABLE public.resource_reservations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    resource_id UUID REFERENCES public.resources(id),
    event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
    request_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE, -- Saat bazlı çakışmalar için
    status reservation_status DEFAULT 'Talep Edildi',
    alternative_date TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. AFİŞ TALEPLERİ
CREATE TABLE public.poster_requests (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
    status poster_status DEFAULT 'Bekliyor',
    required_logos TEXT,
    special_instructions TEXT,
    designer_notes TEXT,
    file_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. ETKİNLİK SONRASI RAPORLAR
CREATE TABLE public.post_event_reports (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
    actual_participants INTEGER NOT NULL,
    drive_link TEXT NOT NULL,
    social_link TEXT,
    feedback TEXT NOT NULL,
    resource_issues TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. BİLDİRİMLER
CREATE TABLE public.notifications (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    event_id UUID REFERENCES public.events(id) ON DELETE CASCADE, -- Opsiyonel
    message TEXT NOT NULL,
    type TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. DENETİM KAYDI (Audit Log)
CREATE TABLE public.audit_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id),
    action TEXT NOT NULL,
    table_name TEXT NOT NULL,
    old_data JSONB,
    new_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS (Row Level Security) Aktifleştirme
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.speakers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_speakers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resource_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poster_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_event_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- ************************************************************
-- RLS YARDIMCI FONKSİYONLARI (Sonsuz Döngüyü Engellemek İçin)
-- ************************************************************
-- Bu fonksiyonlar SECURITY DEFINER olarak çalışır, böylece RLS kısıtlamalarına takılmadan
-- giriş yapmış kullanıcının rolünü, bölgesini ve birimini güvenli bir şekilde okuyabiliriz.

CREATE OR REPLACE FUNCTION public.get_auth_role() RETURNS text AS $$
  SELECT role::text FROM public.users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_auth_region() RETURNS text AS $$
  SELECT region::text FROM public.users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_auth_unit_name() RETURNS text AS $$
  SELECT unit_name FROM public.users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;


-- ************************************************************
-- RLS POLİTİKALARI (AŞAMA 1)
-- ************************************************************

-- 1. USERS TABLOSU
CREATE POLICY "Users can view own profile" ON public.users
    FOR SELECT USING (auth.uid() = id);

-- Yöneticiler (general_admin) herkesin profilini okuyabilir ve güncelleyebilir.
CREATE POLICY "Admins can view all profiles" ON public.users
    FOR SELECT USING (public.get_auth_role() = 'general_admin');

CREATE POLICY "Admins can update all profiles" ON public.users
    FOR UPDATE USING (public.get_auth_role() = 'general_admin');
    
-- Auth üzerinden kayıt olan herkes users tablosuna INSERT yapabilir.
CREATE POLICY "Users can insert their own profile" ON public.users
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Yetkili Birim/Bölge rolleri ilgili kullanıcıların profillerini görebilir.
CREATE POLICY "System roles can view all profiles" ON public.users
    FOR SELECT USING (
        -- Kendi profili
        auth.uid() = id
        OR
        -- Genel Yetkili her şeyi görür
        public.get_auth_role() = 'general_admin'
        OR
        -- Kaynak yöneticisi ve Tasarım ekibi tüm kullanıcıları görebilir (iletişim için)
        public.get_auth_role() IN ('resource_manager', 'design_team')
        OR
        -- Temsilcilikler Birimi Başkanı veya Koordinatörü tüm temsilcileri görebilir
        (
            public.get_auth_role() IN ('rep_head', 'rep_coordinator')
            AND role = 'representative'
        )
        OR
        -- Temsilcilikler Birimi Bölge Sorumlusu kendi bölgesindeki temsilcileri görebilir
        (
            public.get_auth_role() = 'rep_region_manager' 
            AND public.get_auth_region() = region::text
            AND role = 'representative'
        )
        OR
        -- Bir bölge sorumlusu kendi bölgesindeki kendi birim sorumlularını görebilir
        (
            public.get_auth_role() = 'region_manager' 
            AND public.get_auth_region() = region::text 
            AND public.get_auth_unit_name() = unit_name 
            AND role = 'unit_head'
        )
    );

-- 2. EVENTS (ETKİNLİKLER) TABLOSU
-- Herkes (unit_head hariç) tüm etkinlikleri görebilir. unit_head sadece kendi etkinliklerini.
CREATE POLICY "Event view policy" ON public.events
    FOR SELECT USING (
        created_by = auth.uid() -- unit_head veya etkinliği oluşturan kişi
        OR public.get_auth_role() IN ('general_admin', 'resource_manager', 'design_team', 'rep_coordinator', 'rep_head')
        -- Temsilcilikler Birimi Bölge Sorumlusu kendi bölgesindeki temsilci etkinliklerini görsün
        OR (public.get_auth_role() = 'rep_region_manager' AND public.get_auth_region() = region::text)
        -- Normal Bölge Sorumlusu kuralları:
        -- 1. Kendi bölgesindeki kendi biriminin TÜM etkinliklerini (onay kuyruğu dahil) görebilir.
        -- 2. Diğer bölgelerdeki aynı birimin SADECE Onaylandı/Gerçekleşti etkinliklerini görebilir (salt okunur).
        -- NOT: Onaylama yetkisi UPDATE policy ile yalnızca kendi bölgesiyle sınırlıdır.
        OR (
          public.get_auth_role() = 'region_manager' 
          AND public.get_auth_unit_name() = unit_name 
          AND (
            public.get_auth_region() = region::text 
            OR status IN ('Onaylandı', 'Gerçekleşti')
          )
        )
    );

CREATE POLICY "Authorized roles can insert events" ON public.events
    FOR INSERT WITH CHECK (
        created_by = auth.uid() 
        AND public.get_auth_role() IN ('unit_head', 'representative', 'rep_region_manager', 'rep_coordinator', 'rep_head', 'general_admin')
    );

-- Bölge sorumlusu ve Genel yetkili tüm etkinlikleri güncelleyebilir (içerik dahil), unit_head kendi etkinliğini güncelleyebilir.
CREATE POLICY "Event update policy" ON public.events
    FOR UPDATE USING (
        created_by = auth.uid()
        OR public.get_auth_role() IN ('general_admin', 'rep_head', 'rep_coordinator')
        OR (public.get_auth_role() = 'rep_region_manager' AND public.get_auth_region() = region::text)
        OR (public.get_auth_role() = 'region_manager' AND public.get_auth_region() = region::text AND public.get_auth_unit_name() = unit_name)
    );

-- 3. EVENT REVISIONS TABLOSU
CREATE POLICY "Revisions view policy" ON public.event_revisions
    FOR SELECT USING (
        requested_by = auth.uid()
        OR public.get_auth_role() = 'general_admin'
        OR (
            public.get_auth_role() = 'region_manager' 
            AND public.get_auth_region() = (SELECT region::text FROM public.events WHERE id = public.event_revisions.event_id) 
            AND public.get_auth_unit_name() = (SELECT unit_name FROM public.events WHERE id = public.event_revisions.event_id)
        )
    );

CREATE POLICY "Revisions insert policy" ON public.event_revisions
    FOR INSERT WITH CHECK (
        public.get_auth_role() IN ('general_admin', 'unit_head')
        OR (
            public.get_auth_role() = 'region_manager' 
            AND public.get_auth_region() = (SELECT region::text FROM public.events WHERE id = public.event_revisions.event_id) 
            AND public.get_auth_unit_name() = (SELECT unit_name FROM public.events WHERE id = public.event_revisions.event_id)
        )
    );

-- 4. RESOURCES (KAYNAKLAR) TABLOSU
CREATE POLICY "Everyone can view resources" ON public.resources
    FOR SELECT USING (true);

-- KONUŞMACILAR VE ETKİNLİK KONUŞMACILARI İÇİN POLİTİKALAR
CREATE POLICY "Everyone can view speakers" ON public.speakers
    FOR SELECT USING (true);

CREATE POLICY "Everyone can insert speakers" ON public.speakers
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Everyone can update speakers" ON public.speakers
    FOR UPDATE USING (true);

CREATE POLICY "Everyone can view event_speakers" ON public.event_speakers
    FOR SELECT USING (true);

CREATE POLICY "Only event owner can insert speakers" ON public.event_speakers
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM public.events WHERE id = event_id AND created_by = auth.uid())
    );

CREATE POLICY "Only event owner can update speakers" ON public.event_speakers
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM public.events WHERE id = event_id AND created_by = auth.uid())
    );


-- 5. RESOURCE RESERVATIONS (KAYNAK REZERVASYONLARI)
CREATE POLICY "Reservation view policy" ON public.resource_reservations
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.events WHERE id = event_id AND created_by = auth.uid()) -- Kendi etkinliği
        OR public.get_auth_role() IN ('region_manager', 'general_admin', 'resource_manager')
    );

CREATE POLICY "Unit head can request reservation" ON public.resource_reservations
    FOR INSERT WITH CHECK (
        public.get_auth_role() = 'unit_head'
    );

CREATE POLICY "Resource manager and admin can update reservations" ON public.resource_reservations
    FOR UPDATE USING (
        public.get_auth_role() IN ('resource_manager', 'general_admin')
    );

-- 6. POSTER REQUESTS (AFİŞ TALEPLERİ)
CREATE POLICY "Poster view policy" ON public.poster_requests
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.events WHERE id = event_id AND created_by = auth.uid()) -- Kendi etkinliği
        OR public.get_auth_role() IN ('region_manager', 'general_admin', 'design_team')
    );

CREATE POLICY "Poster update policy" ON public.poster_requests
    FOR UPDATE USING (
        public.get_auth_role() IN ('design_team', 'general_admin', 'unit_head', 'region_manager')
    );

CREATE POLICY "Poster insert policy" ON public.poster_requests
    FOR INSERT WITH CHECK (true); -- Trigger üzerinden veya uygulama içinden

-- 7. POST EVENT REPORTS (ETKİNLİK SONRASI RAPORLAR)
CREATE POLICY "Post event report view policy" ON public.post_event_reports
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.events WHERE id = event_id AND created_by = auth.uid())
        OR public.get_auth_role() IN ('region_manager', 'general_admin', 'resource_manager', 'design_team')
    );

CREATE POLICY "Creator can insert report" ON public.post_event_reports
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM public.events WHERE id = event_id AND created_by = auth.uid())
    );

CREATE POLICY "Update reports policy" ON public.post_event_reports
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM public.events WHERE id = event_id AND created_by = auth.uid())
        OR public.get_auth_role() IN ('region_manager', 'general_admin')
    );

-- 8. NOTIFICATIONS (BİLDİRİMLER)
CREATE POLICY "Users view own notifications" ON public.notifications
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications" ON public.notifications
    FOR UPDATE USING (user_id = auth.uid());
    
CREATE POLICY "System can insert notifications" ON public.notifications
    FOR INSERT WITH CHECK (true);

-- 9. STORAGE BUCKETS (DEPOLAMA ALANLARI)
-- Afiş dosyaları için 'posters' adında bir bucket (kovası) oluşturulur.
-- Supabase Studio üzerinden manuel olarak da Storage -> New Bucket diyerek 'posters' isminde Public bir bucket oluşturabilirsiniz.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'posters',
  'posters',
  true,
  15728640, -- 15 MB in bytes (15 * 1024 * 1024)
  ARRAY['image/jpeg', 'image/png', 'application/pdf']::text[]
) ON CONFLICT (id) DO UPDATE SET 
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Storage RLS Politikaları (Mevcut policy'leri önce sil, sonra yeniden oluştur)
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Design Team Upload Access" ON storage.objects;
DROP POLICY IF EXISTS "Design Team Update Access" ON storage.objects;
DROP POLICY IF EXISTS "Design Team Delete Access" ON storage.objects;

CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'posters' );

CREATE POLICY "Design Team Upload Access"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'posters' AND public.get_auth_role() = 'design_team' );

CREATE POLICY "Design Team Update Access"
ON storage.objects FOR UPDATE
USING ( bucket_id = 'posters' AND public.get_auth_role() = 'design_team' );

CREATE POLICY "Design Team Delete Access"
ON storage.objects FOR DELETE
USING ( bucket_id = 'posters' AND public.get_auth_role() = 'design_team' );

-- 10. TRIGGERS
-- Trigger to delete poster requests when parent event status becomes 'Reddedildi'
CREATE OR REPLACE FUNCTION public.delete_poster_request_on_rejection()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'Reddedildi' THEN
    DELETE FROM public.poster_requests WHERE event_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER tr_delete_poster_request_on_rejection
AFTER UPDATE ON public.events
FOR EACH ROW
EXECUTE FUNCTION public.delete_poster_request_on_rejection();

-- 11. TEMSİLCİLİKLER BİRİMİ (REPRESENTATIVES)
-- Not: rep_status_enum script başında zaten drop edildi
CREATE TYPE rep_status_enum AS ENUM ('Aktif', 'Pasif', 'Mezun');

CREATE TABLE public.representative_profiles (
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE PRIMARY KEY,
    status rep_status_enum DEFAULT 'Aktif' NOT NULL,
    start_date DATE DEFAULT CURRENT_DATE,
    end_date DATE,
    last_contact_date TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.rep_communications (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    representative_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    channel TEXT NOT NULL, -- 'WhatsApp', 'Email', 'SMS', 'Yüzyüze'
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS Politikaları (Temsilcilikler Birimi)
ALTER TABLE public.representative_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rep_communications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Herkes kendi profilini gorebilir" ON public.representative_profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Yoneticiler tum profilleri gorebilir" ON public.representative_profiles FOR ALL USING (
    public.get_auth_role() IN ('general_admin', 'rep_head', 'rep_coordinator')
    OR (
        public.get_auth_role() = 'rep_region_manager' 
        AND public.get_auth_region() = (SELECT region::text FROM public.users WHERE id = public.representative_profiles.user_id)
    )
);

CREATE POLICY "Temsilci iletisim gecmisini gorebilir" ON public.rep_communications FOR SELECT USING (auth.uid() = representative_id);
CREATE POLICY "Yoneticiler iletisim gecmisini yonetebilir" ON public.rep_communications FOR ALL USING (
    public.get_auth_role() IN ('general_admin', 'rep_head', 'rep_coordinator')
    OR (
        public.get_auth_role() = 'rep_region_manager' 
        AND public.get_auth_region() = (SELECT region::text FROM public.users WHERE id = public.rep_communications.representative_id)
    )
);

-- 12. TEMSİLCİ ÖNERİLERİ (REPRESENTATIVE RECOMMENDATIONS)
CREATE TABLE IF NOT EXISTS public.representative_recommendations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    recommended_by UUID REFERENCES public.users(id) ON DELETE CASCADE,
    candidate_name TEXT NOT NULL,
    candidate_phone TEXT NOT NULL,
    candidate_email TEXT,
    candidate_university TEXT,
    candidate_department TEXT,
    candidate_grade TEXT,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.representative_recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Rep recommendations visible to rep leadership" ON public.representative_recommendations
    FOR SELECT USING (
        auth.uid() = recommended_by
        OR public.get_auth_role() IN ('general_admin', 'rep_head', 'rep_coordinator', 'rep_region_manager')
    );

CREATE POLICY "Representatives can insert recommendations" ON public.representative_recommendations
    FOR INSERT WITH CHECK (auth.uid() = recommended_by);

-- 13. ENVANTER TALEPLERİ (INVENTORY REQUESTS)
CREATE TABLE IF NOT EXISTS public.envanter_requests (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    representative_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    talep_tarihi TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    gerekli_tarih DATE NOT NULL,
    status TEXT DEFAULT 'Bekliyor', -- 'Bekliyor', 'Onaylandı', 'Reddedildi'
    bez_canta INTEGER DEFAULT 0,
    rozet INTEGER DEFAULT 0,
    etiket INTEGER DEFAULT 0,
    defter INTEGER DEFAULT 0,
    kalem INTEGER DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.envanter_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Rep can view own inventory requests" ON public.envanter_requests
    FOR SELECT USING (auth.uid() = representative_id);

CREATE POLICY "Rep leadership can view all inventory requests" ON public.envanter_requests
    FOR SELECT USING (
        public.get_auth_role() IN ('general_admin', 'rep_head', 'rep_coordinator')
        OR (
            public.get_auth_role() = 'rep_region_manager'
            AND public.get_auth_region() = (SELECT region::text FROM public.users WHERE id = public.envanter_requests.representative_id)
        )
    );

CREATE POLICY "Rep can insert inventory requests" ON public.envanter_requests
    FOR INSERT WITH CHECK (auth.uid() = representative_id);

CREATE POLICY "Rep leadership can update inventory requests" ON public.envanter_requests
    FOR UPDATE USING (
        public.get_auth_role() IN ('general_admin', 'rep_head', 'rep_coordinator', 'rep_region_manager')
    );
