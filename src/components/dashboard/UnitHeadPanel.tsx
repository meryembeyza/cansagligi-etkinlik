'use client';

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
      alert('Lütfen tüm zorunlu alanları doldurun.');
      return;
    }

    const formData = new FormData(e.target as HTMLFormElement);
    const pName = formData.get('p_eventName') || '';
    const pDate = formData.get('p_eventDate') || '';
    const pTime = formData.get('p_eventTime') || '';
    const pLocation = formData.get('p_location') || '';
    const pUni = formData.get('p_university') || '';
    const pSpeakers = formData.get('p_speakers') || '';

    const manualDetails = `📌 AFİŞ METİN BİLGİLERİ:\nEtkinlik Adı: ${pName}\nTarih: ${pDate} - Saat: ${pTime}\nYer: ${pLocation}\nÜniversite: ${pUni}\nKonuşmacı(lar): ${pSpeakers}\n\n---\n\n`;

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

      alert('Afiş talebi başarıyla oluşturuldu!');
      setPosterEvent(null);
      setRequiredLogos('');
      setSpecialInstructions('');
      fetchMyEvents();
    } catch (err: any) {
      console.error(err);
      alert('Tasarım talebi gönderilemedi: ' + (err.message || 'Bilinmeyen Hata'));
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
      alert('Raporlanacak etkinlik seçilmedi.');
      return;
    }
    if (!actualParticipants || !summaryNotes || !driveLink) {
      alert('Lütfen tüm zorunlu alanları doldurun.');
      return;
    }

    setIsSubmitting(true);

    try {
      // Promise with timeout to prevent hanging
      const insertPromise = supabase
        .from('post_event_reports')
        .insert([
          {
            event_id: reportingEvent.id,
            actual_participants: Number(actualParticipants),
            feedback: summaryNotes,
            drive_link: driveLink,
            social_link: socialLink || null,
          },
        ])
        .select()
        .single();

      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('İşlem zaman aşımına uğradı (10 saniye). İnternet bağlantınızı kontrol edin.')), 10000)
      );

      const { data: reportData, error: reportError } = await Promise.race([insertPromise, timeoutPromise]) as any;

      if (reportError) throw reportError;
      console.log('Report inserted:', reportData);

      // 2. Update Event Status to 'Gerçekleşti'
      const { error: updateError } = await supabase
        .from('events')
        .update({ status: 'Gerçekleşti' })
        .eq('id', reportingEvent.id);

      if (updateError) throw updateError;

      alert('Rapor başarıyla kaydedildi! Etkinlik "Gerçekleşti" olarak işaretlendi.');
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
      
      alert('Rapor gönderilemedi: ' + errorMessage);
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
        <div className="card" style={{ backgroundColor: reportNeededEvents.length > 0 ? '#fff1f2' : '#fff', border: reportNeededEvents.length > 0 ? '1px solid #fda4af' : '1px solid #eaeaea' }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem', color: reportNeededEvents.length > 0 ? '#be123c' : 'var(--text-main)' }}>Rapor Bekleyen Etkinlikler</h3>
          {reportNeededEvents.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {reportNeededEvents.map(e => (
                <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: '0.75rem', borderRadius: '4px', border: '1px solid #fecdd3' }}>
                  <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>{e.event_name}</div>
                  <button className="btn btn-primary" style={{ fontSize: '0.75rem', padding: '0.25rem 0.75rem' }} onClick={() => setReportingEvent(e)}>
                    Rapor Gir
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: 'var(--text-muted)' }}><CheckCircle size={16} style={{ display: 'inline', marginBottom: '-3px' }}/> Raporlanmamış geçmiş etkinlik yok.</p>
          )}
        </div>

        <div className="card" style={{ backgroundColor: revisionNeededEvents.length > 0 ? '#fffbeb' : '#fff', border: revisionNeededEvents.length > 0 ? '1px solid #fde68a' : '1px solid #eaeaea' }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem', color: revisionNeededEvents.length > 0 ? '#92400e' : 'var(--text-main)' }}>Revizyon İstenenler</h3>
          {revisionNeededEvents.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {revisionNeededEvents.map(e => (
                <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: '0.75rem', borderRadius: '4px', border: '1px solid #fde68a' }}>
                  <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>{e.event_name}</div>
                  <Link href={`/dashboard/events/${e.id}`} className="btn btn-outline" style={{ fontSize: '0.75rem', padding: '0.25rem 0.75rem', borderColor: '#f59e0b', color: '#92400e', textDecoration: 'none' }}>
                    İncele
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: 'var(--text-muted)' }}><CheckCircle size={16} style={{ display: 'inline', marginBottom: '-3px' }}/> Revizyon bekleyen etkinlik yok.</p>
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
            {events.map(event => (
              <div key={event.id} style={{ border: '1px solid #eaeaea', borderRadius: 'var(--radius-md)', padding: '2rem 1.25rem 1.25rem 1.25rem', backgroundColor: '#fff', position: 'relative', overflow: 'hidden' }}>
                  {/* Dinamik Durum Bandı */}
                  <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0, 
                    padding: '0.25rem 0.5rem', textAlign: 'center', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase',
                    backgroundColor: 
                      event.status === 'Yeniden Onay Bekliyor' ? '#fde68a' :
                      new Date(event.event_date) < new Date() && (!event.post_event_reports || event.post_event_reports.length === 0) ? '#fecaca' :
                      event.status === 'Onaylandı' ? '#bbf7d0' :
                      event.status.includes('Onay Bekliyor') ? '#e5e7eb' :
                      event.status === 'Gerçekleşti' ? '#bfdbfe' : '#fecaca',
                    color: 
                      event.status === 'Yeniden Onay Bekliyor' ? '#92400e' :
                      new Date(event.event_date) < new Date() && (!event.post_event_reports || event.post_event_reports.length === 0) ? '#991b1b' :
                      event.status === 'Onaylandı' ? '#166534' :
                      event.status.includes('Onay Bekliyor') ? '#4b5563' :
                      event.status === 'Gerçekleşti' ? '#1e3a8a' : '#991b1b'
                  }}>
                    {new Date(event.event_date) < new Date() && (!event.post_event_reports || event.post_event_reports.length === 0) && event.status !== 'İptal Edildi' 
                      ? 'Rapor Bekleniyor' 
                      : event.status}
                  </div>
                
                <h4 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.25rem', paddingRight: '5rem' }}>{event.event_name}</h4>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>{event.event_type}</div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Calendar size={14} /> {new Date(event.event_date).toLocaleDateString('tr-TR')}</div>
                  
                  {event.poster_requests && event.poster_requests.length > 0 && event.event_type !== 'Ramazan Etkinliği' ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                      <span>Afiş Durumu:</span>
                      <span className={`badge ${
                        event.poster_requests[0].status === 'Bekliyor' ? 'badge-pending' :
                        event.poster_requests[0].status === 'Hazırlanıyor' ? 'badge-warning' :
                        event.poster_requests[0].status === 'Revizyon Gerekli' ? 'badge-danger' :
                        'badge-success'
                      }`} style={{ fontSize: '0.75rem', padding: '0.15rem 0.5rem' }}>
                        {event.poster_requests[0].status}
                      </span>
                    </div>
                  ) : null}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <Link href={`/dashboard/events/${event.id}`} className="btn btn-outline" style={{ flex: 1, textAlign: 'center', textDecoration: 'none' }}>Detay</Link>
                    {event.status === 'Yeniden Onay Bekliyor' && (
                      <button className="btn btn-outline" style={{ borderColor: '#f59e0b', color: '#92400e' }}>
                        <RefreshCw size={16} />
                      </button>
                    )}
                  </div>
                  
                  {(!event.poster_requests || event.poster_requests.length === 0) && event.status !== 'Taslak' && event.event_type !== 'Ramazan Etkinliği' && (
                    <button 
                      onClick={() => setPosterEvent(event)}
                      className="btn btn-primary"
                      style={{ fontSize: '0.75rem', padding: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem', width: '100%' }}
                    >
                      🎨 Afiş Talebi Oluştur
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Etkinlik Raporu Modalı */}
      {reportingEvent && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: '500px' }}>
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
          <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: '550px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>Afiş Talebi Oluştur</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.875rem' }}>&quot;{posterEvent.event_name}&quot; etkinliği için afiş tasarım talebi oluşturuyorsunuz.</p>
            
            <form onSubmit={handleCreatePosterRequest} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ backgroundColor: '#f9fafb', padding: '1.5rem', borderRadius: 'var(--radius-md)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.875rem' }}>
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
