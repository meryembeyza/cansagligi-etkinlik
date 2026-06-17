'use client';
import { toast } from 'react-hot-toast';

import { useState, useEffect, useMemo } from 'react';
import { Download, Filter, BarChart2, PieChart as PieChartIcon } from 'lucide-react';
import { useRole } from '@/context/RoleContext';
import { createClient } from '@/utils/supabase/client';
const supabase = createClient();
import ExcelJS from 'exceljs';
import LoadingState from '@/components/ui/LoadingState';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const UNIT_COLORS: Record<string, string> = {
  'Sosyal Çalýþmalar Birimi': '#10b981',
  'Mesleki ve Kariyer Çalýþmalarý Birimi': '#ef4444',
  'Bilimsel ve Akademik Çalýþmalar Birimi': '#3b82f6',
  'Temsilcilikler Birimi': '#eab308',
  'Diðer': '#6b7280'
};

const STATUS_COLORS: Record<string, string> = {
  'Onaylandý': '#10b981',
  'Onay Bekliyor': '#f59e0b',
  'Reddedildi': '#ef4444',
  'Taslak': '#6b7280'
};

export default function ReportsExportPage() {
  const { currentRole, userData } = useRole();
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
        if (currentRole === 'region_manager' && userData?.region) {
          query = query.eq('region', userData.region);
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
  }, [currentRole, userData]);

  const filteredEvents = useMemo(() => {
    return events.filter(e => {
      let match = true;
      const eventTime = new Date(e.event_date).getTime();
      
      if (startDate && eventTime < new Date(startDate).getTime()) match = false;
      if (endDate && eventTime > new Date(endDate).getTime()) match = false;
      if (unitFilter !== 'all' && e.unit_name !== unitFilter) match = false;
      
      if (statusFilter !== 'all') {
        if (statusFilter === 'gerceklesti' && e.status !== 'Gerçekleþti') match = false;
        if (statusFilter === 'onaylandi' && e.status !== 'Onaylandý') match = false;
        if (statusFilter === 'iptal' && (e.status === 'Ýptal Edildi' || e.status === 'Reddedildi')) match = false;
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
      const u = e.unit_name || 'Diðer';
      if (!stats[u]) {
        stats[u] = { name: u, count: 0, fill: UNIT_COLORS[u] || UNIT_COLORS['Diðer'] };
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

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const eventList = filteredEvents.map(e => ({
        'Etkinlik Adý': e.event_name,
        'Tarih': new Date(e.event_date).toLocaleDateString('tr-TR'),
        'Birim': e.unit_name,
        'Üniversite': e.university,
        'Bölge': e.region,
        'Durum': e.status,
        'Beklenen Katýlýmcý': e.expected_participants || 0
      }));

      const unitSummaryMap: Record<string, { totalEvents: number, totalParticipants: number }> = {};
      filteredEvents.forEach(e => {
        const u = e.unit_name || 'Diðer';
        if (!unitSummaryMap[u]) unitSummaryMap[u] = { totalEvents: 0, totalParticipants: 0 };
        unitSummaryMap[u].totalEvents += 1;
        unitSummaryMap[u].totalParticipants += (e.expected_participants || 0);
      });
      const unitSummary = Object.keys(unitSummaryMap).map(k => ({
        'Birim': k,
        'Toplam Etkinlik': unitSummaryMap[k].totalEvents,
        'Toplam Katýlýmcý': unitSummaryMap[k].totalParticipants
      }));

      const logisticsList: Record<string, unknown>[] = [];
      filteredEvents.forEach(e => {
        let logisticsObj: Record<string, unknown> = {};
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
          if (logisticsObj.photography) usedItems.push('Fotoðraf Çekimi');
          if (logisticsObj.catering) usedItems.push('Ýkram: ' + (logisticsObj.cateringDetails || ''));
          if (logisticsObj.hasBasicLifeSupport) usedItems.push('TYD Eðitimi: ' + (logisticsObj.basicLifeSupportDetails || ''));
          if (logisticsObj.hasAdvancedLifeSupport) usedItems.push('ÝYD Eðitimi: ' + (logisticsObj.advancedLifeSupportDetails || ''));
          if (logisticsObj.hasSutureTraining) usedItems.push('Sütür Eðitimi: ' + (logisticsObj.sutureTrainingDetails || ''));
          
          if (logisticsObj.customRequests && Array.isArray(logisticsObj.customRequests)) {
            logisticsObj.customRequests.forEach((req: string) => {
               usedItems.push(req.name + ' (' + req.count + ')');
            });
          }

          if (usedItems.length > 0) {
            logisticsList.push({
              'Etkinlik Adý': e.event_name,
              'Birim': e.unit_name,
              'Bölge': e.region,
              'Durum': e.status,
              'Kullanýlan Malzemeler/Hizmetler': usedItems.join(' | '),
              'Ek Notlar': logisticsObj.extraNotes || ''
            });
          }
        }
      });

      const workbook = new ExcelJS.Workbook();
      
      const ws1 = workbook.addWorksheet('Etkinlikler');
      if (eventList.length > 0) {
        ws1.columns = Object.keys(eventList[0]).map(key => ({ header: key, key: key, width: 20 }));
        ws1.addRows(eventList);
      }
      
      const ws2 = workbook.addWorksheet('Birim Özetleri');
      if (unitSummary.length > 0) {
        ws2.columns = Object.keys(unitSummary[0]).map(key => ({ header: key, key: key, width: 20 }));
        ws2.addRows(unitSummary);
      }
      
      const ws3 = workbook.addWorksheet('Lojistik Raporu');
      if (logisticsList.length > 0) {
        ws3.columns = Object.keys(logisticsList[0]).map(key => ({ header: key, key: key, width: 25 }));
        ws3.addRows(logisticsList);
      }

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'Cansagligi_Rapor.xlsx';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);


    } catch (err) {
      console.error(err);
      toast.error('Excel dosyasý oluþturulurken bir hata oluþtu.');
    } finally {
      setIsExporting(false);
    }
  };

  if (currentRole === 'unit_head' || currentRole === 'design_team' || currentRole === 'resource_manager' || currentRole === 'representative') {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Yetkisiz Eriþim</h2>
        <p style={{ color: 'var(--text-muted)' }}>Ýstatistik ve raporlarý yalnýzca Bölge Sorumlularý ve Genel Yetkililer görebilir.</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '4rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Raporlar ve Ýstatistikler</h1>
        <p style={{ color: 'var(--text-muted)' }}>Sistemdeki etkinlik verilerini analiz edin ve Excel formatýnda indirin.</p>
      </div>

      {isLoading ? (
        <LoadingState message="Raporlar yükleniyor..." />
      ) : (
        <>
          <div className="card" style={{ marginBottom: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
              <Filter size={20} color="var(--color-primary)" />
              <h3 style={{ fontSize: '1.125rem', fontWeight: 600 }}>Filtreler</h3>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
              <div>
                <label className="label">Baþlangýç Tarihi</label>
                <input type="date" className="input" value={startDate} onChange={e => setStartDate(e.target.value)} />
              </div>
              <div>
                <label className="label">Bitiþ Tarihi</label>
                <input type="date" className="input" value={endDate} onChange={e => setEndDate(e.target.value)} />
              </div>
              
              <div>
                <label className="label">Birim Tipi</label>
                <select className="input" value={unitFilter} onChange={e => setUnitFilter(e.target.value)}>
                  <option value="all">Tüm Birimler</option>
                  <option value="Sosyal Çalýþmalar Birimi">Sosyal Çalýþmalar Birimi</option>
                  <option value="Bilimsel ve Akademik Çalýþmalar Birimi">Bilimsel ve Akademik Çalýþmalar Birimi</option>
                  <option value="Mesleki ve Kariyer Çalýþmalarý Birimi">Mesleki ve Kariyer Çalýþmalarý Birimi</option>
                  <option value="Ýletiþim ve Tasarým Birimi">Ýletiþim ve Tasarým Birimi</option>
                  <option value="Temsilcilikler Birimi">Temsilcilikler Birimi</option>
                </select>
              </div>

              <div>
                <label className="label">Etkinlik Durumu</label>
                <select className="input" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                  <option value="all">Tümü (Taslaklar Hariç)</option>
                  <option value="onaylandi">Sadece Onaylananlar</option>
                  <option value="bekliyor">Sadece Bekleyenler</option>
                  <option value="iptal">Ýptal Edilenler / Reddedilenler</option>
                </select>
              </div>
            </div>

            <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
              <button onClick={handleExport} disabled={isExporting} className="btn btn-primary" style={{ padding: '0.75rem 2rem' }}>
                <Download size={18} />
                {isExporting ? 'Hazýrlanýyor...' : 'Excel Olarak Ýndir'}
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))', gap: '2rem' }}>
            <div className="card">
              <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <BarChart2 size={20} color="var(--color-primary)" />
                Birimlere Göre Etkinlik Daðýlýmý
              </h3>
              <div style={{ height: '300px', width: '100%' }}>
                {unitStats.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={unitStats} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis allowDecimals={false} />
                      <RechartsTooltip cursor={{ fill: '#f3f4f6' }} />
                      <Bar dataKey="count" name="Etkinlik Sayýsý" radius={[4, 4, 0, 0]}>
                        {unitStats.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>Veri bulunamadý</div>
                )}
              </div>
            </div>

            <div className="card">
              <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <PieChartIcon size={20} color="var(--color-primary)" />
                Etkinlik Durum Daðýlýmý
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
                  <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>Veri bulunamadý</div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}




