'use client';

import { useRole } from '@/context/RoleContext';
import CalendarView from '@/components/dashboard/CalendarView';

export default function CalendarPage() {
  const { currentRole, user } = useRole();

  if (!currentRole) return <div>Yükleniyor...</div>;

  // Sadece Bölge Sorumluları, Genel Yetkililer ve Kaynak Sorumluları (isterseniz) takvimi görebilsin
  const allowedRoles = ['region_manager', 'general_admin', 'resource_manager'];
  
  if (!allowedRoles.includes(currentRole)) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Yetkisiz Erişim</h2>
        <p style={{ color: 'var(--text-muted)' }}>Bu sayfayı görüntüleme yetkiniz bulunmamaktadır.</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>
          {currentRole === 'general_admin' ? 'Tüm Türkiye Etkinlik Takvimi' : 'Bölge Etkinlik Takvimi'}
        </h1>
        <p style={{ color: 'var(--text-muted)' }}>Sistemdeki etkinlikleri takvim üzerinden takip edin.</p>
      </div>

      <CalendarView userRole={currentRole} userRegion={user?.user_metadata?.region || ''} />
    </div>
  );
}
