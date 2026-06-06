'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRole } from '@/context/RoleContext';
import { Search, MapPin, Calendar, Link as LinkIcon, Users, Mail, Phone, Loader2 } from 'lucide-react';

export default function SpeakersArchivePage() {
  const { currentRole } = useRole();
  const [speakersList, setSpeakersList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchSpeakersFromEvents();
  }, []);

  const fetchSpeakersFromEvents = async () => {
    setIsLoading(true);
    try {
      // Sadece 'Onaylandı' durumundaki konuşmacıları ve 'Onaylandı' / 'Gerçekleşti' durumundaki etkinlikleri getir
      const { data, error } = await supabase
        .from('event_speakers')
        .select(`
          *,
          speakers (*),
          events!inner (id, event_name, event_date, university, region, status)
        `)
        .eq('status', 'Onaylandı')
        .in('events.status', ['Onaylandı', 'Gerçekleşti']);

      if (error) throw error;

      // Map to flat structure for UI
      const formattedSpeakers = data?.map((item: any) => ({
        id: item.speakers.id,
        name: item.speakers.full_name,
        title: item.speakers.title,
        about: item.speakers.about,
        socialLinks: item.speakers.social_links || [item.speakers.linkedin_url].filter(Boolean),
        eventId: item.events.id,
        eventName: item.events.event_name,
        eventDate: item.events.event_date,
        university: item.events.university,
        region: item.events.region
      })) || [];

      // Sort by event date descending
      formattedSpeakers.sort((a, b) => new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime());
      
      setSpeakersList(formattedSpeakers);
    } catch (err) {
      console.error('Konuşmacılar çekilirken hata:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredSpeakers = speakersList.filter(sp => {
    const term = searchQuery.toLowerCase();
    return (sp.name?.toLowerCase().includes(term) || 
            sp.title?.toLowerCase().includes(term) || 
            sp.university?.toLowerCase().includes(term));
  });

  if (currentRole === 'design_team' || currentRole === 'resource_manager') {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Yetkisiz Erişim</div>;
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '4rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Users size={24} color="var(--color-primary)" /> Konuşmacı Arşivi
        </h1>
        <p style={{ color: 'var(--text-muted)' }}>Önceki etkinliklerde onaylanmış tüm konuşmacıların profil bilgilerini inceleyin.</p>
      </div>

      <div className="card" style={{ marginBottom: '2rem', backgroundColor: '#f9fafb' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: 'white', padding: '0.75rem 1rem', border: '1px solid #eaeaea', borderRadius: 'var(--radius-md)' }}>
          <Search size={20} color="var(--text-muted)" />
          <input 
            type="text" 
            placeholder="Konuşmacı adı, unvan veya üniversite ara..." 
            style={{ border: 'none', outline: 'none', width: '100%', fontSize: '0.875rem' }}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {isLoading ? (
        <div style={{ padding: '3rem', display: 'flex', justifyContent: 'center' }}>
          <Loader2 className="animate-spin" size={32} color="var(--color-primary)" />
        </div>
      ) : filteredSpeakers.length === 0 ? (
        <div style={{ padding: '3rem', textAlign: 'center', backgroundColor: '#f9fafb', borderRadius: 'var(--radius-md)', color: 'var(--text-muted)' }}>
          Kriterlere uygun onaylanmış konuşmacı bulunamadı.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1.5rem' }}>
          {filteredSpeakers.map((sp, idx) => (
            <div key={`${sp.id}-${sp.eventId}-${idx}`} style={{ backgroundColor: 'white', border: '1px solid #eaeaea', borderRadius: 'var(--radius-lg)', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
              
              {/* Header */}
              <div style={{ padding: '1.5rem', borderBottom: '1px solid #eaeaea', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: 'var(--color-primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-primary)', fontSize: '1.5rem', fontWeight: 700, flexShrink: 0 }}>
                  {sp.name ? sp.name.charAt(0).toUpperCase() : 'S'}
                </div>
                <div>
                  <h3 style={{ fontSize: '1.125rem', fontWeight: 700, margin: '0 0 0.25rem 0' }}>{sp.name || 'İsimsiz Konuşmacı'}</h3>
                  <p style={{ fontSize: '0.875rem', color: 'var(--color-primary)', fontWeight: 500, margin: 0 }}>{sp.title || 'Belirtilmedi'}</p>
                </div>
              </div>

              {/* Body */}
              <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                
                {sp.about && (
                  <div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Hakkında</div>
                    <p style={{ fontSize: '0.875rem', lineHeight: 1.5, margin: 0, color: 'var(--text-main)' }}>{sp.about}</p>
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
                  {sp.socialLinks && sp.socialLinks.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Sosyal Medya / İletişim</div>
                      {sp.socialLinks.map((link: string, i: number) => (
                        <a key={i} href={link.startsWith('http') ? link : `https://${link}`} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--color-primary)', textDecoration: 'none' }}>
                          <LinkIcon size={14} /> Bağlantı {i+1}
                        </a>
                      ))}
                    </div>
                  )}
                </div>

                <div style={{ backgroundColor: '#f9fafb', padding: '1rem', borderRadius: 'var(--radius-md)', marginTop: '0.5rem' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Katıldığı Etkinlik</div>
                  <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{sp.eventName}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Calendar size={12} /> {new Date(sp.eventDate).toLocaleDateString('tr-TR')}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><MapPin size={12} /> {sp.university}</span>
                  </div>
                </div>

              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
