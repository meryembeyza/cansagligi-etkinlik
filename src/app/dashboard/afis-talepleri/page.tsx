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
import Link from 'next/link';

// Utility for dates
const formatDate = (dateStr: string) => {
  const d = new Date(dateStr);
  return d.toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' });
};

const getDaysDifference = (targetDate?: string) => {
  if (!targetDate) return 0;
  const diffTime = new Date(targetDate).getTime() - new Date().getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

type DateFilter = 'BuHafta' | 'BuAy' | 'Tumu';

export default function AfisTalepleriPage() {
  const supabase = createClient();
  const [requestsData, setRequestsData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchRequests = async () => {
  setIsLoading(true);
  try {
    const { data, error } = await supabase
      .from('poster_requests')
      .select('*, events:event_id(id, event_name, event_date, created_by, university)')
      .order('created_at', { ascending: false });
    if (error) throw error;
    setRequestsData(data || []);
  } catch (err) {
    toast.error('Veriler yüklenemedi.');
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
        req.events?.event_name.toLowerCase().includes(q) || 
        req.events?.university.toLowerCase().includes(q)
      );
    }

    // 2. Date Filter (using etkinlikTarihi as requested)
    if (dateFilter === 'BuHafta') {
      result = result.filter(req => {
        const days = getDaysDifference(req.events?.event_date);
        return days >= 0 && days <= 7;
      });
    } else if (dateFilter === 'BuAy') {
       // Simplified month logic for mock purposes: within 30 days
       result = result.filter(req => {
        const days = getDaysDifference(req.events?.event_date);
        return days >= 0 && days <= 30;
      });
    }

    return result;
  }, [searchQuery, dateFilter, requestsData]);

  // Sorting logic based on tab
  const getSortedRequests = (durum: AfisDurumu) => {
    let reqs = filteredRequests.filter(r => r.status === durum);
    
    if (durum === 'Bekliyor' || durum === 'Revizyon') {
      // Uyargan sıra: Etkinliğe en yakın olanlar (farkı en az olanlar) üstte
      reqs.sort((a, b) => {
        const diffA = getDaysDifference(a.events?.event_date);
        const diffB = getDaysDifference(b.events?.event_date);
        // Exclude past events if we only care about upcoming, but let's just sort numerically
        return diffA - diffB;
      });
    } else if (durum === 'Tamamlandı') {
      // Yeni bitenleri yukarı (onay tarihi en yeni)
      reqs.sort((a, b) => new Date(b.updated_at || '').getTime() - new Date(a.updated_at || '').getTime());
    }
    // Hazırlanıyor: Normal sıra (talep tarihine göre eskiler üstte olsun)
    else if (durum === 'Hazırlanıyor') {
        reqs.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    }

    return reqs;
  };

  const currentList = getSortedRequests(activeTab);

  // Counts for tabs
  
  
  const handleIslemeAl = async (id: string) => {
    try {
      const { error } = await supabase
        .from('poster_requests')
        .update({ 
          status: 'Hazırlanıyor',
          started_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', id);
      if (error) throw error;
  
      // Notify event creator that work has started
      const req = requestsData.find(r => r.id === id);
      if (req?.events?.created_by) {
        await supabase.from('notifications').insert([{
          user_id: req.events.created_by,
          event_id: req.event_id,
          message: `"${req.events?.event_name}" etkinliğinizin afişi hazırlanmaya başlandı.`,
          type: 'poster_in_progress'
        }]);
      }
  
      toast.success('Talep işleme alındı.');
      setActiveTab('Hazırlanıyor');
      await fetchRequests();
    } catch (err) {
      toast.error('Hata: ' + (err as Error).message);
    }
  };

  const handleAfisYukle = async (id: string, file: File) => {
    try {
      const req = requestsData.find(r => r.id === id);
      if (!req || !file) return;
  
      // 1. Upload file to Supabase Storage
      const safeFilename = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
      const filePath = `${req.event_id}/${Date.now()}_${safeFilename}`;
      const { error: uploadError } = await supabase.storage
        .from('posters')
        .upload(filePath, file, { cacheControl: '3600', upsert: false });
      if (uploadError) throw uploadError;
  
      const { data: urlData } = supabase.storage.from('posters').getPublicUrl(filePath);
      const publicUrl = urlData.publicUrl;
  
      // 2. Update poster_request in DB
      const { error: updateError } = await supabase
        .from('poster_requests')
        .update({ status: 'Tamamlandı', poster_url: publicUrl, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (updateError) throw updateError;
  
      // 3. Notify event creator
      if (req.events?.created_by) {
        await supabase.from('notifications').insert([{
          user_id: req.events.created_by,
          event_id: req.event_id,
          message: `"${req.events?.event_name}" etkinliğinizin afişi hazırlandı ve sisteme yüklendi.`,
          type: 'poster_completed'
        }]);
      }
  
      toast.success('Afiş başarıyla yüklendi ve etkinlik sahibine bildirim gönderildi.');
      await fetchRequests();
    } catch (err) {
      toast.error('Hata: ' + (err as Error).message);
    }
  };

  const handleRevizyonBitti = async (id: string, file: File) => {
    try {
      const req = requestsData.find(r => r.id === id);
      if (!req || !file) return;

      toast.loading('Revize dosya yükleniyor...', { id: 'upload' });
      const safeFilename = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
      const filePath = `${req.event_id || id}/rev_${Date.now()}_${safeFilename}`;
      
      const { error: uploadError } = await supabase.storage.from('posters').upload(filePath, file, { cacheControl: '3600', upsert: false });
      if (uploadError) throw uploadError;
      
      const { data: urlData } = supabase.storage.from('posters').getPublicUrl(filePath);
      const publicUrl = urlData.publicUrl;
      
      const { error } = await supabase.from('poster_requests').update({ 
        status: 'Tamamlandı', 
        poster_url: publicUrl,
        updated_at: new Date().toISOString()
      }).eq('id', id);
      
      if (error) throw error;

      if (req.events?.created_by && req.event_id) {
        await supabase.from('notifications').insert([{
          user_id: req.events?.created_by,
          event_id: req.event_id,
          message: `Tasarım ekibi "${req.events?.event_name}" etkinliği için revize afişi yükledi.`,
          type: 'poster_update'
        }]);
      }
      
      toast.success('Revize afiş başarıyla yüklendi.', { id: 'upload' });
      await fetchRequests();
      setActiveTab('Tamamlandı');
    } catch(e) {
      toast.error('Hata: ' + (e as Error).message, { id: 'upload' });
    }
  };

  const handleRevizyonReddet = async (id: string, note: string) => {
    try {
      const req = requestsData.find(r => r.id === id);
      const { error } = await supabase.from('poster_requests').update({ 
        status: 'Revizyon Reddedildi',
        designer_notes: note ? `Reddedilme Nedeni: ${note}` : null,
        updated_at: new Date().toISOString()
      }).eq('id', id);
      if (error) throw error;

      if (req?.events?.created_by) {
        await supabase.from('notifications').insert([{
          user_id: req.events.created_by,
          event_id: req.event_id,
          message: `"${req.events?.event_name}" etkinliğinizin revizyon talebi reddedildi. Not: ${note}`,
          type: 'poster_rejected'
        }]);
      }

      toast.success('Revizyon reddedildi.');
      await fetchRequests();
    } catch(err) { toast.error('Hata: ' + (err as Error).message); }
  };

  const handleUpdateProgress = async (id: string, percent: number) => {
    try {
      const { error } = await supabase.from('poster_requests').update({ progress: percent }).eq('id', id);
      if (error) throw error;
      toast.success('İlerleme güncellendi.');
      fetchRequests();
    } catch(e) { toast.error('Hata: ' + (e as any).message); }
  };

  const countBekliyor = filteredRequests.filter(r => r.status === 'Bekliyor').length;
  const countHazirlaniyor = filteredRequests.filter(r => r.status === 'Hazırlanıyor').length;
  const countTamamlandi = filteredRequests.filter(r => r.status === 'Tamamlandı').length;
  const countRevizyon = filteredRequests.filter(r => r.status === 'Revizyon').length;

  const urgentBekleyenCount = filteredRequests.filter(r => r.status === 'Bekliyor' && getDaysDifference(r.created_at) < -7).length;

  return (
    <>
      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% 0 }
          100% { background-position: -200% 0 }
        }
      `}</style>
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
              <div key={i} style={{ height: '300px', background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite', borderRadius: '16px' }} />
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
    </>
  );
}

// Subcomponent for Card
function RequestCard({ request, onIslemeAl, onAfisYukle, onRevizyonBitti, onRevizyonReddet, onUpdateProgress }: { request: any, onIslemeAl?: (id: string) => void, onAfisYukle?: (id: string, file: File) => void, onRevizyonBitti?: (id: string, file: File) => void, onRevizyonReddet?: (id: string, note: string) => void, onUpdateProgress?: (id: string, percent: number) => void }) {
  const safeText = (val?: string) => val?.trim() || null;
  const [isRejectModalOpen, setIsRejectModalOpen] = React.useState(false);
  const [rejectNote, setRejectNote] = React.useState('');
  const [isEditingProgress, setIsEditingProgress] = React.useState(false);
  const [progressVal, setProgressVal] = React.useState(request.progress || 10);

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
      doc.text('Etkinlik Adı: ' + request.events?.event_name, 20, 40);
      doc.text('Üniversite: ' + request.events?.university, 20, 50);
      doc.text('Birim: ' + request.events?.unit_name, 20, 60);
      doc.text('Etkinlik Tarihi: ' + formatDate(request.events?.event_date), 20, 70);
      doc.text('Talep Tarihi: ' + formatDate(request.created_at), 20, 80);
      doc.text('Durum: ' + request.status, 20, 90);
      if (request.special_instructions) { 
          doc.text('Açıklama: ' + request.special_instructions.substring(0, 50) + '...', 20, 100); 
      }
      if (request.status === 'Revizyon' && request.designer_notes) {
          doc.text('Revizyon Notu: ' + request.designer_notes, 20, 110);
      }
      const safeDate = request.events?.event_date.split('T')[0];
      const safeUni = request.events?.university.replace(/[^a-zA-Z0-9]/gi, '_').toLowerCase();
      const safeEtkinlik = request.events?.event_name.replace(/[^a-zA-Z0-9]/gi, '_').toLowerCase();
      doc.save(safeDate + '_' + safeUni + '_' + safeEtkinlik + '.pdf');
    } catch (e) {
      console.error(e);
      toast.error('PDF oluşturulurken bir hata oluştu.');
    }
  };

  const reqDaysDiff = Math.abs(getDaysDifference(request.created_at));
  const eventDaysDiff = getDaysDifference(request.events?.event_date);
  
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
          <Link href={`/dashboard/events/${request.event_id}`} style={{ textDecoration: 'none' }}>
            <h3 className={styles.eventLink}>{request.events?.event_name}</h3>
          </Link>
          <div className={styles.university}>
            <span>{request.events?.university}</span>
          </div>
        </div>
        <span className={`${styles.birimBadge} ${getBirimClass(request.events?.unit_name)}`}>
          {request.events?.unit_name}
        </span>
      </div>

      {/* Progress bar removed based on user request */}

      {/* Specific Details Based on Status */}
      <div className={styles.cardDetails}>

        <div className={styles.detailRow}>
          <User size={14} />
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            İletişim ({"Bilinmiyor"}):
            <strong>
              {null ? (
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
          <span>Etkinlik: <strong>{formatDate(request.events?.event_date)}</strong> 
          {eventDaysDiff >= 0 ? ` (${eventDaysDiff} gün kaldı)` : ' (Geçti)'}</span>
        </div>

        {safeText(request.special_instructions) && (
          <div className={styles.detailRow}>
            <Mail size={14} />
            <span style={{ whiteSpace: 'pre-line' }}>Açıklama: {safeText(request.special_instructions)}</span>
          </div>
        )}

        {request.status === 'Bekliyor' && (
          <div className={styles.detailRow}>
            <Clock size={14} />
            <span>Talep Tarihi: {formatDate(request.created_at)} ({reqDaysDiff} gün önce)</span>
          </div>
        )}

        {request.status === 'Hazırlanıyor' && (
          <>
            <div className={styles.detailRow}>
              <Clock size={14} />
              <span>Başlangıç: {formatDate(request.updated_at!)} ({Math.abs(getDaysDifference(request.updated_at!))} gün)</span>
            </div>
          </>
        )}

        {request.status === 'Tamamlandı' && (
          <>
            <div className={styles.detailRow}>
              <CheckCircle2 size={14} color="#27AE60" />
              <span>Onaylandı: {formatDate(request.updated_at!)}</span>
            </div>
            {safeText(request.poster_url) && (
              <a href={safeText(request.poster_url) || '#'} className={styles.detailRow} style={{ color: '#3b82f6', textDecoration: 'none' }}>
                <Download size={14} />
                <span>Afiş Dosyasını İndir</span>
              </a>
            )}
          </>
        )}

        {request.status === 'Revizyon' && safeText(request.designer_notes) && (
          <div className={styles.detailRow}>
            <AlertTriangle size={14} color="#E74C3C" />
            <span style={{ whiteSpace: 'pre-line', color: '#E74C3C' }}>Revizyon Notu: {safeText(request.designer_notes)}</span>
          </div>
        )}

      </div>
      <div className={styles.cardActions}>
        {request.status === 'Bekliyor' && (
          <>
            <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => onIslemeAl?.(request.id)}>İşleme Al</button>
            <button className={`${styles.btn} ${styles.btnOutline}`} onClick={handleDownloadPDF}><Download size={16} /> PDF İndir</button>
          </>
        )}
        
        {request.status === 'Hazırlanıyor' && (
          <>
            <label className={`${styles.btn} ${styles.btnSuccess}`} style={{ cursor: 'pointer', textAlign: 'center' }}>
              Afiş Yükle
              <input multiple type="file" 
                accept="image/*,application/pdf" 
                style={{ display: 'none' }} 
                onChange={(e) => { const file = e.target.files?.[0]; if (file) onAfisYukle?.(request.id, file); }}
              />
            </label>
      {/* Update progress button removed based on user request */}
          </>
        )}

        {request.status === 'Tamamlandı' && (
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

        {request.status === 'Revizyon' && (
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
          zIndex: 'var(--z-modal)'
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