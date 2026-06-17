'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
const supabase = createClient();
import EmptyState from '@/components/ui/EmptyState';
import LoadingState from '@/components/ui/LoadingState';
import { useRole } from '@/context/RoleContext';
import Link from 'next/link';
import { Plus, Calendar, MapPin, Clock } from 'lucide-react';
import { AppEvent } from '@/types';

export default function EventsPage() {
  const { user, currentRole } = useRole();
  const [events, setEvents] = useState<AppEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const isGlobalRole = ['general_admin', 'region_manager', 'design_team', 'resource_manager', 'rep_region_manager', 'rep_coordinator'].includes(currentRole as string);
  const pageTitle = isGlobalRole ? "Tüm Etkinlikler" : "Etkinliklerim";
  const pageDesc = isGlobalRole ? "Sistemdeki tüm etkinliklerin listesi" : "Oluşturduğunuz ve dahil olduğunuz etkinliklerin listesi";

  useEffect(() => {
    if (!user) return;

    const fetchEvents = async () => {
      try {
        const { data, error } = await supabase
          .from('events')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;
        setEvents(data || []);
      } catch (error) {
        console.error('Etkinlikler yüklenirken hata:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchEvents();
  }, [user]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Taslak': return <span className="badge" style={{ backgroundColor: '#f3f4f6', color: 'var(--text-muted)' }}>Taslak</span>;
      case 'Onay Bekliyor': return <span className="badge badge-warning">Onay Bekliyor</span>;
      case 'Onaylandı': return <span className="badge badge-success">Onaylandı</span>;
      case 'Reddedildi': return <span className="badge badge-danger">Reddedildi</span>;
      default: return <span className="badge">{status}</span>;
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Tarih belirtilmedi';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(date);
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-main)' }}>{pageTitle}</h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}>{pageDesc}</p>
        </div>
        <Link href="/dashboard/events/new" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Plus size={18} /> Yeni Etkinlik
        </Link>
      </div>

      {isLoading ? (
        <LoadingState message="Etkinlikler yükleniyor..." />
      ) : events.length === 0 ? (
        <EmptyState 
          icon={Calendar} 
          title="Henüz etkinlik yok" 
          description="Burada oluşturduğunuz etkinlikler listelenecek." 
          actionText="İlk Etkinliğinizi Oluşturun"
          actionHref="/dashboard/events/new"
        />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1.5rem' }}>
          {events.map((event) => (
            <div key={event.id} className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', height: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{event.event_type}</span>
                  <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginTop: '0.25rem', color: 'var(--text-main)' }}>{event.event_name}</h3>
                </div>
                {getStatusBadge(event.status)}
              </div>
              
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                  <Calendar size={16} />
                  <span>{formatDate(event.event_date)}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                  <MapPin size={16} />
                  <span>{event.location || 'Konum belirtilmedi'}</span>
                </div>
              </div>

              <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {event.expected_participants ? `${event.expected_participants} Katılımcı` : 'Katılımcı sayısı belirtilmedi'}
                </span>
                <Link href={`/dashboard/events/${event.id}`} style={{ color: 'var(--color-primary)', fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none' }}>
                  Detayları Gör
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

