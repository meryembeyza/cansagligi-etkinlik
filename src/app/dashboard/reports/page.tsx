'use client';

import { useState, useEffect, useMemo } from 'react';
import { Download, Filter, BarChart2, PieChart as PieChartIcon } from 'lucide-react';
import { useRole } from '@/context/RoleContext';
import { supabase } from '@/lib/supabase';
import * as XLSX from 'xlsx';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const UNIT_COLORS: Record<string, string> = {
  'Sosyal Çalışmalar Birimi': '#10b981',
  'Mesleki ve Kariyer Çalışmaları Birimi': '#ef4444',
  'Bilimsel ve Akademik Çalışmalar Birimi': '#3b82f6',
  'Temsilcilikler Birimi': '#eab308',
  'Diğer': '#6b7280'
};

const STATUS_COLORS: Record<string, string> = {
  'Onaylandı': '#10b981',
  'Onay Bekliyor': '#f59e0b',
  'Reddedildi': '#ef4444',
  'Taslak': '#6b7280'
};

export default function ReportsExportPage() {
  const { currentRole, user } = useRole();
  const [isExporting, setIsExporting] = useState(false);
  const [events, setEvents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [unitFilter, setUnitFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    const fetchEvents = async () => {
      setIsLoading(true);
      try {
        let query = supabase.from('events').select('*');
        if (currentRole === 'region_manager' && user?.region) {
          query = query.eq('region', user.region);
        }
        const { data, error } = await query;
        if (error) throw error;
        setEvents(data || []);
      } catch (err) {
        console.error('Veri çekilirken hata:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchEvents();
  }, [currentRole, user]);

  const filteredEvents = useMemo(() => {
    return events.filter(e => {
      let match = true;
      const eventTime = new Date(e.event_date).getTime();
      
      if (startDate && eventTime < new Date(startDate).getTime()) match = false;
      if (endDate && eventTime > new Date(endDate).getTime()) match = false;
      if (unitFilter !== 'all' && e.unit_name !== unitFilter) match = false;
      
      if (statusFilter !== 'all') {
        if (statusFilter === 'gerceklesti' && e.status !== 'Gerçekleşti') match = false;
        if (statusFilter === 'onaylandi' && e.status !== 'Onaylandı') match = false;
        if (statusFilter === 'iptal' && (e.status === 'İptal Edildi' || e.status === 'Reddedildi')) match = false;
        if (statusFilter === 'bekliyor' && e.status === 'Onay Bekliyor') match = false;
      } else {
        if (e.status === 'Taslak') match = false;
      }
      
      return match;
    });
  }, [events, startDate, endDate, unitFilter, statusFilter]);

  const unitStats = useMemo(() => {
    const stats: Record<string, { name: string, count: number, fill: string }> = {};
    filteredEvents.forEach(e => {
      const u = e.unit_name || 'Diğer';
      if (!stats[u]) {
        stats[u] = { name: u, count: 0, fill: UNIT_COLORS[u] || UNIT_COLORS['Diğer'] };
      }
      stats[u].count += 1;
    });
    return Object.values(stats).sort((a, b) => b.count - a.count);
  }, [filteredEvents]);

  const statusStats = useMemo(() => {
    const stats: Record<string, { name: string, value: number, fill: string }> = {};
    filteredEvents.forEach(e => {
      const s = e.status || 'Bilinmiyor';
      if (!stats[s]) {
        stats[s] = { name: s, value: 0, fill: STATUS_COLORS[s] || '#8884d8' };
      }
      stats[s].value += 1;
    });
    return Object.values(stats);
  }, [filteredEvents]);

  const handleExport = () => {
    setIsExporting(true);
    try {
      const eventList = filteredEvents.map(e => ({
        'Etkinlik Adı': e.event_name,
        'Tarih': new Date(e.event_date).toLocaleDateString('tr-TR'),
        'Birim': e.unit_name,
        'Üniversite': e.university,
        'Bölge': e.region,
        'Durum': e.status,
        'Beklenen Katılımcı': e.expected_participants || 0
      }));

      const unitSummaryMap: Record<string, { totalEvents: number, totalParticipants: number }> = {};
      filteredEvents.forEach(e => {
        const u = e.unit_name || 'Diğer';
        if (!unitSummaryMap[u]) unitSummaryMap[u] = { totalEvents: 0, totalParticipants: 0 };
        unitSummaryMap[u].totalEvents += 1;
        unitSummaryMap[u].totalParticipants += (e.expected_participants || 0);
      });
      const unitSummary = Object.keys(unitSummaryMap).map(k => ({
        'Birim': k,
        'Toplam Etkinlik': unitSummaryMap[k].totalEvents,
        'Toplam Katılımcı': unitSummaryMap[k].totalParticipants
      }));

      const logisticsList: any[] = [];
      filteredEvents.forEach(e => {
        let logisticsObj: any = {};
        try {
          if (typeof e.budget_request === 'string') {
            logisticsObj = JSON.parse(e.budget_request);
          } else if (e.budget_request) {
            logisticsObj = e.budget_request;
          }
        } catch (err) {}

        if (logisticsObj && Object.keys(logisticsObj).length > 0) {
          const usedItems: string[] = [];
          if (logisticsObj.soundSystem) usedItems.push('Ses Sistemi');
          if (logisticsObj.projector) usedItems.push('Projeksiyon');
          if (logisticsObj.photography) usedItems.push('Fotoğraf Çekimi');
          if (logisticsObj.catering) usedItems.push('İkram: ' + (logisticsObj.cateringDetails || ''));
          if (logisticsObj.hasBasicLifeSupport) usedItems.push('TYD Eğitimi: ' + (logisticsObj.basicLifeSupportDetails || ''));
          if (logisticsObj.hasAdvancedLifeSupport) usedItems.push('İYD Eğitimi: ' + (logisticsObj.advancedLifeSupportDetails || ''));
          if (logisticsObj.hasSutureTraining) usedItems.push('Sütür Eğitimi: ' + (logisticsObj.sutureTrainingDetails || ''));
          
          if (logisticsObj.customRequests && Array.isArray(logisticsObj.customRequests)) {
            logisticsObj.customRequests.forEach((req: any) => {
               usedItems.push(req.name + ' (' + req.count + ')');
            });
          }

          if (usedItems.length > 0) {
            logisticsList.push({
              'Etkinlik Adı': e.event_name,
              'Birim': e.unit_name,
              'Bölge': e.region,
              'Durum': e.status,
              'Kullanılan Malzemeler/Hizmetler': usedItems.join(' | '),
              'Ek Notlar': logisticsObj.extraNotes || ''
            });
          }
        }
      });

      const wb = XLSX.utils.book_new();
      const ws1 = XLSX.utils.json_to_sheet(eventList);
      XLSX.utils.book_append_sheet(wb, ws1, "Etkinlikler");
      
      const ws2 = XLSX.utils.json_to_sheet(unitSummary);
      XLSX.utils.book_append_sheet(wb, ws2, "Birim Özetleri");
      
      const ws3 = XLSX.utils.json_to_sheet(logisticsList);
      XLSX.utils.book_append_sheet(wb, ws3, "Lojistik Raporu");

      XLSX.writeFile(wb, "Cansagligi_Rapor.xlsx");

    } catch (err) {
      console.error(err);
      alert('Excel dosyası oluşturulurken bir hata oluştu.');
    } finally {
      setIsExporting(false);
    }
  };

  if (currentRole === 'unit_head' || currentRole === 'design_team' || currentRole === 'resource_manager' || currentRole === 'representative') {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Yetkisiz Erişim</h2>
        <p style={{ color: 'var(--text-muted)' }}>İstatistik ve raporları yalnızca Bölge Sorumluları ve Genel Yetkililer görebilir.</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '4rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Raporlar ve İstatistikler</h1>
        <p style={{ color: 'var(--text-muted)' }}>Sistemdeki etkinlik verilerini analiz edin ve Excel formatında indirin.</p>
      </div>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}>Yükleniyor...</div>
      ) : (
        <>
          <div className="card" style={{ marginBottom: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid #eaeaea', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
              <Filter size={20} color="var(--color-primary)" />
              <h3 style={{ fontSize: '1.125rem', fontWeight: 600 }}>Filtreler</h3>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
              <div>
                <label className="label">Başlangıç Tarihi</label>
                <input type="date" className="input" value={startDate} onChange={e => setStartDate(e.target.value)} />
              </div>
              <div>
                <label className="label">Bitiş Tarihi</label>
                <input type="date" className="input" value={endDate} onChange={e => setEndDate(e.target.value)} />
              </div>
              
              <div>
                <label className="label">Birim Tipi</label>
                <select className="input" value={unitFilter} onChange={e => setUnitFilter(e.target.value)}>
                  <option value="all">Tüm Birimler</option>
                  <option value="Sosyal Çalışmalar Birimi">Sosyal Çalışmalar Birimi</option>
                  <option value="Bilimsel ve Akademik Çalışmalar Birimi">Bilimsel ve Akademik Çalışmalar Birimi</option>
                  <option value="Mesleki ve Kariyer Çalışmaları Birimi">Mesleki ve Kariyer Çalışmaları Birimi</option>
                  <option value="İletişim ve Tasarım Birimi">İletişim ve Tasarım Birimi</option>
                  <option value="Temsilcilikler Birimi">Temsilcilikler Birimi</option>
                </select>
              </div>

              <div>
                <label className="label">Etkinlik Durumu</label>
                <select className="input" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                  <option value="all">Tümü (Taslaklar Hariç)</option>
                  <option value="onaylandi">Sadece Onaylananlar</option>
                  <option value="bekliyor">Sadece Bekleyenler</option>
                  <option value="iptal">İptal Edilenler / Reddedilenler</option>
                </select>
              </div>
            </div>

            <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid #eaeaea', paddingTop: '1.5rem' }}>
              <button onClick={handleExport} disabled={isExporting} className="btn btn-primary" style={{ padding: '0.75rem 2rem' }}>
                <Download size={18} />
                {isExporting ? 'Hazırlanıyor...' : 'Excel Olarak İndir'}
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))', gap: '2rem' }}>
            <div className="card">
              <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <BarChart2 size={20} color="var(--color-primary)" />
                Birimlere Göre Etkinlik Dağılımı
              </h3>
              <div style={{ height: '300px', width: '100%' }}>
                {unitStats.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={unitStats} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis allowDecimals={false} />
                      <RechartsTooltip cursor={{ fill: '#f3f4f6' }} />
                      <Bar dataKey="count" name="Etkinlik Sayısı" radius={[4, 4, 0, 0]}>
                        {unitStats.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>Veri bulunamadı</div>
                )}
              </div>
            </div>

            <div className="card">
              <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <PieChartIcon size={20} color="var(--color-primary)" />
                Etkinlik Durum Dağılımı
              </h3>
              <div style={{ height: '300px', width: '100%' }}>
                {statusStats.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusStats}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, percent }) => `${name} (${((percent || 0) * 100).toFixed(0)}%)`}
                      >
                        {statusStats.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <RechartsTooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>Veri bulunamadı</div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
