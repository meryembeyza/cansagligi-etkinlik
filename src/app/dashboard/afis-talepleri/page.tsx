'use client';

import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Hourglass, 
  Pencil, 
  CheckCircle2, 
  RefreshCcw, 
  AlertTriangle,
  CalendarDays,
  Clock,
  User,
  Download,
  Mail,
  MessageSquare
} from 'lucide-react';
import styles from './afis-talepleri.module.css';
import { createClient } from '@/utils/supabase/client';
import { toast } from 'react-hot-toast';
import jsPDF from 'jspdf';
import { AfisDurumu, AfisTalebi } from '../../../types/afis-talepleri';

// Utility for dates
const formatDate = (dateStr: string) => {
  const d = new Date(dateStr);
  return d.toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' });
};

const getDaysDifference = (targetDate: string) => {
  const diffTime = new Date(targetDate).getTime() - new Date('2026-07-02T19:19:13+03:00').getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

type DateFilter = 'BuHafta' | 'BuAy' | 'Tumu';

export default function AfisTalepleriPage() {
  const supabase = createClient();
  const [requestsData, setRequestsData] = useState<AfisTalebi[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchRequests = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('poster_requests')
        .select(`
          *,
          events:event_id (
            id, event_name, event_date, location, university, status, created_by, unit_name,
            event_speakers (speakers (full_name)),
            creator:created_by ( full_name, phone )
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const mappedData: AfisTalebi[] = (data || []).map((req: any) => ({
        id: req.id,
        eventId: req.event_id,
        eventCreatorId: req.events?.created_by,
        etkinlikAdi: req.events?.event_name || 'Bilinmiyor',
        universiteAdi: req.events?.university || 'Bilinmiyor',
        birim: req.events?.unit_name || 'Sosyal', 
        etkinlikTarihi: req.events?.event_date || new Date().toISOString(),
        talepTarihi: req.created_at || new Date().toISOString(),
        durum: req.status as AfisDurumu,
        aciklama: req.special_instructions,
        tasarimciAdi: 'Tasarımcı',
        baslangicTarihi: req.started_at || req.updated_at || req.created_at,
        ilerlemeYuzdesi: req.progress || 10,
        onayTarihi: req.updated_at,
        dosyaUrl: req.file_url || req.poster_url,
        revizyonNotu: req.designer_notes,
        creator: req.events?.creator,
      }));

      setRequestsData(mappedData);
    } catch (e) {
      console.error(e);
      toast.error('Talepler yüklenirken hata oluştu');
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
    fetchRequests();
  }, []);
  const [activeTab, setActiveTab] = useState<AfisDurumu>('Bekliyor');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilter>('Tumu');
  
  // Filtering logic
  const filteredRequests = useMemo(() => {
    let result = [...requestsData];

    // 1. Search Filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(req => 
        req.etkinlikAdi.toLowerCase().includes(q) || 
        req.universiteAdi.toLowerCase().includes(q)
      );
    }

    // 2. Date Filter (using etkinlikTarihi as requested)
    if (dateFilter === 'BuHafta') {
      result = result.filter(req => {
        const days = getDaysDifference(req.etkinlikTarihi);
        return days >= 0 && days <= 7;
      });
    } else if (dateFilter === 'BuAy') {
       // Simplified month logic for mock purposes: within 30 days
       result = result.filter(req => {
        const days = getDaysDifference(req.etkinlikTarihi);
        return days >= 0 && days <= 30;
      });
    }

    return result;
  }, [searchQuery, dateFilter, requestsData]);

  // Sorting logic based on tab
  const getSortedRequests = (durum: AfisDurumu) => {
    let reqs = filteredRequests.filter(r => r.durum === durum);
    
    if (durum === 'Bekliyor' || durum === 'Revizyon') {
      // Uyargan sıra: Etkinliğe en yakın olanlar (farkı en az olanlar) üstte
      reqs.sort((a, b) => {
        const diffA = getDaysDifference(a.etkinlikTarihi);
        const diffB = getDaysDifference(b.etkinlikTarihi);
        // Exclude past events if we only care about upcoming, but let's just sort numerically
        return diffA - diffB;
      });
    } else if (durum === 'Tamamlandı') {
      // Yeni bitenleri yukarı (onay tarihi en yeni)
      reqs.sort((a, b) => new Date(b.onayTarihi || '').getTime() - new Date(a.onayTarihi || '').getTime());
    }
    // Hazırlanıyor: Normal sıra (talep tarihine göre eskiler üstte olsun)
    else if (durum === 'Hazırlanıyor') {
        reqs.sort((a, b) => new Date(a.talepTarihi).getTime() - new Date(b.talepTarihi).getTime());
    }

    return reqs;
  };

  const currentList = getSortedRequests(activeTab);

  // Counts for tabs
  
  
  const handleIslemeAl = async (id: string) => {
    try {
      const { error } = await supabase.from('poster_requests').update({ status: 'Hazırlanıyor', started_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
      toast.success('Talep işleme alındı.');
      fetchRequests();
      setActiveTab('Hazırlanıyor');
    } catch(e) { toast.error('Hata: ' + (e as any).message); }
  };

  const handleAfisYukle = async (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const req = requestsData.find(r => r.id === id);
    if (!req) return;

    try {
      toast.loading('Dosya yükleniyor...', { id: 'upload' });
      const file = files[0];
      const safeFilename = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
      const filePath = `${req.eventId || id}/${Date.now()}_${safeFilename}`;
      
      const { error: uploadError } = await supabase.storage.from('posters').upload(filePath, file, { cacheControl: '3600', upsert: false });
      if (uploadError) throw uploadError;
      
      const { data: urlData } = supabase.storage.from('posters').getPublicUrl(filePath);
      const publicUrl = urlData.publicUrl;
      
      const { error } = await supabase.from('poster_requests').update({ 
        status: 'Tamamlandı', 
        poster_url: publicUrl 
      }).eq('id', id);
      
      if (error) throw error;

      if (req.eventCreatorId && req.eventId) {
        await supabase.from('notifications').insert([{
          user_id: req.eventCreatorId,
          event_id: req.eventId,
          message: `Tasarım ekibi "${req.etkinlikAdi}" etkinliği için afiş dosyasını yükledi.`,
          type: 'poster_update'
        }]);
      }
      
      toast.success('Afiş başarıyla yüklendi.', { id: 'upload' });
      fetchRequests();
      setActiveTab('Tamamlandı');
    } catch(e) {
      toast.error('Hata: ' + (e as any).message, { id: 'upload' });
    }
  };

  const handleRevizyonBitti = async (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const req = requestsData.find(r => r.id === id);
    if (!req) return;

    try {
      toast.loading('Revize dosya yükleniyor...', { id: 'upload' });
      const file = files[0];
      const safeFilename = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
      const filePath = `${req.eventId || id}/rev_${Date.now()}_${safeFilename}`;
      
      const { error: uploadError } = await supabase.storage.from('posters').upload(filePath, file, { cacheControl: '3600', upsert: false });
      if (uploadError) throw uploadError;
      
      const { data: urlData } = supabase.storage.from('posters').getPublicUrl(filePath);
      const publicUrl = urlData.publicUrl;
      
      const { error } = await supabase.from('poster_requests').update({ 
        status: 'Tamamlandı', 
        poster_url: publicUrl 
      }).eq('id', id);
      
      if (error) throw error;

      if (req.eventCreatorId && req.eventId) {
        await supabase.from('notifications').insert([{
          user_id: req.eventCreatorId,
          event_id: req.eventId,
          message: `Tasarım ekibi "${req.etkinlikAdi}" etkinliği için revize afişi yükledi.`,
          type: 'poster_update'
        }]);
      }
      
      toast.success('Revize afiş başarıyla yüklendi.', { id: 'upload' });
      fetchRequests();
      setActiveTab('Tamamlandı');
    } catch(e) {
      toast.error('Hata: ' + (e as any).message, { id: 'upload' });
    }
  };

  const handleRevizyonReddet = async (id: string, note: string) => {
    try {
      const { error } = await supabase.from('poster_requests').update({ 
        status: 'Tamamlandı',
        designer_notes: note ? `Reddedilme Nedeni: ${note}` : null
      }).eq('id', id);
      if (error) throw error;
      toast.success('Revizyon reddedildi.');
      fetchRequests();
    } catch(e) { toast.error('Hata: ' + (e as any).message); }
  };

  const handleUpdateProgress = async (id: string, percent: number) => {
    try {
      const { error } = await supabase.from('poster_requests').update({ progress: percent }).eq('id', id);
      if (error) throw error;
      toast.success('İlerleme güncellendi.');
      fetchRequests();
    } catch(e) { toast.error('Hata: ' + (e as any).message); }
  };

  const countBekliyor = filteredRequests.filter(r => r.durum === 'Bekliyor').length;
  const countHazirlaniyor = filteredRequests.filter(r => r.durum === 'Hazırlanıyor').length;
  const countTamamlandi = filteredRequests.filter(r => r.durum === 'Tamamlandı').length;
  const countRevizyon = filteredRequests.filter(r => r.durum === 'Revizyon').length;

  const urgentBekleyenCount = filteredRequests.filter(r => r.durum === 'Bekliyor' && getDaysDifference(r.talepTarihi) < -7).length;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Afiş Talepleri Yönetimi</h1>
      </header>

      {/* Warning Banner for Urgent Requests */}
      {urgentBekleyenCount > 0 && activeTab === 'Bekliyor' && (
        <div className={styles.warningBanner}>
          <AlertTriangle size={20} />
          <span>Dikkat: {urgentBekleyenCount} adet bekleyen afiş talebi 7 günden daha eski! Lütfen en kısa sürede işleme alın.</span>
        </div>
      )}

      {/* Filter Panel */}
      <div className={styles.filterPanel}>
        <div className={styles.filterGroup}>
          <span className={styles.filterLabel}>Tarih Filtresi (Etkinlik):</span>
          <div className={styles.dateFilterButtons}>
            <button 
              className={`${styles.dateBtn} ${dateFilter === 'BuHafta' ? styles.dateBtnActive : ''}`}
              onClick={() => setDateFilter('BuHafta')}
            >
              Bu Hafta Yaklaşan
            </button>
            <button 
              className={`${styles.dateBtn} ${dateFilter === 'BuAy' ? styles.dateBtnActive : ''}`}
              onClick={() => setDateFilter('BuAy')}
            >
              Bu Ay
            </button>
            <button 
              className={`${styles.dateBtn} ${dateFilter === 'Tumu' ? styles.dateBtnActive : ''}`}
              onClick={() => setDateFilter('Tumu')}
            >
              Tümü
            </button>
          </div>
        </div>

        <div className={styles.searchContainer}>
          <Search size={18} className={styles.searchIcon} />
          <input 
            type="text" 
            placeholder="Etkinlik adı, üniversite ara..." 
            className={styles.searchInput}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Tabs */}
      <div className={styles.tabsContainer}>
        <button 
          className={`${styles.tab} ${styles.tabBekliyor} ${activeTab === 'Bekliyor' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('Bekliyor')}
        >
          <Hourglass size={18} /> Bekleyen
          <span className={styles.tabBadge}>{countBekliyor}</span>
        </button>
        <button 
          className={`${styles.tab} ${styles.tabHazirlaniyor} ${activeTab === 'Hazırlanıyor' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('Hazırlanıyor')}
        >
          <Pencil size={18} /> Hazırlanıyor
          <span className={styles.tabBadge}>{countHazirlaniyor}</span>
        </button>
        <button 
          className={`${styles.tab} ${styles.tabTamamlandi} ${activeTab === 'Tamamlandı' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('Tamamlandı')}
        >
          <CheckCircle2 size={18} /> Tamamlandı
          <span className={styles.tabBadge}>{countTamamlandi}</span>
        </button>
        <button 
          className={`${styles.tab} ${styles.tabRevizyon} ${activeTab === 'Revizyon' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('Revizyon')}
        >
          <RefreshCcw size={18} /> Revizyon Gerekli
          <span className={styles.tabBadge}>{countRevizyon}</span>
        </button>
      </div>

      {/* Content Area */}
      <div className={styles.contentArea}>
        <h2 className={styles.sectionTitle}>
          {activeTab === 'Bekliyor' && 'İşlem Bekleyen Afiş Talepleri'}
          {activeTab === 'Hazırlanıyor' && 'Hazırlanmakta Olan Afiş Talepleri'}
          {activeTab === 'Tamamlandı' && 'Tamamlanan Afiş Talepleri'}
          {activeTab === 'Revizyon' && 'Revizyon Bekleyen Afiş Talepleri'}
          <span style={{ color: 'var(--text-secondary)', fontWeight: 'normal', fontSize: '14px' }}>
            ({currentList.length} Talep)
          </span>
        </h2>

        <div className={styles.grid}>
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} style={{ height: '300px', backgroundColor: '#f3f4f6', borderRadius: '16px', animation: 'pulse 1.5s infinite' }} />
            ))
          ) : currentList.length > 0 ? (
            currentList.map(req => (
              <RequestCard key={req.id} request={req} onIslemeAl={handleIslemeAl} onAfisYukle={handleAfisYukle} onRevizyonBitti={handleRevizyonBitti} onRevizyonReddet={handleRevizyonReddet} onUpdateProgress={handleUpdateProgress} />
            ))
          ) : (
            <div style={{ color: 'var(--text-secondary)', padding: '20px 0' }}>
              Bu filtreye uygun talep bulunamadı.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Subcomponent for Card
function RequestCard({ request, onIslemeAl, onAfisYukle, onRevizyonBitti, onRevizyonReddet, onUpdateProgress }: { request: AfisTalebi, onIslemeAl?: (id: string) => void, onAfisYukle?: (id: string, e: React.ChangeEvent<HTMLInputElement>) => void, onRevizyonBitti?: (id: string, e: React.ChangeEvent<HTMLInputElement>) => void, onRevizyonReddet?: (id: string, note: string) => void, onUpdateProgress?: (id: string, percent: number) => void }) {
  const safeText = (val?: string) => val?.trim() || null;
  const [isRejectModalOpen, setIsRejectModalOpen] = React.useState(false);
  const [rejectNote, setRejectNote] = React.useState('');
  const [isEditingProgress, setIsEditingProgress] = React.useState(false);
  const [progressVal, setProgressVal] = React.useState(request.ilerlemeYuzdesi || 10);

  const closeRejectModal = () => {
    setIsRejectModalOpen(false);
    setRejectNote('');
  };

  const submitReject = () => {
    if (onRevizyonReddet) {
      onRevizyonReddet(request.id, rejectNote);
    }
    closeRejectModal();
  };

  const handleDownloadPDF = async () => {
    try {
      const fontUrl = 'https://fonts.gstatic.com/s/notosans/v36/o-0IIpQlx3QUlC5A4PNjThZVZNyBx2pqPIif.woff2';
      const fontResponse = await fetch(fontUrl);
      const blob = await fontResponse.blob();
      const base64String = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          resolve((reader.result as string).split(',')[1]);
        };
        reader.readAsDataURL(blob);
      });

      const doc = new jsPDF();
      doc.addFileToVFS('NotoSans-Regular.ttf', base64String as string);
      doc.addFont('NotoSans-Regular.ttf', 'NotoSans', 'normal');
      doc.setFont('NotoSans', 'normal');
      doc.setLanguage('tr');

      doc.setFontSize(16);
      doc.text('Afiş Talebi Bilgileri', 20, 20);
      doc.setFontSize(12);
      doc.text('Etkinlik Adı: ' + request.etkinlikAdi, 20, 40);
      doc.text('Üniversite: ' + request.universiteAdi, 20, 50);
      doc.text('Birim: ' + request.birim, 20, 60);
      doc.text('Etkinlik Tarihi: ' + formatDate(request.etkinlikTarihi), 20, 70);
      doc.text('Talep Tarihi: ' + formatDate(request.talepTarihi), 20, 80);
      doc.text('Durum: ' + request.durum, 20, 90);
      if (request.aciklama) { 
          doc.text('Açıklama: ' + request.aciklama.substring(0, 50) + '...', 20, 100); 
      }
      if (request.durum === 'Revizyon' && request.revizyonNotu) {
          doc.text('Revizyon Notu: ' + request.revizyonNotu, 20, 110);
      }
      const safeDate = request.etkinlikTarihi.split('T')[0];
      const safeUni = request.universiteAdi.replace(/[^a-zA-Z0-9]/gi, '_').toLowerCase();
      const safeEtkinlik = request.etkinlikAdi.replace(/[^a-zA-Z0-9]/gi, '_').toLowerCase();
      doc.save(safeDate + '_' + safeUni + '_' + safeEtkinlik + '.pdf');
    } catch (e) {
      console.error(e);
      toast.error('PDF oluşturulurken bir hata oluştu.');
    }
  };

  const reqDaysDiff = Math.abs(getDaysDifference(request.talepTarihi));
  const eventDaysDiff = getDaysDifference(request.etkinlikTarihi);
  
  const getBirimClass = (birim: string) => {
    switch (birim) {
      case 'Sosyal': return styles.birimSosyal;
      case 'Mesleki': return styles.birimMesleki;
      case 'Eğitim': return styles.birimEgitim;
      default: return styles.birimDiger;
    }
  };

  return (
    <div className={styles.card}>
      {/* Common Header */}
      <div className={styles.cardHeader}>
        <div className={styles.eventInfo}>
          <h3>{request.etkinlikAdi}</h3>
          <div className={styles.university}>
            <span>{request.universiteAdi}</span>
          </div>
        </div>
        <span className={`${styles.birimBadge} ${getBirimClass(request.birim)}`}>
          {request.birim}
        </span>
      </div>

      {request.durum === 'Hazırlanıyor' && (
        <div style={{ padding: '0', marginTop: '-8px', marginBottom: '8px' }}>
          <div className={styles.progressContainer}>
            <div className={styles.progressBarBg}>
              <div className={styles.progressBarFill} style={{ width: `${request.ilerlemeYuzdesi || 10}%` }}></div>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              %{request.ilerlemeYuzdesi || 10} tamamlandı
            </div>
          </div>
        </div>
      )}

      {/* Specific Details Based on Status */}
      <div className={styles.cardDetails}>

        <div className={styles.detailRow}>
          <User size={14} />
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            İletişim ({request.creator?.full_name || 'Bilinmiyor'}):
            <strong>
              {request.creator?.phone ? (
                <>
                  <a href={`tel:${request.creator.phone}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                    {request.creator.phone}
                  </a>
                  <a 
                    href={`https://wa.me/90${request.creator.phone.replace(/\D/g, '')}`} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    style={{ color: '#25D366', marginLeft: '6px', display: 'inline-flex', alignItems: 'center' }}
                    title="WhatsApp'tan yaz"
                  >
                    <MessageSquare size={14} />
                  </a>
                </>
              ) : 'Belirtilmedi'}
            </strong>
          </span>
        </div>
        <div className={styles.detailRow}>
          <CalendarDays size={14} /> 
          <span>Etkinlik: <strong>{formatDate(request.etkinlikTarihi)}</strong> 
          {eventDaysDiff >= 0 ? ` (${eventDaysDiff} gün kaldı)` : ' (Geçti)'}</span>
        </div>

        {safeText(request.aciklama) && (
          <div className={styles.detailRow}>
            <Mail size={14} />
            <span style={{ whiteSpace: 'pre-line' }}>Açıklama: {safeText(request.aciklama)}</span>
          </div>
        )}

        {request.durum === 'Bekliyor' && (
          <div className={styles.detailRow}>
            <Clock size={14} />
            <span>Talep Tarihi: {formatDate(request.talepTarihi)} ({reqDaysDiff} gün önce)</span>
          </div>
        )}

        {request.durum === 'Hazırlanıyor' && (
          <>
            <div className={styles.detailRow}>
              <Clock size={14} />
              <span>Başlangıç: {formatDate(request.baslangicTarihi!)} ({Math.abs(getDaysDifference(request.baslangicTarihi!))} gün)</span>
            </div>
          </>
        )}

        {request.durum === 'Tamamlandı' && (
          <>
            <div className={styles.detailRow}>
              <CheckCircle2 size={14} color="#27AE60" />
              <span>Onaylandı: {formatDate(request.onayTarihi!)}</span>
            </div>
            {safeText(request.dosyaUrl) && (
              <a href={safeText(request.dosyaUrl) || '#'} className={styles.detailRow} style={{ color: '#3b82f6', textDecoration: 'none' }}>
                <Download size={14} />
                <span>Afiş Dosyasını İndir</span>
              </a>
            )}
          </>
        )}

        {request.durum === 'Revizyon' && safeText(request.revizyonNotu) && (
          <div className={styles.detailRow}>
            <AlertTriangle size={14} color="#E74C3C" />
            <span style={{ whiteSpace: 'pre-line', color: '#E74C3C' }}>Revizyon Notu: {safeText(request.revizyonNotu)}</span>
          </div>
        )}

      </div>
      <div className={styles.cardActions}>
        {request.durum === 'Bekliyor' && (
          <>
            <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => onIslemeAl?.(request.id)}>İşleme Al</button>
            <button className={`${styles.btn} ${styles.btnOutline}`} onClick={handleDownloadPDF}><Download size={16} /> PDF İndir</button>
          </>
        )}
        
        {request.durum === 'Hazırlanıyor' && (
          <>
            <label className={`${styles.btn} ${styles.btnSuccess}`} style={{ cursor: 'pointer', textAlign: 'center' }}>
              Afiş Yükle
              <input multiple type="file" 
                accept="image/*,application/pdf" 
                style={{ display: 'none' }} 
                onChange={(e) => onAfisYukle?.((request.id), e)}
              />
            </label>
            {!isEditingProgress ? (
              <button className={`${styles.btn} ${styles.btnOutline}`} style={{ fontSize: '12px', padding: '4px 8px' }} onClick={() => setIsEditingProgress(true)}>
                İlerlemeyi Güncelle
              </button>
            ) : (
              <div style={{ display: 'flex', gap: '4px', alignItems: 'center', flexWrap: 'wrap', width: '100%' }}>
                <input 
                  type="number" 
                  min="0" max="100" 
                  value={progressVal} 
                  onChange={e => setProgressVal(Number(e.target.value))} 
                  style={{ width: '60px', padding: '4px', fontSize: '12px', border: '1px solid #ccc', borderRadius: '4px' }} 
                />
                <button className={`${styles.btn} ${styles.btnPrimary}`} style={{ fontSize: '12px', padding: '4px 8px', flex: 'none' }} onClick={() => {
                  onUpdateProgress?.(request.id, progressVal);
                  setIsEditingProgress(false);
                }}>Kaydet</button>
                <button className={`${styles.btn} ${styles.btnOutline}`} style={{ fontSize: '12px', padding: '4px 8px', flex: 'none' }} onClick={() => setIsEditingProgress(false)}>İptal</button>
              </div>
            )}
          </>
        )}

        {request.durum === 'Tamamlandı' && (
          <>
            <button className={`${styles.btn} ${styles.btnOutline}`} onClick={() => toast.success('Afiş cihazınıza indiriliyor...')}>
              <Download size={16} /> Afişi İndir
            </button>
            <button className={`${styles.btn} ${styles.btnOutline}`} onClick={handleDownloadPDF}>
              <Download size={16} /> PDF İndir
            </button>
            <button className={`${styles.btn} ${styles.btnOutline}`} onClick={() => toast.success('WhatsApp sohbeti başlatılıyor: +90 555 123 4567')}>
              <MessageSquare size={16} /> WhatsApp
            </button>
          </>
        )}

        {request.durum === 'Revizyon' && (
          <>
            <label className={`${styles.btn} ${styles.btnSuccess}`} style={{ cursor: 'pointer', textAlign: 'center' }}>
              Revize Afişi Yükle
              <input multiple type="file" 
                accept="image/*,application/pdf" 
                style={{ display: 'none' }} 
                onChange={(e) => onRevizyonBitti?.((request.id), e)}
              />
            </label>
            <button className={`${styles.btn} ${styles.btnOutline}`} onClick={() => setIsRejectModalOpen(true)}>
              Reddet
            </button>
            <button className={`${styles.btn} ${styles.btnOutline}`} onClick={handleDownloadPDF}>
              <Download size={16} /> PDF İndir
            </button>
          </>
        )}
      </div>

      {isRejectModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999
        }}>
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '24px',
            width: '100%',
            maxWidth: '480px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#111827' }}>Revizyonu Reddet</h3>
            <p style={{ margin: 0, fontSize: '14px', color: '#4b5563' }}>Bu afiş talebini neden reddediyorsunuz?</p>
            <div>
              <textarea 
                rows={4}
                placeholder="Revizyon sebebini açıklayın — talep sahibine iletilecektir"
                maxLength={300}
                value={rejectNote}
                onChange={(e) => setRejectNote(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid #d1d5db',
                  fontSize: '14px',
                  outline: 'none',
                  resize: 'vertical',
                  fontFamily: 'inherit'
                }}
              />
              <div style={{ textAlign: 'right', fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                {rejectNote.length}/300
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
              <button 
                onClick={closeRejectModal}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: '1px solid #d1d5db',
                  background: 'transparent',
                  cursor: 'pointer',
                  fontWeight: 500,
                  color: '#374151'
                }}
              >
                Vazgeç
              </button>
              <button 
                onClick={submitReject}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#da1c15',
                  color: 'white',
                  cursor: 'pointer',
                  fontWeight: 500
                }}
              >
                Reddet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}