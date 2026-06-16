'use client';
import { toast } from 'react-hot-toast';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRole } from '@/context/RoleContext';
import { Loader2, Calendar, FileText, CheckCircle, AlertCircle, Link as LinkIcon, RefreshCw } from 'lucide-react';
import Link from 'next/link';

export default function UnitHeadPanel() {
  const { user } = useRole();
  const [events, setEvents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [reportingEvent, setReportingEvent] = useState<any | null>(null);

  // Form State
  const [actualParticipants, setActualParticipants] = useState<number | ''>('');
  const [summaryNotes, setSummaryNotes] = useState('');
  const [driveLink, setDriveLink] = useState('');
  const [socialLink, setSocialLink] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Poster Form State
  const [posterEvent, setPosterEvent] = useState<any | null>(null);
  const [requiredLogos, setRequiredLogos] = useState('');
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [isSubmittingPoster, setIsSubmittingPoster] = useState(false);

  const fetchMyEvents = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('events')
        .select(`
          *,
          poster_requests(*),
          post_event_reports(id),
          event_speakers(speakers(full_name))
        `)
        .eq('created_by', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error('Etkinlikler çekilemedi:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreatePosterRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!posterEvent) return;
    if (!requiredLogos || !specialInstructions) {
      toast.error('Lütfen tüm zorunlu alanları doldurun.');
      return;
    }

    const formData = new FormData(e.target as HTMLFormElement);
    const pName = formData.get('p_eventName') || '';
    const pDate = formData.get('p_eventDate') || '';
    const pTime = formData.get('p_eventTime') || '';
    const pLocation = formData.get('p_location') || '';
    const pUni = formData.get('p_university') || '';
    const pSpeakers = formData.get('p_speakers') || '';

    const manualDetails = `📌 AFİÅ METİN BİLGİLERİ:\nEtkinlik Adı: ${pName}\nTarih: ${pDate} - Saat: ${pTime}\nYer: ${pLocation}\nÜniversite: ${pUni}\nKonuşmacı(lar): ${pSpeakers}\n\n---\n\n`;

    setIsSubmittingPoster(true);
    try {
      const { error } = await supabase
        .from('poster_requests')
        .insert([
          {
            event_id: posterEvent.id,
            status: 'Bekliyor',
            required_logos: requiredLogos,
            special_instructions: manualDetails + specialInstructions,
            designer_notes: 'Birim sorumlusu tarafından talep oluşturuldu.'
          }
        ]);

      if (error) throw error;

      toast.success('Afiş talebi başarıyla oluşturuldu!');
      setPosterEvent(null);
      setRequiredLogos('');
      setSpecialInstructions('');
      fetchMyEvents();
    } catch (err: any) {
      console.error(err);
      toast.error('Tasarım talebi gönderilemedi: ' + (err.message || 'Bilinmeyen Hata'));
    } finally {
      setIsSubmittingPoster(false);
    }
  };

  useEffect(() => {
    fetchMyEvents();
  }, [user]);

  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    // Ensure a reporting event is selected
    if (!reportingEvent?.id) {
      toast.success('Raporlanacak etkinlik seçilmedi.');
      return;
    }
    if (!actualParticipants || !summaryNotes || !driveLink) {
      toast.error('Lütfen tüm zorunlu alanları doldurun.');
      return;
    }

    setIsSubmitting(true);

    try {
      const submitTask = async () => {
        // 1. Insert post-event report
        const { error: reportError } = await supabase
          .from('post_event_reports')
          .insert([
            {
              event_id: reportingEvent.id,
              actual_participants: Number(actualParticipants),
              feedback: summaryNotes,
              drive_link: driveLink,
              social_link: socialLink || null,
            },
          ]);

        if (reportError) throw reportError;

        // 2. Update Event Status to 'Gerçekleşti'
        const { error: updateError } = await supabase
          .from('events')
          .update({ status: 'Gerçekleşti' })
          .eq('id', reportingEvent.id);

        if (updateError) throw updateError;
        return true;
      };

      const timeoutTask = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('İşlem zaman aşımına uğradı (15 saniye). Lütfen internet bağlantınızı kontrol edip tekrar deneyin.')), 15000);
      });

      // Race the submission against a 15-second timeout
      await Promise.race([submitTask(), timeoutTask]);

      toast.success('Rapor başarıyla kaydedildi! Etkinlik "Gerçekleşti" olarak işaretlendi.');
      // Reset form & modal
      setReportingEvent(null);
      setActualParticipants('');
      setSummaryNotes('');
      setDriveLink('');
      setSocialLink('');
      // Refresh events list
      fetchMyEvents();
    } catch (err: any) {
      console.error('Report submission error:', err);
      let errorMessage = 'Bilinmeyen bir hata oluştu.';
      if (err instanceof Error) errorMessage = err.message;
      else if (err?.message) errorMessage = err.message;
      else if (typeof err === 'string') errorMessage = err;
      else errorMessage = JSON.stringify(err);
      
      toast.error('Rapor gönderilemedi: ' + errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><Loader2 className="animate-spin" color="var(--color-primary)" /></div>;

  // Analiz
  const reportNeededEvents = events.filter(e => 
    e.status === 'Onaylandı' && 
    new Date(e.event_date) < new Date() &&
    (!e.post_event_reports || e.post_event_reports.length === 0)
  );

  const revisionNeededEvents = events.filter(e => e.status === 'Yeniden Onay Bekliyor');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* İstatistik / Uyarı Kartları */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
        <div className="card" style={reportNeededEvents.length > 0 ? { backgroundColor: 'var(--bg-danger-light)', border: '1px solid var(--border-danger)' } : { background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '24px' }}>
          <h3 style={reportNeededEvents.length > 0 ? { fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--status-danger)' } : { color: 'rgba(255,255,255,0.80)', fontWeight: 600, fontSize: '0.95rem', marginBottom: '16px' }}>Rapor Bekleyen Etkinlikler</h3>
          {reportNeededEvents.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {reportNeededEvents.map(e => (
                <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--bg-card)', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--border-danger)' }}>
                  <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>{e.event_name}</div>
                  <button className="btn btn-primary" style={{ fontSize: '0.75rem', padding: '0.25rem 0.75rem' }} onClick={() => setReportingEvent(e)}>
                    Rapor Gir
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.08)', borderRadius: '8px', padding: '20px 16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <CheckCircle size={18} color="rgba(34,197,94,0.50)" /> 
              <span style={{ color: 'rgba(255,255,255,0.30)', fontSize: '0.85rem' }}>Raporlanmamış geçmiş etkinlik yok.</span>
            </div>
          )}
        </div>

        <div className="card" style={revisionNeededEvents.length > 0 ? { backgroundColor: 'var(--bg-warning-light)', border: '1px solid var(--border-warning)' } : { background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '24px' }}>
          <h3 style={revisionNeededEvents.length > 0 ? { fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--status-highlight)' } : { color: 'rgba(255,255,255,0.80)', fontWeight: 600, fontSize: '0.95rem', marginBottom: '16px' }}>Revizyon İstenenler</h3>
          {revisionNeededEvents.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {revisionNeededEvents.map(e => (
                <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--bg-card)', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--border-warning)' }}>
                  <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>{e.event_name}</div>
                  <Link href={`/dashboard/events/${e.id}`} className="btn btn-outline" style={{ fontSize: '0.75rem', padding: '0.25rem 0.75rem', borderColor: 'var(--status-highlight)', color: 'var(--status-highlight)', textDecoration: 'none' }}>
                    İncele
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.08)', borderRadius: '8px', padding: '20px 16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <CheckCircle size={18} color="rgba(34,197,94,0.50)" /> 
              <span style={{ color: 'rgba(255,255,255,0.30)', fontSize: '0.85rem' }}>Revizyon bekleyen etkinlik yok.</span>
            </div>
          )}
        </div>
      </div>

      {/* Tüm Etkinliklerim */}
      <div className="card">
        <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem', color: 'var(--text-main)' }}>Son Etkinliklerim</h3>
        
        {events.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            Henüz oluşturduğunuz bir etkinlik yok.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
            {events.map(event => {
              const getStatusClass = (status: string, date: string, reports: any[]) => {
                if (status === 'Yeniden Onay Bekliyor') return 'event-status-pending';
                if (new Date(date) < new Date() && (!reports || reports.length === 0)) return 'event-status-rejected';
                if (status === 'Onaylandı') return 'event-status-approved';
                if (status.includes('Onay Bekliyor')) return 'event-status-pending';
                if (status === 'Gerçekleşti') return 'event-status-completed';
                return 'event-status-rejected';
              };
              const statusClass = getStatusClass(event.status, event.event_date, event.post_event_reports);
              const statusText = new Date(event.event_date) < new Date() && (!event.post_event_reports || event.post_event_reports.length === 0) && event.status !== 'İptal Edildi' ? 'Rapor Bekleniyor' : event.status;

              return (
              <div key={event.id} className="event-card">
                <div className="event-card-top">
                  <h4 className="event-card-title">{event.event_name}</h4>
                  <span className={`event-status-badge ${statusClass}`}>{statusText}</span>
                </div>
                
                <div className="event-card-middle">
                  <span className="event-category-pill">{event.event_type}</span>
                  <div className="event-date-row">
                    <Calendar size={13} /> 
                    <span>{new Date(event.event_date).toLocaleDateString('tr-TR')}</span>
                  </div>
                </div>

                <div className="event-card-bottom">
                  {event.poster_requests && event.poster_requests.length > 0 && event.event_type !== 'Ramazan Etkinliği' ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{fontSize: '0.75rem', color: 'var(--text-muted)'}}>Afiş Durumu:</span>
                      <span className="poster-status-badge">
                        {event.poster_requests[0].status}
                      </span>
                    </div>
                  ) : <div></div>}
                  
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <Link href={`/dashboard/events/${event.id}`} className="event-detail-btn">Detay</Link>
                    {event.status === 'Yeniden Onay Bekliyor' && (
                      <button className="btn btn-outline" style={{ borderColor: '#f59e0b', color: '#92400e', padding: '6px' }}>
                        <RefreshCw size={16} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )})}
          </div>
        )}
      </div>

      {/* Etkinlik Raporu Modalı */}
      {reportingEvent && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ backgroundColor: 'var(--bg-card)', padding: '2rem', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: '500px' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>Etkinlik Raporu</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.875rem' }}>{reportingEvent.event_name} için gerçekleşme raporunu dolduruyorsunuz.</p>
            
            <form onSubmit={handleSubmitReport} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label className="label">Gerçekleşen Katılımcı Sayısı *</label>
                <input 
                  type="number" 
                  className="input" 
                  required 
                  min="0"
                  value={actualParticipants}
                  onChange={e => setActualParticipants(e.target.value === '' ? '' : parseInt(e.target.value))}
                />
              </div>

              <div>
                <label className="label">Fotoğraf Drive Linki *</label>
                <div style={{ position: 'relative' }}>
                  <LinkIcon size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input 
                    type="url" 
                    className="input" 
                    style={{ paddingLeft: '2.5rem' }}
                    placeholder="https://drive.google.com/..."
                    required 
                    value={driveLink}
                    onChange={e => setDriveLink(e.target.value)}
                  />
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Etkinliğe ait fotoğrafların bulunduğu klasör linkini yapıştırın.</div>
              </div>

              <div>
                <label className="label">NSosyal Linki (İsteğe Bağlı)</label>
                <div style={{ position: 'relative' }}>
                  <LinkIcon size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input 
                    type="url" 
                    className="input" 
                    style={{ paddingLeft: '2.5rem' }}
                    placeholder="https://nsosyal.com/..."
                    value={socialLink}
                    onChange={e => setSocialLink(e.target.value)}
                  />
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Etkinlikle ilgili NSosyal&apos;de paylaşılan gönderinin linki.</div>
              </div>

              <div>
                <label className="label">Özet Notlar / Değerlendirme *</label>
                <textarea 
                  className="input" 
                  rows={4} 
                  required 
                  placeholder="Etkinlik nasıl geçti? Çıktılar nelerdir?"
                  value={summaryNotes}
                  onChange={e => setSummaryNotes(e.target.value)}
                ></textarea>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                <button type="button" className="btn btn-outline" onClick={() => setReportingEvent(null)} disabled={isSubmitting}>İptal</button>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />} Raporu Gönder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Afiş Talebi Modalı */}
      {posterEvent && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ backgroundColor: 'var(--bg-card)', padding: '2rem', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: '550px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>Afiş Talebi Oluştur</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.875rem' }}>&quot;{posterEvent.event_name}&quot; etkinliği için afiş tasarım talebi oluşturuyorsunuz.</p>
            
            <form onSubmit={handleCreatePosterRequest} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ backgroundColor: 'var(--bg-main)', padding: '1.5rem', borderRadius: 'var(--radius-md)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.875rem' }}>
                <div style={{ gridColumn: 'span 2' }}>
                  <label className="label">Afişte Yer Alacak Etkinlik Adı</label>
                  <input type="text" name="p_eventName" className="input" required defaultValue={posterEvent.event_name} />
                </div>
                <div>
                  <label className="label">Tarih</label>
                  <input type="text" name="p_eventDate" className="input" required defaultValue={new Date(posterEvent.event_date).toLocaleDateString('tr-TR')} />
                </div>
                <div>
                  <label className="label">Saat</label>
                  <input type="text" name="p_eventTime" className="input" required defaultValue={new Date(posterEvent.event_date).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })} />
                </div>
                <div>
                  <label className="label">Yer / Mekan</label>
                  <input type="text" name="p_location" className="input" required defaultValue={posterEvent.location} />
                </div>
                <div>
                  <label className="label">Üniversite</label>
                  <input type="text" name="p_university" className="input" required defaultValue={posterEvent.university} />
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <label className="label">Konuşmacı(lar)</label>
                  <input type="text" name="p_speakers" className="input" required defaultValue={posterEvent.event_speakers && posterEvent.event_speakers.length > 0 ? posterEvent.event_speakers.map((s: any) => s.speakers?.full_name).join(', ') : ''} />
                </div>
              </div>
              <div>
                <label className="label">Afişte Bulunması Gereken Logolar *</label>
                <textarea 
                  className="input" 
                  rows={3} 
                  required 
                  placeholder="Örn: Cansağlığı Vakfı Logosu, Üniversite Logosu, Kulüp Logosu vb."
                  value={requiredLogos}
                  onChange={e => setRequiredLogos(e.target.value)}
                ></textarea>
              </div>

              <div>
                <label className="label">Dikkat Edilmesi Gerekenler / Özel İstekler *</label>
                <textarea 
                  className="input" 
                  rows={4} 
                  required 
                  placeholder="Afişin konsepti, renk tercihleri, vurgulanmasını istediğiniz sloganlar vb."
                  value={specialInstructions}
                  onChange={e => setSpecialInstructions(e.target.value)}
                ></textarea>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                <button type="button" className="btn btn-outline" onClick={() => setPosterEvent(null)} disabled={isSubmittingPoster}>İptal</button>
                <button type="submit" className="btn btn-primary" disabled={isSubmittingPoster}>
                  {isSubmittingPoster ? <Loader2 size={16} className="animate-spin" /> : 'Talebi Gönder'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

