'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';
const supabase = createClient();
import { ChevronLeft, ChevronRight, Check } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
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
    const newErrors: Record<string, string> = {};
    let isValid = true;

    if (currentStep === 1) {
      if (!formData.role) newErrors.role = 'Lütfen bir görev seçiniz.';
      if (!isRepRole && !formData.unitName) newErrors.unitName = 'Lütfen bağlı olduğunuz birimi seçiniz.';
      if (!formData.university.trim()) newErrors.university = 'Lütfen üniversite adını giriniz.';
      if (!formData.region) newErrors.region = 'Lütfen bölgenizi seçiniz.';
    } else if (currentStep === 2) {
      if (!formData.fullName.trim()) newErrors.fullName = 'Lütfen ad soyad giriniz.';
      if (formData.role === 'unit_head' || formData.role === 'representative') {
        if (!formData.department) newErrors.department = 'Lütfen bölümünüzü giriniz.';
        if (!formData.grade) newErrors.grade = 'Lütfen sınıfınızı seçiniz.';
        if (!formData.clubDuty) newErrors.clubDuty = 'Lütfen kulüpteki görevinizi giriniz.';
        if (!formData.nsosyalAccount) newErrors.nsosyalAccount = 'Lütfen NSosyal linkini giriniz.';
      }
    } else if (currentStep === 3) {
      if (!formData.email.trim() || !formData.email.includes('@')) newErrors.email = 'Geçerli bir e-posta giriniz.';
      if (formData.phone.length < 10) newErrors.phone = 'Geçerli bir telefon numarası giriniz.';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setError('Lütfen kırmızı ile işaretlenmiş hatalı/eksik alanları düzeltiniz.');
      isValid = false;
    } else {
      setErrors({});
    }

    return isValid;
  };

  const nextStep = () => {
    if (validateStep(step)) {
      setStep(prev => prev + 1);
    }
  };

  const prevStep = () => {
    setError(null);
    setErrors({});
    setStep(prev => prev - 1);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setErrors({});

    const finalErrors: Record<string, string> = {};
    if (formData.password.length < 6) finalErrors.password = 'Şifreniz en az 6 karakter olmalıdır.';
    if (formData.password !== formData.passwordConfirm) finalErrors.passwordConfirm = 'Şifreler eşleşmiyor.';
    if (!formData.kvkkApproved) finalErrors.kvkkApproved = 'Devam edebilmek için KVKK metnini onaylamalısınız.';

    if (Object.keys(finalErrors).length > 0) {
      setErrors(finalErrors);
      setError('Lütfen hatalı alanları düzeltiniz.');
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
    } catch (err) {
      setError((err as Error).message || 'Kayıt olurken bir hata oluştu.');
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
const redLight = 'var(--bg-danger-light)';
const tealPrimary = '#0e9b8f';

  if (success) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-main)', padding: '1rem' }}>
        <div className="card" style={{ maxWidth: '520px', width: '100%', padding: '3.5rem 2.5rem', textAlign: 'center', backgroundColor: 'var(--bg-card)', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' }}>
          
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '2rem' }}>
            <svg className="animated-check" viewBox="0 0 52 52" style={{ width: '72px', height: '72px' }}>
              <circle className="check-circle" cx="26" cy="26" r="25" fill="none" />
              <path className="check-path" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8" />
            </svg>
          </div>

          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.75rem', color: '#1f2937' }}>
            Başvurunuz Alındı, {formData.fullName.split(' ')[0]}!
          </h2>
          <div style={{ backgroundColor: 'var(--bg-warning-light)', border: '1px solid #fef3c7', borderRadius: '8px', padding: '1rem', marginBottom: '2rem' }}>
            <p style={{ color: '#92400e', margin: 0, fontSize: '0.95rem', lineHeight: '1.6', fontWeight: 500 }}>
              Kayıt işleminiz tamamlandı ancak sisteme henüz <strong>direkt olarak giriş yapamazsınız.</strong> Güvenlik ve yetkilendirme prosedürleri gereği sisteme giriş yapabilmeniz için öncelikle <strong>Genel ve Bölge Sorumlularının onayından geçmeniz gerekmektedir.</strong>
            </p>
          </div>

          <div style={{ backgroundColor: 'var(--bg-nested)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '1.25rem', textAlign: 'left', marginBottom: '2rem' }}>
            <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Onay Süreci
            </h3>
            <ul style={{ listStyleType: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <li style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.9rem', color: '#475569' }}>
                <div style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: 'var(--border-color)', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 600, flexShrink: 0 }}>1</div>
                Başvurunuz inceleniyor
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.9rem', color: '#475569' }}>
                <div style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: 'var(--border-color)', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 600, flexShrink: 0 }}>2</div>
                Genel Yetkili onayı
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.9rem', color: '#475569' }}>
                <div style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: 'var(--border-color)', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 600, flexShrink: 0 }}>3</div>
                WhatsApp bildirimi alırsınız
              </li>
            </ul>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '1.5rem', color: 'var(--text-main)', backgroundColor: 'var(--border-color)', padding: '0.75rem', borderRadius: '8px' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
            </svg>
            <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>
              Onay bildirimi şu numaraya gelecek: <span style={{ fontWeight: 700 }}>{formData.phone}</span>
            </span>
          </div>

          <div style={{ display: 'inline-block', backgroundColor: 'var(--border-color)', color: '#475569', fontSize: '0.75rem', fontWeight: 600, padding: '0.25rem 0.75rem', borderRadius: '9999px', marginBottom: '2.5rem' }}>
            Genellikle 1–3 iş günü
          </div>

          <Link href="/login" className="btn" style={{ display: 'block', width: '100%', backgroundColor: redPrimary, color: 'white', padding: '0.875rem', fontWeight: 600, borderRadius: '8px', textDecoration: 'none' }}>
            Giriş Ekranına Dön
          </Link>
        </div>

        
      </div>
    );
  }

  return (
    <div className="auth-layout">
      <div className="auth-card">
        
        <Link href="/login" className="auth-back-link">
          <ChevronLeft size={16} /> Geri Dön
        </Link>

        <div className="auth-logo-container">
          <img src="/logo.png" alt="Cansağlığı Logo" className="auth-logo" />
          <h1 className="auth-title">Yeni Kayıt Oluştur</h1>
          <p className="auth-subtitle">Hesabınızı oluşturmak için bilgilerinizi girin.</p>
        </div>

        {/* Progress Bar */}
        <div className="auth-progress-bar" style={{ margin: '32px 0 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
          <div style={{ position: 'absolute', top: '16px', left: '0', right: '0', height: '2px', backgroundColor: '#e5e7eb', zIndex: 0 }} />
          <div style={{ position: 'absolute', top: '16px', left: '0', height: '2px', backgroundColor: '#dc2626', zIndex: 0, width: `${((step - 1) / (steps.length - 1)) * 100}%`, transition: 'width 0.3s ease' }} />
          
          {steps.map((s) => {
            const isActive = step === s.num;
            const isCompleted = step > s.num;
            return (
              <div key={s.num} style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', width: '80px' }}>
                <div style={{ 
                  width: '32px', height: '32px', borderRadius: '50%', 
                  backgroundColor: (isActive || isCompleted) ? '#dc2626' : '#ffffff', 
                  border: `2px solid ${(isActive || isCompleted) ? '#dc2626' : '#d1d5db'}`, 
                  color: (isActive || isCompleted) ? '#ffffff' : '#9ca3af', 
                  boxShadow: isActive ? '0 0 0 4px rgba(220,38,38,0.15)' : 'none',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', 
                  fontSize: '0.875rem', fontWeight: 600, transition: 'all 0.3s ease' 
                }}>
                  {isCompleted ? <Check size={16} /> : s.num}
                </div>
                <span style={{ fontSize: '0.75rem', fontWeight: isActive ? 600 : 400, color: isActive ? '#dc2626' : '#9ca3af', textAlign: 'center' }}>
                  {s.title}
                </span>
              </div>
            );
          })}
        </div>

        {error && (
          <div className="error-box">
            {error}
          </div>
        )}

        <form onSubmit={handleRegister}>
          
          <div className="auth-form-container">
            {/* Step 1: Görev Seçimi */}
            {step === 1 && (
              <div style={{ animation: 'fadeIn 0.3s ease-in-out' }}>
                <h3 className="step-title">Görev Seçimi ve Kurumsal Bilgiler</h3>
                <div className="form-grid-2">
                  <div>
                    <label className="label">Görev / Rol *</label>
                    <select className="input" value={formData.role} onChange={e => { handleRoleChange(e.target.value); setErrors(prev => ({...prev, role: ''})); }} style={{ borderColor: errors.role ? '#dc2626' : undefined }}>
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
                    {errors.role && <div className="error-text">{errors.role}</div>}
                  </div>
                  <div>
                    <label className="label">Bağlı Olduğu Birim *</label>
                    {isRepRole ? (
                      <div className="input" style={{ backgroundColor: redLight, color: redHover, fontWeight: 600, cursor: 'not-allowed', display: 'flex', alignItems: 'center', gap: '0.5rem', borderColor: redPrimary }}>
                        🤝 Temsilcilikler Birimi
                      </div>
                    ) : (
                      <select className="input" value={formData.unitName} onChange={e => { setFormData({...formData, unitName: e.target.value}); setErrors(prev => ({...prev, unitName: ''})); }} style={{ borderColor: errors.unitName ? '#dc2626' : undefined }}>
                        <option value="">Seçiniz...</option>
                        <option value="Sosyal Çalışmalar Birimi">Sosyal Çalışmalar Birimi</option>
                        <option value="Mesleki ve Kariyer Çalışmaları Birimi">Mesleki ve Kariyer Çalışmaları Birimi</option>
                        <option value="Bilimsel ve Akademik Çalışmalar Birimi">Bilimsel ve Akademik Çalışmalar Birimi</option>
                        <option value="İletişim ve Planlama Birimi">İletişim ve Planlama Birimi</option>
                        <option value="Temsilcilikler Birimi">Temsilcilikler Birimi</option>
                        <option value="Bursiyer">Bursiyer (Birim Yok)</option>
                      </select>
                    )}
                    {errors.unitName && <div className="error-text">{errors.unitName}</div>}
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label className="label">Üniversite *</label>
                    <input type="text" className="input" placeholder="Örn: Boğaziçi Üniversitesi" value={formData.university} onChange={e => { setFormData({...formData, university: e.target.value}); setErrors(prev => ({...prev, university: ''})); }} style={{ borderColor: errors.university ? '#dc2626' : undefined }} />
                    {errors.university && <div className="error-text">{errors.university}</div>}
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label className="label">Bölge *</label>
                    <select className="input" value={formData.region} onChange={e => { setFormData({...formData, region: e.target.value}); setErrors(prev => ({...prev, region: ''})); }} style={{ borderColor: errors.region ? '#dc2626' : undefined }}>
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
                    {errors.region && <div className="error-text">{errors.region}</div>}
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Kimlik Bilgileri */}
            {step === 2 && (
              <div style={{ animation: 'fadeIn 0.3s ease-in-out' }}>
                <h3 className="step-title">Kimlik Bilgileri</h3>
                <div className="form-grid">
                  <div>
                    <label className="label">Ad - Soyad *</label>
                    <input type="text" className="input" placeholder="Örn: Ali Yılmaz" value={formData.fullName} onChange={e => { setFormData({...formData, fullName: e.target.value}); setErrors(prev => ({...prev, fullName: ''})); }} style={{ borderColor: errors.fullName ? '#dc2626' : (formData.fullName ? tealPrimary : undefined) }} />
                    {errors.fullName && <div className="error-text">{errors.fullName}</div>}
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
                        <input type="text" className="input" placeholder="Bölüm" value={formData.department} onChange={e => { setFormData({...formData, department: e.target.value}); setErrors(prev => ({...prev, department: ''})); }} style={{ fontSize: '0.875rem', borderColor: errors.department ? '#dc2626' : undefined }} />
                        {errors.department && <div className="error-text">{errors.department}</div>}
                      </div>
                      <div>
                        <select className="input" value={formData.grade} onChange={e => { setFormData({...formData, grade: e.target.value}); setErrors(prev => ({...prev, grade: ''})); }} style={{ fontSize: '0.875rem', borderColor: errors.grade ? '#dc2626' : undefined }}>
                          <option value="">Sınıf Seçiniz</option>
                          <option value="Hazırlık">Hazırlık</option>
                          <option value="1. Sınıf">1. Sınıf</option>
                          <option value="2. Sınıf">2. Sınıf</option>
                          <option value="3. Sınıf">3. Sınıf</option>
                          <option value="4. Sınıf">4. Sınıf</option>
                          <option value="Yüksek Lisans">Yüksek Lisans</option>
                          <option value="Doktora">Doktora</option>
                        </select>
                        {errors.grade && <div className="error-text">{errors.grade}</div>}
                      </div>
                      <div>
                        <input type="text" className="input" placeholder="Kulüpteki Görevi" value={formData.clubDuty} onChange={e => { setFormData({...formData, clubDuty: e.target.value}); setErrors(prev => ({...prev, clubDuty: ''})); }} style={{ fontSize: '0.875rem', borderColor: errors.clubDuty ? '#dc2626' : undefined }} />
                        {errors.clubDuty && <div className="error-text">{errors.clubDuty}</div>}
                      </div>
                      <div>
                        <input type="url" className="input" placeholder="NSosyal Linki" value={formData.nsosyalAccount} onChange={e => { setFormData({...formData, nsosyalAccount: e.target.value}); setErrors(prev => ({...prev, nsosyalAccount: ''})); }} style={{ fontSize: '0.875rem', borderColor: errors.nsosyalAccount ? '#dc2626' : undefined }} />
                        {errors.nsosyalAccount && <div className="error-text">{errors.nsosyalAccount}</div>}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 3: İletişim */}
            {step === 3 && (
              <div style={{ animation: 'fadeIn 0.3s ease-in-out' }}>
                <h3 className="step-title">İletişim Bilgileri</h3>
                <div className="form-grid">
                  <div>
                    <label className="label">E-posta Adresi *</label>
                    <input type="email" className="input" placeholder="ornek@edu.tr" value={formData.email} onChange={e => { setFormData({...formData, email: e.target.value}); setErrors(prev => ({...prev, email: ''})); }} style={{ borderColor: errors.email ? '#dc2626' : undefined }} />
                    {errors.email && <div className="error-text">{errors.email}</div>}
                  </div>
                  <div>
                    <label className="label">Telefon Numarası *</label>
                    <input type="text" className="input" value={formData.phone} onChange={e => { handlePhoneChange(e); setErrors(prev => ({...prev, phone: ''})); }} placeholder="+90 5XX XXX XX XX" style={{ borderColor: errors.phone ? '#dc2626' : undefined }} />
                    {errors.phone && <div className="error-text">{errors.phone}</div>}
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Güvenlik */}
            {step === 4 && (
              <div style={{ animation: 'fadeIn 0.3s ease-in-out' }}>
                <h3 className="step-title">Güvenlik ve Onay</h3>
                <div className="form-grid" style={{ marginBottom: '1.5rem' }}>
                  <div>
                    <label className="label">Şifre *</label>
                    <input type="password" className="input" minLength={6} placeholder="••••••••" value={formData.password} onChange={e => { setFormData({...formData, password: e.target.value}); setErrors(prev => ({...prev, password: ''})); }} style={{ borderColor: errors.password ? '#dc2626' : undefined }} />
                    {errors.password && <div className="error-text">{errors.password}</div>}
                  </div>
                  <div>
                    <label className="label">Şifre Tekrar *</label>
                    <input type="password" className="input" minLength={6} placeholder="••••••••" value={formData.passwordConfirm} onChange={e => { setFormData({...formData, passwordConfirm: e.target.value}); setErrors(prev => ({...prev, passwordConfirm: ''})); }} style={{ borderColor: errors.passwordConfirm ? '#dc2626' : undefined }} />
                    {errors.passwordConfirm && <div className="error-text">{errors.passwordConfirm}</div>}
                  </div>
                </div>
                <div>
                  <label className="checkbox-label" style={{ border: `1px solid ${errors.kvkkApproved ? '#fca5a5' : 'var(--border-color)'}` }}>
                    <input type="checkbox" checked={formData.kvkkApproved} onChange={e => { setFormData({...formData, kvkkApproved: e.target.checked}); setErrors(prev => ({...prev, kvkkApproved: ''})); }} style={{ width: '20px', height: '20px', marginTop: '2px', accentColor: tealPrimary }} />
                    <span style={{ fontSize: '0.875rem', lineHeight: '1.5', color: '#475569' }}>
                      Kişisel Verilerin Korunması Kanunu (KVKK) uyarınca, telefon numaram ve kimlik bilgilerimin Cansağlığı Vakfı Etkinlik Yönetim Sistemi tarafından saklanmasına ve WhatsApp bildirimleri için işlenmesine <strong>açık rıza gösteriyorum.</strong>
                    </span>
                  </label>
                  {errors.kvkkApproved && <div className="error-text" style={{ marginTop: '0.5rem', paddingLeft: '0.25rem' }}>{errors.kvkkApproved}</div>}
                </div>
              </div>
            )}
          </div>

          <div className="btn-group">
            <button type="button" onClick={prevStep} disabled={step === 1 || isLoading} className="btn btn-outline" style={{ opacity: step === 1 ? 0.5 : 1 }}>Geri</button>
            
            {step < 4 ? (
              <button type="button" onClick={nextStep} style={{ background: '#dc2626', color: 'white', borderRadius: '8px', padding: '10px 28px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', border: 'none', cursor: 'pointer', transition: 'all 150ms ease', boxShadow: '0 4px 12px rgba(220,38,38,0.30)' }} onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#b91c1c'; e.currentTarget.style.transform = 'translateY(-1px)'; }} onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#dc2626'; e.currentTarget.style.transform = 'translateY(0)'; }}>
                İleri <ChevronRight size={16} />
              </button>
            ) : (
              <button type="submit" disabled={isLoading} style={{ background: '#dc2626', color: 'white', borderRadius: '8px', padding: '10px 28px', fontWeight: 600, border: 'none', cursor: isLoading ? 'not-allowed' : 'pointer', transition: 'all 150ms ease', boxShadow: '0 4px 12px rgba(220,38,38,0.30)' }} onMouseEnter={e => { if(!isLoading) { e.currentTarget.style.backgroundColor = '#b91c1c'; e.currentTarget.style.transform = 'translateY(-1px)'; } }} onMouseLeave={e => { if(!isLoading) { e.currentTarget.style.backgroundColor = '#dc2626'; e.currentTarget.style.transform = 'translateY(0)'; } }}>
                {isLoading ? 'Kaydediliyor...' : 'Kaydı Tamamla'}
              </button>
            )}
          </div>
        </form>

        
      </div>
    </div>
  );
}






