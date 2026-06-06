'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRole } from '@/context/RoleContext';
import { 
  ChevronLeft, 
  ChevronRight, 
  MapPin, 
  Box, 
  Truck, 
  Droplet, 
  FileText, 
  X, 
  Calendar, 
  Info,
  Clock,
  Heart,
  ShieldAlert,
  Scissors
} from 'lucide-react';

// Kaynak kategorileri ve ikonları
const RESOURCE_CATEGORIES = [
  { id: 'Araç', name: 'Ulaşım / Servis', icon: Truck, color: '#eab308', bg: '#fef9c3', text: '#854d0e' },
  { id: 'TemelYaşamDesteği', name: 'Temel Yaşam Desteği Malz.', icon: Heart, color: '#3b82f6', bg: '#dbeafe', text: '#1e40af' },
  { id: 'İleriYaşamDesteği', name: 'İleri Yaşam Desteği Malz.', icon: ShieldAlert, color: '#ef4444', bg: '#fee2e2', text: '#991b1b' },
  { id: 'SüturEğitimi', name: 'Sütur Eğitimi Malz.', icon: Scissors, color: '#ec4899', bg: '#fce7f3', text: '#9d174d' },
  { id: 'Eşantiyon', name: 'Aromaterapi Yağları', icon: Droplet, color: '#10b981', bg: '#d1fae5', text: '#065f46' },
  { id: 'Serbest', name: 'Diğer / Özel Talepler', icon: Box, color: '#8b5cf6', bg: '#f3e8ff', text: '#6b21a8' }
];

