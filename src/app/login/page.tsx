'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import styles from './page.module.css';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMessage, setResetMessage] = useState('');
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const errParam = urlParams.get('error');
      if (errParam === 'not_approved') {
        setError('Hesabınız alınmıştır ancak henüz yöneticiniz tarafından onaylanmamıştır.');
      } else if (errParam === 'not_found') {
        setError('Kullanıcı profiliniz veritabanında bulunamadı. Lütfen kayıt ekranından yeni bir kayıt oluşturun.');
      } else if (errParam === 'session_error') {
        setError('Oturum bilgileri alınırken bir ağ hatası oluştu. Lütfen tekrar giriş yapın.');
      } else if (errParam === 'no_session') {
        setError('Oturum zaman aşımına uğradı veya bulunamadı. Lütfen tekrar giriş yapın.');
      }
      
      // Kilitlenmiş Supabase Auth lock'larını temizle (giriş yapamama / asılı kalma sorununu çözer)
      try {
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (key.startsWith('sb-') || key.includes('auth-token'))) {
             keysToRemove.push(key);
          }
        }
        keysToRemove.forEach(k => localStorage.removeItem(k));
      } catch (e) {
        // Ignore storage errors
      }
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const sanitizedEmail = email.trim().toLowerCase();
      const { data, error: authError } = await supabase.auth.signInWithPassword({ email: sanitizedEmail, password });

      if (authError) throw authError;

      if (data.session) {
        // Oturum doğrulandıktan sonra RoleContext'in onAuthStateChange dinleyicisi 
        // kullanıcı verilerini çekip state'e yazdıktan sonra bizi dashboard'a yönlendirecek.
        // Buradan manuel yönlendirme yapmak Race Condition'a sebep olduğu için kaldırıldı.
      }
    } catch (err: any) {
      setError(err.message || 'Giriş yapılamadı. E-posta ve şifrenizi kontrol edin.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail) {
      setResetMessage('Lütfen e-posta adresinizi girin.');
      return;
    }
    setResetLoading(true);
    setResetMessage('');
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: window.location.origin + '/reset-password',
      });
      if (resetError) throw resetError;
      setResetMessage('Şifre sıfırlama linki e-posta adresinize gönderildi.');
    } catch (err: any) {
      setResetMessage('Bir hata oluştu: ' + (err.message || 'Lütfen tekrar deneyin.'));
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      {/* Sol Panel - Görsel ve Motto */}
      <div className={styles.leftPanel}>
        <div className={styles.logoContainer}>
          <img src="/logo.png" alt="Cansağlığı Vakfı" className={styles.logo} />
        </div>
        <h1 className={styles.motto}>Hastalığa tutulmuş dünyaya şifa olmak için...</h1>
      </div>

      {/* Sağ Panel - Form */}
      <div className={styles.rightPanel}>
        <div className={styles.formContainer}>
          <h2 className={styles.title}>Hoş geldiniz</h2>
          <p className={styles.subtitle}>Sisteme giriş yapmak için bilgilerinizi girin.</p>

          {error && (
            <div className={styles.errorBox}>
              {error}
            </div>
          )}

          <form onSubmit={handleLogin}>
            <div className={styles.formGroup}>
              <label className={styles.label}>E-posta Adresi</label>
              <input 
                type="email" 
                required 
                className={styles.input} 
                placeholder="ad.soyad@cansagligi.org" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            
            <div className={styles.formGroup}>
              <label className={styles.label}>Şifre</label>
              <input 
                type="password" 
                required 
                className={styles.input} 
                placeholder="••••••••" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <div className={styles.forgotPassword}>
              <a href="#" className={styles.forgotPasswordLink} onClick={(e) => { e.preventDefault(); setShowResetModal(!showResetModal); }}>Şifremi unuttum</a>
              
              {showResetModal && (
                <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', width: '100%', textAlign: 'left' }}>
                  <p style={{ fontSize: '0.875rem', marginBottom: '0.5rem', color: '#475569' }}>Şifrenizi sıfırlamak için e-posta adresinizi girin:</p>
                  <input 
                    type="email" 
                    className={styles.input} 
                    placeholder="E-posta adresiniz" 
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    style={{ marginBottom: '0.75rem' }}
                  />
                  <button 
                    type="button" 
                    onClick={handleResetPassword} 
                    disabled={resetLoading} 
                    className={styles.submitBtn} 
                    style={{ padding: '0.5rem', fontSize: '0.875rem', backgroundColor: '#da1c15', width: '100%' }}
                  >
                    {resetLoading ? 'Gönderiliyor...' : 'Sıfırlama Linki Gönder'}
                  </button>
                  {resetMessage && (
                    <div style={{ marginTop: '0.75rem', fontSize: '0.875rem', color: resetMessage.includes('hata') || resetMessage.includes('Lütfen') ? '#dc2626' : '#16a34a' }}>
                      {resetMessage}
                    </div>
                  )}
                </div>
              )}
            </div>

            <button type="submit" disabled={isLoading} className={styles.submitBtn}>
              {isLoading ? 'Giriş Yapılıyor...' : 'Giriş Yap'}
            </button>

            <div className={styles.registerLink}>
              Hesabınız yok mu? <a href="/register">Hemen Kayıt Olun</a>
            </div>
          </form>



        </div>
      </div>
    </div>
  );
}
