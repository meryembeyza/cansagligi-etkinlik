'use client';

import { useState, useEffect } from 'react';
import { useRole } from '@/context/RoleContext';
import { supabase } from '@/lib/supabase';
import { Users, Calendar, Briefcase, Award, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function RepRegionManagerPanel() {
  const { userData } = useRole();
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    passive: 0,
    eventsCount: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  const region = userData?.region || '';

  useEffect(() => {
    if (!region) return;

    const fetchRegionalStats = async () => {
      try {
        setIsLoading(true);
        // Query users in this region who are representatives
        const { data: reps, error } = await supabase
          .from('users')
          .select('id, representative_profiles(status)')
          .eq('role', 'representative')
          .eq('region', region);

        if (error) throw error;

        let active = 0;
        let passive = 0;

        reps?.forEach(rep => {
          const status = (rep.representative_profiles as any)?.status || 'Aktif';
          if (status === 'Aktif') active++;
          else passive++;
        });

        // Query events count in this region
        const { count: eventsCount } = await supabase
          .from('events')
          .select('*', { count: 'exact', head: true })
          .eq('region', region);

        setStats({
          total: reps?.length || 0,
          active,
          passive,
          eventsCount: eventsCount || 0,
        });
      } catch (err) {
        console.error("Failed to fetch regional stats:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRegionalStats();
  }, [region]);

  if (!region) {
    return <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>Hata: Profilinizde tanımlı bir bölge bulunamadı.</div>;
  }

  if (isLoading) {
    return <div style={{ textAlign: 'center', padding: '2rem' }}>Bölge verileri yükleniyor...</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Welcome Card */}
      <div className="card" style={{ padding: '2rem', background: 'linear-gradient(135deg, var(--color-primary) 0%, #4f46e5 100%)', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <span style={{ fontSize: '0.875rem', opacity: 0.8, textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em' }}>
            BÖLGE SORUMLUSU PANELSİ
          </span>
          <h2 style={{ fontSize: '2rem', fontWeight: 700, margin: '0.25rem 0' }}>{userData?.full_name}</h2>
          <p style={{ opacity: 0.9, fontSize: '1rem' }}>Bölgeniz: <strong>{region.toUpperCase()}</strong></p>
        </div>
        <div style={{ padding: '1rem 1.5rem', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 'var(--radius-lg)', textAlign: 'center', backdropFilter: 'blur(10px)' }}>
          <div style={{ fontSize: '2.5rem', fontWeight: 800 }}>{stats.total}</div>
          <div style={{ fontSize: '0.75rem', opacity: 0.8, fontWeight: 600 }}>TOPLAM TEMSİLCİ</div>
        </div>
      </div>

      {/* Grid Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem' }}>
        <div className="card" style={{ padding: '1.5rem', borderLeft: '4px solid var(--status-success)' }}>
          <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Aktif Temsilciler</div>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--status-success)', margin: '0.5rem 0' }}>{stats.active}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Tüm görevlerini aktif sürdürenler</div>
        </div>

        <div className="card" style={{ padding: '1.5rem', borderLeft: '4px solid #f59e0b' }}>
          <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Bölge Etkinlikleri</div>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: '#f59e0b', margin: '0.5rem 0' }}>{stats.eventsCount}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Bu dönem gerçekleştirilen toplam etkinlik</div>
        </div>

        <div className="card" style={{ padding: '1.5rem', borderLeft: '4px solid var(--text-muted)' }}>
          <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Pasif / Mezun Temsilci</div>
          <div style={{ fontSize: '2rem', fontWeight: 700, margin: '0.5rem 0' }}>{stats.passive}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Görev süresi dolmuş veya ayrılmış</div>
        </div>
      </div>

      {/* Quick Menu / Tabs */}
      <div>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem' }}>Bölge İşlemleri</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
          
          <Link href="/dashboard/representatives" className="card" style={{ padding: '1.5rem', textDecoration: 'none', color: 'inherit', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'transform 0.2s' }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateX(4px)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'none'}
          >
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <div style={{ padding: '0.5rem', backgroundColor: 'var(--color-primary-light)', borderRadius: 'var(--radius-md)' }}>
                <Users size={20} color="var(--color-primary)" />
              </div>
              <div>
                <h4 style={{ fontWeight: 700 }}>Temsilcilerim</h4>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Temsilci bilgilerini düzenle ve takip et</p>
              </div>
            </div>
            <ArrowRight size={20} color="var(--text-muted)" />
          </Link>

          <Link href="/dashboard/ramadan" className="card" style={{ padding: '1.5rem', textDecoration: 'none', color: 'inherit', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'transform 0.2s' }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateX(4px)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'none'}
          >
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <div style={{ padding: '0.5rem', backgroundColor: '#fef3c7', borderRadius: 'var(--radius-md)' }}>
                <Calendar size={20} color="#d97706" />
              </div>
              <div>
                <h4 style={{ fontWeight: 700 }}>Ramazan Etkinlikleri</h4>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Bölgenizdeki Ramazan çalışmalarını izleyin</p>
              </div>
            </div>
            <ArrowRight size={20} color="var(--text-muted)" />
          </Link>

          <Link href="/dashboard/inventory" className="card" style={{ padding: '1.5rem', textDecoration: 'none', color: 'inherit', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'transform 0.2s' }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateX(4px)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'none'}
          >
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <div style={{ padding: '0.5rem', backgroundColor: '#e0f2fe', borderRadius: 'var(--radius-md)' }}>
                <Briefcase size={20} color="#0284c7" />
              </div>
              <div>
                <h4 style={{ fontWeight: 700 }}>Envanter Talepleri</h4>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Bölgedeki malzeme taleplerini inceleyin</p>
              </div>
            </div>
            <ArrowRight size={20} color="var(--text-muted)" />
          </Link>

        </div>
      </div>

    </div>
  );
}
