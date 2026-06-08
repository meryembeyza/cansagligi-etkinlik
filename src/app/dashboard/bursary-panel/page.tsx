'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useRole } from '@/context/RoleContext';
import { supabase } from '@/lib/supabase';
import { Calendar, MapPin, CheckCircle, XCircle, Clock, Info } from 'lucide-react';

interface BursaryEvent {
  id: string;
  title: string;
  description: string;
  event_date: string;
  location: string;
  my_attendance?: {
    id: string;
    rsvp_status: string;
    excuse_text: string | null;
    has_attended: boolean;
  } | null;
}

export default function BursaryPanelPage() {
  const { currentRole, user } = useRole();
  const [events, setEvents] = useState<BursaryEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [activeEvent, setActiveEvent] = useState<BursaryEvent | null>(null);
  const [rsvpMode, setRsvpMode] = useState<'attending' | 'not_attending' | null>(null);
  const [excuseText, setExcuseText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      fetchEvents();
    }
  }, [user]);

  const fetchEvents = async () => {
    setIsLoading(true);
    try {
      // Fetch events
      const { data: eventsData, error: eventsError } = await supabase
        .from('bursary_events')
        .select('*')
        .order('event_date', { ascending: true });

      if (eventsError) throw eventsError;

      // Fetch my attendances
      const { data: attData, error: attError } = await supabase
        .from('bursary_attendances')
        .select('*')
        .eq('user_id', user?.id);

      if (attError) throw attError;

      const attMap = new Map();
      (attData || []).forEach(a => attMap.set(a.event_id, a));

      const merged = (eventsData || []).map(ev => ({
        ...ev,
        my_attendance: attMap.get(ev.id) || null
      }));

      setEvents(merged);
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRSVP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeEvent || !rsvpMode) return;

    if (rsvpMode === 'not_attending' && !excuseText.trim()) {
      alert('Lütfen geçerli bir mazeret giriniz.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (activeEvent.my_attendance) {
        // Update existing
        const { error } = await supabase
          .from('bursary_attendances')
          .update({
            rsvp_status: rsvpMode,
            excuse_text: rsvpMode === 'not_attending' ? excuseText : null
          })
          .eq('id', activeEvent.my_attendance.id);
        if (error) throw error;
      } else {
        // Insert new
        const { error } = await supabase
          .from('bursary_attendances')
          .insert([{
            event_id: activeEvent.id,
            user_id: user?.id,
            rsvp_status: rsvpMode,
            excuse_text: rsvpMode === 'not_attending' ? excuseText : null,
            has_attended: false
          }]);
        if (error) throw error;
      }

      alert('RSVP durumunuz başarıyla kaydedildi.');
      setActiveEvent(null);
      setRsvpMode(null);
      setExcuseText('');
      fetchEvents();
    } catch (err: any) {
      console.error(err);
      alert('Hata: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMarkAttended = async (attendanceId: string) => {
    if (!confirm('Etkinliğe fiilen katıldığınızı onaylıyor musunuz?')) return;
    
    try {
      const { error } = await supabase
        .from('bursary_attendances')
        .update({ has_attended: true })
        .eq('id', attendanceId);

      if (error) throw error;
      alert('Yoklamanız başarıyla alındı!');
      fetchEvents();
    } catch (err: any) {
      alert('Hata: ' + err.message);
    }
  };

  if (currentRole !== 'bursary_student' && currentRole !== 'general_admin') {
    return <div style={{ padding: '2rem' }}>Sadece bursiyerlerin erişimine açıktır.</div>;
  }

  const isEventPastOrToday = (dateString: string) => {
    const evDate = new Date(dateString);
    const today = new Date();
    // Eğer etkinlik tarihi geçmişse veya bugünse (saatlere bakmaksızın gün bazında)
    // Yoklama butonu aktif olsun.
    return evDate <= today || evDate.toDateString() === today.toDateString();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', paddingBottom: '4rem' }}>
      <div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          🎓 Bursiyer Paneli
        </h1>
        <p style={{ color: 'var(--text-muted)' }}>Zorunlu etkinliklerinizi görüntüleyip katılım durumunuzu bildirebilirsiniz.</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {isLoading ? (
          <div style={{ padding: '2rem', textAlign: 'center' }}>Etkinlikler yükleniyor...</div>
        ) : events.length === 0 ? (
          <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <Calendar size={48} style={{ margin: '0 auto 1rem', opacity: 0.2 }} />
            Yaklaşan bir bursiyer etkinliği bulunmuyor.
          </div>
        ) : (
          events.map(ev => {
            const att = ev.my_attendance;
            const canMarkAttended = att && att.rsvp_status === 'attending' && !att.has_attended && isEventPastOrToday(ev.event_date);

            return (
              <div key={ev.id} className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', borderLeft: att?.has_attended ? '4px solid var(--status-success)' : '4px solid var(--color-primary)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>{ev.title}</h3>
                    <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Calendar size={14}/> {new Date(ev.event_date).toLocaleString('tr-TR', { dateStyle: 'long', timeStyle: 'short' })}</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><MapPin size={14}/> {ev.location}</span>
                    </div>
                  </div>
                  <div>
                    {/* Status Badge */}
                    {!att || att.rsvp_status === 'pending' ? (
                      <span className="badge badge-warning"><Clock size={14} style={{ marginRight:'4px' }}/> RSVP Bekleniyor</span>
                    ) : att.rsvp_status === 'attending' ? (
                      <span className="badge badge-success"><CheckCircle size={14} style={{ marginRight:'4px' }}/> Katılacağım</span>
                    ) : (
                      <span className="badge badge-danger"><XCircle size={14} style={{ marginRight:'4px' }}/> Katılamayacağım</span>
                    )}
                  </div>
                </div>
                
                {ev.description && (
                  <div style={{ backgroundColor: '#f9fafb', padding: '1rem', borderRadius: 'var(--radius-md)', fontSize: '0.875rem' }}>
                    <strong>Açıklama:</strong> {ev.description}
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '1rem', borderTop: '1px solid #eaeaea' }}>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                    {att?.has_attended ? (
                      <span style={{ color: 'var(--status-success)', fontWeight: 600 }}>Yoklamanız alındı. Teşekkürler!</span>
                    ) : (
                      <span>Katılım bildirimi (RSVP) yapmanız zorunludur.</span>
                    )}
                  </div>
                  
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {/* Yoklama Butonu */}
                    {canMarkAttended && (
                      <button onClick={() => handleMarkAttended(att.id)} className="btn btn-primary" style={{ backgroundColor: 'var(--status-success)', borderColor: 'var(--status-success)' }}>
                        Etkinliğe Katıldım (Yoklama)
                      </button>
                    )}

                    {/* RSVP Butonu */}
                    {!att?.has_attended && (
                      <button onClick={() => setActiveEvent(ev)} className="btn btn-outline" style={{ color: 'var(--color-primary)', borderColor: 'var(--color-primary-light)' }}>
                        {att && att.rsvp_status !== 'pending' ? 'Durumumu Değiştir' : 'Katılım Durumu Bildir'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* RSVP Modal */}
      {activeEvent && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: '500px' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Katılım Durumu (RSVP)</h2>
              <button onClick={() => {setActiveEvent(null); setRsvpMode(null); setExcuseText('');}} className="btn btn-outline" style={{ padding: '0.25rem 0.5rem' }}>X</button>
            </div>

            <p style={{ marginBottom: '1.5rem', color: 'var(--text-muted)' }}>
              <strong>{activeEvent.title}</strong> etkinliğine katılım durumunuzu aşağıdan belirtiniz.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
              <button 
                onClick={() => setRsvpMode('attending')}
                style={{ 
                  padding: '1rem', borderRadius: 'var(--radius-md)', border: rsvpMode === 'attending' ? '2px solid var(--status-success)' : '1px solid #eaeaea', 
                  backgroundColor: rsvpMode === 'attending' ? '#ecfdf5' : 'white', cursor: 'pointer', textAlign: 'center', fontWeight: 600, color: rsvpMode === 'attending' ? 'var(--status-success)' : 'inherit'
                }}
              >
                ✅ Katılacağım
              </button>
              <button 
                onClick={() => setRsvpMode('not_attending')}
                style={{ 
                  padding: '1rem', borderRadius: 'var(--radius-md)', border: rsvpMode === 'not_attending' ? '2px solid var(--status-danger)' : '1px solid #eaeaea', 
                  backgroundColor: rsvpMode === 'not_attending' ? '#fef2f2' : 'white', cursor: 'pointer', textAlign: 'center', fontWeight: 600, color: rsvpMode === 'not_attending' ? 'var(--status-danger)' : 'inherit'
                }}
              >
                ❌ Katılamayacağım
              </button>
            </div>

            {rsvpMode === 'not_attending' && (
              <div style={{ marginBottom: '1.5rem' }}>
                <label className="label">Mazeretiniz (Zorunlu) *</label>
                <textarea 
                  className="input" 
                  rows={3} 
                  required
                  placeholder="Lütfen etkinliğe neden katılamayacağınızı detaylıca açıklayınız."
                  value={excuseText}
                  onChange={e => setExcuseText(e.target.value)}
                />
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button onClick={() => {setActiveEvent(null); setRsvpMode(null); setExcuseText('');}} className="btn btn-outline">İptal</button>
              <button onClick={handleRSVP} disabled={isSubmitting || !rsvpMode} className="btn btn-primary">
                {isSubmitting ? 'Kaydediliyor...' : 'Kaydet'}
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
