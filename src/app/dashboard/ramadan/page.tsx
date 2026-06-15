'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import EmptyState from '@/components/ui/EmptyState';
import LoadingState from '@/components/ui/LoadingState';
import { useRole } from '@/context/RoleContext';
import { supabase } from '@/lib/supabase';
import { Calendar, Search, Filter, Moon, MapPin, Edit2, Users, School, Download, AlertCircle, BookOpen, Clock, Heart } from 'lucide-react';
import ExcelJS from 'exceljs';

interface RamadanEvent {
  id: string;
  event_name: string;
  event_date: string;
  location: string;
  university: string;
  region: string;
  status: string;
  expected_participants: number | null;
  created_by_user?: {
    full_name: string;
  };
}

const REGIONS = [
  'Akdeniz', 'Doğu Anadolu', 'Ege', 'Güneydoğu Anadolu', 'Ankara', 'İç Anadolu', 'Karadeniz', 'İstanbul Anadolu', 'İstanbul Avrupa', 'Marmara'
];

const MONTHS = [
  { value: 'all', label: 'Tüm Aylar' },
  { value: '01', label: 'Ocak' },
  { value: '02', label: 'Şubat' },
  { value: '03', label: 'Mart' },
  { value: '04', label: 'Nisan' },
  { value: '05', label: 'Mayıs' },
  { value: '06', label: 'Haziran' },
  { value: '07', label: 'Temmuz' },
  { value: '08', label: 'Ağustos' },
  { value: '09', label: 'Eylül' },
  { value: '10', label: 'Ekim' },
  { value: '11', label: 'Kasım' },
  { value: '12', label: 'Aralık' }
];

