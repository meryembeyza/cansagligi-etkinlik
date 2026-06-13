-- ================================================================
-- TEMSİLCİ ONAY SİSTEMİ - YENİ RLS KURALLARI
-- Bu SQL'i Supabase Studio > SQL Editor'dan çalıştırın.
-- ================================================================

-- 1. Temsilcilik yöneticilerinin temsilci kayıtlarını onaylayabilmesi için UPDATE politikası
-- (rep_head, rep_coordinator: tüm temsilcileri onaylayabilir)
-- (rep_region_manager: sadece kendi bölgesindeki temsilcileri onaylayabilir)
CREATE POLICY "Rep leadership can approve representatives" ON public.users
    FOR UPDATE USING (
        role = 'representative'
        AND (
            public.get_auth_role() IN ('rep_head', 'rep_coordinator', 'general_admin')
            OR (
                public.get_auth_role() = 'rep_region_manager'
                AND public.get_auth_region() = region::text
            )
        )
    );

-- 2. Temsilcilik başkanı ve koordinatörü onaylanmamış temsilci kayıtlarını kalıcı olarak silebilir
CREATE POLICY "Rep head can delete unapproved representatives" ON public.users
    FOR DELETE USING (
        role = 'representative'
        AND NOT is_approved
        AND public.get_auth_role() IN ('rep_head', 'rep_coordinator', 'general_admin')
    );

-- 3. Temsilcilikler birimi yöneticileri onaylanmamış temsilci kayıtlarını da görebilsin
-- (Mevcut "System roles can view all profiles" politikası sadece onaylananları kapsıyorsa bunu ekleyin)
-- NOT: Eğer zaten görebiliyorlarsa bu policy çakışma yaratabilir. 
-- Güvenli yol: Mevcut politikayı güncellemek yerine ek bir SELECT politikası ekleyin.
DROP POLICY IF EXISTS "Rep leadership can view pending representatives" ON public.users;
CREATE POLICY "Rep leadership can view pending representatives" ON public.users
    FOR SELECT USING (
        role = 'representative'
        AND NOT is_approved
        AND (
            public.get_auth_role() IN ('rep_head', 'rep_coordinator', 'general_admin')
            OR (
                public.get_auth_role() = 'rep_region_manager'
                AND public.get_auth_region() = region::text
            )
        )
    );
