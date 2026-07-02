'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useRole } from '@/context/RoleContext';
import { createClient } from '@/utils/supabase/client';
import RegionManagerPanel from '@/components/dashboard/RegionManagerPanel';
import GeneralAdminPanel from '@/components/dashboard/GeneralAdminPanel';
import ResourceManagerPanel from '@/components/dashboard/ResourceManagerPanel';
import DesignTeamPanel from '@/components/dashboard/DesignTeamPanel';
import CalendarView from '@/components/dashboard/CalendarView';
import ResourceCalendar from '@/components/dashboard/ResourceCalendar';
import UnitHeadPanel from '@/components/dashboard/UnitHeadPanel';
import Link from 'next/link';
import { Plus, CalendarDays, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import RepHeadPanel from '@/components/dashboard/RepHeadPanel';
import RepRegionManagerPanel from '@/components/dashboard/RepRegionManagerPanel';
import RepCoordinatorPanel from '@/components/dashboard/RepCoordinatorPanel';
import RepresentativePanel from '@/components/dashboard/RepresentativePanel';

export default function DashboardPage() {
  const { currentRole, userData, user } = useRole();
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [altDate, setAltDate] = useState('');
  const [unitHeadStats, setUnitHeadStats] = useState({ total: 0, pending: 0, completed: 0, revision: 0 });

  useEffect(() => {
    async function fetchStats() {
      if (currentRole === 'unit_head' && user?.id) {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('events')
          .select('status')
          .eq('created_by', user.id);
        if (data && !error) {
          setUnitHeadStats({
            total: data.length,
            pending: data.filter(e => e.status?.includes('Onay Bekliyor')).length,
            completed: data.filter(e => e.status === 'Gerçekleşti').length,
            revision: data.filter(e => e.status === 'Yeniden Onay Bekliyor' || e.status === 'Revizyon İstendi').length
          });
        }
      }
    }
    fetchStats();
  }, [currentRole, user]);

  const statsCards = [
    { label: 'Toplam Etkinlik', value: unitHeadStats.total, color: '#3b82f6', icon: <CalendarDays size={28} color="rgba(59, 130, 246, 0.2)" /> },
    { label: 'Onay Bekleyen', value: unitHeadStats.pending, color: '#f59e0b', icon: <Clock size={28} color="rgba(245, 158, 11, 0.2)" /> },
    { label: 'Tamamlanan', value: unitHeadStats.completed, color: '#10b981', icon: <CheckCircle2 size={28} color="rgba(16, 185, 129, 0.2)" /> },
    { label: 'Revizyon Bekleyen', value: unitHeadStats.revision, color: '#ef4444', icon: <AlertCircle size={28} color="rgba(239, 68, 68, 0.2)" /> }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>
          {currentRole === 'unit_head' && 'Birim Başkanı Paneli'}
          {currentRole === 'region_manager' && 'Bölge Sorumlusu Paneli'}
          {currentRole === 'general_admin' && 'Genel Yetkili Paneli'}
          {currentRole === 'design_team' && 'Tasarım Ekibi Paneli'}
          {currentRole === 'resource_manager' && 'Kaynak Sorumlusu Paneli'}
          {currentRole === 'rep_head' && 'Temsilcilikler Birimi Başkanı Paneli'}
          {currentRole === 'rep_region_manager' && 'Temsilcilikler Birimi Bölge Sorumlusu Paneli'}
          {currentRole === 'rep_coordinator' && 'Temsilcilikler Birimi Koordinatörü Paneli'}
          {currentRole === 'representative' && 'Temsilci Paneli'}
          {currentRole === 'bursary_student' && 'Öğrenci Paneli'}
        </h1>
        {currentRole === 'unit_head' && (
          <Link href="/dashboard/events/new" className="btn-create-event">
            <Plus size={18} />
            Yeni Etkinlik Oluştur
          </Link>
        )}
      </div>

      {currentRole === 'unit_head' && (
        <>
          <style dangerouslySetInnerHTML={{__html: `
            .stats-grid {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 16px;
              margin-bottom: 28px;
            }
            .stat-card {
              background: white;
              border: 1px solid #f0f0f0;
              border-radius: 14px;
              padding: 20px 24px;
              box-shadow: 0 1px 4px rgba(0,0,0,0.06);
              position: relative;
              overflow: hidden;
            }
            [data-theme="dark"] .stat-card, .dark .stat-card {
              background: #1c1c1c;
              border: 1px solid rgba(255,255,255,0.07);
              box-shadow: 0 1px 4px rgba(0,0,0,0.2);
            }
            @media (max-width: 768px) {
              .stats-grid {
                grid-template-columns: repeat(2, 1fr);
              }
            }
          `}} />
          <div className="stats-grid">
            {statsCards.map((stat, i) => (
              <div key={i} className="stat-card" style={{ borderBottom: `3px solid ${stat.color}` }}>
                <div style={{
                  width: '80px', height: '80px', borderRadius: '50%',
                  position: 'absolute', top: '-20px', right: '-20px',
                  backgroundColor: stat.color, opacity: 0.08
                }}></div>
                <div style={{ position: 'absolute', bottom: '16px', right: '16px' }}>
                  {stat.icon}
                </div>
                <div style={{ position: 'relative', zIndex: 1 }}>
                  <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-main)', lineHeight: 1 }}>
                    {stat.value}
                  </div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginTop: '4px' }}>
                    {stat.label}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="tab-group-pill">
        <button 
          className={`tab-pill-btn ${viewMode === 'list' ? 'active' : ''}`}
          onClick={() => setViewMode('list')}
        >
          Yönetim Paneli
        </button>
        <button 
          className={`tab-pill-btn ${viewMode === 'calendar' ? 'active' : ''}`}
          onClick={() => setViewMode('calendar')}
        >
          Etkinlik Takvimi
        </button>
      </div>

      {viewMode === 'calendar' ? (
        <CalendarView userRole={currentRole || ''} userRegion={userData?.region || ''} userId={user?.id} />
      ) : (
        <>
          {/* Role Specific Content */}
          {currentRole === 'unit_head' && (
            <UnitHeadPanel />
          )}

          {currentRole === 'region_manager' && (
            <RegionManagerPanel />
          )}

          {currentRole === 'general_admin' && (
            <GeneralAdminPanel />
          )}

          {currentRole === 'design_team' && (
            <DesignTeamPanel />
          )}

          {currentRole === 'resource_manager' && (
            <ResourceManagerPanel />
          )}

          {currentRole === 'rep_head' && (
            <RepHeadPanel />
          )}

          {currentRole === 'rep_region_manager' && (
            <RepRegionManagerPanel />
          )}

          {currentRole === 'rep_coordinator' && (
            <RepCoordinatorPanel />
          )}

          {currentRole === 'representative' && (
            <RepresentativePanel />
          )}

          {currentRole === 'bursary_student' && (
            <div className="card" style={{ padding: '4rem 2rem', textAlign: 'center', marginTop: '2rem' }}>
              <div style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: 'var(--bg-success-light)', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                <span style={{ fontSize: '2.5rem' }}>🎓</span>
              </div>
              <h2 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--text-main)' }}>
                Öğrenci Paneline Hoş Geldiniz
              </h2>
              <p style={{ color: 'var(--text-muted)', marginBottom: '2.5rem', maxWidth: '550px', margin: '0 auto 2.5rem', lineHeight: '1.6' }}>
                Cansağlığı Vakfı Etkinlik Yönetim Sistemi üzerinden sizin için tanımlanan zorunlu etkinlikleri takip edebilir, RSVP bildirimlerinizi yapabilir ve etkinlik günü yoklamanızı verebilirsiniz.
              </p>
              <Link href="/dashboard/bursary-panel" className="btn btn-primary" style={{ padding: '0.875rem 2rem', fontSize: '1rem', fontWeight: 600, borderRadius: '8px' }}>
                Öğrenci Etkinlik Paneline Git
              </Link>
            </div>
          )}
        </>
      )}
    </div>
  );
}
