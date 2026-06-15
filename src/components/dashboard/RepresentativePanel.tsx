'use client';

import { useState, useEffect } from 'react';
import { useRole } from '@/context/RoleContext';
import { supabase } from '@/lib/supabase';
import { Calendar as CalendarIcon, Award, BookOpen, Clock, AlertCircle, Eye, Info, List } from 'lucide-react';
import Link from 'next/link';

interface Event {
  id: string;
  event_name: string;
  event_date: string;
  location: string;
  status: string;
  unit_name: string;
  poster_requests: { status: string }[];
}

export default function RepresentativePanel() {
  const { userData } = useRole();
  const [events, setEvents] = useState<Event[]>([]);
  const [stats, setStats] = useState({
    activeCount: 0,
    plannedCount: 0,
    totalCount: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [panelViewMode, setPanelViewMode] = useState<'list' | 'calendar'>('list');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedEventDetails, setSelectedEventDetails] = useState<Event | null>(null);

  const university = userData?.university || '';

  useEffect(() => {
    if (!university) return;

    const fetchUniEvents = async () => {
      try {
        setIsLoading(true);
        // Query events belonging to this university along with their poster requests
        const { data, error } = await supabase
          .from('events')
          .select(`
            id, 
            event_name, 
            event_date, 
            location, 
            status, 
            unit_name,
            poster_requests(status)
          `)
          .eq('university', university)
          .order('event_date', { ascending: false });

        if (error) throw error;

        setEvents(data as any || []);

        let active = 0;
        let planned = 0;
        data?.forEach(e => {
          if (e.status === 'Onaylandı' || e.status === 'Gerçekleşti') active++;
          if (e.status === 'Onay Bekliyor' || e.status === 'Yeniden Onay Bekliyor') planned++;
        });

        setStats({
          activeCount: active,
          plannedCount: planned,
          totalCount: data?.length || 0
        });
      } catch (err) {
        console.error("Failed to fetch university events:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUniEvents();
  }, [university]);

  if (!university) {
    return (
      <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
        <AlertCircle size={40} color="var(--status-danger)" style={{ margin: '0 auto 1rem' }} />
        <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Üniversite Bilgisi Eksik</h3>
        <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>Profilinizde üniversite ismi tanımlı olmadığı için etkinlikler listelenemedi. Lütfen profil bilgilerinizi güncelleyin.</p>
      </div>
    );
  }

  // --- CALENDAR HELPERS ---
  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
  const startOffset = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;

  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

  const monthNames = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
  const dayNames = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];

  // Helper to color events according to approval status as requested
  const getEventStatusColor = (status: string) => {
    switch (status) {
      case 'Onaylandı':
      case 'Gerçekleşti':
        return '#10b981'; // Green (Approved)
      case 'Onay Bekliyor':
      case 'Yeniden Onay Bekliyor':
        return '#f59e0b'; // Yellow/Orange (Pending)
      default:
        return '#ef4444'; // Red (Draft, Rejected, Cancelled, Revision Needed)
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Welcome & University Hero */}
      <div className="card" style={{ padding: '2rem', background: 'linear-gradient(135deg, var(--color-primary) 0%, #0d9488 100%)', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: 'var(--shadow-lg)' }}>
        <div>
          <span style={{ fontSize: '0.875rem', opacity: 0.85, textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>
            🎓 Cansağlığı Üniversite Temsilcisi
          </span>
          <h2 style={{ fontSize: '2rem', fontWeight: 800, margin: '0.25rem 0' }}>{userData?.full_name}</h2>
          <p style={{ opacity: 0.95, fontSize: '1.05rem', marginTop: '0.5rem' }}>Temsil Edilen Kurum: <strong>{university}</strong></p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <div style={{ padding: '1rem', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 'var(--radius-md)', textAlign: 'center', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.2)' }}>
            <div style={{ fontSize: '2rem', fontWeight: 800 }}>{stats.totalCount}</div>
            <div style={{ fontSize: '0.65rem', opacity: 0.9, fontWeight: 700, letterSpacing: '0.05em' }}>TOPLAM ETKİNLİK</div>
          </div>
        </div>
      </div>

      {/* Grid Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem' }}>
        <div className="card" style={{ padding: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center', borderLeft: '4px solid #10b981' }}>
          <div style={{ padding: '0.5rem', backgroundColor: '#ecfdf5', borderRadius: 'var(--radius-md)' }}>
            <BookOpen size={24} color="#10b981" />
          </div>
          <div>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Onaylı / Gerçekleşen Etkinlikler</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-main)' }}>{stats.activeCount}</div>
          </div>
        </div>

        <div className="card" style={{ padding: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center', borderLeft: '4px solid #f59e0b' }}>
          <div style={{ padding: '0.5rem', backgroundColor: '#fef3c7', borderRadius: 'var(--radius-md)' }}>
            <Clock size={24} color="#f59e0b" />
          </div>
          <div>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Onay / Değerlendirme Aşamasında</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-main)' }}>{stats.plannedCount}</div>
          </div>
        </div>
      </div>

      {/* Sub-navigation Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
        <button 
          className={`btn ${panelViewMode === 'list' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setPanelViewMode('list')}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}
        >
          <List size={16} /> 📋 Liste Takip Görünümü
        </button>
        <button 
          className={`btn ${panelViewMode === 'calendar' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setPanelViewMode('calendar')}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}
        >
          <CalendarIcon size={16} /> 📅 Üniversite Etkinlik Takvimi
        </button>
      </div>

      {/* --- LIST VIEW --- */}
      {panelViewMode === 'list' && (
        <div className="card" style={{ padding: '2rem' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            📋 {university} Tüm Birimlerin Etkinlik Takibi
          </h3>

          {isLoading ? (
            <div style={{ textAlign: 'center', padding: '2rem' }}>Etkinlikler yükleniyor...</div>
          ) : events.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
              Üniversitenize ait aktif bir etkinlik kaydı bulunmamuyor.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #eaeaea' }}>
                    <th style={{ padding: '1rem 0.5rem' }}>Etkinlik Adı</th>
                    <th style={{ padding: '1rem 0.5rem' }}>Düzenleyen Birim</th>
                    <th style={{ padding: '1rem 0.5rem' }}>Tarih</th>
                    <th style={{ padding: '1rem 0.5rem' }}>Mekan</th>
                    <th style={{ padding: '1rem 0.5rem' }}>Onay Durumu</th>
                    <th style={{ padding: '1rem 0.5rem' }}>Afiş Talebi</th>
                    <th style={{ padding: '1rem 0.5rem' }}>Detay</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map(event => {
                    const posterStatus = event.poster_requests?.[0]?.status || 'Talep Edilmedi';
                    return (
                      <tr key={event.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                        <td style={{ padding: '1rem 0.5rem', fontWeight: 600 }}>{event.event_name}</td>
                        <td style={{ padding: '1rem 0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>{event.unit_name}</td>
                        <td style={{ padding: '1rem 0.5rem' }}>{new Date(event.event_date).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                        <td style={{ padding: '1rem 0.5rem' }}>{event.location}</td>
                        <td style={{ padding: '1rem 0.5rem' }}>
                          <span className={`badge ${
                            event.status === 'Onaylandı' ? 'badge-success' :
                            event.status === 'Gerçekleşti' ? 'badge-success' :
                            event.status === 'Onay Bekliyor' ? 'badge-pending' :
                            event.status === 'Reddedildi' ? 'badge-danger' : 'badge-warning'
                          }`}>
                            {event.status}
                          </span>
                        </td>
                        <td style={{ padding: '1rem 0.5rem' }}>
                          <span className={`badge ${
                            posterStatus === 'Tamamlandı' ? 'badge-success' :
                            posterStatus === 'Hazırlanıyor' ? 'badge-pending' :
                            posterStatus === 'Talep Edilmedi' ? 'badge-outline' : 'badge-warning'
                          }`} style={{ backgroundColor: posterStatus === 'Talep Edilmedi' ? 'transparent' : undefined, border: posterStatus === 'Talep Edilmedi' ? '1px dashed #ccc' : undefined, color: posterStatus === 'Talep Edilmedi' ? '#666' : undefined }}>
                            {posterStatus}
                          </span>
                        </td>
                        <td style={{ padding: '1rem 0.5rem' }}>
                          <Link href={`/dashboard/events/${event.id}`} className="btn btn-outline" style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                            <Eye size={12} /> İncele
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* --- INTERACTIVE CALENDAR VIEW --- */}
      {panelViewMode === 'calendar' && (
        <div className="card" style={{ padding: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>
              📅 {university} Ortak Etkinlik Takvimi
            </h3>
            
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <button onClick={prevMonth} className="btn btn-outline" style={{ padding: '0.5rem' }}><ChevronLeft size={16} /></button>
              <span style={{ fontWeight: 700, fontSize: '1.1rem', minWidth: '130px', textAlign: 'center' }}>
                {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
              </span>
              <button onClick={nextMonth} className="btn btn-outline" style={{ padding: '0.5rem' }}><ChevronRight size={16} /></button>
            </div>
          </div>

          {/* Calendar Status Legend */}
          <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1.5rem', fontSize: '0.85rem', flexWrap: 'wrap', backgroundColor: 'var(--bg-main)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#10b981' }} />
              <strong>Onaylı / Gerçekleşti</strong>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#f59e0b' }} />
              <strong>Onay Aşamasında</strong>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#ef4444' }} />
              <strong>Taslak / Onaylanmadı (Onaysız)</strong>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', textAlign: 'center', fontWeight: 700, marginBottom: '0.5rem' }}>
            {dayNames.map(day => (
              <div key={day} style={{ fontSize: '0.85rem', padding: '0.5rem 0', color: 'var(--text-muted)' }}>{day}</div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', minHeight: '380px' }}>
            {/* Empty days offset */}
            {Array.from({ length: startOffset }).map((_, idx) => (
              <div key={`offset-${idx}`} style={{ backgroundColor: 'var(--bg-main)', borderRadius: '4px', border: '1px solid #f3f4f6', opacity: 0.4 }} />
            ))}

            {/* Monthly calendar days */}
            {Array.from({ length: daysInMonth }).map((_, idx) => {
              const dayNum = idx + 1;
              const dayEvents = events.filter(e => {
                const eDate = new Date(e.event_date);
                return eDate.getDate() === dayNum && eDate.getMonth() === currentDate.getMonth() && eDate.getFullYear() === currentDate.getFullYear();
              });

              return (
                <div 
                  key={`day-${dayNum}`} 
                  style={{ 
                    backgroundColor: 'var(--bg-card)', 
                    borderRadius: '4px', 
                    border: '1px solid var(--border-color)', 
                    padding: '0.35rem', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    minHeight: '80px',
                    position: 'relative'
                  }}
                >
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.25rem', color: 'var(--text-main)' }}>{dayNum}</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', overflowY: 'auto', flex: 1 }}>
                    {dayEvents.map(ev => {
                      const bg = getEventStatusColor(ev.status);
                      return (
                        <div 
                          key={ev.id}
                          onClick={() => setSelectedEventDetails(ev)}
                          style={{ 
                            backgroundColor: bg, 
                            color: 'white', 
                            fontSize: '0.7rem', 
                            padding: '3px 6px', 
                            borderRadius: '3px', 
                            cursor: 'pointer',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            fontWeight: 600,
                            boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                            transition: 'transform 0.1s'
                          }}
                          title={ev.event_name}
                        >
                          {ev.event_name}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* --- INTERACTIVE CALENDAR DETAIL MODAL --- */}
      {selectedEventDetails && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div className="card" style={{ maxWidth: '500px', width: '90%', padding: '2rem', position: 'relative', boxShadow: 'var(--shadow-xl)' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
              Etkinlik Detay Kartı
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Etkinlik Adı</span>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)' }}>{selectedEventDetails.event_name}</div>
              </div>

              <div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Düzenleyen Birim</span>
                <div style={{ fontSize: '0.95rem', fontWeight: 600 }}>{selectedEventDetails.unit_name}</div>
              </div>

              <div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Etkinlik Tarihi & Saati</span>
                <div style={{ fontSize: '0.95rem', fontWeight: 600 }}>
                  {new Date(selectedEventDetails.event_date).toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>

              <div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Mekan</span>
                <div style={{ fontSize: '0.95rem', fontWeight: 600 }}>{selectedEventDetails.location}</div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '0.5rem' }}>
                <div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Onay Durumu</span>
                  <div style={{ marginTop: '0.25rem' }}>
                    <span className={`badge ${
                      selectedEventDetails.status === 'Onaylandı' ? 'badge-success' :
                      selectedEventDetails.status === 'Gerçekleşti' ? 'badge-success' :
                      selectedEventDetails.status === 'Onay Bekliyor' ? 'badge-pending' :
                      selectedEventDetails.status === 'Reddedildi' ? 'badge-danger' : 'badge-warning'
                    }`}>
                      {selectedEventDetails.status}
                    </span>
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Afiş Talebi</span>
                  <div style={{ marginTop: '0.25rem' }}>
                    <span className={`badge ${
                      (selectedEventDetails.poster_requests?.[0]?.status || 'Talep Edilmedi') === 'Tamamlandı' ? 'badge-success' :
                      (selectedEventDetails.poster_requests?.[0]?.status || 'Talep Edilmedi') === 'Hazırlanıyor' ? 'badge-pending' : 'badge-outline'
                    }`}>
                      {selectedEventDetails.poster_requests?.[0]?.status || 'Talep Edilmedi'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '2rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem' }}>
              <Link 
                href={`/dashboard/events/${selectedEventDetails.id}`} 
                className="btn btn-primary" 
                style={{ fontSize: '0.85rem', padding: '0.5rem 1rem', textDecoration: 'none' }}
              >
                Detay Sayfasına Git
              </Link>
              <button 
                onClick={() => setSelectedEventDetails(null)} 
                className="btn btn-outline" 
                style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }}
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

const ChevronLeft = ({ size }: { size: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
);

const ChevronRight = ({ size }: { size: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
);
