'use client';

import ResourceCalendar from '@/components/dashboard/ResourceCalendar';

export default function ResourceCalendarPage() {
  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '1rem' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#1e293b' }}>Kaynak & Lojistik Takvimi</h1>
        <p style={{ color: 'var(--text-muted)' }}>Ürün ve malzeme bazında aylık kullanım ve onaylanmış rezervasyon takvimi.</p>
      </div>
      
      <ResourceCalendar />
    </div>
  );
}
