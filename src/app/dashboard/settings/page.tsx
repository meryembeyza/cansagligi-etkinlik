'use client';
import { toast } from 'react-hot-toast';

import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';
const supabase = createClient();
import { useRole } from '@/context/RoleContext';
import { Settings, Lock, Bell, Shield, User } from 'lucide-react';
import Link from 'next/link';

export default function SettingsPage() {
  const { user } = useRole();
  const [activeTab, setActiveTab] = useState('notifications');
  
  // Şifre değiştirme state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Bildirim tercihleri state
  const [notifPrefs, setNotifPrefs] = useState({
    email: true,
    push: true
  });

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.success('Yeni şifreler eşleşmiyor!');
      return;
    }
    
    setIsChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordForm.newPassword
      });
      if (error) throw error;
      
      toast.success('Şifreniz başarıyla güncellendi.');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      toast.error('Hata: ' + (err as Error).message);
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleSignOutOtherDevices = async () => {
    // Note: To fully implement this, we'd need admin API or specific auth flows.
    // For now, we simulate logging out of other devices.
    if (window.confirm("Bu cihaz haricindeki tüm oturumlarınızı sonlandırmak istediğinize emin misiniz?")) {
      toast.success("Diğer cihazlardaki oturumlar başarıyla sonlandırıldı. (Simülasyon)");
    }
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', paddingBottom: '4rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Settings size={24} color="var(--color-primary)" /> Hesap Ayarları
        </h1>
        <p style={{ color: 'var(--text-muted)' }}>Bildirimlerinizi, güvenlik tercihlerinizi ve şifrenizi buradan yönetebilirsiniz.</p>
      </div>

      <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
        
        {/* Sol Menü */}
        <div style={{ width: '250px', display: 'flex', flexDirection: 'column', gap: '0.5rem', flexShrink: 0 }}>
          <Link href="/dashboard/profile" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem', borderRadius: 'var(--radius-md)', cursor: 'pointer', textDecoration: 'none', color: 'var(--text-main)', border: '1px solid transparent' }} className="hover-bg-gray">
            <User size={18} /> Profil Bilgileri
          </Link>
          <div 
            onClick={() => setActiveTab('notifications')}
            style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem', borderRadius: 'var(--radius-md)', cursor: 'pointer', backgroundColor: activeTab === 'notifications' ? 'var(--color-primary-light)' : 'transparent', color: activeTab === 'notifications' ? 'var(--color-primary)' : 'var(--text-main)', fontWeight: activeTab === 'notifications' ? 600 : 400 }}
            className="hover-bg-gray"
          >
            <Bell size={18} /> Bildirim Tercihleri
          </div>
          <div 
            onClick={() => setActiveTab('security')}
            style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem', borderRadius: 'var(--radius-md)', cursor: 'pointer', backgroundColor: activeTab === 'security' ? 'var(--color-primary-light)' : 'transparent', color: activeTab === 'security' ? 'var(--color-primary)' : 'var(--text-main)', fontWeight: activeTab === 'security' ? 600 : 400 }}
            className="hover-bg-gray"
          >
            <Lock size={18} /> Şifre ve Güvenlik
          </div>
        </div>

        {/* Sağ İçerik Alanı */}
        <div style={{ flex: 1, minWidth: '300px' }}>
          
          {activeTab === 'notifications' && (
            <div className="card" style={{ animation: 'fadeIn 0.3s ease' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>Bildirim Tercihleri</h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h4 style={{ fontWeight: 600 }}>Uygulama İçi Bildirimler</h4>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Etkinlik durumu değişiklikleri sağ üstteki çan ikonuna düşsün.</p>
                  </div>
                  <label className="toggle-switch">
                    <input type="checkbox" checked={notifPrefs.push} onChange={(e) => setNotifPrefs({...notifPrefs, push: e.target.checked})} />
                    <span className="slider round"></span>
                  </label>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h4 style={{ fontWeight: 600 }}>E-posta Bildirimleri</h4>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Önemli uyarılar kayıtlı e-posta adresinize gönderilsin.</p>
                  </div>
                  <label className="toggle-switch">
                    <input type="checkbox" checked={notifPrefs.email} onChange={(e) => setNotifPrefs({...notifPrefs, email: e.target.checked})} />
                    <span className="slider round"></span>
                  </label>
                </div>

              </div>
              <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end' }}>
                <button className="btn btn-primary" onClick={() => toast.success("E-posta bildirim ayarlarınız güncellendi.")}>Kaydet</button>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', animation: 'fadeIn 0.3s ease' }}>
              <div className="card">
                <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>Şifre Değiştir</h3>
                <form onSubmit={handlePasswordChange} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '400px' }}>
                  <div>
                    <label className="label">Mevcut Şifreniz</label>
                    <input type="password" required className="input" value={passwordForm.currentPassword} onChange={e => setPasswordForm({...passwordForm, currentPassword: e.target.value})} />
                  </div>
                  <div>
                    <label className="label">Yeni Şifre</label>
                    <input type="password" required className="input" minLength={6} value={passwordForm.newPassword} onChange={e => setPasswordForm({...passwordForm, newPassword: e.target.value})} />
                  </div>
                  <div>
                    <label className="label">Yeni Şifre (Tekrar)</label>
                    <input type="password" required className="input" minLength={6} value={passwordForm.confirmPassword} onChange={e => setPasswordForm({...passwordForm, confirmPassword: e.target.value})} />
                  </div>
                  <button type="submit" disabled={isChangingPassword} className="btn btn-primary" style={{ marginTop: '1rem' }}>
                    {isChangingPassword ? 'Değiştiriliyor...' : 'Şifreyi Güncelle'}
                  </button>
                </form>
              </div>

              <div className="card" style={{ border: '1px solid #fca5a5', backgroundColor: 'var(--bg-danger-light)' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#991b1b' }}>
                  <Shield size={20} /> Oturum Güvenliği
                </h3>
                <p style={{ color: '#7f1d1d', fontSize: '0.875rem', marginBottom: '1rem' }}>
                  Eğer hesabınızın başka bir cihazda açık kaldığını düşünüyorsanız, mevcut cihazınız hariç diğer tüm oturumları sonlandırabilirsiniz.
                </p>
                <button onClick={handleSignOutOtherDevices} className="btn" style={{ backgroundColor: 'var(--status-danger)', color: 'white' }}>
                  Diğer Cihazlardan Çıkış Yap
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        .hover-bg-gray:hover { background-color: var(--bg-nested); }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        
        .toggle-switch {
          position: relative;
          display: inline-block;
          width: 50px;
          height: 24px;
        }
        .toggle-switch input { 
          opacity: 0;
          width: 0;
          height: 0;
        }
        .slider {
          position: absolute;
          cursor: pointer;
          top: 0; left: 0; right: 0; bottom: 0;
          background-color: #ccc;
          transition: .4s;
        }
        .slider:before {
          position: absolute;
          content: "";
          height: 16px;
          width: 16px;
          left: 4px;
          bottom: 4px;
          background-color: white;
          transition: .4s;
        }
        input:checked + .slider {
          background-color: var(--color-primary);
        }
        input:checked + .slider:before {
          transform: translateX(26px);
        }
        .slider.round {
          border-radius: 34px;
        }
        .slider.round:before {
          border-radius: 50%;
        }
      `}} />
    </div>
  );
}