export default function ResourceCalendar() {
  const { currentRole, userData } = useRole();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [mergedReservations, setMergedReservations] = useState<any[]>([]);
  const [selectedRes, setSelectedRes] = useState<any | null>(null);

  useEffect(() => {
    fetchMonthlyResourceRequests();
  }, [currentDate, currentRole, userData]);

  const fetchMonthlyResourceRequests = async () => {
    setLoading(true);
    try {
      const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).toISOString();
      const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59).toISOString();

      // 1. ONAYLANMIŞ ETKİNLİKLERİ VE LOJİSTİK BÜTÇE TALEPLERİNİ ÇEK
      let eventsQuery = supabase
        .from('events')
        .select('id, event_name, university, region, event_date, status, budget_request, unit_name')
        .in('status', ['Onaylandı', 'Gerçekleşti'])
        .gte('event_date', firstDay)
        .lte('event_date', lastDay);

      // Kaynak sorumlusu ise sadece kendi birimini filtrele
      if (currentRole === 'resource_manager' && userData?.unit_name) {
        eventsQuery = eventsQuery.eq('unit_name', userData.unit_name);
      }

      const { data: eventsData, error: eventsError } = await eventsQuery;
      if (eventsError) throw eventsError;

      const parsedFromEvents: any[] = [];

      eventsData?.forEach(event => {
        try {
          const logData = JSON.parse(event.budget_request);
          if (!logData) return;

          // Event date details
          const eDate = new Date(event.event_date);
          const dayNumber = eDate.getDate();

          // A. Shuttle / Servis Talebi -> Ulaşım/Araç
          if (logData.hasShuttle && logData.shuttle) {
            parsedFromEvents.push({
              id: `${event.id}-shuttle`,
              eventId: event.id,
              eventName: event.event_name,
              university: event.university,
              region: event.region,
              unitName: event.unit_name,
              date: event.event_date,
              day: dayNumber,
              type: 'Araç',
              title: 'Servis Talebi',
              details: `${logData.shuttle.description} | Kalkış: ${logData.shuttle.departurePoint} (${logData.shuttle.departureTime}) - Dönüş: ${logData.shuttle.returnPoint} (${logData.shuttle.returnTime}) | Sorumlu: ${logData.shuttle.vehicleManager}`,
              quantity: 1,
              source: 'Etkinlik Formu (Lojistik)'
            });
          }

          // B. Aromaterapi Yağları -> Eşantiyon
          if (logData.hasAroma && logData.aroma && logData.aroma.length > 0) {
            const aromaDetails = logData.aroma.map((a: any, idx: number) => 
              `Formül ${idx + 1}: ${a.oils} (${a.amount}) - ${a.peopleCount} Kişilik`
            ).join(' | ');

            parsedFromEvents.push({
              id: `${event.id}-aroma`,
              eventId: event.id,
              eventName: event.event_name,
              university: event.university,
              region: event.region,
              unitName: event.unit_name,
              date: event.event_date,
              day: dayNumber,
              type: 'Eşantiyon',
              title: 'Aromaterapi Yağları',
              details: aromaDetails,
              quantity: logData.aroma.length,
              source: 'Etkinlik Formu (Lojistik)'
            });
          }

          // C. Temel Yaşam Desteği Talebi
          if (logData.hasBasicLifeSupport) {
            parsedFromEvents.push({
              id: `${event.id}-basic-life`,
              eventId: event.id,
              eventName: event.event_name,
              university: event.university,
              region: event.region,
              unitName: event.unit_name,
              date: event.event_date,
              day: dayNumber,
              type: 'TemelYaşamDesteği',
              title: 'Temel Yaşam Desteği Malzemeleri',
              details: logData.basicLifeSupportDetails || 'Temel Yaşam Desteği Malzemeleri Talebi',
              quantity: 1,
              source: 'Etkinlik Formu (Lojistik)'
            });
          }

          // D. İleri Yaşam Desteği Talebi
          if (logData.hasAdvancedLifeSupport) {
            parsedFromEvents.push({
              id: `${event.id}-advanced-life`,
              eventId: event.id,
              eventName: event.event_name,
              university: event.university,
              region: event.region,
              unitName: event.unit_name,
              date: event.event_date,
              day: dayNumber,
              type: 'İleriYaşamDesteği',
              title: 'İleri Yaşam Desteği Malzemeleri',
              details: logData.advancedLifeSupportDetails || 'İleri Yaşam Desteği Malzemeleri Talebi',
              quantity: 1,
              source: 'Etkinlik Formu (Lojistik)'
            });
          }

          // E. Sütur Eğitimi Talebi
          if (logData.hasSutureTraining) {
            parsedFromEvents.push({
              id: `${event.id}-suture-training`,
              eventId: event.id,
              eventName: event.event_name,
              university: event.university,
              region: event.region,
              unitName: event.unit_name,
              date: event.event_date,
              day: dayNumber,
              type: 'SüturEğitimi',
              title: 'Sütur Eğitimi Malzemeleri',
              details: logData.sutureTrainingDetails || 'Sütur Eğitimi Malzemeleri Talebi',
              quantity: 1,
              source: 'Etkinlik Formu (Lojistik)'
            });
          }

          // D. Özel Talepler -> Serbest
          if (logData.customRequests && logData.customRequests.length > 0) {
            logData.customRequests.forEach((cr: any, idx: number) => {
              parsedFromEvents.push({
                id: `${event.id}-custom-${idx}`,
                eventId: event.id,
                eventName: event.event_name,
                university: event.university,
                region: event.region,
                unitName: event.unit_name,
                date: event.event_date,
                day: dayNumber,
                type: 'Serbest',
                title: cr.name || 'Özel Talep',
                details: cr.note || 'Not belirtilmemiş',
                quantity: 1,
                source: 'Etkinlik Formu (Lojistik)'
              });
            });
          }

        } catch (e) {
          // JSON Parse Error, ignore
        }
      });

      // 2. VERİTABANI REZERVASYONLARINI ÇEK (resource_reservations)
      let resQuery = supabase
        .from('resource_reservations')
        .select(`
          *,
          events:event_id (id, event_name, university, region, event_date, unit_name),
          resources:resource_id (name, type)
        `)
        .eq('status', 'Onaylandı')
        .gte('request_date', firstDay)
        .lte('request_date', lastDay);

      const { data: dbResData, error: dbResError } = await resQuery;
      if (dbResError) throw dbResError;

      const parsedFromDb: any[] = [];
      dbResData?.forEach(res => {
        // Kaynak sorumlusu filtre kontrolü
        if (currentRole === 'resource_manager' && userData?.unit_name) {
          if (res.events?.unit_name !== userData.unit_name) {
            return;
          }
        }

        const rDate = new Date(res.request_date);
        parsedFromDb.push({
          id: res.id,
          eventId: res.events?.id,
          eventName: res.events?.event_name || 'Bilinmeyen Etkinlik',
          university: res.events?.university || 'Bilinmeyen Okul',
          region: res.events?.region,
          unitName: res.events?.unit_name,
          date: res.request_date,
          day: rDate.getDate(),
          type: res.resources?.type || 'Serbest',
          title: res.resources?.name || 'Kaynak Talebi',
          details: res.notes || 'Not belirtilmemiş',
          quantity: res.quantity || 1,
          source: 'Kaynak Rezervasyonu'
        });
      });

      // İki veri setini birleştir
      const allMerged = [...parsedFromEvents, ...parsedFromDb];
      setMergedReservations(allMerged);

    } catch (err: any) {
      console.error('Kaynak takvimi yüklenemedi:', err.message);
    } finally {
      setLoading(false);
    }
  };

  // Ayın günlerini belirleme
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  
  const monthNames = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
  const weekdays = ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"];

  // Bir güne ait haftanın gününü alma
  const getWeekdayName = (day: number) => {
    const d = new Date(year, month, day);
    return weekdays[d.getDay()];
  };

  const isToday = (day: number) => {
    const today = new Date();
    return day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Takvim Üst Kontrol Paneli */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: '1.25rem 1.5rem', borderRadius: 'var(--radius-lg)', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '1px solid #eaeaea' }}>
        <div>
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {currentRole === 'resource_manager' ? `${userData?.unit_name} Kaynakları` : 'Vakıf Kaynakları'}
          </span>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#1e293b', marginTop: '0.25rem' }}>
            {monthNames[month]} <span style={{ fontWeight: 300, color: '#64748b' }}>{year}</span>
          </h2>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button onClick={prevMonth} className="btn btn-outline" style={{ padding: '0.5rem', borderRadius: '50%', width: '40px', height: '40px', justifyContent: 'center' }}>
            <ChevronLeft size={20} />
          </button>
          <button onClick={() => setCurrentDate(new Date())} className="btn btn-outline" style={{ fontWeight: 600, padding: '0.5rem 1.25rem', borderRadius: '20px' }}>
            Bugün
          </button>
          <button onClick={nextMonth} className="btn btn-outline" style={{ padding: '0.5rem', borderRadius: '50%', width: '40px', height: '40px', justifyContent: 'center' }}>
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {/* Ana Gantt Izgarası Kartı */}
      <div className="card" style={{ padding: '1.5rem', overflow: 'hidden' }}>
        
        {loading ? (
          <div style={{ padding: '6rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <div style={{ width: '40px', height: '40px', border: '3px solid #f3f3f3', borderTop: '3px solid var(--color-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 1.5rem' }}></div>
            <strong>Kaynak rezervasyonları hesaplanıyor...</strong>
            <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
          </div>
        ) : (
          <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '850px' }}>
              <thead>
                <tr>
                  {/* Sticky Kaynak Başlık Hücresi */}
                  <th style={{ 
                    position: 'sticky', 
                    left: 0, 
                    backgroundColor: '#fff', 
                    zIndex: 20, 
                    minWidth: '220px', 
                    padding: '1rem', 
                    textAlign: 'left', 
                    borderBottom: '2px solid #e2e8f0', 
                    boxShadow: '2px 0 5px rgba(0,0,0,0.02)'
                  }}>
                    <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      KAYNAK / ÜRÜN
                    </div>
                  </th>
                  
                  {/* Gün Sütunları Başlıkları */}
                  {Array.from({ length: daysInMonth }).map((_, idx) => {
                    const day = idx + 1;
                    const wDay = getWeekdayName(day);
                    const isWeekend = wDay === 'Cmt' || wDay === 'Paz';
                    return (
                      <th key={day} style={{ 
                        padding: '0.75rem 0.25rem', 
                        textAlign: 'center', 
                        borderBottom: '2px solid #e2e8f0',
                        backgroundColor: isToday(day) ? '#fee2e2' : isWeekend ? '#f8fafc' : 'transparent',
                        color: isToday(day) ? '#ef4444' : isWeekend ? '#64748b' : '#334155',
                        minWidth: '40px',
                        borderLeft: '1px solid #f1f5f9'
                      }}>
                        <div style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', opacity: 0.8 }}>{wDay}</div>
                        <div style={{ fontSize: '1rem', fontWeight: 800, marginTop: '2px' }}>{day}</div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              
              <tbody>
                {RESOURCE_CATEGORIES.map(category => {
                  const IconComponent = category.icon;
                  return (
                    <tr key={category.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      
                      {/* Sticky Ürün Hücresi */}
                      <td style={{ 
                        position: 'sticky', 
                        left: 0, 
                        backgroundColor: '#fff', 
                        zIndex: 10, 
                        padding: '1.25rem 1rem', 
                        borderBottom: '1px solid #f1f5f9',
                        boxShadow: '2px 0 5px rgba(0,0,0,0.02)',
                        minWidth: '220px'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div style={{ 
                            padding: '0.5rem', 
                            borderRadius: '10px', 
                            backgroundColor: category.bg, 
                            color: category.color,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            <IconComponent size={20} />
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '0.925rem', color: '#1e293b' }}>
                              {category.name}
                            </div>
                            <span style={{ fontSize: '0.725rem', color: '#64748b', fontWeight: 500 }}>
                              {category.id === 'Araç' ? 'Servis / Ulaşım' : category.id === 'Maket' ? 'Model & Stand' : category.id === 'Eşantiyon' ? 'Aromaterapi' : 'Lojistik Malzeme'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Günlük Hücreler */}
                      {Array.from({ length: daysInMonth }).map((_, idx) => {
                        const day = idx + 1;
                        const wDay = getWeekdayName(day);
                        const isWeekend = wDay === 'Cmt' || wDay === 'Paz';
                        
                        // Bu güne ve bu kategoriye ait onaylı rezervasyonları bul
                        const dayRequests = mergedReservations.filter(res => 
                          res.day === day && res.type === category.id
                        );

                        return (
                          <td key={day} style={{ 
                            padding: '0.5rem 0.25rem', 
                            textAlign: 'center', 
                            backgroundColor: isToday(day) ? '#fff5f5' : isWeekend ? '#fafbfd' : 'transparent',
                            borderLeft: '1px solid #f1f5f9',
                            position: 'relative',
                            height: '75px'
                          }}>
                            {dayRequests.length > 0 ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                                {dayRequests.map((req, rIdx) => (
                                  <div 
                                    key={req.id || rIdx}
                                    onClick={() => setSelectedRes(req)}
                                    style={{ 
                                      backgroundColor: category.color,
                                      color: '#fff',
                                      fontSize: '0.65rem',
                                      fontWeight: 800,
                                      padding: '0.25rem 0.5rem',
                                      borderRadius: '6px',
                                      cursor: 'pointer',
                                      maxWidth: '38px',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      whiteSpace: 'nowrap',
                                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                                      transition: 'transform 0.15s ease, filter 0.15s ease',
                                    }}
                                    onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.15)'; e.currentTarget.style.filter = 'brightness(1.1)'; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.filter = 'brightness(1)'; }}
                                    title={`${req.university} - ${req.eventName}`}
                                  >
                                    {req.university ? req.university.substring(0, 3).toUpperCase() : 'ETK'}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              // Müsait Hücre (Soft Artı İkonlu Hover)
                              <div 
                                style={{ 
                                  height: '100%', 
                                  width: '100%', 
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  justifyContent: 'center',
                                  fontSize: '0.875rem',
                                  color: '#cbd5e1',
                                  cursor: 'default',
                                  transition: 'background-color 0.15s ease, color 0.15s ease',
                                  borderRadius: '6px'
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f1f5f9'; e.currentTarget.style.color = 'var(--color-primary)'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#cbd5e1'; }}
                              >
                                +
                              </div>
                            )}
                          </td>
                        );
                      })}

                    </tr>
                  );
                })}
              </tbody>
            </table>

          </div>
        )}

      </div>

      {/* Premium Rezervasyon Detay Modalı */}
      {selectedRes && (
        <div style={{ 
          position: 'fixed', 
          top: 0, 
          left: 0, 
          right: 0, 
          bottom: 0, 
          backgroundColor: 'rgba(15, 23, 42, 0.4)', 
          backdropFilter: 'blur(8px)',
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          zIndex: 9999,
          padding: '1rem',
          animation: 'fadeIn 0.2s ease-out'
        }} onClick={() => setSelectedRes(null)}>
          
          <div style={{ 
            backgroundColor: '#fff', 
            borderRadius: '20px', 
            width: '100%', 
            maxWidth: '550px', 
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)',
            overflow: 'hidden',
            animation: 'slideUp 0.25s ease-out'
          }} onClick={e => e.stopPropagation()}>
            
            {/* Modal Header */}
            <div style={{ 
              backgroundColor: RESOURCE_CATEGORIES.find(c => c.id === selectedRes.type)?.bg || '#f1f5f9',
              padding: '1.5rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderBottom: '1px solid #e2e8f0'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ 
                  color: RESOURCE_CATEGORIES.find(c => c.id === selectedRes.type)?.color || '#475569',
                  display: 'flex',
                  alignItems: 'center'
                }}>
                  {(() => {
                    const Icon = RESOURCE_CATEGORIES.find(c => c.id === selectedRes.type)?.icon || Box;
                    return <Icon size={24} />;
                  })()}
                </div>
                <div>
                  <div style={{ 
                    fontSize: '0.75rem', 
                    fontWeight: 700, 
                    color: RESOURCE_CATEGORIES.find(c => c.id === selectedRes.type)?.text || '#475569',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                  }}>
                    {selectedRes.title}
                  </div>
                  <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 500 }}>
                    Kayıt Kaynağı: {selectedRes.source}
                  </span>
                </div>
              </div>
              <button onClick={() => setSelectedRes(null)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748b' }}>
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div>
                <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#1e293b', marginBottom: '0.5rem', lineHeight: '1.3' }}>
                  {selectedRes.eventName}
                </h3>
                <p style={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', fontWeight: 500 }}>
                  <MapPin size={16} color="var(--color-primary)" /> {selectedRes.university} ({selectedRes.region})
                </p>
              </div>

              {/* Detay Kartı */}
              <div style={{ backgroundColor: '#f8fafc', border: '1px solid #f1f5f9', borderRadius: '12px', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Birim</div>
                  <div style={{ fontWeight: 600, color: '#334155', fontSize: '0.9rem' }}>{selectedRes.unitName || 'Bilinmeyen Birim'}</div>
                </div>

                <div style={{ display: 'flex', gap: '1.5rem' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Tarih & Zaman</div>
                    <div style={{ fontWeight: 600, color: '#334155', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Calendar size={14} color="#64748b" /> {new Date(selectedRes.date).toLocaleDateString('tr-TR', { dateStyle: 'long' })}
                    </div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Miktar</div>
                    <div style={{ fontWeight: 600, color: '#334155', fontSize: '0.9rem' }}>{selectedRes.quantity} Adet</div>
                  </div>
                </div>

                <hr style={{ border: 0, borderTop: '1px solid #e2e8f0', margin: '0.25rem 0' }} />

                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <Info size={14} color="#64748b" /> TALEP DETAYLARI
                  </div>
                  <div style={{ fontSize: '0.875rem', color: '#475569', lineHeight: '1.5', whiteSpace: 'pre-wrap', backgroundColor: '#fff', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    {selectedRes.details}
                  </div>
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div style={{ padding: '1.25rem 2rem', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--status-success)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                ● REZERVASYON ONAYLI
              </span>
              <button className="btn btn-primary" onClick={() => setSelectedRes(null)} style={{ padding: '0.5rem 1.5rem', borderRadius: '20px' }}>
                Kapat
              </button>
            </div>

          </div>

          <style>{`
            @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
            @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
          `}</style>
        </div>
      )}

    </div>
  );
}
