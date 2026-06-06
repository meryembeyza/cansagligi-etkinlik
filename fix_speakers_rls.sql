-- Konuşmacılar (speakers) tablosu için RLS politikaları
CREATE POLICY "Everyone can view speakers" ON public.speakers
    FOR SELECT USING (true);

CREATE POLICY "Everyone can insert speakers" ON public.speakers
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Everyone can update speakers" ON public.speakers
    FOR UPDATE USING (true);

-- Etkinlik-Konuşmacı ilişkisi (event_speakers) tablosu için RLS politikaları
CREATE POLICY "Everyone can view event_speakers" ON public.event_speakers
    FOR SELECT USING (true);

CREATE POLICY "Everyone can insert event_speakers" ON public.event_speakers
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Everyone can update event_speakers" ON public.event_speakers
    FOR UPDATE USING (true);
