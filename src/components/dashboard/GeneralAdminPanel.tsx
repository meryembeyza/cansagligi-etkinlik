'use client';
import { toast } from 'react-hot-toast';

import { useState, useEffect } from 'react';
import EmptyState from '@/components/ui/EmptyState';
import LoadingState from '@/components/ui/LoadingState';
import { createClient } from '@/utils/supabase/client';
const supabase = createClient();
import { Loader2, Search, Filter, Download, AlertTriangle, Calendar } from 'lucide-react';
import Link from 'next/link';
import ExcelJS from 'exceljs';

export default function GeneralAdminPanel() {
  const [events, setEvents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // İstatistikler
  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    pending: 0,
    cancelled: 0,
    participants: 0
  });
  
  const [delayedEvents, setDelayedEvents] = useState<any[]>([]);

  // Filtreler
  const [filterRegion, setFilterRegion] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchEvents = async () => {
    setIsLoading(true);
    try {
      let query = supabase.from('events').select('*').order('created_at', { ascending: false });

      if (filterRegion) query = query.eq('region', filterRegion);
      if (filterStatus) query = query.eq('status', filterStatus);
      if (searchQuery) query = query.ilike('event_name', `%${searchQuery}%`);

      const { data, error } = await query;
      if (error) throw error;

      setEvents(data || []);

      // İstatistikleri sadece ilk yüklemede veya filtresizken genel hesaplamak daha mantıklıdır,
      // ama şimdilik mevcut filtrelenmiş verinin veya tüm verinin istatistiğini gösterebiliriz.
      // Tüm veriyi çekip istatistikleri genel tutalım:
      if (!filterRegion && !filterStatus && !searchQuery && data) {
        const completedEvents = data.filter(e => e.status === 'Gerçekleşti');
        
        setStats({
          total: data.length,
          completed: completedEvents.length,
          pending: data.filter(e => ['Onay Bekliyor', 'Yeniden Onay Bekliyor'].includes(e.status)).length,
          cancelled: data.filter(e => e.status === 'İptal Edildi').length,
          participants: completedEvents.reduce((acc, curr) => acc + (curr.expected_participants || 0), 0)
        });

        // 3 günden uzun süredir onay bekleyenleri bul
        const threeDaysAgo = new Date();
        threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
        const delayed = data.filter(e => 
          ['Onay Bekliyor', 'Yeniden Onay Bekliyor'].includes(e.status) && 
          new Date(e.created_at) < threeDaysAgo
        );
        setDelayedEvents(delayed);
      }

    } catch (error) {
      console.error('Etkinlikler çekilemedi:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const exportToExcel = async () => {
    if (events.length === 0) {
      toast.error('İndirilecek etkinlik bulunamadı.');
      return;
    }
    
    try {
      const sortedEvents = [...events].sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime());

      const getMonthName = (dateStr: string) => {
        const d = new Date(dateStr);
        const months = ['OCAK', 'ŞUBAT', 'MART', 'NİSAN', 'MAYIS', 'HAZİRAN', 'TEMMUZ', 'AĞUSTOS', 'EYLÜL', 'EKİM', 'KASIM', 'ARALIK'];
        return `${months[d.getMonth()]} ${d.getFullYear()}`;
      };

      const getWeekOfMonthName = (dateStr: string) => {
        const d = new Date(dateStr);
        const months = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
        return `${months[d.getMonth()]} ${Math.ceil(d.getDate() / 7)}. Hafta`;
      };

      const weekSummaryMap: Record<string, { totalEvents: number, totalParticipants: number, label: string }> = {};
      sortedEvents.forEach(e => {
        const d = new Date(e.event_date);
        const weekNum = Math.ceil(d.getDate() / 7);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-W${weekNum}`;
        const label = getWeekOfMonthName(e.event_date);
        
        if (!weekSummaryMap[key]) {
          weekSummaryMap[key] = { totalEvents: 0, totalParticipants: 0, label };
        }
        weekSummaryMap[key].totalEvents += 1;
        weekSummaryMap[key].totalParticipants += (e.expected_participants || 0);
      });

      const weekSummary = Object.keys(weekSummaryMap).sort().map(k => ({
        'Hafta': weekSummaryMap[k].label,
        'Toplam Etkinlik': weekSummaryMap[k].totalEvents,
        'Toplam Katılımcı': weekSummaryMap[k].totalParticipants
      }));

      const workbook = new ExcelJS.Workbook();
      
      const wsSummary = workbook.addWorksheet('Özet Tablo');
      wsSummary.columns = [
        { header: 'Hafta', key: 'Hafta', width: 30 },
        { header: 'Toplam Etkinlik', key: 'Toplam Etkinlik', width: 20 },
        { header: 'Toplam Katılımcı', key: 'Toplam Katılımcı', width: 20 }
      ];
      if (weekSummary.length > 0) wsSummary.addRows(weekSummary);
      
      wsSummary.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      wsSummary.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } };
      wsSummary.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };
      wsSummary.autoFilter = 'A1:C1';
      wsSummary.eachRow((row) => {
        row.eachCell((cell) => {
          cell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
        });
      });

      const wsEvents = workbook.addWorksheet('Etkinlikler');
      wsEvents.columns = [
        { header: 'Tarih', key: 'Tarih', width: 15 },
        { header: 'Etkinlik Adı', key: 'Etkinlik Adı', width: 45 },
        { header: 'Birim', key: 'Birim', width: 25 },
        { header: 'Üniversite', key: 'Üniversite', width: 35 },
        { header: 'Bölge', key: 'Bölge', width: 20 },
        { header: 'Durum', key: 'Durum', width: 15 },
        { header: 'Beklenen Katılımcı', key: 'Beklenen Katılımcı', width: 20 }
      ];
      
      wsEvents.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      wsEvents.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } };
      wsEvents.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };
      wsEvents.autoFilter = 'A1:G1';
      wsEvents.views = [{ state: 'frozen', ySplit: 1 }];

      let currentMonth = '';
      sortedEvents.forEach(e => {
        const monthStr = getMonthName(e.event_date);
        
        if (monthStr !== currentMonth) {
          currentMonth = monthStr;
          const headerRow = wsEvents.addRow([monthStr]);
          wsEvents.mergeCells(`A${headerRow.number}:G${headerRow.number}`);
          headerRow.font = { bold: true, size: 14, color: { argb: 'FF000000' } };
          headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1D5DB' } };
          headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
          headerRow.eachCell((cell) => {
            cell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
          });
        }

        const row = wsEvents.addRow([
          new Date(e.event_date).toLocaleDateString('tr-TR'),
          e.event_name,
          e.unit_name || e.event_type,
          e.university,
          e.region,
          e.status,
          e.expected_participants || 0
        ]);

        let bgColor = 'FFFFFFFF'; 
        if (e.region === 'İstanbul Avrupa') bgColor = 'FFE0F2FE'; 
        else if (e.region === 'İstanbul Anadolu') bgColor = 'FFFEF08A'; 
        else if (e.region === 'Marmara') bgColor = 'FFDCFCE7'; 
        else if (e.region === 'İç Anadolu') bgColor = 'FFFFEDD5'; 
        else if (e.region === 'Ege') bgColor = 'FFFAE8FF'; 
        else if (e.region) bgColor = 'FFF3E8FF'; 

        row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
        row.font = { color: { argb: 'FF000000' } }; // Force black font color just in case
        
        row.eachCell((cell) => {
          cell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
        });
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `etkinlik_raporu_${new Date().toLocaleDateString('tr-TR')}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error(error);
      toast.error('Excel oluşturulamadı.');
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [filterRegion, filterStatus, searchQuery]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* İstatistik Kartları */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--color-primary)' }}>{stats.total}</div>
          <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Toplam Etkinlik</div>
        </div>
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--status-success)' }}>{stats.completed}</div>
          <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Gerçekleşen</div>
        </div>
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--status-pending)' }}>{stats.pending}</div>
          <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Onay Bekleyen</div>
        </div>
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--status-danger)' }}>{stats.cancelled}</div>
          <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>İptal Edilen</div>
        </div>
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#8b5cf6' }}>{stats.participants}</div>
          <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Toplam Katılımcı</div>
        </div>
      </div>

      {/* Gecikmiş Onay Uyarıları */}
      {delayedEvents.length > 0 && (
        <div style={{ backgroundColor: 'var(--bg-danger-light)', border: '1px solid #fca5a5', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#991b1b', fontWeight: 600, marginBottom: '0.5rem' }}>
            <AlertTriangle size={20} />
            Dikkat: {delayedEvents.length} etkinlik 3 günden uzun süredir onay bekliyor!
          </div>
          <ul style={{ margin: 0, paddingLeft: '1.5rem', color: '#7f1d1d', fontSize: '0.875rem' }}>
            {delayedEvents.map(e => (
              <li key={e.id}>{e.event_name} ({e.region}) - {new Date(e.created_at).toLocaleDateString('tr-TR')} tarihinden beri bekliyor.</li>
            ))}
          </ul>
        </div>
      )}

      {/* Filtreler ve Arama */}
      <div className="card" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', backgroundColor: 'var(--bg-main)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: '1 1 250px', backgroundColor: 'var(--bg-card)', padding: '0.5rem 1rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
          <Search size={18} color="var(--text-muted)" />
          <input 
            type="text" 
            placeholder="Etkinlik Adı Ara..." 
            style={{ border: 'none', outline: 'none', width: '100%', fontSize: '0.875rem' }}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <select className="input" style={{ flex: '1 1 200px' }} value={filterRegion} onChange={(e) => setFilterRegion(e.target.value)}>
          <option value="">Tüm Bölgeler</option>
          <option value="İstanbul Anadolu">İstanbul Anadolu</option>
          <option value="İstanbul Avrupa">İstanbul Avrupa</option>
          <option value="Marmara">Marmara</option>
          <option value="Ege">Ege</option>
          <option value="İç Anadolu">İç Anadolu</option>
          <option value="Ankara">Ankara</option>
          <option value="Akdeniz">Akdeniz</option>
          <option value="Karadeniz">Karadeniz</option>
          <option value="Doğu Anadolu">Doğu Anadolu</option>
          <option value="Güneydoğu Anadolu">Güneydoğu Anadolu</option>
        </select>

        <select className="input" style={{ flex: '1 1 200px' }} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="">Tüm Durumlar</option>
          <option value="Onay Bekliyor">Onay Bekliyor</option>
          <option value="Onaylandı">Onaylandı</option>
          <option value="Gerçekleşti">Gerçekleşti</option>
          <option value="İptal Edildi">İptal Edildi</option>
        </select>

        <button className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }} onClick={exportToExcel}>
          <Download size={16} /> Excel İndir
        </button>
        <Link href="/dashboard/reports" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#e11d48', color: 'white' }}>
          <Download size={16} /> Gelişmiş Raporlar & PDF
        </Link>
      </div>

      {/* Etkinlik Listesi */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {isLoading ? (
          <LoadingState message="Etkinlikler yükleniyor..." minHeight="300px" />
        ) : events.length === 0 ? (
          <EmptyState 
            icon={Calendar} 
            title="Etkinlik Bulunamadı" 
            description="Filtrelerinize uygun bir etkinlik bulunmamaktadır." 
            minHeight="300px" 
          />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #eaeaea', backgroundColor: 'var(--bg-main)' }}>
                  <th style={{ padding: '1rem' }}>Etkinlik Adı</th>
                  <th style={{ padding: '1rem' }}>Üniversite / Bölge</th>
                  <th style={{ padding: '1rem' }}>Tarih</th>
                  <th style={{ padding: '1rem' }}>Durum</th>
                  <th style={{ padding: '1rem' }}>İşlem</th>
                </tr>
              </thead>
              <tbody>
                {events.map((event) => (
                  <tr key={event.id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background-color 0.2s' }}>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{event.event_name}</div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{event.event_type}</div>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ fontWeight: 500 }}>{event.university}</div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{event.region}</div>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      {new Date(event.event_date).toLocaleDateString('tr-TR')}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <span className={`badge ${
                        event.status.includes('Onay') ? (event.status === 'Onaylandı' ? 'badge-success' : 'badge-pending') :
                        event.status.includes('İptal') || event.status.includes('Red') ? 'badge-danger' : ''
                      }`}>
                        {event.status}
                      </span>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      {/* TODO: Create event detail page and replace href */}
                      <Link href={`/dashboard/events/${event.id}`} style={{ color: 'var(--color-primary)', fontWeight: 600, textDecoration: 'none' }}>
                        Detaylar
                      </Link>
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



