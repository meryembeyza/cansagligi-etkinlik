-- ==========================================
-- ENVANTER VE LOJİSTİK MODÜLLERİ (V4)
-- ==========================================

-- 1. inventory_items Tablosu
CREATE TABLE IF NOT EXISTS public.inventory_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    current_stock INT DEFAULT 0,
    unit TEXT DEFAULT 'adet',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Başlangıç verilerini ekle
INSERT INTO public.inventory_items (id, name, unit)
VALUES 
    (uuid_generate_v4(), 'Bez Çanta', 'adet'),
    (uuid_generate_v4(), 'Etiket', 'adet'),
    (uuid_generate_v4(), 'Rozet', 'adet'),
    (uuid_generate_v4(), 'Cepli Dosya', 'adet'),
    (uuid_generate_v4(), 'Defter', 'adet'),
    (uuid_generate_v4(), 'Kalem', 'adet'),
    (uuid_generate_v4(), 'Gönüllülük Broşürü', 'adet')
ON CONFLICT DO NOTHING;

-- 2. inventory_movements Tablosu
CREATE TABLE IF NOT EXISTS public.inventory_movements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    item_id UUID REFERENCES public.inventory_items(id) ON DELETE CASCADE,
    movement_type TEXT CHECK (movement_type IN ('giris', 'cikis')),
    quantity INT NOT NULL,
    event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
    destination_region TEXT,
    notes TEXT,
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. shipments (Kargo/Lojistik) Tablosu
CREATE TABLE IF NOT EXISTS public.shipments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sender_region TEXT, -- NULL ise Merkez'den gönderilmiştir
    recipient_region TEXT NOT NULL,
    recipient_name TEXT NOT NULL,
    recipient_university TEXT,
    recipient_address TEXT NOT NULL,
    recipient_phone TEXT,
    event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
    event_date DATE,
    items JSONB NOT NULL, -- Örn: [{"item_id": "uuid", "name": "Bez Çanta", "qty": 10}]
    status TEXT CHECK (status IN ('hazirlaniyor', 'gonderildi', 'teslim_edildi', 'iptal')) DEFAULT 'hazirlaniyor',
    shipped_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    notes TEXT,
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- ROW LEVEL SECURITY (RLS) POLİTİKALARI
-- ==========================================

ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;

-- inventory_items (Herkes görebilir, sadece admin/resource_manager ekleyebilir/silebilir ama şimdilik statik olduğu için herkes SELECT yapabilir)
CREATE POLICY "Herkes envanter kalemlerini görebilir" ON public.inventory_items FOR SELECT USING (true);
CREATE POLICY "Sadece resource_manager ve general_admin item guncelleyebilir" ON public.inventory_items FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() AND role IN ('general_admin', 'resource_manager')
    )
);

-- inventory_movements
-- Admin ve Resource Manager her şeyi görür
CREATE POLICY "Admin ve RM hareketleri gorebilir" ON public.inventory_movements FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() AND role IN ('general_admin', 'resource_manager')
    )
);

-- Bölge yetkilileri sadece kendi bölgelerine olan çıkışları görebilir veya kendi oluşturdukları hareketleri görebilir
CREATE POLICY "Bolge yetkilileri kendi hareketlerini gorebilir" ON public.inventory_movements FOR SELECT USING (
    created_by = auth.uid() OR
    destination_region = (SELECT region::text FROM public.users WHERE id = auth.uid())
);

-- Yeni hareket ekleme (Sadece yetkili roller eklemeli)
CREATE POLICY "Admin ve RM hareket ekleyebilir" ON public.inventory_movements FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() AND role IN ('general_admin', 'resource_manager')
    )
);

-- shipments
-- Admin ve Resource Manager her kargoyu görür
CREATE POLICY "Admin ve RM kargolari gorebilir" ON public.shipments FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() AND role IN ('general_admin', 'resource_manager')
    )
);

-- Bölge yetkilileri sadece kendi bölgelerine gelen veya kendi bölgelerinden çıkan kargoları görebilir
CREATE POLICY "Bolge yetkilileri kendi kargolarini gorebilir" ON public.shipments FOR SELECT USING (
    recipient_region = (SELECT region::text FROM public.users WHERE id = auth.uid()) OR
    sender_region = (SELECT region::text FROM public.users WHERE id = auth.uid()) OR
    created_by = auth.uid()
);

-- Yeni kargo ekleme ve güncelleme
CREATE POLICY "Admin ve RM kargo ekleyip guncelleyebilir" ON public.shipments FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() AND role IN ('general_admin', 'resource_manager')
    )
);
