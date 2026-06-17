'use client';
import { toast } from 'react-hot-toast';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
const supabase = createClient();
import { useRole } from '@/context/RoleContext';
import EventDiffViewer from '@/components/events/EventDiffViewer';
import { Check, X, Edit3, Calendar, MapPin, Loader2, FileSearch } from 'lucide-react';
import Link from 'next/link';

export default function RegionManagerPanel() {
  const { userData } = useRole();
  const [events, setEvents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState<{ [key: string]: string }>({});
  const [diffEventId, setDiffEventId] = useState<string | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<string>('');

  const regions = ['Ýstanbul Anadolu', 'Ýstanbul Avrupa', 'Marmara', 'Ege', 'Ýç Anadolu', 'Ankara', 'Doðu Anadolu', 'Güneydoðu Anadolu', 'Akdeniz', 'Karadeniz'];

  useEffect(() => {
    if (userData?.region && !selectedRegion) {
      setSelectedRegion(userData.region);
    }
  }, [userData?.region]);

  const fetchEvents = async () => {
    if (!selectedRegion) return;
    setIsLoading(true);
    try {
      const isOwnRegion = selectedRegion === userData?.region;
      const statusFilter = isOwnRegion 
        ? ['Onay Bekliyor', 'Yeniden Onay Bekliyor'] 
        : ['Onaylandý', 'Gerçekleþti'];

      let query = supabase
        .from('events')
        .select('*, users(*)')
        .eq('region', selectedRegion)
        .in('status', statusFilter)
        .order('created_at', { ascending: false });

      // Sadece kendi birimine ait etkinlikleri görsün (Genel yetkililer hariç)
      if (userData?.unit_name && userData.role === 'region_manager') {
        query = query.eq('unit_name', userData.unit_name);
      }

      const { data, error } = await query;

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error('Etkinlikler çekilemedi:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [selectedRegion, userData?.region]);

  const handleAction = async (eventId: string, newStatus: string, notes?: string) => {
    setProcessingId(eventId);
    try {
      // 1. Durumu güncelle
      const { error: updateError } = await supabase
        .from('events')
        .update({ status: newStatus })
        .eq('id', eventId);
        
      if (updateError) throw updateError;

      // 2. Eðer onaylandýysa otomatik afiþ talebi oluþtur
      if (newStatus === 'Onaylandý') {
        const { error: posterError } = await supabase
          .from('poster_requests')
          .insert([{ event_id: eventId, status: 'Bekliyor' }]);
        if (posterError) {
          console.warn('Afiþ talebi oluþturulurken hata:', posterError);
        }
      }

      const targetEvent = events.find(e => e.id === eventId);
      
      // 3. Bildirim oluþtur (Birim Baþkanýna)
      let notifMessage = '';
      if (newStatus === 'Onaylandý') notifMessage = `Tebrikler, "${targetEvent?.event_name}" etkinliðiniz Bölge Sorumlusu tarafýndan onaylandý.`;
      else if (newStatus === 'Reddedildi') notifMessage = `Maalesef "${targetEvent?.event_name}" etkinliðiniz reddedildi. Neden: ${notes}`;
      else if (newStatus === 'Yeniden Onay Bekliyor') notifMessage = `"${targetEvent?.event_name}" etkinliðiniz için revizyon isteniyor. Notlar: ${notes}`;

      if (notifMessage && targetEvent) {
        await supabase.from('notifications').insert([{
          user_id: targetEvent.created_by,
          event_id: eventId,
          message: notifMessage,
          type: 'event_status_change'
        }]);
      }

      // 4. Listeyi yenile
      await fetchEvents();
    } catch (error) {
      toast.error('Ýþlem baþarýsýz: ' + (error as Error).message);
    } finally {
      setProcessingId(null);
    }
  };

  const isOwnRegion = selectedRegion === userData?.region;

  if (isLoading && !events.length) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><Loader2 className="animate-spin" color="var(--color-primary)" /></div>;
  }

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-main)' }}>
          {isOwnRegion ? 'Bölge Onayý Bekleyen Etkinlikler' : `${selectedRegion} Bölgesi Etkinlikleri (Salt Okunur)`}
        </h3>
        
        <select 
          className="input" 
          style={{ width: '200px' }}
          value={selectedRegion} 
          onChange={(e) => setSelectedRegion(e.target.value)}
        >
          {regions.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>

      {events.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem 1rem', backgroundColor: 'var(--bg-main)', borderRadius: 'var(--radius-md)' }}>
          <Check size={48} color="var(--status-success)" style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
          <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>
            {isOwnRegion ? 'Bölgenizde þu an onay bekleyen bir etkinlik bulunmuyor.' : 'Bu bölgede henüz onaylanmýþ bir etkinlik bulunmuyor.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {events.map((event) => (
            <div key={event.id} style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '1.5rem', backgroundColor: event.status === 'Yeniden Onay Bekliyor' ? 'var(--bg-warning-light)' : 'var(--bg-card)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <div>
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <Link href={`/dashboard/events/${event.id}`} style={{ textDecoration: 'none' }}>
                      <h4 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--color-primary)', cursor: 'pointer' }}>{event.event_name}</h4>
                    </Link>
                    <span className={`badge ${event.status === 'Yeniden Onay Bekliyor' ? 'badge-warning' : 'badge-pending'}`}>
                      {event.status}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <MapPin size={14} /> {event.university} - {event.unit_name}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {event.status === 'Yeniden Onay Bekliyor' && (
                    <button 
                      className="btn btn-outline" 
                      onClick={() => setDiffEventId(event.id)}
                      style={{ fontSize: '0.875rem', padding: '0.5rem 0.75rem' }}
                    >
                      <FileSearch size={16} style={{ marginRight: '0.5rem' }}/> Deðiþiklik Özeti
                    </button>
                  )}
                  <Link href={`/dashboard/events/${event.id}`} className="btn btn-outline" style={{ fontSize: '0.875rem', padding: '0.5rem 0.75rem', borderColor: 'var(--color-primary)', color: 'var(--color-primary)' }}>
                    Detaylarý Gör
                  </Link>
                </div>
              </div>

              {/* Gönderen Kiþi Bilgisi */}
              {event.users && (
                <div style={{ padding: '0.75rem 1rem', backgroundColor: '#f0f9ff', borderRadius: 'var(--radius-sm)', marginBottom: '1rem', border: '1px solid #bae6fd', fontSize: '0.875rem' }}>
                  <div style={{ fontWeight: 600, color: '#0369a1', marginBottom: '0.25rem' }}>Gönderen Birim Baþkaný: {event.users.full_name}</div>
                  <div style={{ color: '#0c4a6e', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                    {event.users.region && <span><strong>Bölge:</strong> {event.users.region}</span>}
                    {event.users.university && <span><strong>Üniversite:</strong> {event.users.university}</span>}
                    {event.users.department && <span><strong>Bölüm:</strong> {event.users.department}</span>}
                    {event.users.grade && <span><strong>Sýnýf:</strong> {event.users.grade}</span>}
                    {event.users.club_duty && <span><strong>Görev:</strong> {event.users.club_duty}</span>}
                    {event.users.nsosyal_account && <span><strong>NSosyal:</strong> <a href={event.users.nsosyal_account} target="_blank" rel="noopener noreferrer" style={{ color: '#0284c7', textDecoration: 'underline' }}>Profil Linki</a></span>}
                  </div>
                </div>
              )}

              <div style={{ padding: '1rem', backgroundColor: 'var(--bg-main)', borderRadius: 'var(--radius-sm)', marginBottom: '1.5rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Etkinlik Türü / Amacý</div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>{event.event_type}</div>
                  <div style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}>{event.event_purpose}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Tarih ve Katýlýmcý</div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <Calendar size={14} /> 
                    {new Date(event.event_date).toLocaleString('tr-TR', { dateStyle: 'long', timeStyle: 'short' })}
                  </div>
                  <div style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}>{event.expected_participants || 0} Kiþi Bekleniyor</div>
                </div>
              </div>

              {/* Reddetme Notu Input Alaný (Sadece Reddet'e basýldýðýnda açýlýr) */}
              {isOwnRegion && rejectReason[event.id] !== undefined && (
                <div style={{ marginBottom: '1rem' }}>
                  <input 
                    type="text" 
                    className="input" 
                    placeholder="Red/Revizyon nedenini yazýn..." 
                    autoFocus
                    value={rejectReason[event.id]}
                    onChange={(e) => setRejectReason({ ...rejectReason, [event.id]: e.target.value })}
                  />
                </div>
              )}

              {isOwnRegion && (
                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
                  {rejectReason[event.id] === undefined ? (
                    <>
                      <button 
                        className="btn btn-outline" 
                        style={{ color: 'var(--status-danger)', borderColor: 'var(--status-danger)' }}
                        onClick={() => setRejectReason({ ...rejectReason, [event.id]: '' })}
                        disabled={processingId === event.id}
                      >
                        <X size={16} /> Reddet / Revizyon
                      </button>
                      <button 
                        className="btn btn-primary" 
                        style={{ backgroundColor: 'var(--status-success)', borderColor: 'var(--status-success)' }}
                        onClick={() => handleAction(event.id, 'Onaylandý')}
                        disabled={processingId === event.id}
                      >
                        {processingId === event.id ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} 
                        Etkinliði Onayla
                      </button>
                    </>
                  ) : (
                    <>
                      <button className="btn btn-outline" onClick={() => {
                        const newReasons = { ...rejectReason };
                        delete newReasons[event.id];
                        setRejectReason(newReasons);
                      }}>
                        Ýptal
                      </button>
                      <button 
                        className="btn btn-outline" 
                        style={{ color: '#92400E', borderColor: '#F59E0B' }}
                        onClick={() => handleAction(event.id, 'Yeniden Onay Bekliyor', rejectReason[event.id])}
                        disabled={!rejectReason[event.id] || processingId === event.id}
                      >
                        <Edit3 size={16} /> Revizyona Gönder
                      </button>
                      <button 
                        className="btn btn-primary" 
                        style={{ backgroundColor: 'var(--status-danger)', borderColor: 'var(--status-danger)' }}
                        onClick={() => handleAction(event.id, 'Reddedildi', rejectReason[event.id])}
                        disabled={!rejectReason[event.id] || processingId === event.id}
                      >
                        <X size={16} /> Kesin Reddet
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {diffEventId && (
        <EventDiffViewer 
          eventId={diffEventId} 
          currentEvent={events.find(e => e.id === diffEventId)} 
          onClose={() => setDiffEventId(null)} 
        />
      )}
    </div>
  );
}




