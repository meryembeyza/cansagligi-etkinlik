'use client';
import { toast } from 'react-hot-toast';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
const supabase = createClient();
import { Loader2, Check, Upload, Clock, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default function DesignTeamPanel() {
  const [requests, setRequests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<any | null>(null);

  const fetchRequests = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('poster_requests')
        .select(`
          *,
          events:event_id (
            id, event_name, event_date, location, university, status, created_by,
            event_speakers (speakers (full_name))
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (error) {
      console.error('Afiþ talepleri çekilemedi:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleFileUpload = async (requestId: string, eventId: string, eventCreatorId: string, eventName: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setProcessingId(requestId);
    try {
      if (file.size > 15 * 1024 * 1024) {
        throw new Error('Dosya boyutu 15MB limitini aþýyor.');
      }

      // Dosya adýný güvenli hale getir ve benzersiz yap
      const safeFilename = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
      const filePath = `${eventId}/${Date.now()}_${safeFilename}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('posters')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('posters')
        .getPublicUrl(filePath);

      const publicUrl = urlData.publicUrl;

      const { error } = await supabase
        .from('poster_requests')
        .update({ 
          status: 'Tamamlandý',
          poster_url: publicUrl 
        })
        .eq('id', requestId);

      if (error) throw error;

      // Bildirim Gönder (Etkinlik Sahibine)
      await supabase.from('notifications').insert([{
        user_id: eventCreatorId,
        event_id: eventId,
        message: `Tasarým ekibi "${eventName}" etkinliði için afiþ dosyasýný yükledi.`,
        type: 'poster_update'
      }]);

      await fetchRequests();
    } catch (err) {
      toast.error('Dosya yüklenirken hata oluþtu: ' + (err as Error).message);
    } finally {
      setProcessingId(null);
    }
  };

  const markAsPreparing = async (requestId: string) => {
    setProcessingId(requestId);
    try {
      const { error } = await supabase
        .from('poster_requests')
        .update({ status: 'Hazýrlanýyor' })
        .eq('id', requestId);

      if (error) throw error;
      await fetchRequests();
    } catch (err) {
      toast.error('Hata: ' + (err as Error).message);
    } finally {
      setProcessingId(null);
    }
  };

  if (isLoading) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}><Loader2 className="animate-spin" size={32} color="var(--color-primary)" /></div>;
  }

  return (
    <div className="card">
      <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem', color: 'var(--text-main)' }}>Aktif Afiþ Talepleri</h3>
      
      {requests.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem 1rem', backgroundColor: 'var(--bg-main)', borderRadius: 'var(--radius-md)' }}>
          <Check size={48} color="var(--status-success)" style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
          <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>Åžu an bekleyen veya devam eden bir afiþ talebi bulunmuyor.</p>
        </div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #eaeaea', textAlign: 'left' }}>
              <th style={{ padding: '1rem 0.75rem' }}>Etkinlik Adý</th>
              <th style={{ padding: '1rem 0.75rem' }}>Tarih</th>
              <th style={{ padding: '1rem 0.75rem' }}>Durum</th>
              <th style={{ padding: '1rem 0.75rem' }}>Ýþlem</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((req) => (
              <tr key={req.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                <td style={{ padding: '1rem 0.75rem' }}>
                  <div style={{ fontWeight: 600, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <button 
                      onClick={() => setSelectedRequest(req)} 
                      style={{ color: 'var(--color-primary)', background: 'none', border: 'none', padding: 0, font: 'inherit', cursor: 'pointer', fontWeight: 600, textDecoration: 'underline', textAlign: 'left' }}
                    >
                      {req.events?.event_name || 'Silinmiþ Etkinlik'}
                    </button>
                  </div>
                  {req.designer_notes && (
                    <div style={{ color: 'var(--status-danger)', fontSize: '0.75rem', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <AlertCircle size={12} /> {req.designer_notes}
                    </div>
                  )}
                </td>
                <td style={{ padding: '1rem 0.75rem', color: 'var(--text-muted)' }}>
                  {req.events ? new Date(req.events.event_date).toLocaleDateString('tr-TR') : '-'}
                </td>
                <td style={{ padding: '1rem 0.75rem' }}>
                  <span className={`badge ${
                    req.status === 'Bekliyor' ? 'badge-pending' :
                    req.status === 'Hazýrlanýyor' ? 'badge-warning' :
                    req.status === 'Revizyon Gerekli' ? 'badge-danger' :
                    'badge-success'
                  }`}>
                    {req.status}
                  </span>
                </td>
                <td style={{ padding: '1rem 0.75rem' }}>
                  {req.status === 'Bekliyor' && (
                    <button 
                      className="btn btn-outline" 
                      style={{ fontSize: '0.75rem', padding: '0.25rem 0.75rem' }}
                      onClick={() => markAsPreparing(req.id)}
                      disabled={processingId === req.id}
                    >
                      {processingId === req.id ? <Loader2 size={14} className="animate-spin" /> : <Clock size={14} style={{ marginRight: '4px', display: 'inline' }}/>} Ýþleme Al
                    </button>
                  )}

                  {(req.status === 'Hazýrlanýyor' || req.status === 'Revizyon Gerekli') && (
                    <label className={`btn btn-primary ${processingId === req.id ? 'opacity-50 cursor-not-allowed' : ''}`} style={{ fontSize: '0.75rem', padding: '0.25rem 0.75rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', backgroundColor: 'var(--status-success)', borderColor: 'var(--status-success)' }}>
                      {processingId === req.id ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />} 
                      {req.status === 'Revizyon Gerekli' ? 'Yeni Versiyon Yükle' : 'Dosya Seç (Yükle)'}
                      <input 
                        type="file" 
                        style={{ display: 'none' }} 
                        accept=".jpg,.jpeg,.png,.pdf" 
                        disabled={processingId === req.id}
                        onChange={(e) => handleFileUpload(req.id, req.events?.id, req.events?.created_by, req.events?.event_name, e)}
                      />
                    </label>
                  )}

                  {req.status === 'Tamamlandý' && (
                    <div style={{ color: 'var(--status-success)', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.25rem', fontWeight: 500 }}>
                      <Check size={16} /> Gönderildi
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {selectedRequest && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ backgroundColor: 'var(--bg-card)', width: '100%', maxWidth: '550px', borderRadius: 'var(--radius-lg)', padding: '2rem', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
              Afiþ Talebi Detaylarý
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.9rem', color: 'var(--text-main)', marginBottom: '1.5rem' }}>
              <div>
                <strong style={{ color: 'var(--text-muted)' }}>Etkinlik Adý:</strong> 
                <div style={{ padding: '0.5rem', backgroundColor: 'var(--bg-main)', borderRadius: '4px', marginTop: '0.25rem', fontWeight: 600 }}>
                  {selectedRequest.events?.event_name}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <strong style={{ color: 'var(--text-muted)' }}>Tarih:</strong>
                  <div style={{ padding: '0.5rem', backgroundColor: 'var(--bg-main)', borderRadius: '4px', marginTop: '0.25rem', fontWeight: 500 }}>
                    {selectedRequest.events ? new Date(selectedRequest.events.event_date).toLocaleDateString('tr-TR') : '-'}
                  </div>
                </div>
                <div>
                  <strong style={{ color: 'var(--text-muted)' }}>Saat:</strong>
                  <div style={{ padding: '0.5rem', backgroundColor: 'var(--bg-main)', borderRadius: '4px', marginTop: '0.25rem', fontWeight: 500 }}>
                    {selectedRequest.events ? new Date(selectedRequest.events.event_date).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : '-'}
                  </div>
                </div>
              </div>

              <div>
                <strong style={{ color: 'var(--text-muted)' }}>Yer:</strong>
                <div style={{ padding: '0.5rem', backgroundColor: 'var(--bg-main)', borderRadius: '4px', marginTop: '0.25rem', fontWeight: 500 }}>
                  {selectedRequest.events?.location || '-'}
                </div>
              </div>

              <div>
                <strong style={{ color: 'var(--text-muted)' }}>Konuþmacý(lar):</strong>
                <div style={{ padding: '0.5rem', backgroundColor: 'var(--bg-main)', borderRadius: '4px', marginTop: '0.25rem', fontWeight: 500 }}>
                  {selectedRequest.events?.event_speakers && selectedRequest.events.event_speakers.length > 0
                    ? selectedRequest.events.event_speakers.map((s: EventSpeaker) => s.speakers?.full_name).join(', ')
                    : 'Belirtilmedi'}
                </div>
              </div>

              <div>
                <strong style={{ color: 'var(--text-muted)' }}>Üniversite:</strong>
                <div style={{ padding: '0.5rem', backgroundColor: 'var(--bg-main)', borderRadius: '4px', marginTop: '0.25rem', fontWeight: 500 }}>
                  {selectedRequest.events?.university || '-'}
                </div>
              </div>

              <div>
                <strong style={{ color: 'var(--text-muted)' }}>Afiþte Bulunmasý Gereken Logolar:</strong>
                <div style={{ padding: '0.75rem', backgroundColor: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '4px', marginTop: '0.25rem', whiteSpace: 'pre-wrap', fontWeight: 500 }}>
                  {selectedRequest.required_logos || 'Belirtilmemiþ.'}
                </div>
              </div>

              <div>
                <strong style={{ color: 'var(--text-muted)' }}>Dikkat Edilmesi Gerekenler:</strong>
                <div style={{ padding: '0.75rem', backgroundColor: 'var(--bg-warning-light)', border: '1px solid #fde68a', borderRadius: '4px', marginTop: '0.25rem', whiteSpace: 'pre-wrap', fontWeight: 500 }}>
                  {selectedRequest.special_instructions || 'Belirtilmemiþ.'}
                </div>
              </div>

              <div>
                <strong style={{ color: 'var(--text-muted)' }}>Etkinlik Onay Durumu:</strong>
                <div style={{ marginTop: '0.25rem' }}>
                  <span className={`badge ${
                    selectedRequest.events?.status === 'Onaylandý' ? 'badge-success' :
                    selectedRequest.events?.status?.includes('Onay') ? 'badge-pending' :
                    'badge-danger'
                  }`}>
                    {selectedRequest.events?.status || 'Bilinmiyor'}
                  </span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
              <button className="btn btn-outline" onClick={() => setSelectedRequest(null)}>
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}





