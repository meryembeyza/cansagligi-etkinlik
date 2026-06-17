'use client';

import { useState, useEffect } from 'react';
import { Bell, CheckCircle2, Menu } from 'lucide-react';
import ThemeToggle from '@/components/ui/ThemeToggle';
import { useRole } from '@/context/RoleContext';
import { UserRole } from '@/types';
import { createClient } from '@/utils/supabase/client';
const supabase = createClient();

export default function Header({ onMenuClick }: { onMenuClick?: () => void }) {
  const { currentRole, user, logout } = useRole();
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      fetchNotifications();
    }
  }, [user]);

  const fetchNotifications = async () => {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user?.id)
      .order('created_at', { ascending: false })
      .limit(20);
    
    if (!error && data) {
      setNotifications(data);
    }
  };

  const markAllAsRead = async () => {
    if (unreadCount === 0) return;
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user?.id)
      .eq('is_read', false);
    
    fetchNotifications();
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const roles: {value: UserRole, label: string}[] = [
    { value: 'unit_head', label: 'Birim Başkanı' },
    { value: 'region_manager', label: 'Bölge Sorumlusu' },
    { value: 'general_admin', label: 'Genel Yetkili' },
    { value: 'design_team', label: 'Tasarım Ekibi' },
    { value: 'resource_manager', label: 'Kaynak Sorumlusu' },
  ];

  return (
    <header className="header-container">
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <button 
          className="mobile-menu-btn" 
          onClick={onMenuClick} 
        >
          <Menu size={24} />
        </button>
        <h2 className="header-greeting">
          Hoş Geldiniz{user?.user_metadata?.full_name ? `, ${user.user_metadata.full_name.split(' ')[0]} 👋` : ''}
        </h2>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
        
        <ThemeToggle />

        <div style={{ position: 'relative' }}>
          <button 
            onClick={() => setIsNotifOpen(!isNotifOpen)}
            className="header-icon-btn"
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="notif-dot"></span>
            )}
          </button>

          {isNotifOpen && (
            <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: '0.5rem', width: '320px', backgroundColor: 'var(--bg-card)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-lg)', border: '1px solid var(--border-color)', zIndex: 50 }}>
              <div style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Bildirimler</h3>
                {unreadCount > 0 && (
                  <button onClick={markAllAsRead} style={{ fontSize: '0.75rem', color: 'var(--color-primary)', cursor: 'pointer', background: 'none', border: 'none' }}>Tümünü Okundu İşaretle</button>
                )}
              </div>
              <div style={{ maxHeight: '300px', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
                {notifications.length === 0 ? (
                  <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    Yeni bildirim bulunmuyor.
                  </div>
                ) : (
                  notifications.map(notif => (
                    <div key={notif.id} style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)', backgroundColor: notif.is_read ? 'transparent' : '#f0fdf4', display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                      {!notif.is_read && <div style={{ width: '8px', height: '8px', backgroundColor: 'var(--status-success)', borderRadius: '50%', marginTop: '6px', flexShrink: 0 }}></div>}
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: '0.875rem', color: 'var(--text-main)', margin: '0 0 0.25rem 0', lineHeight: 1.4 }}>{notif.message}</p>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{new Date(notif.created_at).toLocaleString('tr-TR')}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <div style={{ position: 'relative' }}>
          <div 
            style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', padding: '0.5rem', borderRadius: 'var(--radius-sm)', transition: 'background-color 0.2s' }}
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="hover-bg-gray"
          >
            <div className="header-avatar">
              {user?.user_metadata?.full_name?.charAt(0) || 'U'}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span className="header-user-name">{user?.user_metadata?.full_name || 'Kullanıcı'}</span>
              <span className="header-user-role">
                {currentRole === 'unit_head' ? 'Birim Başkanı' : 
                 currentRole === 'region_manager' ? 'Bölge Sorumlusu' : 
                 currentRole === 'general_admin' ? 'Genel Yetkili' : 
                 currentRole === 'design_team' ? 'Tasarım Ekibi' : 
                 currentRole === 'resource_manager' ? 'Kaynak Sorumlusu' : 'Yükleniyor...'}
              </span>
            </div>
          </div>

          {isProfileOpen && (
            <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: '0.5rem', width: '200px', backgroundColor: 'var(--bg-card)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-lg)', border: '1px solid var(--border-color)', zIndex: 50, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <a href="/dashboard/profile" style={{ padding: '0.75rem 1rem', color: 'var(--text-main)', textDecoration: 'none', borderBottom: '1px solid var(--border-color)', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }} className="hover-bg-gray">
                Profilim
              </a>
              <a href="/dashboard/settings" style={{ padding: '0.75rem 1rem', color: 'var(--text-main)', textDecoration: 'none', borderBottom: '1px solid var(--border-color)', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }} className="hover-bg-gray">
                Ayarlar
              </a>
              <button onClick={logout} style={{ padding: '0.75rem 1rem', color: 'var(--status-danger)', textDecoration: 'none', background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%' }} className="hover-bg-gray">
                Çıkış Yap
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