export default function RamadanPage() {
  const { currentRole, userData } = useRole();
  const [events, setEvents] = useState<RamadanEvent[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<RamadanEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [selectedRegion, setSelectedRegion] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const isRegionManager = currentRole === 'rep_region_manager' || currentRole === 'region_manager';
  const isRepresentative = currentRole === 'representative';
  const userRegion = userData?.region || '';
  const userUniversity = userData?.university || '';

  // Fetch Ramadan events (event_type = 'Ramazan Etkinliği')
  const fetchRamadanEvents = async () => {
    try {
      setIsLoading(true);
      let query = supabase
        .from('events')
        .select(`
          id, event_name, event_date, location, university, region, status, expected_participants
        `)
        .eq('event_type', 'Ramazan Etkinliği');

      // Region restriction for Region Managers
      if (isRegionManager && userRegion) {
        query = query.eq('region', userRegion);
      }

      // University restriction for Representatives
      if (isRepresentative && userUniversity) {
        query = query.eq('university', userUniversity);
      }

      const { data, error } = await query;
      if (error) throw error;

      setEvents(data as any || []);
    } catch (err) {
      console.error("Failed to fetch Ramadan events:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRamadanEvents();
  }, [currentRole, userRegion, userUniversity]);

  // Apply filters
  useEffect(() => {
    let result = [...events];

    // Filter by Region
    if (selectedRegion && !isRegionManager) {
      result = result.filter(e => e.region?.toLowerCase() === selectedRegion.toLowerCase());
    }

    // Filter by Month
    if (selectedMonth && selectedMonth !== 'all') {
      result = result.filter(e => {
        const date = new Date(e.event_date);
        const m = (date.getMonth() + 1).toString().padStart(2, '0');
        return m === selectedMonth;
      });
    }

    // Filter by Status
    if (selectedStatus) {
      result = result.filter(e => e.status === selectedStatus);
    }

    // Filter by Search Query
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(e => 
        e.event_name?.toLowerCase().includes(q) || 
        e.university?.toLowerCase().includes(q) ||
        e.location?.toLowerCase().includes(q)
      );
    }

    setFilteredEvents(result);
  }, [events, selectedRegion, selectedMonth, selectedStatus, searchQuery]);

  const exportToExcel = async () => {
    const data = filteredEvents.map(e => ({
      'Etkinlik Adı': e.event_name,
      'Üniversite': e.university,
      'Bölge': e.region,
      'Tarih': new Date(e.event_date).toLocaleDateString('tr-TR'),
      'Mekan': e.location,
      'Tahmini Katılımcı': e.expected_participants || 0,
      'Durum': e.status
    }));

    const workbook = new ExcelJS.Workbook();
    const ws = workbook.addWorksheet('Ramazan Etkinlikleri');
    if (data.length > 0) {
      ws.columns = Object.keys(data[0]).map(key => ({ header: key, key: key, width: 20 }));
      ws.addRows(data);
    }
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Cansagligi_Ramazan_Etkinlikleri_${selectedRegion || 'Tum_Bolgeler'}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Stats calculation
  const totalParticipants = filteredEvents.reduce((acc, curr) => acc + (curr.expected_participants || 0), 0);
  const approvedEvents = filteredEvents.filter(e => e.status === 'Onaylandı' || e.status === 'Gerçekleşti').length;
  const pendingEvents = filteredEvents.filter(e => e.status === 'Onay Bekliyor').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            🌙 Ramazan Takip Sistemi
          </h1>
          <p style={{ color: 'var(--text-muted)' }}>Cansağlığı Vakfı Ramazan ayı etkinliklerinin bölge ve üniversite bazlı takibi</p>
        </div>
        <button onClick={exportToExcel} className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          <Download size={16} /> Excel Raporu İndir
        </button>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem' }}>
        <div className="card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', borderLeft: '4px solid #10b981' }}>
          <div style={{ padding: '0.5rem', backgroundColor: '#ecfdf5', borderRadius: 'var(--radius-md)' }}>
            <Calendar size={24} color="#10b981" />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Toplam Ramazan Etkinliği</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{filteredEvents.length} Etkinlik</div>
          </div>
        </div>

        <div className="card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', borderLeft: '4px solid #f59e0b' }}>
          <div style={{ padding: '0.5rem', backgroundColor: '#fef3c7', borderRadius: 'var(--radius-md)' }}>
            <Clock size={24} color="#f59e0b" />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Onay Bekleyenler</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{pendingEvents} Başvuru</div>
          </div>
        </div>

        <div className="card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', borderLeft: '4px solid #3b82f6' }}>
          <div style={{ padding: '0.5rem', backgroundColor: '#dbeafe', borderRadius: 'var(--radius-md)' }}>
            <Heart size={24} color="#3b82f6" />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Toplam Hedeflenen Katılımcı</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{totalParticipants} Kişi</div>
          </div>
        </div>
      </div>

      {/* Filtering area */}
      <div className="card" style={{ padding: '1.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        
        {/* Search */}
        <div>
          <label className="label">Etkinlik Ara</label>
          <div style={{ position: 'relative' }}>
            <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />
            <input 
              type="text" 
              className="input" 
              placeholder="Üniversite veya etkinlik..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ paddingLeft: '2.25rem' }}
            />
          </div>
        </div>

        {/* Region */}
        {!isRegionManager && !isRepresentative && (
          <div>
            <label className="label">Bölge Seçimi</label>
            <select className="input" value={selectedRegion} onChange={e => setSelectedRegion(e.target.value)}>
              <option value="">Tüm Bölgeler</option>
              {REGIONS.map(reg => (
                <option key={reg} value={reg}>{reg.toUpperCase()}</option>
              ))}
            </select>
          </div>
        )}

        {isRegionManager && (
          <div>
            <label className="label">Bölge</label>
            <input type="text" className="input" disabled value={`📍 ${userRegion.toUpperCase()}`} />
          </div>
        )}

        {/* Month */}
        <div>
          <label className="label">Aylar</label>
          <select className="input" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}>
            {MONTHS.map(m => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>

        {/* Status */}
        <div>
          <label className="label">Durum</label>
          <select className="input" value={selectedStatus} onChange={e => setSelectedStatus(e.target.value)}>
            <option value="">Tümü</option>
            <option value="Onay Bekliyor">Onay Bekliyor</option>
            <option value="Onaylandı">Onaylandı</option>
            <option value="Gerçekleşti">Gerçekleşti</option>
            <option value="Reddedildi">Reddedildi</option>
          </select>
        </div>

      </div>

      {/* Events table */}
      <div className="card" style={{ padding: '2rem' }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          📅 Ramazan Etkinlik Planlama Listesi
        </h3>

        {isLoading ? (
          <LoadingState message="Ramazan etkinlikleri yükleniyor..." />
        ) : filteredEvents.length === 0 ? (
          <EmptyState 
            icon={Calendar} 
            title="Etkinlik Bulunamadı" 
            description="Seçili kriterlere göre Ramazan etkinliği bulunamadı." 
          />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #eaeaea' }}>
                  <th style={{ padding: '1rem 0.5rem' }}>Etkinlik Adı</th>
                  <th style={{ padding: '1rem 0.5rem' }}>Üniversite</th>
                  <th style={{ padding: '1rem 0.5rem' }}>Bölge</th>
                  <th style={{ padding: '1rem 0.5rem' }}>Tarih</th>
                  <th style={{ padding: '1rem 0.5rem' }}>Mekan</th>
                  <th style={{ padding: '1rem 0.5rem' }}>Katılımcı Hedefi</th>
                  <th style={{ padding: '1rem 0.5rem' }}>Durum</th>
                  <th style={{ padding: '1rem 0.5rem', textAlign: 'right' }}>İşlem</th>
                </tr>
              </thead>
              <tbody>
                {filteredEvents.map(event => (
                  <tr key={event.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '1rem 0.5rem', fontWeight: 600 }}>{event.event_name}</td>
                    <td style={{ padding: '1rem 0.5rem' }}>{event.university}</td>
                    <td style={{ padding: '1rem 0.5rem', textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: 600 }}>{event.region}</td>
                    <td style={{ padding: '1rem 0.5rem' }}>{new Date(event.event_date).toLocaleDateString('tr-TR')}</td>
                    <td style={{ padding: '1rem 0.5rem' }}>{event.location}</td>
                    <td style={{ padding: '1rem 0.5rem', fontWeight: 600 }}>{event.expected_participants || '-'}</td>
                    <td style={{ padding: '1rem 0.5rem' }}>
                      <span className={`badge ${
                        event.status === 'Onaylandı' ? 'badge-success' :
                        event.status === 'Gerçekleşti' ? 'badge-success' :
                        event.status === 'Onay Bekliyor' ? 'badge-pending' : 'badge-danger'
                      }`}>
                        {event.status}
                      </span>
                    </td>
                    <td style={{ padding: '1rem 0.5rem', textAlign: 'right' }}>
                      <a href={`/dashboard/events/${event.id}`} className="btn btn-outline" style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem', textDecoration: 'none' }}>
                        Detay
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
