'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { ChevronLeft } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    fullName: '',
    studentId: '',
    email: '',
    phone: '+90',
    university: '',
    region: '',
    unitName: '',
    role: '',
    department: '',
    grade: '',
    clubDuty: '',
    nsosyalAccount: '',
    password: '',
    passwordConfirm: '',
    kvkkApproved: false
  });

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value;
    if (!val.startsWith('+90')) {
      val = '+90' + val.replace(/^\+90/, '');
    }
    setFormData({ ...formData, phone: val });
  };

  // Temsilcilik rolleri seçildiğinde birimi otomatik ayarla
  const REP_ROLES = ['rep_head', 'rep_region_manager', 'rep_coordinator', 'representative'];
  const isRepRole = REP_ROLES.includes(formData.role);

  const handleRoleChange = (newRole: string) => {
    const isRep = REP_ROLES.includes(newRole);
    setFormData(prev => ({
      ...prev,
      role: newRole,
      unitName: isRep ? 'Temsilcilikler Birimi' : prev.unitName
    }));
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (formData.password !== formData.passwordConfirm) {
      setError('Şifreler eşleşmiyor.');
      return;
    }

    if (!formData.kvkkApproved) {
      setError('Devam edebilmek için KVKK metnini onaylamalısınız.');
      return;
    }

    // Birim sorumluları için üniversite ve bölge zorunludur
    if (formData.role === 'unit_head' && (!formData.university.trim() || !formData.region)) {
      setError('Birim sorumluları için üniversite ve bölge alanları zorunludur.');
      return;
    }

    // Temsilciler için üniversite ve bölge zorunludur
    if (formData.role === 'representative' && (!formData.university.trim() || !formData.region)) {
      setError('Temsilciler için üniversite ve bölge alanları zorunludur.');
      return;
    }

    setIsLoading(true);

    try {
      // 1. Create user in Supabase Auth
      const sanitizedEmail = formData.email.trim().toLowerCase();
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: sanitizedEmail,
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName,
          }
        }
      });

      if (authError) throw authError;

      // 2. Insert into public.users (is_approved defaults to false)
      if (authData.user) {
        const { error: dbError } = await supabase.from('users').insert([{
          id: authData.user.id,
          full_name: formData.fullName,
          email: sanitizedEmail,
          student_id: formData.studentId || null,
          phone_number: formData.phone,
          university: formData.university,
          region: formData.region,
          unit_name: formData.unitName,
          role: formData.role,
          department: formData.department || null,
          grade: formData.grade || null,
          club_duty: formData.clubDuty || null,
          nsosyal_account: formData.nsosyalAccount || null,
          kvkk_approved: formData.kvkkApproved,
          is_approved: false // Bekleme odası mantığı
        }]);

        if (dbError) throw dbError;
        
        setSuccess(true);
      }
    } catch (err: any) {
      setError(err.message || 'Kayıt olurken bir hata oluştu.');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f9fafb', padding: '1rem' }}>
        <div className="card" style={{ maxWidth: '500px', width: '100%', padding: '3rem 2rem', textAlign: 'center' }}>
          <div style={{ width: '64px', height: '64px', backgroundColor: 'var(--color-primary-light)', color: 'var(--color-primary)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', margin: '0 auto 1.5rem' }}>✓</div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem' }}>Kaydınız Alınmıştır</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
            Hesabınız sistem yöneticisi (Genel Yetkili) tarafından onaylandıktan sonra sisteme giriş yapabilirsiniz. Onay durumunuzla ilgili WhatsApp üzerinden bilgilendirileceksiniz.
          </p>
          <Link href="/login" className="btn btn-primary" style={{ width: '100%' }}>
            Giriş Ekranına Dön
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb', padding: '2rem 1rem' }}>
      <div className="card" style={{ maxWidth: '800px', margin: '0 auto', padding: '2.5rem' }}>
        
        <Link href="/login" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', textDecoration: 'none', marginBottom: '2rem', fontSize: '0.875rem' }}>
          <ChevronLeft size={16} /> Giriş Ekranına Dön
        </Link>

        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <img src="/logo.png" alt="Cansağlığı Logo" style={{ height: '50px', objectFit: 'contain', margin: '0 auto 1rem' }} />
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1a202c' }}>Sisteme Kayıt Ol</h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>Yetkili onayından sonra giriş yapabileceksiniz.</p>
        </div>

        {error && (
          <div style={{ backgroundColor: '#fef2f2', color: '#991b1b', padding: '1rem', borderRadius: 'var(--radius-md)', fontSize: '0.875rem', marginBottom: '2rem', border: '1px solid #fecaca' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Section 1: Kimlik */}
          <div>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 600, borderBottom: '1px solid #eaeaea', paddingBottom: '0.5rem', marginBottom: '1rem' }}>1. Temel Kimlik Bilgileri</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label className="label">Ad - Soyad *</label>
                <input type="text" required className="input" placeholder="Örn: Ali Yılmaz" value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} />
              </div>
              <div>
                <label className="label">Öğrenci Numarası</label>
                <input type="text" className="input" placeholder="Opsiyonel" value={formData.studentId} onChange={e => setFormData({...formData, studentId: e.target.value})} />
              </div>
            </div>
          </div>

          {/* Section 2: İletişim */}
          <div>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 600, borderBottom: '1px solid #eaeaea', paddingBottom: '0.5rem', marginBottom: '1rem' }}>2. İletişim Bilgileri</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label className="label">E-posta Adresi *</label>
                <input type="email" required className="input" placeholder="ornek@edu.tr" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
              </div>
              <div>
                <label className="label">Telefon Numarası * (WhatsApp)</label>
                <input type="text" required className="input" value={formData.phone} onChange={handlePhoneChange} placeholder="+90 5XX XXX XX XX" />
              </div>
            </div>
          </div>

          {/* Section 3: Kurumsal */}
          <div>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 600, borderBottom: '1px solid #eaeaea', paddingBottom: '0.5rem', marginBottom: '1rem' }}>3. Kurumsal Yetki Bilgileri</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label className="label">Üniversite *</label>
                <input type="text" required className="input" placeholder="Örn: Boğaziçi Üniversitesi" value={formData.university} onChange={e => setFormData({...formData, university: e.target.value})} />
              </div>
              <div>
                <label className="label">Bölge *</label>
                <select required className="input" value={formData.region} onChange={e => setFormData({...formData, region: e.target.value})}>
                  <option value="">Seçiniz...</option>
                  <option value="İstanbul Avrupa">İstanbul Avrupa</option>
                  <option value="İstanbul Anadolu">İstanbul Anadolu</option>
                  <option value="Marmara">Marmara</option>
                  <option value="Ege">Ege</option>
                  <option value="İç Anadolu">İç Anadolu</option>
                  <option value="Ankara">Ankara</option>
                  <option value="Doğu Anadolu">Doğu Anadolu</option>
                  <option value="Güneydoğu Anadolu">Güneydoğu Anadolu</option>
                  <option value="Akdeniz">Akdeniz</option>
                  <option value="Karadeniz">Karadeniz</option>
                </select>
              </div>
              <div>
                <label className="label">Bağlı Olduğu Birim *</label>
                {isRepRole ? (
                  <div className="input" style={{ backgroundColor: '#f0fdf4', color: '#166534', fontWeight: 600, cursor: 'not-allowed', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    🤝 Temsilcilikler Birimi
                  </div>
                ) : (
                  <select required className="input" value={formData.unitName} onChange={e => setFormData({...formData, unitName: e.target.value})}>
                    <option value="">Seçiniz...</option>
                    <option value="Sosyal Çalışmalar Birimi">Sosyal Çalışmalar Birimi</option>
                    <option value="Mesleki ve Kariyer Çalışmaları Birimi">Mesleki ve Kariyer Çalışmaları Birimi</option>
                    <option value="Bilimsel ve Akademik Çalışmalar Birimi">Bilimsel ve Akademik Çalışmalar Birimi</option>
                    <option value="İletişim ve Planlama Birimi">İletişim ve Planlama Birimi</option>
                    <option value="Temsilcilikler Birimi">Temsilcilikler Birimi</option>
                    <option value="Bursiyer">Bursiyer (Birim Yok)</option>
                  </select>
                )}
              </div>
              <div>
                <label className="label">Görev / Rol *</label>
                <select required className="input" value={formData.role} onChange={e => handleRoleChange(e.target.value)}>
                  <option value="">Seçiniz...</option>
                  <option value="unit_head">Birim Başkanı (Birim Sorumlusu)</option>
                  <option value="region_manager">Bölge Sorumlusu</option>
                  <option value="general_admin">Genel Yetkili</option>
                  <option value="design_team">Tasarım Ekibi</option>
                  <option value="resource_manager">Kaynak Sorumlusu</option>
                  <option value="rep_head">Temsilcilikler Birimi Başkanı</option>
                  <option value="rep_region_manager">Temsilcilikler Birimi Bölge Sorumlusu</option>
                  <option value="rep_coordinator">Temsilcilikler Birimi Koordinatörü</option>
                  <option value="representative">Okul Temsilcisi</option>
                  <option value="bursary_student">Bursiyer Öğrenci</option>
                </select>
              </div>
            </div>
          </div>

          {/* Birim sorumlusu için zorunlu üniversite uyarısı */}
          {formData.role === 'unit_head' && (
            <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 'var(--radius-md)', padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#92400e', display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
              ⚠️ <span><strong>Birim sorumluları için üniversite ve bölge bilgisi zorunludur.</strong> Etkinlikleriniz bu bölgenin sorumlusuna iletilecektir.</span>
            </div>
          )}

          {/* Sadece Birim Başkanları ve Temsilciler İçin Ek Bilgiler */}
          {(formData.role === 'unit_head' || formData.role === 'representative') && (
            <div style={{ backgroundColor: '#f0fdf4', padding: '1.5rem', borderRadius: 'var(--radius-md)', border: '1px solid #bbf7d0' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 600, borderBottom: '1px solid #bbf7d0', paddingBottom: '0.5rem', marginBottom: '1rem', color: '#166534' }}>Öğrenci & Birim Ek Bilgileri</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label className="label" style={{ color: '#166534' }}>Bölüm *</label>
                  <input type="text" required className="input" style={{ borderColor: '#bbf7d0' }} placeholder="Örn: Bilgisayar Mühendisliği" value={formData.department} onChange={e => setFormData({...formData, department: e.target.value})} />
                </div>
                <div>
                  <label className="label" style={{ color: '#166534' }}>Sınıf *</label>
                  <select required className="input" style={{ borderColor: '#bbf7d0' }} value={formData.grade} onChange={e => setFormData({...formData, grade: e.target.value})}>
                    <option value="">Seçiniz...</option>
                    <option value="Hazırlık">Hazırlık</option>
                    <option value="1. Sınıf">1. Sınıf</option>
                    <option value="2. Sınıf">2. Sınıf</option>
                    <option value="3. Sınıf">3. Sınıf</option>
                    <option value="4. Sınıf">4. Sınıf</option>
                    <option value="Yüksek Lisans">Yüksek Lisans</option>
                    <option value="Doktora">Doktora</option>
                  </select>
                </div>
                <div>
                  <label className="label" style={{ color: '#166534' }}>Kulüpteki Görevi *</label>
                  <input type="text" required className="input" style={{ borderColor: '#bbf7d0' }} placeholder="Örn: Yönetim Kurulu Üyesi" value={formData.clubDuty} onChange={e => setFormData({...formData, clubDuty: e.target.value})} />
                </div>
                <div>
                  <label className="label" style={{ color: '#166534' }}>NSosyal Hesabı (Link) *</label>
                  <input type="url" required className="input" style={{ borderColor: '#bbf7d0' }} placeholder="https://nsosyal.com/..." value={formData.nsosyalAccount} onChange={e => setFormData({...formData, nsosyalAccount: e.target.value})} />
                </div>
              </div>
            </div>
          )}

          {/* Section 4: Güvenlik */}
          <div>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 600, borderBottom: '1px solid #eaeaea', paddingBottom: '0.5rem', marginBottom: '1rem' }}>4. Güvenlik ve Onay</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
              <div>
                <label className="label">Şifre *</label>
                <input type="password" required className="input" minLength={6} placeholder="••••••••" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
              </div>
              <div>
                <label className="label">Şifre Tekrar *</label>
                <input type="password" required className="input" minLength={6} placeholder="••••••••" value={formData.passwordConfirm} onChange={e => setFormData({...formData, passwordConfirm: e.target.value})} />
              </div>
            </div>
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', cursor: 'pointer', backgroundColor: '#f8fafc', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
              <input type="checkbox" required checked={formData.kvkkApproved} onChange={e => setFormData({...formData, kvkkApproved: e.target.checked})} style={{ width: '20px', height: '20px', marginTop: '2px' }} />
              <span style={{ fontSize: '0.875rem', lineHeight: '1.5' }}>
                Kişisel Verilerin Korunması Kanunu (KVKK) uyarınca, telefon numaram ve kimlik bilgilerimin Cansağlığı Vakfı Etkinlik Yönetim Sistemi tarafından saklanmasına ve WhatsApp bildirimleri için işlenmesine <strong>açık rıza gösteriyorum.</strong>
              </span>
            </label>
          </div>

          <button type="submit" disabled={isLoading} className="btn btn-primary" style={{ padding: '1rem', fontSize: '1.125rem', marginTop: '1rem' }}>
            {isLoading ? 'Kaydediliyor...' : 'Kayıt Başvurusu Yap'}
          </button>

        </form>
      </div>
    </div>
  );
}
