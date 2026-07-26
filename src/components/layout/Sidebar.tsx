'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useRole } from '@/context/RoleContext';
import { Home, Calendar, Users, PenTool, LayoutTemplate, Briefcase, Settings, LogOut, User, ChevronLeft, ChevronRight } from 'lucide-react';

export default function Sidebar({ isOpen = false, setIsOpen }: { isOpen?: boolean, setIsOpen?: (val: boolean) => void }) {
  const { currentRole, logout } = useRole();
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sidebar_collapsed');
      if (saved === 'true') {
        setIsCollapsed(true);
      }
    }
  }, []);

  const toggleCollapse = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    if (typeof window !== 'undefined') {
      localStorage.setItem('sidebar_collapsed', newState.toString());
    }
  };

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
      { name: 'Afiş Talepleri', icon: PenTool, path: '/dashboard/afis-talepleri' },
    ],
    resource_manager: [
      { name: 'Rezervasyon Talepleri', icon: Briefcase, path: '/dashboard' },
      { name: 'Kaynak Takvimi', icon: Calendar, path: '/dashboard/resource-calendar' },
    ],
    rep_head: [
      { name: 'Ana Panel', icon: Home, path: '/dashboard' },
      { name: 'Temsilciler', icon: Users, path: '/dashboard/representatives' },
      { name: 'Gönüllü Takibi', icon: Users, path: '/dashboard/volunteers' },
      { name: 'Bursiyer Yönetimi', icon: Users, path: '/dashboard/bursary' },
      { name: 'Ramazan Takibi', icon: Calendar, path: '/dashboard/ramadan' },
      { name: 'Envanter Yönetimi', icon: Briefcase, path: '/dashboard/inventory' },
      { name: 'Bursiyer Takip (Admin)', icon: Users, path: '/dashboard/bursary-admin' },
      { name: 'Raporlar & Analizler', icon: LayoutTemplate, path: '/dashboard/reports' },
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
      { name: 'Etkinlikler', icon: Calendar, path: '/dashboard/bursary-panel/events' },
      { name: 'Profilim', icon: User, path: '/dashboard/profile' },
    ]
  };

  const currentMenu = currentRole ? (menuItems[currentRole] || []) : [];

  return (
    <>
      {isOpen && (
        <div 
          className="sidebar-overlay active"
          onClick={() => setIsOpen && setIsOpen(false)}
        />
      )}
      <aside className={`sidebar-container ${isOpen ? 'open' : ''} ${isCollapsed ? 'collapsed' : ''}`}>
        <div style={{ padding: '24px 20px', borderBottom: '1px solid var(--sidebar-logo-border, var(--border-color))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="logo-wrapper"><img src="/logo.png" alt="Cansağlığı Vakfı Logo" className="theme-aware-logo" style={{ height: '45px', objectFit: 'contain' }} /></div>
        </div>
      
      <nav style={{ flex: 1, padding: '1.5rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <p className="sidebar-menu-label sidebar-text">
          Menü
        </p>
        
        {currentMenu.map((item, index) => {
          const Icon = item.icon;
          const isActive = pathname === item.path || (item.path !== '/dashboard' && pathname.startsWith(item.path));
          return (
            <Link
              key={index}
              href={item.path}
              className={`sidebar-link ${isActive ? 'active' : ''}`}
            >
              <Icon size={18} className="sidebar-link-icon" style={{ minWidth: '18px' }} />
              <span className="sidebar-text">{item.name}</span>
              <div className="sidebar-tooltip">{item.name}</div>
            </Link>
          );
        })}
      </nav>

      <div className="sidebar-bottom-section" style={{ position: 'relative' }}>
        <Link href="/dashboard/profile" className="btn btn-outline sidebar-bottom-btn" style={{ width: '100%', justifyContent: 'flex-start', border: 'none' }}>
          <User size={18} style={{ minWidth: '18px' }} />
          <span className="sidebar-text">Profilim</span>
          <div className="sidebar-tooltip">Profilim</div>
        </Link>
        <button onClick={logout} className="btn sidebar-logout-btn" style={{ width: '100%', justifyContent: 'flex-start', border: 'none' }}>
          <LogOut size={18} style={{ minWidth: '18px' }} />
          <span className="sidebar-text">Çıkış Yap</span>
          <div className="sidebar-tooltip">Çıkış Yap</div>
        </button>

        {/* Collapse Toggle Button */}
        <button 
          onClick={toggleCollapse}
          style={{
            position: 'absolute',
            right: '-12px',
            bottom: '24px',
            width: '24px',
            height: '24px',
            borderRadius: '50%',
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            zIndex: 60,
            boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
            color: 'var(--text-muted)'
          }}
          className="sidebar-collapse-toggle"
        >
          {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>
    </aside>
    </>
  );
}
