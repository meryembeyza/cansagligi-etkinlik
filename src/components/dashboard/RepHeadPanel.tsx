'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Users, MapPin, Award, CheckSquare, Calendar, ChevronRight } from 'lucide-react';
import Link from 'next/link';

interface RegionStat {
  name: string;
  manager: string;
  count: number;
  activeCount: number;
}

const REGIONS = [
  { name: 'Akdeniz', manager: 'Tuğba KIRIM', responsibility: 'Adana, Mersin, Antalya, İçel vb.' },
  { name: 'Doğu Anadolu', manager: 'Furkan BAYHAN', responsibility: 'Erzurum, Rize, Trabzon, Van vb.' },
  { name: 'Ege', manager: 'Abdullah KAYA', responsibility: 'İzmir, Aydın, Denizli, Muğla vb.' },
  { name: 'Güneydoğu Anadolu', manager: 'Recep ÇETİN', responsibility: 'Gaziantep, Şanlıurfa, Diyarbakır, Mardin vb.' },
  { name: 'Ankara', manager: 'Hasan SAY', responsibility: 'Ankara' },
  { name: 'İç Anadolu', manager: 'Berire GÜLMEZ', responsibility: 'Konya, Kayseri, Sivas, Niğde vb.' },
  { name: 'Karadeniz', manager: 'Hasan Sadık MAYDA', responsibility: 'Samsun, Ordu, Rize, Giresun vb.' },
  { name: 'İstanbul Anadolu', manager: 'Rabia Nur MUTLU', responsibility: 'İstanbul (Anadolu Yakası)' },
  { name: 'İstanbul Avrupa', manager: 'Zeynep Erva DOĞAN', responsibility: 'İstanbul (Avrupa Yakası)' },
  { name: 'Marmara', manager: 'Yusuf ÖZTÜRKMEN', responsibility: 'Bursa, Eskişehir, Bilecik, Tekirdağ vb.' }
];

export default function RepHeadPanel() {
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    passive: 0,
    bursaryCandidates: 0,
    regionManagersCount: 10
  });
  const [regionStats, setRegionStats] = useState<RegionStat[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchRepStats = async () => {
      try {
        // Fetch users who are representatives
        const { data: reps, error } = await supabase
          .from('users')
          .select('id, is_approved, region, representative_profiles(status)')
          .eq('role', 'representative');

        if (error) throw error;

        // Calculate counts
        const totalCount = reps?.length || 0;
        let active = 0;
        let passive = 0;

        const regionCounts: Record<string, { total: number; active: number }> = {};
        REGIONS.forEach(r => {
          regionCounts[r.name.toLowerCase()] = { total: 0, active: 0 };
        });

        reps?.forEach(rep => {
          const profileStatus = (rep.representative_profiles as any)?.status || 'Aktif';
          if (profileStatus === 'Aktif') active++;
          else passive++;

          const rName = rep.region ? rep.region.toString().toLowerCase() : '';
          if (regionCounts[rName]) {
            regionCounts[rName].total++;
            if (profileStatus === 'Aktif') regionCounts[rName].active++;
          }
        });

        // Set state stats
        setStats({
          total: totalCount,
          active,
          passive,
          bursaryCandidates: 12, // Mock or fetch bursary candidates
          regionManagersCount: REGIONS.length
        });

        // Map region stats
        const mappedRegionStats = REGIONS.map(r => ({
          name: r.name,
          manager: r.manager,
          count: regionCounts[r.name.toLowerCase()]?.total || 0,
          activeCount: regionCounts[r.name.toLowerCase()]?.active || 0
        }));

        setRegionStats(mappedRegionStats);
      } catch (err) {
        console.error("Failed to fetch representative stats:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRepStats();
  }, []);

  if (isLoading) {
    return <div style={{ textAlign: 'center', padding: '2rem' }}>İstatistikler yükleniyor...</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
        <div className="card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', borderLeft: '4px solid var(--color-primary)' }}>
          <div style={{ padding: '0.75rem', backgroundColor: 'var(--color-primary-light)', borderRadius: 'var(--radius-md)' }}>
            <Users size={24} color="var(--color-primary)" />
          </div>
          <div>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Toplam Temsilci</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{stats.total}</div>
          </div>
        </div>

        <div className="card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', borderLeft: '4px solid var(--status-success)' }}>
          <div style={{ padding: '0.75rem', backgroundColor: '#ecfdf5', borderRadius: 'var(--radius-md)' }}>
            <Users size={24} color="var(--status-success)" />
          </div>
          <div>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Aktif Temsilci</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--status-success)' }}>{stats.active}</div>
          </div>
        </div>

        <div className="card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', borderLeft: '4px solid var(--text-muted)' }}>
          <div style={{ padding: '0.75rem', backgroundColor: '#f3f4f6', borderRadius: 'var(--radius-md)' }}>
            <Users size={24} color="var(--text-muted)" />
          </div>
          <div>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Pasif / Mezun</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{stats.passive}</div>
          </div>
        </div>

        <div className="card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', borderLeft: '4px solid #f59e0b' }}>
          <div style={{ padding: '0.75rem', backgroundColor: '#fef3c7', borderRadius: 'var(--radius-md)' }}>
            <Award size={24} color="#f59e0b" />
          </div>
          <div>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Bursiyer Adayı</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{stats.bursaryCandidates}</div>
          </div>
        </div>
      </div>

      {/* Region Grid Header */}
      <div>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <MapPin size={20} color="var(--color-primary)" />
          Temsilcilik Bölgeleri ({stats.regionManagersCount} Bölge)
        </h2>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
          {regionStats.map((region, idx) => (
            <Link 
              key={idx}
              href={`/dashboard/representatives?region=${encodeURIComponent(region.name)}`}
              className="card"
              style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', textDecoration: 'none', color: 'inherit', transition: 'transform 0.2s, box-shadow 0.2s', cursor: 'pointer' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'none';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--color-primary)' }}>{region.name.toUpperCase()}</h3>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Bölge Sorumlusu:</span>
                  <div style={{ fontSize: '0.9rem', fontWeight: 600, marginTop: '0.1rem' }}>{region.manager}</div>
                </div>
                <div style={{ padding: '0.35rem 0.75rem', backgroundColor: 'var(--color-primary-light)', color: 'var(--color-primary)', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 700 }}>
                  {region.count} Temsilci
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem', paddingTop: '0.75rem', borderTop: '1px dashed #eaeaea', color: 'var(--text-muted)' }}>
                <span>Aktif: <strong>{region.activeCount}</strong></span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--color-primary)' }}>
                  Detayları Gör <ChevronRight size={14} />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>

    </div>
  );
}
