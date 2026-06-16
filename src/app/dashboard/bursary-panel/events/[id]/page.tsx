'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useParams, useRouter } from 'next/navigation';
import { Calendar, MapPin, User, ArrowLeft, XCircle, ArrowRight, Phone, Mail, Clock } from 'lucide-react';

export default function BursaryEventDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  
  const [event, setEvent] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    
    async function fetchEvent() {
      try {
        if (!id) return;
        
        const { data, error } = await supabase
          .from('bursiyer_events')
          .select('*')
          .eq('id', id)
          .single();
          
        if (error) throw error;
        
        if (mounted) {
          setEvent(data);
        }
      } catch (err: any) {
        console.error('Error fetching bursary event:', err);
        if (mounted) setError('Etkinlik bulunamadı veya görüntüleme yetkiniz yok.');
      } finally {
        if (mounted) setIsLoading(false);
      }
    }
    
    fetchEvent();
    return () => { mounted = false; };
  }, [id]);

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <div className="spinner" style={{ width: '40px', height: '40px', border: '4px solid #f3f3f3', borderTop: '4px solid #da1c15', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h2 style={{ color: '#da1c15', marginBottom: '1rem' }}>Hata</h2>
        <p style={{ color: '#555' }}>{error || 'Etkinlik bulunamadı.'}</p>
        <button onClick={() => router.push('/dashboard/bursary-panel/events')} className="btn btn-primary" style={{ marginTop: '1rem' }}>
          Etkinliklere Dön
        </button>
      </div>
    );
  }

  const isPastDeadline = event.requires_registration && event.registration_deadline 
    ? new Date(event.registration_deadline) < new Date() 
    : false;

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', paddingBottom: '3rem' }}>
      {/* Geri Butonu */}
      <button 
        onClick={() => router.push('/dashboard/bursary-panel/events')}
        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', marginBottom: '1.5rem', padding: '0.5rem 0' }}
      >
        <ArrowLeft size={16} /> Etkinliklere Dön
      </button>

      <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: 'var(--radius-xl)', overflow: 'hidden', border: '1px solid var(--border-color)', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
        {/* Hero / Banner Area */}
        <div style={{ position: 'relative', width: '100%', height: '300px', backgroundColor: 'var(--text-main)' }}>
          {event.poster_url ? (
            <img 
              src={event.poster_url} 
              alt={event.display_title} 
              style={{ width: '100%', height: '100%', objectFit: 'contain', backgroundColor: '#000' }}
            />
          ) : (
            <div style={{
              width: '100%', height: '100%',
              background: 'linear-gradient(135deg, #da1c15 0%, #7f1d1d 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', textAlign: 'center'
            }}>
              <h1 style={{ color: '#fff', fontSize: '2.5rem', fontWeight: 800, textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>
                {event.display_title}
              </h1>
            </div>
          )}
          
          <div style={{
            position: 'absolute', top: '1rem', right: '1rem',
            backgroundColor: event.participant_type === 'all' ? '#10b981' : '#6b7280',
            color: '#fff', fontSize: '0.875rem', fontWeight: 600, padding: '0.5rem 1rem', borderRadius: '2rem',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
          }}>
            {event.participant_type === 'all' ? 'Herkese Açık' : 'Üniversiteye Özel'}
          </div>
        </div>

        {/* Content Area */}
        <div style={{ padding: '2rem' }}>
          {event.poster_url && (
            <h1 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '1.5rem' }}>
              {event.display_title}
            </h1>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
            
            {/* Sol Kolon - Detaylar */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* Tarih ve Konum */}
              <div style={{ backgroundColor: 'var(--bg-nested)', padding: '1.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Clock size={18} color="#da1c15" /> Zaman & Mekan
                </h3>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                    <Calendar size={18} color="var(--text-muted)" style={{ marginTop: '0.125rem' }} />
                    <div>
                      <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Tarih</div>
                      <div style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--text-main)' }}>
                        {new Date(event.event_date).toLocaleString('tr-TR', { dateStyle: 'long', timeStyle: 'short' })}
                        {event.event_end_date && ` - ${new Date(event.event_end_date).toLocaleString('tr-TR', { timeStyle: 'short' })}`}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                    <MapPin size={18} color="var(--text-muted)" style={{ marginTop: '0.125rem' }} />
                    <div>
                      <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Konum</div>
                      <div style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--text-main)' }}>{event.city}</div>
                      {event.venue && <div style={{ fontSize: '0.875rem', color: 'var(--text-main)', marginTop: '0.25rem' }}>{event.venue}</div>}
                    </div>
                  </div>
                </div>
              </div>

              {/* İletişim */}
              {event.contact_person && event.contact_person.name && (
                <div style={{ backgroundColor: 'var(--bg-nested)', padding: '1.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <User size={18} color="#da1c15" /> İletişim Kişisi
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-main)' }}>{event.contact_person.name}</div>
                    {event.contact_person.phone && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                        <Phone size={14} /> {event.contact_person.phone}
                      </div>
                    )}
                    {event.contact_person.email && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                        <Mail size={14} /> {event.contact_person.email}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Sağ Kolon - Açıklama ve Konuşmacılar */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* Başvuru Butonu Alanı */}
              {event.requires_registration && (
                <div style={{ backgroundColor: isPastDeadline ? 'var(--bg-danger-light)' : '#f0fdf4', padding: '1.5rem', borderRadius: 'var(--radius-lg)', border: `1px solid ${isPastDeadline ? 'var(--border-danger)' : '#bbf7d0'}`, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                  
                  <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: isPastDeadline ? '#dc2626' : '#16a34a', marginBottom: '0.5rem' }}>
                    {isPastDeadline ? 'Başvurular Kapandı' : 'Başvurular Açık'}
                  </h3>
                  
                  {event.registration_deadline && (
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
                      Son Başvuru: <span style={{ fontWeight: 600 }}>{new Date(event.registration_deadline).toLocaleDateString('tr-TR')}</span>
                    </p>
                  )}

                  {isPastDeadline ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', width: '100%' }}>
                      <button disabled style={{
                        width: '100%', padding: '0.875rem', backgroundColor: 'var(--border-color)', color: '#9ca3af',
                        border: 'none', borderRadius: 'var(--radius-md)', fontSize: '1rem', fontWeight: 600,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', cursor: 'not-allowed'
                      }}>
                        <XCircle size={18} /> Süre Doldu
                      </button>
                      <span style={{ fontSize: '0.875rem', color: '#dc2626', fontWeight: 500 }}>
                        Maalesef, bu etkinlik için son başvuru tarihi geçmiştir.
                      </span>
                    </div>
                  ) : (
                    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      <a 
                        href={event.registration_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        style={{
                          width: '100%', padding: '0.875rem', backgroundColor: '#da1c15', color: '#fff',
                          border: 'none', borderRadius: 'var(--radius-md)', fontSize: '1rem', fontWeight: 600,
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', cursor: 'pointer',
                          textDecoration: 'none', transition: 'background-color 0.2s ease'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#b91c1c'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#da1c15'}
                      >
                        Hemen Başvuru Yap <ArrowRight size={18} />
                      </a>
                      {event.registration_required_warning && (
                        <span style={{ fontSize: '0.75rem', color: '#da1c15', fontWeight: 600 }}>
                          * Bu etkinliğe katılmak için başvuru formunu doldurmanız zorunludur.
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Açıklama */}
              {event.description && (
                <div>
                  <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.75rem' }}>Hakkında</h3>
                  <div style={{ fontSize: '0.9375rem', color: 'var(--text-muted)', lineHeight: '1.7', whiteSpace: 'pre-wrap' }}>
                    {event.description}
                  </div>
                </div>
              )}

              {/* Konuşmacılar */}
              {event.speakers && event.speakers.length > 0 && (
                <div style={{ marginTop: '0.5rem' }}>
                  <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '1rem' }}>Konuşmacılar</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {event.speakers.map((speaker: any, idx: number) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '1rem', backgroundColor: 'var(--bg-main)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid #f3f4f6' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#da1c15', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem', fontWeight: 'bold', flexShrink: 0 }}>
                          {speaker.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-main)' }}>{speaker.name}</div>
                          <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{speaker.title}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
