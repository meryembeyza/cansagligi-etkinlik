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
        // Otomatik rol bazlı yönlendirme için kullanıcı bilgisini çekelim
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('role, is_approved')
          .eq('id', data.session.user.id)
          .maybeSingle();
          
        if (userError) {
          await supabase.auth.signOut();
          setError(`Veritabanı hatası: ${userError.message} (${userError.code})`);
          return;
        }

        if (!userData) {
          // Kullanıcı profili eksik olsa da oturum açılmasına izin ver
          // userData boş olduğunda varsayılan bir nesne oluştur
          // Bu sayede profil doldurulmamış olsa da giriş yapılabilir
          // İleride profil sayfasında eksik alanları doldurabilirler
        }

        if (userData && !userData.is_approved) {
          await supabase.auth.signOut();
          setError('Hesabınız alınmıştır ancak henüz yöneticiniz tarafından onaylanmamıştır.');
          return;
        }
        
        // Yönlendirme (window.location.href yerine router.push)
        router.push('/dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'Giriş yapılamadı. E-posta ve şifrenizi kontrol edin.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      {/* Sol Panel - Görsel ve Motto */}
      <div className={styles.leftPanel}>
        <div className={styles.logoContainer}>
          <img src="/logo.png" alt="Cansağlığı Vakfı" style={{ height: '50px' }} />
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
              <a href="#" className={styles.forgotPasswordLink} onClick={(e) => { e.preventDefault(); alert("Şifre sıfırlama özelliği yakında eklenecektir."); }}>Şifremi unuttum</a>
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
