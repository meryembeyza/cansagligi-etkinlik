'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { ChevronLeft, ChevronRight, MapPin, Filter } from 'lucide-react';
import Link from 'next/link';

const UNIT_COLORS: Record<string, string> = {
  'Sosyal Çalışmalar Birimi': '#10b981', // Yeşil
  'Mesleki ve Kariyer Çalışmaları Birimi': '#ef4444', // Kırmızı
  'Bilimsel ve Akademik Çalışmalar Birimi': '#3b82f6', // Mavi
  'İletişim ve Planlama Birimi': '#8b5cf6', // Mor
  'Temsilcilikler Birimi': '#f59e0b', // Amber / Turuncu
  'Diğer': '#64748b' // Gri
};

export default function CalendarView({ userRole, userRegion, userId }: { userRole: string, userRegion: string, userId?: string }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<any[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);

  // Collapsible filter panel state
  const [isFilterOpen, setIsFilterOpen] = useState(true);

  // Filtreler (Türkiye Sorumlusu için)
  const [regionFilter, setRegionFilter] = useState<string[]>([]);
  const [unitFilter, setUnitFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    fetchCalendarEvents();

    // Supabase Realtime Subscription for Instant Updates
    const subscription = supabase
      .channel('calendar-events')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, payload => {
        // Fetch events again to reflect changes
        fetchCalendarEvents();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [currentDate, regionFilter, unitFilter, statusFilter]);

  const fetchCalendarEvents = async () => {
    // Bulunduğumuz ayın ilk ve son gününü bul
    const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).toISOString();
    const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59).toISOString();

    let query = supabase
      .from('events')
      .select('*')
      .gte('event_date', firstDay)
      .lte('event_date', lastDay);

    // Default status filter if none provided by the General Admin (others only see Onaylandı/Gerçekleşti)
    if (userRole !== 'general_admin') {
      query = query.in('status', ['Onaylandı', 'Gerçekleşti']);
    }

    // Rol bazlı filtreleme
    if (userRole === 'region_manager') {
      let regionToFilter = userRegion;
      let unitToFilter = '';
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: userData } = await supabase.from('users').select('region, unit_name').eq('id', user.id).single();
        regionToFilter = regionToFilter || userData?.region || '';
        unitToFilter = userData?.unit_name || '';
      }
      query = query.eq('region', regionToFilter);
      if (unitToFilter) {
        query = query.eq('unit_name', unitToFilter);
      }
    } else if (userRole === 'unit_head') {
      // Birim başkanı sadece kendi oluşturduğu etkinlikleri görmeli
      if (userId) {
        query = query.eq('created_by', userId);
      } else {
        // userId gelmemişse (yarış durumları için) auth'dan çekmeye çalış
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          query = query.eq('created_by', user.id);
        }
      }
    } else if (userRole === 'resource_manager') {
      // Kaynak sorumlusu sadece kendi biriminin onaylanmış/gerçekleşmiş etkinliklerini görmeli
      let unitToFilter = '';
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: userData } = await supabase.from('users').select('unit_name').eq('id', user.id).single();
        unitToFilter = userData?.unit_name || '';
      }
      if (unitToFilter) {
        query = query.eq('unit_name', unitToFilter);
      }
    }

    // Ekstra filtre (Genel Yetkili için)
    if (userRole === 'general_admin') {
      if (regionFilter && regionFilter.length > 0) {
        query = query.in('region', regionFilter);
      }
      if (unitFilter) {
        query = query.eq('event_type', unitFilter);
      }
      if (statusFilter) {
        query = query.eq('status', statusFilter);
      }
    }

    const { data, error } = await query;
    if (!error && data) {
      setEvents(data);
    }
  };

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay(); // 0: Sunday, 1: Monday...
  
  // Pazartesi'den başlaması için offset ayarı
  const startOffset = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;

  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

  const monthNames = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
  const dayNames = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"];

  // Günleri oluştur

  // Toggle button for filter panel (placed above calendar)
  const activeFilterCount = regionFilter.length + (unitFilter ? 1 : 0) + (statusFilter ? 1 : 0);

  const days = [];
  for (let i = 0; i < startOffset; i++) {
    days.push(<div key={`empty-${i}`} className="calendar-day empty" style={{ backgroundColor: 'var(--bg-main)', border: '0.5px solid var(--border-color)', minHeight: '90px' }} />);
  }
  
  for (let i = 1; i <= daysInMonth; i++) {
    // Find events for this day
    const dayEvents = events.filter(e => {
      const eDate = new Date(e.event_date);
      return eDate.getDate() === i && eDate.getMonth() === currentDate.getMonth() && eDate.getFullYear() === currentDate.getFullYear();
    });

    const isToday = i === new Date().getDate() && currentDate.getMonth() === new Date().getMonth() && currentDate.getFullYear() === new Date().getFullYear();

    const cellStyle: React.CSSProperties = {
      minHeight: '90px',
      display: 'flex',
      flexDirection: 'column',
      border: '0.5px solid var(--border-color)',
      padding: '0.5rem',
      backgroundColor: isToday ? 'var(--color-primary-light)' : 'transparent',
      position: 'relative',
    };

    const dayNumberStyle: React.CSSProperties = isToday ? {
      backgroundColor: '#da1c15',
      color: '#fff',
      borderRadius: '50%',
      width: '24px',
      height: '24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '13px',
      alignSelf: 'flex-end',
      marginBottom: '0.5rem',
    } : {
      fontSize: '13px',
      color: '#6b7280',
      alignSelf: 'flex-end',
      marginBottom: '0.5rem',
    };

    days.push(
      <div key={`day-${i}`} className="calendar-day" style={cellStyle}>
        <div className="day-number" style={dayNumberStyle}>{i}</div>
        <div className="day-events" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {dayEvents.slice(0, 2).map(ev => {
            const unitColor = UNIT_COLORS[ev.unit_name] || UNIT_COLORS['Diğer'];
            return (
              <div
                key={ev.id}
                className="event-pill"
                style={{
                  backgroundColor: `${unitColor}20`,
                  color: unitColor,
                  fontSize: '11px',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: '100%',
                  cursor: 'pointer',
                }}
                onClick={() => setSelectedEvent(ev)}
                title={ev.event_name}
              >
                {ev.event_name}
              </div>
            );
          })}
          {dayEvents.length > 2 && (
            <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>
              +{dayEvents.length - 2} daha
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <React.Fragment>
  {/* Filter toggle button placed outside calendar container */}
  <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', padding: '1rem' }}>
    <button onClick={() => setIsFilterOpen(!isFilterOpen)} style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '0.5rem', padding: '0.5rem 1rem', cursor: 'pointer', transition: 'background 150ms' }}>
      <Filter size={16} style={{ marginRight: '0.5rem' }} />
      {isFilterOpen ? 'Filtreleri Gizle' : 'Filtreleri Göster'}
      {activeFilterCount > 0 && (
        <span style={{ background: '#da1c15', color: '#fff', borderRadius: '50%', width: '16px', height: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', marginLeft: '0.5rem' }}>{activeFilterCount}</span>
      )}
    </button>
  </div>
  <div className="calendar-container">
      <style dangerouslySetInnerHTML={{__html: `
        .calendar-container {
          display: flex;
          background: var(--bg-card);
          border-radius: var(--radius-lg);
          border: 1px solid var(--border-color);
          overflow: hidden;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
        }
        .calendar-sidebar {
          width: ${isFilterOpen ? '280px' : '0px'};
          border-right: ${isFilterOpen ? '1px solid var(--border-color)' : 'none'};
          padding: ${isFilterOpen ? '2rem 1.5rem' : '0'};
          background: var(--bg-card);
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
        }
        .calendar-main {
          flex: 1;
          padding: 2rem;
          display: flex;
          flex-direction: column;
        }
        .calendar-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
        }
        .calendar-title {
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--text-main);
        }
        .calendar-nav {
          display: flex;
          gap: 0.5rem;
          align-items: center;
        }
        .calendar-nav button {
          background: none;
          border: 1px solid var(--border-color);
          border-radius: 50%;
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: var(--text-main);
          transition: all 0.2s;
        }
        .calendar-nav button:hover {
          background: #f3f4f6;
        }
        .calendar-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          flex: 1;
        }
        .calendar-day-header {
          text-align: center;
          padding: 1rem 0;
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--text-muted);
          border-bottom: 1px solid var(--border-color);
        }
        .day-number {
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--text-main);
          margin: 0 auto 0.5rem auto;
        }
        .day-events {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }
        .event-pill {
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          font-size: 0.75rem;
          color: white;
          cursor: pointer;
          display: flex;
          gap: 0.5rem;
          align-items: center;
          overflow: hidden;
          transition: opacity 0.2s;
        }
        .event-pill:hover {
          opacity: 0.9;
        }
        .event-time {
          font-weight: 600;
          opacity: 0.85;
          flex-shrink: 0;
        }
        .event-title {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .legend-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 1rem;
          font-size: 0.875rem;
          color: var(--text-main);
        }
        .legend-color {
          width: 12px;
          height: 12px;
          border-radius: 50%;
        }
        
        /* Popup Styles */
        .event-popup-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0,0,0,0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }
        .event-popup {
          background: var(--bg-card);
          border-radius: var(--radius-lg);
          padding: 2rem;
          width: 100%;
          max-width: 500px;
          position: relative;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
        }
      `}} />
      {/* Sidebar */}
      {isFilterOpen && (
        <div className="calendar-sidebar">
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1.5rem' }}>
            FİLTRELER
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '2rem' }}>
            <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.25rem', display: 'block' }}>Bölgeler (Çoklu Seçim)</label>
                <select 
                  multiple 
                  className="input" 
                  value={regionFilter} 
                  onChange={(e) => setRegionFilter(Array.from(e.target.selectedOptions, option => option.value))} 
                  style={{ width: '100%', minHeight: '120px' }}
                >
                  <option value="İstanbul Anadolu">İstanbul Anadolu</option>
                  <option value="İstanbul Avrupa">İstanbul Avrupa</option>
                  <option value="Marmara">Marmara</option>
                  <option value="Ege">Ege</option>
                  <option value="İç Anadolu">İç Anadolu</option>
                  <option value="Ankara">Ankara</option>
                  <option value="Doğu Anadolu">Doğu Anadolu</option>
                  <option value="Güneydoğu Anadolu">Güneydoğu Anadolu</option>
                  <option value="Akdeniz">Akdeniz</option>
                  <option value="Karadeniz">Karadeniz</option>
                </select>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>*Birden fazla seçmek için Ctrl/Cmd tuşuna basılı tutun. Hiçbiri seçili değilse tüm bölgeler gelir.</div>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.25rem', display: 'block' }}>Birim Türü</label>
                <select className="input" value={unitFilter} onChange={(e) => setUnitFilter(e.target.value)} style={{ width: '100%' }}>
                  <option value="">Tümü</option>
                  <option value="Sosyal Çalışmalar Birimi">Sosyal Çalışmalar Birimi</option>
                  <option value="Mesleki ve Kariyer Çalışmaları Birimi">Mesleki ve Kariyer Çalışmaları Birimi</option>
                  <option value="Bilimsel ve Akademik Çalışmalar Birimi">Bilimsel ve Akademik Çalışmalar Birimi</option>
                  <option value="İletişim ve Planlama Birimi">İletişim ve Planlama Birimi</option>
                  <option value="Temsilcilikler Birimi">Temsilcilikler Birimi</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.25rem', display: 'block' }}>Etkinlik Durumu</label>
                <select className="input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ width: '100%' }}>
                  <option value="">Tümü</option>
                  <option value="Onaylandı">Onaylandı</option>
                  <option value="Gerçekleşti">Gerçekleşti</option>
                  <option value="Onay Bekliyor">Onay Bekliyor</option>
                  <option value="İptal Edildi">İptal Edildi</option>
                </select>
              </div>
            </div>

          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1.5rem' }}>
            Birim Renkleri
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {Object.entries(UNIT_COLORS).map(([name, color]) => (
              <div key={name} className="legend-item">
                <div className="legend-color" style={{ backgroundColor: color }}></div>
                <span>{name}</span>
              </div>
            ))}
          </div>
          {/* Collapse button when panel is closed */}
          {!isFilterOpen && (
            <button onClick={() => setIsFilterOpen(true)} style={{ position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '0 0.5rem 0.5rem 0', padding: '0.25rem', cursor: 'pointer' }}>
              <ChevronLeft size={16} />
            </button>
          )}
        </div>
      )}

      {/* Ana Takvim Alanı */}
      <div className="calendar-main">
        {/* When filter panel is closed, the calendar-header stretches across the full width */}
        <div className="calendar-header">
          <div className="calendar-title">
            {monthNames[currentDate.getMonth()]} <span style={{ fontWeight: 300 }}>{currentDate.getFullYear()}</span>
          </div>
          
          <div className="calendar-nav">
            <button onClick={prevMonth}><ChevronLeft size={20} /></button>
            <button onClick={() => setCurrentDate(new Date())} style={{ width: 'auto', padding: '0 1rem', borderRadius: 'var(--radius-sm)', fontSize: '0.875rem', fontWeight: 600 }}>Bugün</button>
            <button onClick={nextMonth}><ChevronRight size={20} /></button>
          </div>
        </div>

        <div className="calendar-grid">
          {/* Gün Başlıkları */}
          {dayNames.map(day => (
            <div key={day} className="calendar-day-header">{day}</div>
          ))}
          
          {/* Gün Hücreleri */}
          {days}
        </div>
      </div>

      {/* Event Details Popup */}
      {selectedEvent && (
        <div className="event-popup-overlay" onClick={() => setSelectedEvent(null)}>
          <div className="event-popup" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '1rem' }}>
              <div className="legend-color" style={{ backgroundColor: UNIT_COLORS[selectedEvent.event_type] || UNIT_COLORS['Diğer'], width: '16px', height: '16px' }}></div>
              <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{selectedEvent.event_type}</span>
            </div>
            
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
              {selectedEvent.event_name}
            </h2>
            
            <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <MapPin size={16} /> {selectedEvent.university} ({selectedEvent.region})
            </p>

            <div style={{ backgroundColor: 'var(--bg-main)', padding: '1rem', borderRadius: 'var(--radius-md)', marginBottom: '2rem' }}>
              <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>Tarih:</div>
              <div>{new Date(selectedEvent.event_date).toLocaleString('tr-TR', { dateStyle: 'full', timeStyle: 'short' })}</div>
              
              <div style={{ fontWeight: 600, marginTop: '1rem', marginBottom: '0.25rem' }}>Durum:</div>
              <div className="badge badge-success">{selectedEvent.status}</div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
              <button className="btn btn-outline" onClick={() => setSelectedEvent(null)}>Kapat</button>
              <Link href={`/dashboard/events/${selectedEvent.id}`} className="btn btn-primary" style={{ textDecoration: 'none' }}>
                Detaylara Git
              </Link>
            </div>
          </div>
        </div>
      )}
      </div>
    </React.Fragment>
  );
}
