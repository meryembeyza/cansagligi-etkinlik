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
        </>
      )}
    </div>
  );
}
