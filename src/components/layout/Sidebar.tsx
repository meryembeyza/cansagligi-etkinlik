'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { useRole } from '@/context/RoleContext';
import { Home, Calendar, Users, PenTool, LayoutTemplate, Briefcase, Settings, LogOut, User } from 'lucide-react';

export default function Sidebar({ isOpen = false, setIsOpen }: { isOpen?: boolean, setIsOpen?: (val: boolean) => void }) {
  const { currentRole, logout } = useRole();
  const pathname = usePathname();

  useEffect(() => {
    if (setIsOpen) setIsOpen(false);
  }, [pathname, setIsOpen]);

  const menuItems = {
    unit_head: [
      { name: 'Ana Panel', icon: Home, path: '/dashboard' },
      { name: 'Etkinliklerim', icon: Calendar, path: '/dashboard/events' },
      { name: 'Yeni Etkinlik', icon: PenTool, path: '/dashboard/events/new' },
      { name: 'Konuşmacı Arşivi', icon: Users, path: '/dashboard/speakers' },
    ],
    region_manager: [
      { name: 'Onay Bekleyenler', icon: Home, path: '/dashboard' },
      { name: 'Bölge Takvimi', icon: Calendar, path: '/dashboard/calendar' },
      { name: 'Raporlar', icon: LayoutTemplate, path: '/dashboard/reports' },
    ],
    general_admin: [
      { name: 'Genel Bakış', icon: Home, path: '/dashboard' },
      { name: 'Tüm Takvim', icon: Calendar, path: '/dashboard/calendar' },
      { name: 'Lojistik Yönetimi', icon: Briefcase, path: '/dashboard/logistics' },
      { name: 'Kullanıcılar', icon: Users, path: '/dashboard/users' },
      { name: 'Bursiyer Takip (Admin)', icon: Users, path: '/dashboard/bursary-admin' },
      { name: 'Ayarlar', icon: Settings, path: '/dashboard/settings' },
    ],
    design_team: [
      { name: 'Afiş Talepleri', icon: PenTool, path: '/dashboard' },
    ],
    resource_manager: [
      { name: 'Rezervasyon Talepleri', icon: Briefcase, path: '/dashboard' },
      { name: 'Kaynak Takvimi', icon: Calendar, path: '/dashboard/resource-calendar' },
    ],
    rep_head: [
      { name: 'Ana Panel', icon: Home, path: '/dashboard' },
      { name: 'Temsilciler', icon: Users, path: '/dashboard/representatives' },
      { name: 'Gönüllü Takibi', icon: Users, path: '/dashboard/volunteers' },
      { name: 'Bölge Yönetimi', icon: LayoutTemplate, path: '/dashboard/regions' },
      { name: 'Bursiyer Yönetimi', icon: Users, path: '/dashboard/bursary' },
      { name: 'Ramazan Takibi', icon: Calendar, path: '/dashboard/ramadan' },
      { name: 'Envanter Yönetimi', icon: Briefcase, path: '/dashboard/inventory' },
      { name: 'Bursiyer Takip (Admin)', icon: Users, path: '/dashboard/bursary-admin' },
      { name: 'Raporlar & Analizler', icon: LayoutTemplate, path: '/dashboard/rep-reports' },
    ],
    rep_coordinator: [
      { name: 'Ana Panel', icon: Home, path: '/dashboard' },
      { name: 'Temsilci Yönetimi', icon: Users, path: '/dashboard/representatives' },
      { name: 'Gönüllü Takibi', icon: Users, path: '/dashboard/volunteers' },
      { name: 'Bursiyer Adayları', icon: Users, path: '/dashboard/bursary' },
      { name: 'Ramazan Etkinlikleri', icon: Calendar, path: '/dashboard/ramadan' },
      { name: 'Envanter Talepleri', icon: Briefcase, path: '/dashboard/inventory' },
    ],
    rep_region_manager: [
      { name: 'Ana Panel', icon: Home, path: '/dashboard' },
      { name: 'Bölge Temsilcileri', icon: Users, path: '/dashboard/representatives' },
      { name: 'Gönüllü Takibi', icon: Users, path: '/dashboard/volunteers' },
      { name: 'Ramazan Etkinlikleri', icon: Calendar, path: '/dashboard/ramadan' },
      { name: 'Envanter Talepleri', icon: Briefcase, path: '/dashboard/inventory' },
      { name: 'Bursiyer Adayları', icon: Users, path: '/dashboard/bursary' },
    ],
    representative: [
      { name: 'Temsilci Paneli', icon: Home, path: '/dashboard' },
      { name: 'Yeni Etkinlik', icon: PenTool, path: '/dashboard/events/new' },
      { name: 'Envanter Talepleri', icon: Briefcase, path: '/dashboard/inventory' },
      { name: 'Gönüllü Takibi', icon: Users, path: '/dashboard/volunteers' },
    ],
    bursary_student: [
      { name: 'Bursiyer Paneli', icon: Home, path: '/dashboard/bursary-panel' },
      { name: 'Profilim', icon: User, path: '/dashboard/profile' },
    ]
  };

  const currentMenu = currentRole ? (menuItems[currentRole] || []) : [];

  return (
    <>
      {isOpen && (
        <div 
          className="sidebar-overlay"
          onClick={() => setIsOpen && setIsOpen(false)}
        />
      )}
      <aside className={`sidebar-container ${isOpen ? 'open' : ''}`}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid #eaeaea', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <img src="/logo.png" alt="Cansağlığı Vakfı Logo" style={{ height: '45px', objectFit: 'contain' }} />
      </div>
      
      <nav style={{ flex: 1, padding: '1.5rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
          Menü
        </p>
        
        {currentMenu.map((item, index) => {
          const Icon = item.icon;
          const isActive = pathname === item.path || (item.path !== '/dashboard' && pathname.startsWith(item.path));
          return (
            <Link
              key={index}
              href={item.path}
              style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.75rem 1rem',
                  paddingLeft: isActive ? 'calc(1rem - 3px)' : '1rem',
                  borderLeft: isActive ? '3px solid #da1c15' : '3px solid transparent',
                  borderRadius: 'var(--radius-md)',
                  color: isActive ? '#da1c15' : 'var(--text-main)',
                  backgroundColor: isActive ? '#fcdbd9' : 'transparent',
                  transition: 'background-color 150ms',
                  fontWeight: isActive ? 600 : 500,
                  textDecoration: 'none',
                }}
              className={isActive ? '' : 'sidebar-link-hover'}
            >
              <Icon size={18} color={isActive ? '#da1c15' : 'var(--text-muted)'} />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div style={{ padding: '1rem', borderTop: '1px solid #eaeaea', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <Link href="/dashboard/profile" className="btn btn-outline" style={{ width: '100%', justifyContent: 'flex-start', border: 'none', backgroundColor: 'transparent', padding: '0.5rem 1rem' }}>
          <User size={18} />
          Profilim
        </Link>
        <button onClick={logout} className="btn btn-outline" style={{ width: '100%', justifyContent: 'flex-start', color: 'var(--status-danger)', borderColor: 'var(--status-danger)' }}>
          <LogOut size={18} />
          Çıkış Yap
        </button>
      </div>
      <style dangerouslySetInnerHTML={{__html: `
        .sidebar-container {
          width: 250px;
          min-width: 250px;
          background-color: var(--bg-card);
          border-right: 1px solid #eaeaea;
          display: flex;
          flex-direction: column;
          height: 100vh;
          position: sticky;
          top: 0;
          z-index: 50;
        }
        .sidebar-overlay {
          display: none;
        }
        .sidebar-link-hover:hover {
          background-color: #f3f4f6 !important;
        }
        @media (max-width: 768px) {
          .sidebar-container {
            position: fixed;
            top: 0;
            left: 0;
            height: 100vh;
            transform: translateX(-250px);
            transition: transform 300ms ease;
          }
          .sidebar-container.open {
            transform: translateX(0);
          }
          .sidebar-overlay {
            display: block;
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: rgba(0, 0, 0, 0.4);
            z-index: 40;
          }
        }
      `}} />
    </aside>
    </>
  );
}
