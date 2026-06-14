'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
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

  const validateStep = (currentStep: number) => {
    setError(null);
    if (currentStep === 1) {
      if (!formData.university.trim() || !formData.region || !formData.role) {
        setError('Lütfen zorunlu kurumsal alanları doldurunuz.');
        return false;
      }
      if (!isRepRole && !formData.unitName) {
        setError('Lütfen bağlı olduğunuz birimi seçiniz.');
        return false;
      }
    } else if (currentStep === 2) {
      if (!formData.fullName.trim()) {
        setError('Lütfen ad soyad giriniz.');
        return false;
      }
      if (formData.role === 'unit_head' || formData.role === 'representative') {
        if (!formData.department || !formData.grade || !formData.clubDuty || !formData.nsosyalAccount) {
          setError('Lütfen ek bilgileri eksiksiz doldurunuz.');
          return false;
        }
      }
    } else if (currentStep === 3) {
      if (!formData.email.trim() || !formData.email.includes('@')) {
        setError('Lütfen geçerli bir e-posta giriniz.');
        return false;
      }
      if (formData.phone.length < 10) {
        setError('Lütfen geçerli bir telefon numarası giriniz.');
        return false;
      }
    }
    return true;
  };

  const nextStep = () => {
    if (validateStep(step)) {
      setStep(prev => prev + 1);
    }
  };

  const prevStep = () => {
    setError(null);
    setStep(prev => prev - 1);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (formData.password !== formData.passwordConfirm) {
      setError('Şifreler eşleşmiyor.');
      return;
    }
    if (formData.password.length < 6) {
      setError('Şifreniz en az 6 karakter olmalıdır.');
      return;
    }
    if (!formData.kvkkApproved) {
      setError('Devam edebilmek için KVKK metnini onaylamalısınız.');
      return;
    }

    setIsLoading(true);

    try {
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
          is_approved: false
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

  const steps = [
    { num: 1, title: 'Görev Seçimi' },
    { num: 2, title: 'Kimlik Bilgileri' },
    { num: 3, title: 'İletişim' },
    { num: 4, title: 'Güvenlik' }
  ];

  const redPrimary = '#da1c15';
const redHover = '#b91610';
const redLight = '#fef2f2';
const tealPrimary = '#0e9b8f';

  if (success) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f9fafb', padding: '1rem' }}>
        <div className="card" style={{ maxWidth: '520px', width: '100%', padding: '3.5rem 2.5rem', textAlign: 'center', backgroundColor: '#ffffff', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' }}>
          
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '2rem' }}>
            <svg className="animated-check" viewBox="0 0 52 52" style={{ width: '72px', height: '72px' }}>
              <circle className="check-circle" cx="26" cy="26" r="25" fill="none" />
              <path className="check-path" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8" />
            </svg>
          </div>

          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.75rem', color: '#1f2937' }}>
            Başvurunuz Alındı, {formData.fullName.split(' ')[0]}!
          </h2>
          <p style={{ color: '#4b5563', marginBottom: '2rem', fontSize: '0.95rem', lineHeight: '1.6' }}>
            Kaydınız Cansağlığı Vakfı Etkinlik Yönetim Sistemi&apos;ne iletilmiştir. Güvenlik ve yetkilendirme prosedürleri gereği başvurunuz incelemeye alınmıştır.
          </p>

          <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1.25rem', textAlign: 'left', marginBottom: '2rem' }}>
            <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Onay Süreci
            </h3>
            <ul style={{ listStyleType: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <li style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.9rem', color: '#475569' }}>
                <div style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: '#f1f5f9', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 600, flexShrink: 0 }}>1</div>
                Başvurunuz inceleniyor
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.9rem', color: '#475569' }}>
                <div style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: '#f1f5f9', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 600, flexShrink: 0 }}>2</div>
                Genel Yetkili onayı
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.9rem', color: '#475569' }}>
                <div style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: '#f1f5f9', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 600, flexShrink: 0 }}>3</div>
                WhatsApp bildirimi alırsınız
              </li>
            </ul>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '1.5rem', color: '#334155', backgroundColor: '#f1f5f9', padding: '0.75rem', borderRadius: '8px' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
            </svg>
            <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>
              Onay bildirimi şu numaraya gelecek: <span style={{ fontWeight: 700 }}>{formData.phone}</span>
            </span>
          </div>

          <div style={{ display: 'inline-block', backgroundColor: '#f1f5f9', color: '#475569', fontSize: '0.75rem', fontWeight: 600, padding: '0.25rem 0.75rem', borderRadius: '9999px', marginBottom: '2.5rem' }}>
            Genellikle 1–3 iş günü
          </div>

          <Link href="/login" className="btn" style={{ display: 'block', width: '100%', backgroundColor: redPrimary, color: 'white', padding: '0.875rem', fontWeight: 600, borderRadius: '8px', textDecoration: 'none' }}>
            Giriş Ekranına Dön
          </Link>
        </div>

        <style dangerouslySetInnerHTML={{__html: `
          .animated-check {
            border-radius: 50%;
            display: block;
            stroke-width: 3;
            stroke: ${redPrimary};
            stroke-miterlimit: 10;
            box-shadow: inset 0px 0px 0px ${redPrimary};
            animation: fill .4s ease-in-out .4s forwards, scale .3s ease-in-out .9s both;
          }
          .check-circle {
            stroke-dasharray: 166;
            stroke-dashoffset: 166;
            stroke-width: 3;
            stroke-miterlimit: 10;
            stroke: ${redPrimary};
            fill: none;
            animation: stroke 0.6s cubic-bezier(0.65, 0, 0.45, 1) forwards;
          }
          .check-path {
            transform-origin: 50% 50%;
            stroke-dasharray: 48;
            stroke-dashoffset: 48;
            animation: stroke 0.3s cubic-bezier(0.65, 0, 0.45, 1) 0.6s forwards;
          }
          @keyframes stroke {
            100% { stroke-dashoffset: 0; }
          }
          @keyframes scale {
            0%, 100% { transform: none; }
            50% { transform: scale3d(1.1, 1.1, 1); }
          }
          @keyframes fill {
            100% { box-shadow: inset 0px 0px 0px 40px rgba(218, 28, 21, 0.05); }
          }
        `}} />
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f9fafb', padding: '2rem 1rem' }}>
      
      <div className="card" style={{ maxWidth: '700px', width: '100%', padding: '2.5rem', position: 'relative' }}>
        
        <Link href="/login" style={{ position: 'absolute', top: '1.5rem', left: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.875rem' }}>
          <ChevronLeft size={16} /> Geri Dön
        </Link>

        <div style={{ textAlign: 'center', marginBottom: '2.5rem', marginTop: '1rem' }}>
          <img src="/logo.png" alt="Cansağlığı Logo" style={{ height: '45px', objectFit: 'contain', margin: '0 auto 0.5rem' }} />
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1a202c' }}>Yeni Kayıt Oluştur</h1>
        </div>

        {/* Progress Bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2.5rem', position: 'relative' }}>
          <div style={{ position: 'absolute', top: '50%', left: '0', right: '0', height: '2px', backgroundColor: '#e5e7eb', zIndex: 0, transform: 'translateY(-50%)' }} />
          <div style={{ position: 'absolute', top: '50%', left: '0', height: '2px', backgroundColor: redPrimary, zIndex: 0, transform: 'translateY(-50%)', width: `${((step - 1) / (steps.length - 1)) * 100}%`, transition: 'width 0.3s ease' }} />
          
          {steps.map((s) => (
            <div key={s.num} style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', width: '80px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: step >= s.num ? redPrimary : '#fff', border: `2px solid ${step >= s.num ? redPrimary : '#d1d5db'}`, color: step >= s.num ? '#fff' : '#6b7280', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.875rem', fontWeight: 600, transition: 'all 0.3s ease' }}>
                {step > s.num ? <Check size={16} /> : s.num}
              </div>
              <span style={{ fontSize: '0.75rem', fontWeight: step >= s.num ? 600 : 400, color: step >= s.num ? '#1f2937' : '#6b7280', textAlign: 'center' }}>
                {s.title}
              </span>
            </div>
          ))}
        </div>

        {error && (
          <div style={{ backgroundColor: '#fef2f2', color: '#991b1b', padding: '1rem', borderRadius: 'var(--radius-md)', fontSize: '0.875rem', marginBottom: '1.5rem', border: '1px solid #fecaca' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleRegister}>
          
          <div style={{ minHeight: '280px' }}>
            {/* Step 1: Görev Seçimi */}
            {step === 1 && (
              <div style={{ animation: 'fadeIn 0.3s ease-in-out' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem', color: '#1f2937' }}>Görev Seçimi ve Kurumsal Bilgiler</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                  <div>
                    <label className="label">Görev / Rol *</label>
                    <select className="input" value={formData.role} onChange={e => handleRoleChange(e.target.value)}>
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
                  <div>
                    <label className="label">Bağlı Olduğu Birim *</label>
                    {isRepRole ? (
                      <div className="input" style={{ backgroundColor: redLight, color: redHover, fontWeight: 600, cursor: 'not-allowed', display: 'flex', alignItems: 'center', gap: '0.5rem', borderColor: redPrimary }}>
                        🤝 Temsilcilikler Birimi
                      </div>
                    ) : (
                      <select className="input" value={formData.unitName} onChange={e => setFormData({...formData, unitName: e.target.value})}>
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
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label className="label">Üniversite *</label>
                    <input type="text" className="input" placeholder="Örn: Boğaziçi Üniversitesi" value={formData.university} onChange={e => setFormData({...formData, university: e.target.value})} />
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label className="label">Bölge *</label>
                    <select className="input" value={formData.region} onChange={e => setFormData({...formData, region: e.target.value})}>
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
                </div>
              </div>
            )}

            {/* Step 2: Kimlik Bilgileri */}
            {step === 2 && (
              <div style={{ animation: 'fadeIn 0.3s ease-in-out' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem', color: '#1f2937' }}>Kimlik Bilgileri</h3>
                <div style={{ display: 'grid', gap: '1.25rem' }}>
                  <div>
                    <label className="label">Ad - Soyad *</label>
                    <input type="text" className="input" placeholder="Örn: Ali Yılmaz" value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} style={{ borderColor: formData.fullName ? tealPrimary : undefined }} />
                  </div>
                  <div>
                    <label className="label">Öğrenci Numarası</label>
                    <input type="text" className="input" placeholder="Opsiyonel" value={formData.studentId} onChange={e => setFormData({...formData, studentId: e.target.value})} />
                  </div>
                </div>

                {(formData.role === 'unit_head' || formData.role === 'representative') && (
                  <div style={{ backgroundColor: redLight, padding: '1.25rem', borderRadius: 'var(--radius-md)', border: `1px solid ${redPrimary}`, marginTop: '1.25rem' }}>
                    <h4 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '1rem', color: redHover }}>Öğrenci & Birim Ek Bilgileri *</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <div>
                        <input type="text" className="input" placeholder="Bölüm" value={formData.department} onChange={e => setFormData({...formData, department: e.target.value})} style={{ fontSize: '0.875rem' }} />
                      </div>
                      <div>
                        <select className="input" value={formData.grade} onChange={e => setFormData({...formData, grade: e.target.value})} style={{ fontSize: '0.875rem' }}>
                          <option value="">Sınıf Seçiniz</option>
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
                        <input type="text" className="input" placeholder="Kulüpteki Görevi" value={formData.clubDuty} onChange={e => setFormData({...formData, clubDuty: e.target.value})} style={{ fontSize: '0.875rem' }} />
                      </div>
                      <div>
                        <input type="url" className="input" placeholder="NSosyal Linki" value={formData.nsosyalAccount} onChange={e => setFormData({...formData, nsosyalAccount: e.target.value})} style={{ fontSize: '0.875rem' }} />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 3: İletişim */}
            {step === 3 && (
              <div style={{ animation: 'fadeIn 0.3s ease-in-out' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem', color: '#1f2937' }}>İletişim Bilgileri</h3>
                <div style={{ display: 'grid', gap: '1.25rem' }}>
                  <div>
                    <label className="label">E-posta Adresi *</label>
                    <input type="email" className="input" placeholder="ornek@edu.tr" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                  </div>
                  <div>
                    <label className="label">Telefon Numarası * (WhatsApp)</label>
                    <input type="text" className="input" value={formData.phone} onChange={handlePhoneChange} placeholder="+90 5XX XXX XX XX" />
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Güvenlik */}
            {step === 4 && (
              <div style={{ animation: 'fadeIn 0.3s ease-in-out' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem', color: '#1f2937' }}>Güvenlik ve Onay</h3>
                <div style={{ display: 'grid', gap: '1.25rem', marginBottom: '1.5rem' }}>
                  <div>
                    <label className="label">Şifre *</label>
                    <input type="password" className="input" minLength={6} placeholder="••••••••" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
                  </div>
                  <div>
                    <label className="label">Şifre Tekrar *</label>
                    <input type="password" className="input" minLength={6} placeholder="••••••••" value={formData.passwordConfirm} onChange={e => setFormData({...formData, passwordConfirm: e.target.value})} />
                  </div>
                </div>
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', cursor: 'pointer', backgroundColor: '#f8fafc', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid #e2e8f0' }}>
                  <input type="checkbox" checked={formData.kvkkApproved} onChange={e => setFormData({...formData, kvkkApproved: e.target.checked})} style={{ width: '20px', height: '20px', marginTop: '2px', accentColor: tealPrimary }} />
                  <span style={{ fontSize: '0.875rem', lineHeight: '1.5', color: '#475569' }}>
                    Kişisel Verilerin Korunması Kanunu (KVKK) uyarınca, telefon numaram ve kimlik bilgilerimin Cansağlığı Vakfı Etkinlik Yönetim Sistemi tarafından saklanmasına ve WhatsApp bildirimleri için işlenmesine <strong>açık rıza gösteriyorum.</strong>
                  </span>
                </label>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid #e5e7eb' }}>
            <button type="button" onClick={prevStep} disabled={step === 1 || isLoading} className="btn" style={{ backgroundColor: 'transparent', color: step === 1 ? '#d1d5db' : '#4b5563', border: `1px solid ${step === 1 ? '#e5e7eb' : '#d1d5db'}`, padding: '0.5rem 1.5rem', cursor: step === 1 ? 'not-allowed' : 'pointer' }}>
              Geri
            </button>
            
            {step < 4 ? (
              <button type="button" onClick={nextStep} className="btn" style={{ backgroundColor: redPrimary, color: 'white', padding: '0.5rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', border: 'none' }}>
                İleri <ChevronRight size={16} />
              </button>
            ) : (
              <button type="submit" disabled={isLoading} className="btn" style={{ backgroundColor: redPrimary, color: 'white', padding: '0.5rem 2rem', fontWeight: 600, border: 'none' }}>
                {isLoading ? 'Kaydediliyor...' : 'Kaydı Tamamla'}
              </button>
            )}
          </div>
        </form>

        <style dangerouslySetInnerHTML={{__html: `
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(5px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}} />
      </div>
    </div>
  );
}

