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
  const { currentRole, userData } = useRole();
  const [isExporting, setIsExporting] = useState(false);
  const [isPdfExporting, setIsPdfExporting] = useState(false);
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

  
  const applyQuickFilter = (type: 'this_week' | 'last_week' | 'this_month' | 'last_month' | 'this_year') => {
    const now = new Date();
    let start = new Date();
    let end = new Date();

    if (type === 'this_week') {
      const day = now.getDay() || 7; 
      start.setDate(now.getDate() - day + 1);
      end.setDate(start.getDate() + 6);
    } else if (type === 'last_week') {
      const day = now.getDay() || 7; 
      start.setDate(now.getDate() - day - 6);
      end.setDate(start.getDate() + 6);
    } else if (type === 'this_month') {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    } else if (type === 'last_month') {
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      end = new Date(now.getFullYear(), now.getMonth(), 0);
    } else if (type === 'this_year') {
      start = new Date(now.getFullYear(), 0, 1);
      end = new Date(now.getFullYear(), 11, 31);
    }

    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end.toISOString().split('T')[0]);
  };


  const handleExport = async () => {
    setIsExporting(true);
    try {
      // 1. Etkinlikleri kronolojik sırala
      const sortedEvents = [...filteredEvents].sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime());

      // Tarih yardımcı fonksiyonları
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

      // 2. Özet Tablo verisi (Hafta bazlı)
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

      // Lojistik Verisi Hazırlığı (Mevcut mantık korunuyor)
      const logisticsList: Record<string, unknown>[] = [];
      sortedEvents.forEach(e => {
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
          if (logisticsObj.photography) usedItems.push('Fotoğraf Çekimi');
          if (logisticsObj.catering) usedItems.push('İkram: ' + (logisticsObj.cateringDetails || ''));
          if (logisticsObj.hasBasicLifeSupport) usedItems.push('TYD Eğitimi: ' + (logisticsObj.basicLifeSupportDetails || ''));
          if (logisticsObj.hasAdvancedLifeSupport) usedItems.push('İYD Eğitimi: ' + (logisticsObj.advancedLifeSupportDetails || ''));
          if (logisticsObj.hasSutureTraining) usedItems.push('Sütür Eğitimi: ' + (logisticsObj.sutureTrainingDetails || ''));
          
          if (logisticsObj.customRequests && Array.isArray(logisticsObj.customRequests)) {
            logisticsObj.customRequests.forEach((req: string) => {
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

      const workbook = new ExcelJS.Workbook();
      
      
      // Yıllık Özet
      const yearSummaryMap: Record<string, { totalEvents: number, totalParticipants: number, label: string }> = {};
      sortedEvents.forEach(e => {
        const d = new Date(e.event_date);
        const year = d.getFullYear().toString();
        
        if (!yearSummaryMap[year]) {
          yearSummaryMap[year] = { totalEvents: 0, totalParticipants: 0, label: year + ' Yılı' };
        }
        yearSummaryMap[year].totalEvents += 1;
        yearSummaryMap[year].totalParticipants += (e.expected_participants || 0);
      });
      const yearSummary = Object.keys(yearSummaryMap).sort().map(k => ({
        'Yıl': yearSummaryMap[k].label,
        'Toplam Etkinlik': yearSummaryMap[k].totalEvents,
        'Toplam Katılımcı': yearSummaryMap[k].totalParticipants
      }));
      
      const wsYear = workbook.addWorksheet('Yıllık Özet');
      wsYear.columns = [
        { header: 'Yıl', key: 'Yıl', width: 30 },
        { header: 'Toplam Etkinlik', key: 'Toplam Etkinlik', width: 20 },
        { header: 'Toplam Katılımcı', key: 'Toplam Katılımcı', width: 20 }
      ];
      if (yearSummary.length > 0) wsYear.addRows(yearSummary);
      wsYear.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      wsYear.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } };
      wsYear.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };
      wsYear.eachRow((row) => {
        row.eachCell((cell) => { cell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} }; });
      });

      // --- SEKME 1: ÖZET TABLO ---

      const wsSummary = workbook.addWorksheet('Özet Tablo');
      wsSummary.columns = [
        { header: 'Hafta', key: 'Hafta', width: 30 },
        { header: 'Toplam Etkinlik', key: 'Toplam Etkinlik', width: 20 },
        { header: 'Toplam Katılımcı', key: 'Toplam Katılımcı', width: 20 }
      ];
      if (weekSummary.length > 0) wsSummary.addRows(weekSummary);
      
      // Özet Tablo Stilleri
      wsSummary.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      wsSummary.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } };
      wsSummary.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };
      wsSummary.autoFilter = 'A1:C1';
      wsSummary.eachRow((row) => {
        row.eachCell((cell) => {
          cell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
        });
      });

      // --- SEKME 2: ETKİNLİKLER (Aylık Gruplu & Renkli) ---
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
      
      // Etkinlikler Başlık Stilleri
      wsEvents.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      wsEvents.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } };
      wsEvents.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };
      wsEvents.autoFilter = 'A1:G1';
      wsEvents.views = [{ state: 'frozen', ySplit: 1 }];

      let currentMonth = '';
      sortedEvents.forEach(e => {
        const monthStr = getMonthName(e.event_date);
        
        // Ay değiştiğinde ara başlık ekle
        if (monthStr !== currentMonth) {
          currentMonth = monthStr;
          const headerRow = wsEvents.addRow([monthStr]);
          wsEvents.mergeCells(`A${headerRow.number}:G${headerRow.number}`);
          headerRow.font = { bold: true, size: 14, color: { argb: 'FF000000' } };
          headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1D5DB' } }; // Gri arka plan
          headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
          headerRow.eachCell((cell) => {
            cell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
          });
        }

        // Veri satırı ekle
        const row = wsEvents.addRow([
          new Date(e.event_date).toLocaleDateString('tr-TR'),
          e.event_name,
          e.unit_name,
          e.university,
          e.region,
          e.status,
          e.expected_participants || 0
        ]);

        // Bölgeye göre satır renklendirme
        let bgColor = 'FFFFFFFF'; // Beyaz
        if (e.region === 'İstanbul Avrupa') bgColor = 'FFE0F2FE'; // Açık Mavi
        else if (e.region === 'İstanbul Anadolu') bgColor = 'FFFEF08A'; // Açık Sarı
        else if (e.region === 'Marmara') bgColor = 'FFDCFCE7'; // Açık Yeşil
        else if (e.region === 'İç Anadolu') bgColor = 'FFFFEDD5'; // Açık Turuncu
        else if (e.region === 'Ege') bgColor = 'FFFAE8FF'; // Açık Pembe
        else if (e.region) bgColor = 'FFF3E8FF'; // Diğerleri için soft mor

        row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
        row.font = { color: { argb: 'FF000000' } }; // Force black font
        
        row.eachCell((cell) => {
          cell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
        });
      });

      // --- SEKME 3: LOJİSTİK RAPORU ---
      const wsLogistics = workbook.addWorksheet('Lojistik Raporu');
      wsLogistics.columns = [
        { header: 'Etkinlik Adı', key: 'Etkinlik Adı', width: 35 },
        { header: 'Birim', key: 'Birim', width: 20 },
        { header: 'Bölge', key: 'Bölge', width: 15 },
        { header: 'Durum', key: 'Durum', width: 15 },
        { header: 'Kullanılan Malzemeler/Hizmetler', key: 'Kullanılan Malzemeler/Hizmetler', width: 50 },
        { header: 'Ek Notlar', key: 'Ek Notlar', width: 30 }
      ];
      if (logisticsList.length > 0) wsLogistics.addRows(logisticsList);

      wsLogistics.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      wsLogistics.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } };
      wsLogistics.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };
      wsLogistics.autoFilter = 'A1:F1';
      wsLogistics.views = [{ state: 'frozen', ySplit: 1 }];
      wsLogistics.eachRow((row) => {
        row.eachCell((cell) => {
          cell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
        });
      });

      // İndirme İşlemi
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
      toast.error('Excel dosyası oluşturulurken bir hata oluştu.');
    } finally {
      setIsExporting(false);
    }
  };

  
  const handlePdfExport = async () => {
    setIsPdfExporting(true);
    try {
      const html2pdf = (await import('html2pdf.js')).default;
      
      const element = document.createElement('div');
      element.style.padding = '20px';
      element.style.fontFamily = 'sans-serif';
      element.style.color = '#333';
      
      // Header
      const header = document.createElement('h1');
      header.textContent = 'Can Sağlığı Etkinlik & Lojistik Raporu';
      header.style.textAlign = 'center';
      header.style.color = '#dc2626';
      element.appendChild(header);
      
      const subHeader = document.createElement('p');
      subHeader.textContent = `Tarih Aralığı: ${startDate || 'Tümü'} - ${endDate || 'Tümü'}`;
      subHeader.style.textAlign = 'center';
      subHeader.style.marginBottom = '30px';
      element.appendChild(subHeader);

      // Clone charts
      const chartsContainer = document.getElementById('charts-container');
      if (chartsContainer) {
        const clonedCharts = chartsContainer.cloneNode(true);
        clonedCharts.style.display = 'block';
        element.appendChild(clonedCharts);
      }

      // Add Table
      const tableDiv = document.createElement('div');
      tableDiv.style.marginTop = '40px';
      tableDiv.innerHTML = `
        <h2 style="font-size: 18px; color: #111827; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px;">Filtrelenen Etkinlikler</h2>
        <table style="width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px;">
          <thead>
            <tr style="background-color: #f3f4f6; text-align: left;">
              <th style="padding: 8px; border: 1px solid #d1d5db;">Tarih</th>
              <th style="padding: 8px; border: 1px solid #d1d5db;">Etkinlik Adı</th>
              <th style="padding: 8px; border: 1px solid #d1d5db;">Birim</th>
              <th style="padding: 8px; border: 1px solid #d1d5db;">Durum</th>
            </tr>
          </thead>
          <tbody>
            ${filteredEvents.map(e => `
              <tr>
                <td style="padding: 8px; border: 1px solid #d1d5db;">${new Date(e.event_date).toLocaleDateString('tr-TR')}</td>
                <td style="padding: 8px; border: 1px solid #d1d5db;">${e.event_name}</td>
                <td style="padding: 8px; border: 1px solid #d1d5db;">${e.unit_name}</td>
                <td style="padding: 8px; border: 1px solid #d1d5db;">${e.status}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
      element.appendChild(tableDiv);

      const opt = {
        margin:       10,
        filename:     'Cansagligi_Rapor.pdf',
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      await html2pdf().set(opt).from(element).save();

    } catch (err) {
      console.error(err);
      toast.error('PDF oluşturulurken hata oluştu.');
    } finally {
      setIsPdfExporting(false);
    }
  };


  if (currentRole === 'design_team' || currentRole === 'resource_manager' || currentRole === 'representative') {
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


            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
              <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)', alignSelf: 'center', marginRight: '8px' }}>Hızlı Seçim:</span>
              <button onClick={() => applyQuickFilter('this_week')} className="btn btn-outline" style={{ padding: '0.25rem 0.75rem', fontSize: '12px' }}>Bu Hafta</button>
              <button onClick={() => applyQuickFilter('last_week')} className="btn btn-outline" style={{ padding: '0.25rem 0.75rem', fontSize: '12px' }}>Geçen Hafta</button>
              <button onClick={() => applyQuickFilter('this_month')} className="btn btn-outline" style={{ padding: '0.25rem 0.75rem', fontSize: '12px' }}>Bu Ay</button>
              <button onClick={() => applyQuickFilter('last_month')} className="btn btn-outline" style={{ padding: '0.25rem 0.75rem', fontSize: '12px' }}>Geçen Ay</button>
              <button onClick={() => applyQuickFilter('this_year')} className="btn btn-outline" style={{ padding: '0.25rem 0.75rem', fontSize: '12px' }}>Bu Yıl</button>
            </div>

            <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
              <button onClick={handleExport} disabled={isExporting} className="btn btn-primary" style={{ padding: '0.75rem 2rem' }}>
                <Download size={18} />
                {isExporting ? 'Hazırlanıyor...' : 'Excel Olarak İndir'}
              </button>
              <button onClick={handlePdfExport} disabled={isPdfExporting} className="btn btn-primary" style={{ padding: '0.75rem 2rem', backgroundColor: '#e11d48' }}>
                <Download size={18} />
                {isPdfExporting ? 'Hazırlanıyor...' : 'PDF Olarak İndir'}
              </button>
            </div>
          </div>

          <div id="charts-container" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))', gap: '2rem' }}>
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




