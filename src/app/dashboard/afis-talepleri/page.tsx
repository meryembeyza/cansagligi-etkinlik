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
import { mockAfisTalepleri } from '../../../data/mock-afis-talepleri';
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
  const [requestsData, setRequestsData] = useState<AfisTalebi[]>(mockAfisTalepleri);
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
  
  
  const handleIslemeAl = (id: string) => {
    setRequestsData(prev => prev.map(req => req.id === id ? { ...req, durum: 'Hazırlanıyor', ilerlemeYuzdesi: 10, baslangicTarihi: new Date().toISOString() } : req));
    setActiveTab('Hazırlanıyor');
  };
const handleAfisYukle = (id: string) => {
    setRequestsData(prev => prev.map(req => req.id === id ? { ...req, durum: 'Tamamlandı', onayTarihi: new Date().toISOString(), dosyaUrl: '#' } : req));
  };

  const handleRevizyonBitti = (id: string) => {
    setRequestsData(prev => prev.map(req => req.id === id ? { ...req, durum: 'Tamamlandı', onayTarihi: new Date().toISOString() } : req));
  };

  const handleRevizyonReddet = (id: string, note: string) => {
    // Reddedilen talebi Tamamlandı sekmesine geri gönder
    // Opsiyonel notu da loglayabiliriz veya state'e ekleyebiliriz (burada alert ile gosterilebilir)
    setRequestsData(prev => prev.map(req => req.id === id ? { ...req, durum: 'Tamamlandı' } : req));
    if (note) {
        alert('Revizyon reddedildi. Notunuz: ' + note);
    }
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
          {currentList.map(req => (
            <RequestCard key={req.id} request={req} onIslemeAl={handleIslemeAl} onAfisYukle={handleAfisYukle} onRevizyonBitti={handleRevizyonBitti} onRevizyonReddet={handleRevizyonReddet} />
          ))}
          {currentList.length === 0 && (
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
function RequestCard({ request, onIslemeAl }: { request: AfisTalebi, onIslemeAl?: (id: string) => void, onAfisYukle?: (id: string) => void, onRevizyonBitti?: (id: string) => void, onRevizyonReddet?: (id: string, note: string) => void }) {
  
    
  const replaceTurkishChars = (text: string) => {
    if (!text) return '';
    return text.replace(/ğ/g, 'g').replace(/Ğ/g, 'G')
               .replace(/ü/g, 'u').replace(/Ü/g, 'U')
               .replace(/ş/g, 's').replace(/Ş/g, 'S')
               .replace(/ı/g, 'i').replace(/İ/g, 'I')
               .replace(/ö/g, 'o').replace(/Ö/g, 'O')
               .replace(/ç/g, 'c').replace(/Ç/g, 'C');
  };

  const handleDownloadPDF = () => {
    const doc = new jsPDF();
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(16);
    doc.text(replaceTurkishChars('Afiş Talebi Bilgileri'), 20, 20);
    doc.setFontSize(12);
    doc.text(replaceTurkishChars('Etkinlik Adı: ' + request.etkinlikAdi), 20, 40);
    doc.text(replaceTurkishChars('Üniversite: ' + request.universiteAdi), 20, 50);
    doc.text(replaceTurkishChars('Birim: ' + request.birim), 20, 60);
    doc.text(replaceTurkishChars('Etkinlik Tarihi: ' + formatDate(request.etkinlikTarihi)), 20, 70);
    doc.text(replaceTurkishChars('Talep Tarihi: ' + formatDate(request.talepTarihi)), 20, 80);
    doc.text(replaceTurkishChars('Durum: ' + request.durum), 20, 90);
    if (request.aciklama) { 
        doc.text(replaceTurkishChars('Açıklama: ' + request.aciklama.substring(0, 50) + '...'), 20, 100); 
    }
    if (request.durum === 'Revizyon' && request.revizyonNotu) {
        doc.text(replaceTurkishChars('Revizyon Notu: ' + request.revizyonNotu), 20, 110);
    }
    const safeDate = request.etkinlikTarihi.split('T')[0];
    const safeUni = request.universiteAdi.replace(/[^a-zA-Z0-9]/gi, '_').toLowerCase();
    const safeEtkinlik = replaceTurkishChars(request.etkinlikAdi).replace(/[^a-zA-Z0-9]/gi, '_').toLowerCase();
    doc.save(safeDate + '_' + safeUni + '_' + safeEtkinlik + '.pdf');
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

      {/* Specific Details Based on Status */}
      <div className={styles.cardDetails}>

        <div className={styles.detailRow}>
          <User size={14} />
          <span>İletişim: <strong>+90 555 123 4567</strong></span>
        </div>
        <div className={styles.detailRow}>
          <CalendarDays size={14} /> 
          <span>Etkinlik: <strong>{formatDate(request.etkinlikTarihi)}</strong> 
          {eventDaysDiff >= 0 ? ` (${eventDaysDiff} gün kaldı)` : ' (Geçti)'}</span>
        </div>

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
            {request.dosyaUrl && (
              <a href="#" className={styles.detailRow} style={{ color: '#3b82f6', textDecoration: 'none' }}>
                <Download size={14} />
                <span>Afiş Dosyasını İndir</span>
              </a>
            )}
          </>
        )}

      </div>\n      <div className={styles.cardActions}>
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
              <input 
                type="file" 
                accept="image/*,application/pdf" 
                style={{ display: 'none' }} 
                onChange={() => onAfisYukle?.(request.id)}
              />
            </label>
            <button className={`${styles.btn} ${styles.btnOutline}`} onClick={handleDownloadPDF}><Download size={16} /> PDF İndir</button>
          </>
        )}

        {request.durum === 'Tamamlandı' && (
          <>
            <button className={`${styles.btn} ${styles.btnOutline}`} onClick={() => alert('Afiş cihazınıza indiriliyor...')}>
              <Download size={16} /> Afişi İndir
            </button>
            <button className={`${styles.btn} ${styles.btnOutline}`} onClick={handleDownloadPDF}>
              <Download size={16} /> PDF İndir
            </button>
            <button className={`${styles.btn} ${styles.btnOutline}`} onClick={() => alert('WhatsApp sohbeti başlatılıyor: +90 555 123 4567')}>
              <MessageSquare size={16} /> WhatsApp
            </button>
          </>
        )}

        {request.durum === 'Revizyon' && (
          <>
            <label className={`${styles.btn} ${styles.btnSuccess}`} style={{ cursor: 'pointer', textAlign: 'center' }}>
              Revize Afişi Yükle
              <input 
                type="file" 
                accept="image/*,application/pdf" 
                style={{ display: 'none' }} 
                onChange={() => onRevizyonBitti?.(request.id)}
              />
            </label>
            <button className={`${styles.btn} ${styles.btnOutline}`} onClick={() => {
                const note = window.prompt('Revizyonu reddetme nedeniniz (İsteğe bağlı):');
                if (note !== null) {
                    onRevizyonReddet?.(request.id, note);
                }
            }}>
              Reddet
            </button>
            <button className={`${styles.btn} ${styles.btnOutline}`} onClick={handleDownloadPDF}>
              <Download size={16} /> PDF İndir
            </button>
          </>
        )}
      </div>
    </div>
  );
}