import React from 'react';
import { Calendar, MapPin, User, ArrowRight, XCircle } from 'lucide-react';
import Link from 'next/link';

interface Speaker {
  name: string;
  title: string;
}

interface ContactPerson {
  name: string;
  phone?: string;
  email?: string;
}

interface BursiyerEventCardProps {
  event: {
    id: string;
    display_title: string;
    participant_type: string;
    event_date: string;
    city: string;
    venue?: string;
    description?: string;
    speakers?: Speaker[];
    poster_url?: string;
    requires_registration: boolean;
    registration_url?: string;
    registration_deadline?: string;
    registration_required_warning: boolean;
    contact_person?: ContactPerson;
  };
}

export default function BursiyerEventCard({ event }: BursiyerEventCardProps) {
  const isPastDeadline = event.requires_registration && event.registration_deadline 
    ? new Date(event.registration_deadline) < new Date() 
    : false;

  return (
    <div className="bursiyer-event-card" style={{
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: 'var(--bg-card)',
      borderRadius: 'var(--radius-lg)',
      overflow: 'hidden',
      border: '1px solid var(--border-color)',
      transition: 'box-shadow 0.2s ease, transform 0.2s ease',
      cursor: 'pointer',
      minWidth: '320px',
      height: '100%'
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.boxShadow = '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)';
      e.currentTarget.style.transform = 'translateY(-2px)';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.boxShadow = 'none';
      e.currentTarget.style.transform = 'translateY(0)';
    }}
    >
      {/* Banner / Poster */}
      <div style={{ position: 'relative', width: '100%', paddingTop: '56.25%', backgroundColor: 'var(--bg-nested)' }}>
        {event.poster_url ? (
          <img 
            src={event.poster_url} 
            alt={event.display_title} 
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <div style={{
            position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
            background: 'linear-gradient(135deg, #da1c15 0%, #7f1d1d 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', textAlign: 'center'
          }}>
            <h3 style={{ color: '#fff', fontSize: '1.25rem', fontWeight: 700, textShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>
              {event.display_title}
            </h3>
          </div>
        )}
        
        {/* Participant Badge */}
        <div style={{
          position: 'absolute', top: '1rem', right: '1rem',
          backgroundColor: event.participant_type === 'all' ? '#10b981' : '#6b7280',
          color: '#fff', fontSize: '0.75rem', fontWeight: 600, padding: '0.25rem 0.75rem', borderRadius: '1rem',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          {event.participant_type === 'all' ? 'Herkese Açık' : 'Üniversiteye Özel'}
        </div>
      </div>

      <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
        {/* Title */}
        <h3 style={{
          fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '1rem',
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden'
        }}>
          {event.display_title}
        </h3>

        {/* Details (Date & Location) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            <Calendar size={16} color="#da1c15" style={{ flexShrink: 0 }} />
            <span>{new Date(event.event_date).toLocaleString('tr-TR', { dateStyle: 'medium', timeStyle: 'short' })}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            <MapPin size={16} color="#da1c15" style={{ flexShrink: 0 }} />
            <span style={{ display: 'inline-block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {event.city}{event.venue ? ` - ${event.venue}` : ''}
            </span>
          </div>
        </div>

        {/* Speakers */}
        {event.speakers && event.speakers.length > 0 && (
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Konuşmacılar</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {event.speakers.slice(0, 3).map((speaker, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', backgroundColor: 'var(--bg-main)', padding: '0.25rem 0.5rem', borderRadius: '0.375rem', border: '1px solid var(--border-inner)' }}>
                  <div style={{ width: '16px', height: '16px', borderRadius: '50%', backgroundColor: '#da1c15', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', fontWeight: 'bold' }}>
                    {speaker.name.charAt(0).toUpperCase()}
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-main)', fontWeight: 500 }}>{speaker.name}</span>
                </div>
              ))}
              {event.speakers.length > 3 && (
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
                  +{event.speakers.length - 3} kişi
                </div>
              )}
            </div>
          </div>
        )}

        {/* Description */}
        {event.description && (
          <p style={{
            fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.5rem', flexGrow: 1,
            display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: '1.5'
          }}>
            {event.description}
          </p>
        )}

        {/* Contact Person */}
        {event.contact_person && event.contact_person.name && (
           <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '1rem', marginTop: 'auto' }}>
             <User size={14} />
             <span>İletişim: {event.contact_person.name} {event.contact_person.phone ? `(${event.contact_person.phone})` : ''}</span>
           </div>
        )}

        {/* Actions */}
        <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid #f0f0f0' }}>
          <Link 
            href={`/dashboard/bursary-panel/events/${event.id}`}
            style={{
              width: '100%', padding: '0.625rem', 
              backgroundColor: event.requires_registration ? (isPastDeadline ? '#f3f4f6' : '#da1c15') : 'transparent', 
              color: event.requires_registration ? (isPastDeadline ? '#9ca3af' : '#fff') : 'var(--text-main)',
              border: event.requires_registration ? 'none' : '1px solid var(--border-color)', 
              borderRadius: 'var(--radius-md)', fontSize: '0.875rem', fontWeight: 600,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', cursor: 'pointer', textDecoration: 'none'
            }}
          >
            {event.requires_registration ? (
              isPastDeadline ? (
                <><XCircle size={16} /> Detaylar (Başvurular Kapandı)</>
              ) : (
                <>Detayları İncele ve Başvur <ArrowRight size={16} /></>
              )
            ) : (
              "Detayları Gör"
            )}
          </Link>
          
          {event.requires_registration && event.registration_deadline && (
            <div style={{ fontSize: '0.65rem', textAlign: 'center', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
              Son Başvuru: {new Date(event.registration_deadline).toLocaleDateString('tr-TR')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
