'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { useRole } from '@/context/RoleContext';
import RegionManagerPanel from '@/components/dashboard/RegionManagerPanel';
import GeneralAdminPanel from '@/components/dashboard/GeneralAdminPanel';
import ResourceManagerPanel from '@/components/dashboard/ResourceManagerPanel';
import DesignTeamPanel from '@/components/dashboard/DesignTeamPanel';
import CalendarView from '@/components/dashboard/CalendarView';
import ResourceCalendar from '@/components/dashboard/ResourceCalendar';
import UnitHeadPanel from '@/components/dashboard/UnitHeadPanel';
import Link from 'next/link';
import RepHeadPanel from '@/components/dashboard/RepHeadPanel';
import RepRegionManagerPanel from '@/components/dashboard/RepRegionManagerPanel';
import RepCoordinatorPanel from '@/components/dashboard/RepCoordinatorPanel';
import RepresentativePanel from '@/components/dashboard/RepresentativePanel';

export default function DashboardPage() {
  const { currentRole, userData, user } = useRole();
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [altDate, setAltDate] = useState('');

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
          <Link href="/dashboard/events/new" className="btn btn-primary" style={{ textDecoration: 'none' }}>
            Yeni Etkinlik Oluştur
          </Link>
        )}
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid #eaeaea', paddingBottom: '1rem' }}>
        <button 
          className={`btn ${viewMode === 'list' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setViewMode('list')}
        >
          Yönetim Paneli (Liste)
        </button>
        <button 
          className={`btn ${viewMode === 'calendar' ? 'btn-primary' : 'btn-outline'}`}
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
              <div style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: '#f0fdf4', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                <span style={{ fontSize: '2.5rem' }}>🎓</span>
              </div>
              <h2 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.75rem', color: '#111827' }}>
                Öğrenci Paneline Hoş Geldiniz
              </h2>
              <p style={{ color: '#4b5563', marginBottom: '2.5rem', maxWidth: '550px', margin: '0 auto 2.5rem', lineHeight: '1.6' }}>
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
