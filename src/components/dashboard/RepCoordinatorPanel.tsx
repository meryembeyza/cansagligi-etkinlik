'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
const supabase = createClient();
import { Users, ClipboardList, Calendar, Award, Briefcase, Plus, Search } from 'lucide-react';
import Link from 'next/link';

export default function RepCoordinatorPanel() {
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    bursary: 0,
    pendingInterviews: 8,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setIsLoading(true);
        // Fetch representatives count
        const { data: reps } = await supabase
          .from('users')
          .select('id, representative_profiles(status)')
          .eq('role', 'representative');

        let active = 0;
        reps?.forEach(rep => {
          if (((rep.representative_profiles as any)?.status || 'Aktif') === 'Aktif') active++;
        });

        setStats({
          total: reps?.length || 0,
          active,
          bursary: 45, // Mock value as per specifications
          pendingInterviews: 8,
        });
      } catch (err) {
        console.error("Failed to fetch coordinator stats:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (isLoading) {
    return <div style={{ textAlign: 'center', padding: '2rem' }}>Veriler yükleniyor...</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Upper stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem' }}>
        <div className="card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '0.75rem', backgroundColor: 'var(--color-primary-light)', borderRadius: 'var(--radius-md)' }}>
            <Users size={24} color="var(--color-primary)" />
          </div>
          <div>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Temsilci Havuzu</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{stats.total} Kayıt</div>
          </div>
        </div>

        <div className="card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '0.75rem', backgroundColor: '#ecfdf5', borderRadius: 'var(--radius-md)' }}>
            <Users size={24} color="var(--status-success)" />
          </div>
          <div>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Aktif Görevde</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--status-success)' }}>{stats.active}</div>
          </div>
        </div>

        <div className="card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '0.75rem', backgroundColor: '#fef3c7', borderRadius: 'var(--radius-md)' }}>
            <Award size={24} color="#f59e0b" />
          </div>
          <div>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Bursiyer Adayı</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{stats.bursary} Aday</div>
          </div>
        </div>

        <div className="card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '0.75rem', backgroundColor: '#e0f2fe', borderRadius: 'var(--radius-md)' }}>
            <ClipboardList size={24} color="#0284c7" />
          </div>
          <div>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Mülakat Bekleyen</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{stats.pendingInterviews} Aday</div>
          </div>
        </div>
      </div>

      {/* Main Action Modules */}
      <div>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem' }}>Günlük Operasyon Modülleri</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
          
          {/* Card 1 */}
          <div className="card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem', borderTop: '4px solid var(--color-primary)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h4 style={{ fontSize: '1.125rem', fontWeight: 700 }}>Temsilci Yönetimi</h4>
              <Users size={24} color="var(--color-primary)" />
            </div>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Tüm bölgelerdeki temsilcileri arayın, detaylarını güncelleyin veya yeni temsilci ekleyin.</p>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: 'auto' }}>
              <Link href="/dashboard/representatives" className="btn btn-primary" style={{ textDecoration: 'none', flex: 1, textAlign: 'center', fontSize: '0.875rem' }}>
                <Search size={16} style={{ marginRight: '0.25rem' }} /> İncele & Yönet
              </Link>
            </div>
          </div>

          {/* Card 2 */}
          <div className="card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem', borderTop: '4px solid #f59e0b' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h4 style={{ fontSize: '1.125rem', fontWeight: 700 }}>Mülakat ve Burs Sistemi</h4>
              <Award size={24} color="#f59e0b" />
            </div>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Burs başvurularını görün, adaylar için mülakat randevuları planlayın ve değerlendirmeleri girin.</p>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: 'auto' }}>
              <Link href="/dashboard/bursary" className="btn btn-outline" style={{ textDecoration: 'none', flex: 1, textAlign: 'center', fontSize: '0.875rem' }}>
                Randevu Planla
              </Link>
            </div>
          </div>

          {/* Card 3 */}
          <div className="card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem', borderTop: '4px solid #0284c7' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h4 style={{ fontSize: '1.125rem', fontWeight: 700 }}>Envanter ve Lojistik</h4>
              <Briefcase size={24} color="#0284c7" />
            </div>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Bölgelerden gelen envanter taleplerini detaylı inceleyin, not ekleyerek başkana iletin.</p>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: 'auto' }}>
              <Link href="/dashboard/inventory" className="btn btn-outline" style={{ textDecoration: 'none', flex: 1, textAlign: 'center', fontSize: '0.875rem' }}>
                Talepleri İncele
              </Link>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}

