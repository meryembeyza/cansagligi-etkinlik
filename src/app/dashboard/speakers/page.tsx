'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
const supabase = createClient();
import { useRole } from '@/context/RoleContext';
import { Search, MapPin, Calendar, Link as LinkIcon, Users, Mail, Phone, Loader2, Filter, ChevronDown, Check } from 'lucide-react';
import universitiesData from '@/data/universities.json';
import expertiseData from '@/data/expertiseFields.json';

export default function SpeakersArchivePage() {
  const { currentRole } = useRole();
  const [speakersList, setSpeakersList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedExpertise, setSelectedExpertise] = useState('');
  const [availableCities, setAvailableCities] = useState<string[]>([]);
  const [showExpertiseDropdown, setShowExpertiseDropdown] = useState(false);

  // Flatten expertise options for easy listing
  const allExpertiseOptions = Object.values(expertiseData).flat();

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
      const formattedSpeakers = data?.map((item: Record<string, unknown>) => ({
        id: item.speakers.id,
        name: item.speakers.full_name,
        title: item.speakers.title,
        about: item.speakers.about,
        socialLinks: item.speakers.social_links || [item.speakers.linkedin_url].filter(Boolean),
        eventId: item.events.id,
        eventName: item.events.event_name,
        eventDate: item.events.event_date,
        university: item.events.university,
        region: item.events.region,
        city: (universitiesData as any)[item.events.university] || 'Belirtilmedi',
        expertiseFields: item.speakers.expertise_fields || [],
        otherExpertise: item.speakers.other_expertise || ''
      })) || [];

      // Sort by event date descending
      formattedSpeakers.sort((a, b) => new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime());
      
      setSpeakersList(formattedSpeakers);

      // Extract unique cities from the fetched speakers
      const cities = new Set<string>();
      formattedSpeakers.forEach(s => {
        if (s.city && s.city !== 'Belirtilmedi') {
          cities.add(s.city);
        }
      });
      setAvailableCities(Array.from(cities).sort());
    } catch (err) {
      console.error('Konuşmacılar çekilirken hata:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredSpeakers = speakersList.filter(sp => {
    // Search Query Match
    const term = searchQuery.toLowerCase();
    const matchesSearch = (sp.name?.toLowerCase().includes(term) || 
                           sp.title?.toLowerCase().includes(term) || 
                           sp.university?.toLowerCase().includes(term));

    // City Match
    const matchesCity = selectedCity ? sp.city === selectedCity : true;

    // Expertise Match
    const matchesExpertise = selectedExpertise 
      ? sp.expertiseFields.includes(selectedExpertise) || (selectedExpertise === 'Diğer' && sp.expertiseFields.includes('Diğer'))
      : true;

    return matchesSearch && matchesCity && matchesExpertise;
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

      <div className="card" style={{ marginBottom: '2rem', backgroundColor: 'var(--bg-main)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '1rem', alignItems: 'center' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: 'var(--bg-card)', padding: '0.75rem 1rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', flex: 1 }}>
            <Search size={20} color="var(--text-muted)" />
            <input 
              type="text" 
              placeholder="Konuşmacı adı, unvan veya üniversite ara..." 
              style={{ border: 'none', outline: 'none', width: '100%', fontSize: '0.875rem' }}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Filter size={18} color="var(--text-muted)" />
            <select 
              className="input" 
              style={{ padding: '0.75rem', width: '200px', backgroundColor: 'var(--bg-card)' }}
              value={selectedCity}
              onChange={e => setSelectedCity(e.target.value)}
            >
              <option value="">Tüm Şehirler</option>
              {availableCities.map(city => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
          </div>

          <div style={{ position: 'relative' }}>
            <div 
              onClick={() => setShowExpertiseDropdown(!showExpertiseDropdown)}
              style={{ 
                backgroundColor: 'var(--bg-card)', 
                border: '1px solid var(--border-color)', 
                borderRadius: 'var(--radius-md)', 
                padding: '0.75rem 1rem',
                width: '240px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                cursor: 'pointer',
                fontSize: '0.875rem'
              }}
            >
              <span style={{ color: selectedExpertise ? 'var(--text-main)' : 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {selectedExpertise || 'Tüm Uzmanlık Alanları'}
              </span>
              <ChevronDown size={16} color="var(--text-muted)" />
            </div>

            {showExpertiseDropdown && (
              <div style={{ 
                position: 'absolute', 
                top: '100%', 
                right: 0, 
                marginTop: '0.25rem',
                backgroundColor: 'var(--bg-card)', 
                border: '1px solid var(--border-color)', 
                borderRadius: 'var(--radius-md)', 
                boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                zIndex: 50,
                width: '280px',
                maxHeight: '400px',
                overflowY: 'auto',
                padding: '0.5rem'
              }}>
                <div 
                  onClick={() => { setSelectedExpertise(''); setShowExpertiseDropdown(false); }}
                  style={{ padding: '0.5rem 0.75rem', cursor: 'pointer', borderRadius: '4px', fontSize: '0.875rem', fontWeight: !selectedExpertise ? 700 : 400, color: !selectedExpertise ? 'var(--color-primary)' : 'var(--text-main)' }}
                >
                  Tüm Uzmanlık Alanları
                </div>
                
                {Object.entries(expertiseData).map(([category, subs]) => (
                  <div key={category} style={{ marginTop: '0.5rem' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', padding: '0.25rem 0.75rem', backgroundColor: 'var(--bg-main)' }}>
                      {category}
                    </div>
                    {subs.map(sub => (
                      <div 
                        key={sub}
                        onClick={() => { setSelectedExpertise(sub); setShowExpertiseDropdown(false); }}
                        style={{ 
                          padding: '0.5rem 0.75rem', 
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          fontSize: '0.875rem',
                          backgroundColor: selectedExpertise === sub ? 'var(--color-primary-light)' : 'transparent',
                          color: selectedExpertise === sub ? 'var(--color-primary)' : 'var(--text-main)',
                          borderRadius: '4px'
                        }}
                      >
                        {sub}
                        {selectedExpertise === sub && <Check size={16} />}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>

      {isLoading ? (
        <div style={{ padding: '3rem', display: 'flex', justifyContent: 'center' }}>
          <Loader2 className="animate-spin" size={32} color="var(--color-primary)" />
        </div>
      ) : filteredSpeakers.length === 0 ? (
        <div style={{ padding: '3rem', textAlign: 'center', backgroundColor: 'var(--bg-main)', borderRadius: 'var(--radius-md)', color: 'var(--text-muted)' }}>
          Kriterlere uygun onaylanmış konuşmacı bulunamadı.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1.5rem' }}>
          {filteredSpeakers.map((sp, idx) => (
            <div key={`${sp.id}-${sp.eventId}-${idx}`} style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
              
              {/* Header */}
              <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
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

                {sp.expertiseFields && sp.expertiseFields.length > 0 && (
                  <div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Uzmanlık Alanları</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                      {sp.expertiseFields.map((field: string, i: number) => (
                        <span key={i} style={{ backgroundColor: '#f3f4f6', color: 'var(--text-muted)', padding: '0.25rem 0.6rem', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 500 }}>
                          {field === 'Diğer' && sp.otherExpertise ? `Diğer (${sp.otherExpertise})` : field}
                        </span>
                      ))}
                    </div>
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

                <div style={{ backgroundColor: 'var(--bg-main)', padding: '1rem', borderRadius: 'var(--radius-md)', marginTop: '0.5rem' }}>
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


