'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import BursiyerEventCard from '@/components/dashboard/bursary-panel/BursiyerEventCard';
import { Filter, Calendar, MapPin, Loader2, Users } from 'lucide-react';

export default function BursiyerEventsPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Filters
  const [cityFilter, setCityFilter] = useState<string>('');
  const [participantFilter, setParticipantFilter] = useState<string>('Tümü'); // Tümü, Herkese Açık, Üniversiteye Özel
  const [statusFilter, setStatusFilter] = useState<string>('Tümü'); // Tümü, Açık, Kapandı
  
  const [availableCities, setAvailableCities] = useState<string[]>([]);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('bursiyer_events')
        .select('*')
        .eq('is_published', true)
        .order('event_date', { ascending: true });

      if (error) throw error;
      
      setEvents(data || []);
      
      // Extract unique cities
      const cities = Array.from(new Set(data?.map(e => e.city))).filter(Boolean) as string[];
      setAvailableCities(cities.sort());
      
    } catch (error) {
      console.error("Etkinlikler yüklenirken hata:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredEvents = events.filter(event => {
    // City Filter
    if (cityFilter && event.city !== cityFilter) return false;
    
    // Participant Type Filter
    if (participantFilter === 'Herkese Açık' && event.participant_type !== 'all') return false;
    if (participantFilter === 'Üniversiteye Özel' && event.participant_type !== 'university_only') return false;
    
    // Registration Status Filter
    if (statusFilter !== 'Tümü') {
      const isPastDeadline = event.requires_registration && event.registration_deadline 
        ? new Date(event.registration_deadline) < new Date() 
        : false;
        
      if (statusFilter === 'Açık' && (!event.requires_registration || isPastDeadline)) return false;
      if (statusFilter === 'Kapandı' && (!event.requires_registration || !isPastDeadline)) return false;
    }
    
    return true;
  });

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1rem' }}>
      
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, color: '#da1c15', marginBottom: '0.5rem' }}>Etkinlikler</h1>
        <p style={{ color: 'var(--text-muted)' }}>Sizin için özel olarak yayınlanan ve herkese açık etkinlikleri keşfedin.</p>
      </div>

      {/* Horizontal Filter Bar */}
      <div style={{ 
        position: 'sticky', top: '1rem', zIndex: 100, 
        backgroundColor: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', 
        padding: '1rem', marginBottom: '2rem',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        border: '1px solid var(--border-color)',
        display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-main)', fontWeight: 600, paddingRight: '1rem', borderRight: '1px solid var(--border-color)' }}>
          <Filter size={18} /> Filtreler
        </div>
        
        {/* City Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <MapPin size={16} color="var(--text-muted)" />
          <select 
            className="input" 
            style={{ padding: '0.4rem 2rem 0.4rem 0.75rem', fontSize: '0.875rem', minWidth: '150px' }}
            value={cityFilter} onChange={(e) => setCityFilter(e.target.value)}
          >
            <option value="">Tüm Şehirler</option>
            {availableCities.map(city => (
              <option key={city} value={city}>{city}</option>
            ))}
          </select>
        </div>

        {/* Participant Type Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderLeft: '1px solid var(--border-color)', paddingLeft: '1rem' }}>
          <Users size={16} color="var(--text-muted)" />
          <div style={{ display: 'flex', backgroundColor: '#f3f4f6', borderRadius: 'var(--radius-md)', padding: '0.25rem' }}>
            {['Tümü', 'Herkese Açık', 'Üniversiteye Özel'].map(type => (
              <button
                key={type}
                onClick={() => setParticipantFilter(type)}
                style={{
                  padding: '0.25rem 0.75rem', fontSize: '0.75rem', fontWeight: 600,
                  backgroundColor: participantFilter === type ? '#fff' : 'transparent',
                  color: participantFilter === type ? '#da1c15' : 'var(--text-muted)',
                  border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                  boxShadow: participantFilter === type ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  transition: 'all 0.2s'
                }}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* Status Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderLeft: '1px solid var(--border-color)', paddingLeft: '1rem' }}>
          <Calendar size={16} color="var(--text-muted)" />
          <div style={{ display: 'flex', backgroundColor: '#f3f4f6', borderRadius: 'var(--radius-md)', padding: '0.25rem' }}>
            {['Tümü', 'Açık', 'Kapandı'].map(type => (
              <button
                key={type}
                onClick={() => setStatusFilter(type)}
                style={{
                  padding: '0.25rem 0.75rem', fontSize: '0.75rem', fontWeight: 600,
                  backgroundColor: statusFilter === type ? '#fff' : 'transparent',
                  color: statusFilter === type ? '#da1c15' : 'var(--text-muted)',
                  border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                  boxShadow: statusFilter === type ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  transition: 'all 0.2s'
                }}
              >
                {type === 'Açık' ? 'Başvuru Açık' : type === 'Kapandı' ? 'Başvurular Kapandı' : 'Tümü'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grid / Empty State / Loading */}
      {isLoading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} style={{ backgroundColor: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)', overflow: 'hidden', minHeight: '400px', display: 'flex', flexDirection: 'column' }}>
              <div style={{ width: '100%', paddingTop: '56.25%', backgroundColor: '#f3f4f6', position: 'relative', overflow: 'hidden' }}>
                <div className="skeleton-shimmer" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}></div>
              </div>
              <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', flexGrow: 1 }}>
                <div className="skeleton-shimmer" style={{ height: '24px', width: '80%', borderRadius: '4px' }}></div>
                <div className="skeleton-shimmer" style={{ height: '24px', width: '60%', borderRadius: '4px' }}></div>
                <div style={{ marginTop: 'auto' }}>
                  <div className="skeleton-shimmer" style={{ height: '40px', width: '100%', borderRadius: '8px' }}></div>
                </div>
              </div>
            </div>
          ))}
          <style dangerouslySetInnerHTML={{__html: `
            @keyframes shimmer {
              0% { background-position: -1000px 0; }
              100% { background-position: 1000px 0; }
            }
            .skeleton-shimmer {
              background: #f6f7f8;
              background-image: linear-gradient(to right, #f6f7f8 0%, #edeef1 20%, #f6f7f8 40%, #f6f7f8 100%);
              background-repeat: no-repeat;
              background-size: 1000px 100%; 
              animation: shimmer 2s infinite linear forwards;
            }
          `}} />
        </div>
      ) : filteredEvents.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem 2rem', backgroundColor: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '1px dashed #cbd5e1' }}>
          <div style={{ width: '120px', height: '120px', margin: '0 auto 1.5rem auto', backgroundColor: '#fcdbd9', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Calendar size={48} color="#da1c15" />
          </div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.5rem' }}>Yakında Etkinlik Eklenecek</h3>
          <p style={{ color: 'var(--text-muted)', maxWidth: '400px', margin: '0 auto' }}>
            Şu anda seçili filtrelere uygun bir etkinlik bulunamadı. Lütfen daha sonra tekrar kontrol edin.
          </p>
          {(cityFilter || participantFilter !== 'Tümü' || statusFilter !== 'Tümü') && (
            <button 
              onClick={() => { setCityFilter(''); setParticipantFilter('Tümü'); setStatusFilter('Tümü'); }}
              className="btn btn-outline" style={{ marginTop: '1.5rem', borderColor: '#da1c15', color: '#da1c15' }}
            >
              Filtreleri Temizle
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
          {filteredEvents.map(event => (
            <BursiyerEventCard key={event.id} event={event} />
          ))}
        </div>
      )}

    </div>
  );
}
