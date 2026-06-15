'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Loader2, Check, X, Calendar, MapPin, AlertCircle, Clock } from 'lucide-react';
import Link from 'next/link';
import { useRole } from '@/context/RoleContext';

export default function ResourceManagerPanel() {
  const { currentRole, userData } = useRole();
  const [reservations, setReservations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  
  // Form stateleri
  const [rejectReason, setRejectReason] = useState('');
  const [altDate, setAltDate] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchReservations = async () => {
    setIsLoading(true);
    try {
      // Sadece 'Bekliyor' durumundaki rezervasyonları ve ilişkili etkinlik/kaynak bilgilerini çek
      const { data, error } = await supabase
        .from('resource_reservations')
        .select(`
          *,
          events:event_id (id, event_name, event_date, university, region, created_by, unit_name),
          resources:resource_id (name, type)
        `)
        .eq('status', 'Bekliyor')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      let filteredData = data || [];
      if (currentRole === 'resource_manager' && userData?.unit_name) {
        filteredData = filteredData.filter((res: any) => res.events?.unit_name === userData.unit_name);
      }
      setReservations(filteredData);
    } catch (error) {
      console.error('Rezervasyonlar çekilemedi:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReservations();
  }, []);

  const handleAction = async (reservation: any, newStatus: string) => {
    setProcessingId(reservation.id);
    try {
      let finalNotes = reservation.notes || '';
      
      if (newStatus === 'Reddedildi') {
        finalNotes += `\n\n--- Sistem Notu ---\nRed Nedeni: ${rejectReason}`;
        if (altDate) finalNotes += `\nÖnerilen Alternatif Tarih: ${new Date(altDate).toLocaleString('tr-TR')}`;
      }

      const { error } = await supabase
        .from('resource_reservations')
        .update({ 
          status: newStatus,
          notes: finalNotes 
        })
        .eq('id', reservation.id);

      if (error) throw error;

      // Bildirim Gönder (Etkinlik sahibine)
      let notifMessage = '';
      if (newStatus === 'Onaylandı') {
        notifMessage = `"${reservation.events.event_name}" etkinliğiniz için "${reservation.resources.name}" talebiniz Onaylandı!`;
      } else if (newStatus === 'Reddedildi') {
        notifMessage = `"${reservation.events.event_name}" etkinliğiniz için "${reservation.resources.name}" talebiniz Reddedildi. Neden: ${rejectReason}`;
        if (altDate) notifMessage += ` (Önerilen Alternatif Tarih: ${new Date(altDate).toLocaleString('tr-TR')})`;
      }

      await supabase.from('notifications').insert([{
        user_id: reservation.events.created_by,
        event_id: reservation.events.id,
        message: notifMessage,
        type: 'resource_update'
      }]);

      setRejectingId(null);
      setRejectReason('');
      setAltDate('');
      await fetchReservations();
    } catch (err: any) {
      alert('İşlem başarısız: ' + err.message);
    } finally {
      setProcessingId(null);
    }
  };

  if (isLoading) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}><Loader2 className="animate-spin" size={32} color="var(--color-primary)" /></div>;
  }

  return (
    <div className="card">
      <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem', color: 'var(--text-main)' }}>Bekleyen Rezervasyon Talepleri</h3>
      
      {reservations.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem 1rem', backgroundColor: 'var(--bg-main)', borderRadius: 'var(--radius-md)' }}>
          <Check size={48} color="var(--status-success)" style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
          <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>Şu an onay bekleyen herhangi bir kaynak/lojistik talebi bulunmuyor.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {reservations.map((res) => (
            <div key={res.id} style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '1.5rem', backgroundColor: 'var(--bg-card)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <div>
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <h4 style={{ fontSize: '1.15rem', fontWeight: 700 }}>{res.events?.event_name || 'Silinmiş Etkinlik'}</h4>
                    <span className="badge badge-pending">Onay Bekliyor</span>
                  </div>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <MapPin size={14} /> {res.events?.university} - {res.events?.region}
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'flex-end' }}>
                    <Clock size={16} color="var(--color-primary)" />
                    {new Date(res.start_time).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' })} - 
                    {new Date(res.end_time).toLocaleTimeString('tr-TR', { timeStyle: 'short' })}
                  </div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '0.25rem', fontWeight: 500 }}>
                    Talep: {res.quantity}x {res.resources?.name}
                  </div>
                </div>
              </div>
              
              {res.notes && (
                <div style={{ backgroundColor: 'var(--bg-main)', padding: '1rem', borderRadius: 'var(--radius-sm)', marginBottom: '1.5rem', fontSize: '0.875rem', display: 'flex', gap: '0.5rem' }}>
                  <AlertCircle size={16} color="var(--text-muted)" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <strong>Ek Not:</strong> {res.notes}
                  </div>
                </div>
              )}

              {rejectingId === res.id ? (
                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div>
                    <label className="label">Reddetme Nedeni (Zorunlu)</label>
                    <input 
                      type="text" 
                      className="input" 
                      placeholder="Örn: Cihaz o tarihte bakımda..." 
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="label">Alternatif Tarih Önerisi (Opsiyonel)</label>
                    <input 
                      type="datetime-local" 
                      className="input" 
                      value={altDate}
                      onChange={(e) => setAltDate(e.target.value)}
                    />
                  </div>
                  
                  <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                    <button className="btn btn-outline" onClick={() => { setRejectingId(null); setRejectReason(''); setAltDate(''); }} disabled={processingId === res.id}>
                      İptal
                    </button>
                    <button 
                      className="btn btn-outline" 
                      style={{ color: 'var(--status-danger)', borderColor: 'var(--status-danger)' }} 
                      onClick={() => handleAction(res, 'Reddedildi')}
                      disabled={!rejectReason || processingId === res.id}
                    >
                      {processingId === res.id ? <Loader2 size={16} className="animate-spin" /> : <X size={16} />} 
                      Kesin Olarak Reddet
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem', display: 'flex', gap: '1rem', justifyContent: 'flex-end', alignItems: 'center' }}>
                  <Link href={`/dashboard/events/${res.events?.id}`} className="btn btn-outline" style={{ marginRight: 'auto', border: 'none', color: 'var(--color-primary)' }}>
                    Etkinlik Detayını İncele &rarr;
                  </Link>

                  <button 
                    className="btn btn-outline" 
                    style={{ color: 'var(--status-danger)', borderColor: 'var(--status-danger)' }} 
                    onClick={() => setRejectingId(res.id)}
                    disabled={processingId === res.id}
                  >
                    Reddet / Tarih Öner
                  </button>
                  <button 
                    className="btn btn-primary" 
                    style={{ backgroundColor: 'var(--status-success)', borderColor: 'var(--status-success)' }} 
                    onClick={() => handleAction(res, 'Onaylandı')}
                    disabled={processingId === res.id}
                  >
                    {processingId === res.id ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} 
                    Talebi Onayla
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
