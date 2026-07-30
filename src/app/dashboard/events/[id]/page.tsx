'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/utils/supabase/client';
const supabase = createClient();
import { useRole } from '@/context/RoleContext';
import { Loader2, ArrowLeft, Download, Check, X, MapPin, Calendar, Users, AlertTriangle, Clock, Edit, FileText, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import RevisionModal from '@/components/events/RevisionModal';
import PublishToBursaryModal from '@/components/dashboard/events/PublishToBursaryModal';
import { toast } from 'react-hot-toast';
import { usePrompt } from '@/components/ui/usePrompt';
export default function EventDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { currentRole, user } = useRole();
  const { PromptModal, prompt } = usePrompt();
  const [event, setEvent] = useState<any>(null);
  const [speakers, setSpeakers] = useState<any[]>([]);
  const [revisions, setRevisions] = useState<any[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [showRevisionModal, setShowRevisionModal] = useState(false);
  
  // Admin Notes Modal State
  const [showAdminNoteModal, setShowAdminNoteModal] = useState(false);
  const [pendingStatus, setPendingStatus] = useState('');
  const [adminNote, setAdminNote] = useState('');
  
  const [showPublishModal, setShowPublishModal] = useState(false);
  
  const contentRef = useRef<HTMLDivElement>(null);

  const fetchAllData = async () => {
    setIsLoading(true);
    try {
      const { data: eventData, error: eventErr } = await supabase
        .from('events')
        .select('*')
        .eq('id', params.id)
        .single();
      if (eventErr) throw eventErr;
      setEvent(eventData);

      const { data: speakerData, error: speakerErr } = await supabase
        .from('event_speakers')
        .select(`*, speakers (*)`)
        .eq('event_id', params.id);
      
      if (!speakerErr && speakerData) {
        setSpeakers(speakerData);
      }

      const { data: revData, error: revErr } = await supabase
        .from('event_revisions')
        .select(`*, users:requested_by (full_name)`)
        .eq('event_id', params.id)
        .order('created_at', { ascending: false });
        
      if (!revErr && revData) {
        setRevisions(revData);
      }
    } catch (err) {
      console.error('Veriler çekilirken hata:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, [params.id]);

  const handleStatusChangeSubmit = async () => {
    setProcessing(true);
    try {
      const { error } = await supabase
        .from('events')
        .update({ 
          status: pendingStatus,
          admin_notes: adminNote || event.admin_notes // Eklenecek notu kaydet (varsa eskisini tut/değiştir)
        })
        .eq('id', event.id);

      if (error) throw error;
      
      let notifMessage = pendingStatus === 'Onaylandı' 
        ? `Tebrikler, "${event.event_name}" etkinliğiniz Yönetim tarafından onaylandı.` 
        : `"${event.event_name}" etkinliğinizin durumu "${pendingStatus}" olarak güncellendi.`;
        
      if (adminNote) {
        notifMessage += ` Yönetici Notu: "${adminNote}"`;
      }

      await supabase.from('notifications').insert([{
        user_id: event.created_by,
        event_id: event.id,
        message: notifMessage,
        type: 'event_status_change'
      }]);

      // E-posta gönderimi
      const { data: creator } = await supabase.from('users').select('email').eq('id', event.created_by).single();
      if (creator && creator.email) {
        const { data: { session } } = await supabase.auth.getSession();
        // Arayüzü bekletmemek için await kullanılmıyor - Fire and forget
        fetch('/api/send-email', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token || ''}`
          },
          body: JSON.stringify({
            to: creator.email,
            subject: pendingStatus === 'Onaylandı' ? 'Etkinliğiniz Onaylandı 🎉' : 'Etkinlik Durumu Güncellendi',
            html: `<p>Merhaba,</p><p>${notifMessage}</p><p>Detayları incelemek için sisteme giriş yapabilirsiniz.</p>`
          })
        }).catch(err => console.error('E-posta gönderilemedi:', err));
      }

      setEvent({ ...event, status: pendingStatus, admin_notes: adminNote || event.admin_notes });
      setShowAdminNoteModal(false);
      setAdminNote('');
      toast.success(`Etkinlik durumu "${pendingStatus}" olarak güncellendi.`);
    } catch (err) {
      console.error(err);
      toast.error('İşlem başarısız: ' + ((err as Error).message || 'Bilinmeyen Hata'));
    } finally {
      setProcessing(false);
    }
  };

  const handleSpeakerStatus = async (eventSpeakerId: string, newStatus: string, speakerName: string) => {
    let cancelReason = '';
    
    // Eğer reddediliyorsa not isteyelim
    if (newStatus === 'Reddedildi') {
      const reason = await prompt(`"${speakerName}" isimli konuşmacıyı reddediyorsunuz.\nLütfen reddetme nedeninizi yazın (Sorumluya iletilecektir):`);
      if (reason === null) return; // İptal edildi
      cancelReason = reason;
    }

    try {
      const { error } = await supabase
        .from('event_speakers')
        .update({ 
          status: newStatus, 
          is_cancelled: newStatus === 'Reddedildi',
          cancel_reason: cancelReason || null
        })
        .eq('id', eventSpeakerId);

      if (error) throw error;

      setSpeakers(speakers.map(s => s.id === eventSpeakerId ? { ...s, status: newStatus, cancel_reason: cancelReason || s.cancel_reason } : s));

      if (newStatus === 'Reddedildi') {
        let msg = `"${event.event_name}" etkinliğindeki konuşmacı "${speakerName}" reddedildi.`;
        if (cancelReason) msg += ` Red Nedeni: ${cancelReason}`;

        await supabase.from('notifications').insert([{
          user_id: event.created_by,
          event_id: event.id,
          message: msg,
          type: 'speaker_rejected'
        }]);
      }
    } catch (err) {
      toast.error('Konuşmacı durumu güncellenemedi.');
      console.error(err);
    }
  };

  const handleLogisticStatus = async (type: string, index: number | null, newStatus: string) => {
    const reason = await prompt(`${type.toUpperCase()} talebini ${newStatus} yapıyorsunuz.\nLütfen bir not girin (Miktar değişikliği veya red nedeni vb.):`);
    if (reason === null && newStatus === 'Reddedildi') {
      return; // Red işlemi için not zorunlu gibi düşünülebilir veya iptal edildi
    }
    
    setProcessing(true);
    try {
      let logistics = null;
      if (event.budget_request) {
        logistics = JSON.parse(event.budget_request);
      }
      if (!logistics) throw new Error("Lojistik verisi bulunamadı.");

      let target;
      if (type === 'shuttle') target = logistics.shuttle;
      else if (type === 'basicLifeSupport') {
        if (!logistics.basicLifeSupportDetailsObj) logistics.basicLifeSupportDetailsObj = { text: logistics.basicLifeSupportDetails };
        target = logistics.basicLifeSupportDetailsObj;
      }
      else if (type === 'advancedLifeSupport') {
        if (!logistics.advancedLifeSupportDetailsObj) logistics.advancedLifeSupportDetailsObj = { text: logistics.advancedLifeSupportDetails };
        target = logistics.advancedLifeSupportDetailsObj;
      }
      else if (type === 'sutureTraining') {
        if (!logistics.sutureTrainingDetailsObj) logistics.sutureTrainingDetailsObj = { text: logistics.sutureTrainingDetails };
        target = logistics.sutureTrainingDetailsObj;
      }
      else if (type === 'aroma' && index !== null) target = logistics.aroma[index];
      else if (type === 'custom' && index !== null) target = logistics.customRequests[index];

      if (target) {
        target.status = newStatus;
        target.adminNote = reason || '';
      }

      const { error } = await supabase
        .from('events')
        .update({ budget_request: JSON.stringify(logistics) })
        .eq('id', event.id);

      if (error) throw error;
      
      setEvent({ ...event, budget_request: JSON.stringify(logistics) });
      
      let msg = `"${event.event_name}" etkinliğindeki bir kaynak talebi (${type}) ${newStatus} olarak güncellendi.`;
      if (reason) msg += ` Not: ${reason}`;
      
      await supabase.from('notifications').insert([{
        user_id: event.created_by,
        event_id: event.id,
        message: msg,
        type: 'logistic_status_change'
      }]);
      
    } catch (err) {
      toast.error('Lojistik durumu güncellenemedi.');
      console.error(err);
    } finally {
      setProcessing(false);
    }
  };

  const handleDownloadPDF = async () => {
    const element = contentRef.current;
    if (!element) return;

    try {
      // @ts-ignore
      const html2pdf = (await import('html2pdf.js')).default;
      const opt = {
        margin:       1,
        filename:     `etkinlik_${event.event_name.replace(/\s+/g, '_')}.pdf`,
        image:        { type: 'jpeg' as const, quality: 0.98 },
        html2canvas:  { scale: 2 },
        jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' as const }
      };
      html2pdf().set(opt).from(element).save();
    } catch (error) {
      console.error('PDF oluşturulurken hata:', error);
      toast.error('PDF oluşturulurken bir hata oluştu.');
    }
  };

  const handleCancelEvent = async () => {
    const confirmCancel = await prompt("Bu Ramazan etkinliğini iptal etmek istediğinize emin misiniz? Lütfen nedenini girin:");
    if (confirmCancel === null) return;

    setProcessing(true);
    try {
      const { error } = await supabase
        .from('events')
        .update({ status: 'İptal Edildi' })
        .eq('id', event.id);

      if (error) throw error;

      setEvent({ ...event, status: 'İptal Edildi' });
      toast.success("Etkinlik başarıyla 'İptal Edildi' olarak güncellendi.");
    } catch (err) {
      console.error(err);
      toast.error("İptal işlemi sırasında bir hata oluştu: " + ((err as Error).message || err));
    } finally {
      setProcessing(false);
    }
  };

  if (isLoading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}><Loader2 className="animate-spin" size={32} color="var(--color-primary)" /></div>;
  if (!event) return <div style={{ padding: '4rem', textAlign: 'center' }}>Etkinlik bulunamadı.</div>;

  const canApprove = currentRole === 'general_admin' || currentRole === 'region_manager' || currentRole === 'rep_region_manager';
  const isCreator = user?.id === event.created_by;

  let logistics: any = null;
  if (event.budget_request) {
    try { logistics = JSON.parse(event.budget_request); } catch(e) {}
  }

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem 1rem' }}>
      
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body * { visibility: hidden; }
          #printable-event-details, #printable-event-details * { visibility: visible; }
          #printable-event-details { position: absolute; left: 0; top: 0; width: 100%; }
          .no-print { display: none !important; }
        }
      `}} />
      
      {showRevisionModal && (
        <RevisionModal 
          event={event} 
          initialSpeakers={speakers}
          isManager={canApprove}
          onClose={() => setShowRevisionModal(false)} 
          onSuccess={(updatedEvent) => {
            setEvent(updatedEvent);
            setShowRevisionModal(false);
            fetchAllData();
          }} 
        />
      )}

      {showPublishModal && (
        <PublishToBursaryModal 
          event={event} 
          onClose={() => setShowPublishModal(false)}
          onSuccess={() => {
            setShowPublishModal(false);
            toast.success('Harika! Etkinlik başarıyla Bursiyer Paneline eklendi ve yayına alındı.');
          }}
        />
      )}

      {/* Admin Note Modal */}
      {showAdminNoteModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="card" style={{ backgroundColor: 'var(--bg-card)', width: '100%', maxWidth: '500px', borderRadius: 'var(--radius-lg)', padding: '2rem' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem', color: pendingStatus === 'Onaylandı' ? 'var(--status-success)' : 'var(--status-danger)' }}>
              Etkinliği {pendingStatus === 'Onaylandı' ? 'Onaylıyorsunuz' : 'Reddediyorsunuz'}
            </h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
              Etkinlik sorumlusuna iletmek istediğiniz bir not var mı? 
              <br/>(Örn: &quot;15 maket istendi ancak 10 adet onaylanmıştır&quot; veya &quot;Tarih çakışması nedeniyle reddedildi&quot;)
            </p>
            <textarea 
              className="input" 
              rows={4} 
              placeholder={`${pendingStatus === 'Onaylandı' ? 'Opsiyonel yönetici notu...' : 'Zorunlu red nedeni...'}`}
              value={adminNote}
              onChange={e => setAdminNote(e.target.value)}
              required={pendingStatus === 'Reddedildi'}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem' }}>
              <button className="btn btn-outline" onClick={() => setShowAdminNoteModal(false)} disabled={processing}>İptal</button>
              <button 
                className="btn btn-primary" 
                onClick={() => {
                  if (pendingStatus === 'Reddedildi' && !adminNote.trim()) {
                    toast.error('Reddederken neden belirtmeniz zorunludur.');
                    return;
                  }
                  handleStatusChangeSubmit();
                }} 
                disabled={processing}
                style={{ backgroundColor: pendingStatus === 'Onaylandı' ? 'var(--status-success)' : 'var(--status-danger)', borderColor: pendingStatus === 'Onaylandı' ? 'var(--status-success)' : 'var(--status-danger)' }}
              >
                {processing ? <Loader2 size={16} className="animate-spin" /> : (pendingStatus === 'Onaylandı' ? <Check size={16} /> : <X size={16} />)}
                İşlemi Tamamla
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', textDecoration: 'none', fontWeight: 600 }}>
          <ArrowLeft size={16} /> Geri Dön
        </Link>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button className="btn btn-outline" onClick={() => window.print()} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', borderColor: '#d1d5db' }}>
            <Download size={16} /> PDF İndir
          </button>
          {((isCreator && (event.status === 'Onay Bekliyor' || event.status === 'Yeniden Onay Bekliyor' || event.status === 'Reddedildi')) || canApprove) && event.event_type !== 'Ramazan Etkinliği' && event.status !== 'İptal Edildi' && (
            <button className="btn btn-outline" onClick={() => setShowRevisionModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderColor: 'var(--color-primary)', color: 'var(--color-primary)' }}>
              <Edit size={16} /> Etkinliği Revize Et / Düzenle
            </button>
          )}
          {isCreator && event.event_type === 'Ramazan Etkinliği' && event.status !== 'İptal Edildi' && (
            <button 
              className="btn btn-outline" 
              onClick={handleCancelEvent} 
              disabled={processing}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderColor: 'var(--status-danger)', color: 'var(--status-danger)' }}
            >
              <X size={16} /> Etkinliği İptal Et (İptal Oldu)
            </button>
          )}
          <button className="btn btn-outline" onClick={handleDownloadPDF} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Download size={16} /> PDF İndir
          </button>
          
          {event.status === 'Onaylandı' && (
             <button className="btn btn-primary" onClick={() => setShowPublishModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#da1c15', borderColor: '#da1c15' }}>
               <Users size={16} /> Bursiyer Paneline Ekle
             </button>
          )}
        </div>
      </div>

      <div id="printable-event-details" className="card" ref={contentRef} style={{ padding: '3rem', backgroundColor: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}>
        
        {/* Header Section */}
        <div style={{ borderBottom: '2px solid #eaeaea', paddingBottom: '1.5rem', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
                {event.event_type}
              </div>
              <h1 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-main)', margin: '0 0 0.5rem 0' }}>
                {event.event_name}
              </h1>
              <div style={{ display: 'flex', gap: '1rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><MapPin size={16} /> {event.university} ({event.region})</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Calendar size={16} /> {new Date(event.event_date).toLocaleString('tr-TR', { dateStyle: 'long', timeStyle: 'short' })}</span>
              </div>
            </div>
            <div className={`badge ${
                event.status.includes('Onay') ? (event.status === 'Onaylandı' ? 'badge-success' : 'badge-pending') :
                event.status.includes('İptal') || event.status.includes('Red') ? 'badge-danger' : 'badge-success'
              }`} style={{ fontSize: '1rem', padding: '0.5rem 1rem' }}>
              {event.status}
            </div>
          </div>
        </div>

        {/* Admin Notes Section */}
        {event.admin_notes && (
          <div style={{ padding: '1.5rem', backgroundColor: 'var(--bg-info-light)', border: '1px solid var(--border-info)', borderRadius: 'var(--radius-md)', marginBottom: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--status-info)', fontWeight: 700, marginBottom: '0.5rem' }}>
              <AlertTriangle size={18} /> Yönetim Notu
            </div>
            <div style={{ color: '#1e3a8a', fontSize: '0.9rem', lineHeight: 1.5 }}>
              {event.admin_notes}
            </div>
          </div>
        )}

        {/* Content Section */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.75rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>Etkinlik Amacı</h3>
            <p style={{ color: 'var(--text-muted)', lineHeight: 1.6 }}>{event.event_purpose || 'Belirtilmedi'}</p>
          </div>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.75rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>Hedef Kitle & Katılım</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)' }}>
                <Users size={16} />
                <strong>Beklenen Katılımcı:</strong> {event.expected_participants || 0} Kişi
              </div>
              <div style={{ color: 'var(--text-muted)' }}>
                <strong>Hedef Kitle:</strong> {(event.target_audience || []).join(', ') || 'Belirtilmedi'}
              </div>
            </div>
          </div>
        </div>

        {/* Speakers Section */}
        {speakers.length > 0 && (
          <div style={{ marginBottom: '2rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.75rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>Konuşmacılar</h3>
            <div style={{ display: 'grid', gap: '1rem' }}>
              {speakers.map((s, idx) => (
                <div key={idx} style={{ padding: '1rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h4 style={{ margin: '0 0 0.25rem 0', fontWeight: 600 }}>{s.speakers?.full_name}</h4>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{s.speakers?.title}</div>
                    
                    {s.speakers?.about && (
                      <div style={{ fontSize: '0.875rem', marginTop: '0.5rem', color: 'var(--text-main)' }}>
                        <strong>Hakkında:</strong> {s.speakers.about}
                      </div>
                    )}
                    
                    {s.speakers?.social_links && s.speakers.social_links.length > 0 && s.speakers.social_links[0] !== '' && (
                      <div style={{ fontSize: '0.8rem', marginTop: '0.5rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <strong>Sosyal Medya:</strong>
                        {s.speakers.social_links.filter((l: string) => l.trim() !== '').map((link: string, i: number) => (
                          <a key={i} href={link.startsWith('http') ? link : `https://${link}`} target="_blank" rel="noopener noreferrer" style={{ color: '#0ea5e9', textDecoration: 'underline' }}>Link {i + 1}</a>
                        ))}
                      </div>
                    )}

                    <div style={{ fontSize: '0.8rem', marginTop: '0.5rem', color: 'var(--color-primary)' }}><strong>Neden:</strong> {s.select_reason}</div>
                    
                    {s.cancel_reason && s.status === 'Reddedildi' && (
                      <div style={{ fontSize: '0.8rem', marginTop: '0.5rem', color: 'var(--status-danger)', backgroundColor: 'var(--bg-danger-light)', padding: '0.5rem', borderRadius: '4px' }}>
                        <strong>Red Nedeni:</strong> {s.cancel_reason}
                      </div>
                    )}
                  </div>
                  <div className="no-print" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <span className={`badge ${s.status === 'Onaylandı' ? 'badge-success' : s.status === 'Reddedildi' ? 'badge-danger' : 'badge-pending'}`}>
                      {s.status || 'Bekliyor'}
                    </span>
                    {canApprove && s.status !== 'Onaylandı' && (
                      <button onClick={() => handleSpeakerStatus(s.id, 'Onaylandı', s.speakers?.full_name)} className="btn btn-outline" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', borderColor: 'var(--status-success)', color: 'var(--status-success)' }}>Onayla</button>
                    )}
                    {canApprove && s.status !== 'Reddedildi' && (
                      <button onClick={() => handleSpeakerStatus(s.id, 'Reddedildi', s.speakers?.full_name)} className="btn btn-outline" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', borderColor: 'var(--status-danger)', color: 'var(--status-danger)' }}>Reddet</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Logistics Section */}
        {logistics && event.event_type !== 'Ramazan Etkinliği' && (
          <div style={{ marginBottom: '2rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>Lojistik ve Kaynak Talepleri</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              
              {/* Shuttle */}
              {logistics.hasShuttle && (
                <div style={{ backgroundColor: 'var(--bg-nested, var(--bg-nested))', padding: '1.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                  <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-main)' }}>🚐 Araç / Servis Talebi</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', fontSize: '0.875rem' }}>
                    <div><span style={{ color: 'var(--text-muted)' }}>Tarih:</span> <strong>{logistics.shuttle?.date || '-'}</strong></div>
                    <div><span style={{ color: 'var(--text-muted)' }}>Araç Talebi:</span> <strong>{logistics.shuttle?.description || '-'}</strong></div>
                    <div><span style={{ color: 'var(--text-muted)' }}>Kalkış:</span> <strong>{logistics.shuttle?.departurePoint || '-'}</strong> ({logistics.shuttle?.departureTime || '-'})</div>
                    <div><span style={{ color: 'var(--text-muted)' }}>Varış:</span> <strong>{logistics.shuttle?.arrivalPoint || '-'}</strong></div>
                    <div><span style={{ color: 'var(--text-muted)' }}>Dönüş:</span> <strong>{logistics.shuttle?.returnPoint || '-'}</strong> ({logistics.shuttle?.returnTime || '-'})</div>
                    <div><span style={{ color: 'var(--text-muted)' }}>Sorumlu:</span> <strong>{logistics.shuttle?.vehicleManager || '-'}</strong></div>
                  </div>
                  {logistics.shuttle?.adminNote && (
                    <div style={{ marginTop: '1rem', padding: '0.75rem', backgroundColor: 'var(--bg-info-light)', borderRadius: 'var(--radius-sm)', fontSize: '0.875rem', color: 'var(--status-info)' }}>
                      <strong>Yönetici Notu:</strong> {logistics.shuttle.adminNote}
                    </div>
                  )}
                  <div className="no-print" style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
                    <span className={`badge ${logistics.shuttle?.status === 'Onaylandı' ? 'badge-success' : logistics.shuttle?.status === 'Reddedildi' ? 'badge-danger' : 'badge-pending'}`}>
                      {logistics.shuttle?.status || 'Bekliyor'}
                    </span>
                    {canApprove && logistics.shuttle?.status !== 'Onaylandı' && (
                      <button onClick={() => handleLogisticStatus('shuttle', null, 'Onaylandı')} disabled={processing} className="btn btn-outline" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', borderColor: 'var(--status-success)', color: 'var(--status-success)' }}>Onayla</button>
                    )}
                    {canApprove && logistics.shuttle?.status !== 'Reddedildi' && (
                      <button onClick={() => handleLogisticStatus('shuttle', null, 'Reddedildi')} disabled={processing} className="btn btn-outline" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', borderColor: 'var(--status-danger)', color: 'var(--status-danger)' }}>Reddet</button>
                    )}
                  </div>
                </div>
              )}

              {/* Aroma */}
              {logistics.hasAroma && (
                <div style={{ backgroundColor: 'var(--bg-nested, var(--bg-nested))', padding: '1.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                  <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-main)' }}>🌿 Aromaterapi Yağ Talebi</h4>
                  <div style={{ display: 'grid', gap: '1rem' }}>
                    {(logistics.aroma || []).map((a: any, i: number) => (
                      <div key={i} style={{ padding: '1rem', backgroundColor: 'var(--bg-card)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', fontSize: '0.875rem' }}>
                        <div style={{ fontWeight: 600, marginBottom: '0.5rem' }}>{i + 1}. Formülasyon</div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.5rem' }}>
                          <div><span style={{ color: 'var(--text-muted)' }}>Yağlar:</span> {a.oils || '-'}</div>
                          <div><span style={{ color: 'var(--text-muted)' }}>Miktar:</span> {a.amount || '-'}</div>
                          <div><span style={{ color: 'var(--text-muted)' }}>Kişi:</span> {a.peopleCount || '-'}</div>
                        </div>
                        {a.notes && <div style={{ marginTop: '0.5rem', color: 'var(--text-muted)' }}><em>Not: {a.notes}</em></div>}
                        {a.adminNote && (
                          <div style={{ marginTop: '0.75rem', padding: '0.5rem', backgroundColor: 'var(--bg-info-light)', borderRadius: '4px', color: 'var(--status-info)' }}>
                            <strong>Yönetici Notu:</strong> {a.adminNote}
                          </div>
                        )}
                        <div className="no-print" style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px dashed #eaeaea' }}>
                          <span className={`badge ${a.status === 'Onaylandı' ? 'badge-success' : a.status === 'Reddedildi' ? 'badge-danger' : 'badge-pending'}`}>
                            {a.status || 'Bekliyor'}
                          </span>
                          {canApprove && a.status !== 'Onaylandı' && (
                            <button onClick={() => handleLogisticStatus('aroma', i, 'Onaylandı')} disabled={processing} className="btn btn-outline" style={{ padding: '0.2rem 0.4rem', fontSize: '0.7rem', borderColor: 'var(--status-success)', color: 'var(--status-success)' }}>Onayla</button>
                          )}
                          {canApprove && a.status !== 'Reddedildi' && (
                            <button onClick={() => handleLogisticStatus('aroma', i, 'Reddedildi')} disabled={processing} className="btn btn-outline" style={{ padding: '0.2rem 0.4rem', fontSize: '0.7rem', borderColor: 'var(--status-danger)', color: 'var(--status-danger)' }}>Reddet</button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Temel Yaşam Desteği */}
              {logistics.hasBasicLifeSupport && (
                <div style={{ backgroundColor: 'var(--bg-nested, var(--bg-nested))', padding: '1.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                  <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text-main)' }}>🫁 Temel Yaşam Desteği Malzemeleri</h4>
                  <p style={{ fontSize: '0.875rem', margin: 0 }}>{logistics.basicLifeSupportDetailsObj?.text || logistics.basicLifeSupportDetails || 'Detay belirtilmemiş.'}</p>
                  
                  {logistics.basicLifeSupportDetailsObj?.adminNote && (
                    <div style={{ marginTop: '1rem', padding: '0.75rem', backgroundColor: 'var(--bg-info-light)', borderRadius: 'var(--radius-sm)', fontSize: '0.875rem', color: 'var(--status-info)' }}>
                      <strong>Yönetici Notu:</strong> {logistics.basicLifeSupportDetailsObj.adminNote}
                    </div>
                  )}
                  
                  <div className="no-print" style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
                    <span className={`badge ${logistics.basicLifeSupportDetailsObj?.status === 'Onaylandı' ? 'badge-success' : logistics.basicLifeSupportDetailsObj?.status === 'Reddedildi' ? 'badge-danger' : 'badge-pending'}`}>
                      {logistics.basicLifeSupportDetailsObj?.status || 'Bekliyor'}
                    </span>
                    {canApprove && logistics.basicLifeSupportDetailsObj?.status !== 'Onaylandı' && (
                      <button onClick={() => handleLogisticStatus('basicLifeSupport', null, 'Onaylandı')} disabled={processing} className="btn btn-outline" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', borderColor: 'var(--status-success)', color: 'var(--status-success)' }}>Onayla</button>
                    )}
                    {canApprove && logistics.basicLifeSupportDetailsObj?.status !== 'Reddedildi' && (
                      <button onClick={() => handleLogisticStatus('basicLifeSupport', null, 'Reddedildi')} disabled={processing} className="btn btn-outline" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', borderColor: 'var(--status-danger)', color: 'var(--status-danger)' }}>Reddet</button>
                    )}
                  </div>
                </div>
              )}

              {/* İleri Yaşam Desteği */}
              {logistics.hasAdvancedLifeSupport && (
                <div style={{ backgroundColor: 'var(--bg-nested, var(--bg-nested))', padding: '1.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                  <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text-main)' }}>🩺 İleri Yaşam Desteği Malzemeleri</h4>
                  <p style={{ fontSize: '0.875rem', margin: 0 }}>{logistics.advancedLifeSupportDetailsObj?.text || logistics.advancedLifeSupportDetails || 'Detay belirtilmemiş.'}</p>
                  
                  {logistics.advancedLifeSupportDetailsObj?.adminNote && (
                    <div style={{ marginTop: '1rem', padding: '0.75rem', backgroundColor: 'var(--bg-info-light)', borderRadius: 'var(--radius-sm)', fontSize: '0.875rem', color: 'var(--status-info)' }}>
                      <strong>Yönetici Notu:</strong> {logistics.advancedLifeSupportDetailsObj.adminNote}
                    </div>
                  )}
                  
                  <div className="no-print" style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
                    <span className={`badge ${logistics.advancedLifeSupportDetailsObj?.status === 'Onaylandı' ? 'badge-success' : logistics.advancedLifeSupportDetailsObj?.status === 'Reddedildi' ? 'badge-danger' : 'badge-pending'}`}>
                      {logistics.advancedLifeSupportDetailsObj?.status || 'Bekliyor'}
                    </span>
                    {canApprove && logistics.advancedLifeSupportDetailsObj?.status !== 'Onaylandı' && (
                      <button onClick={() => handleLogisticStatus('advancedLifeSupport', null, 'Onaylandı')} disabled={processing} className="btn btn-outline" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', borderColor: 'var(--status-success)', color: 'var(--status-success)' }}>Onayla</button>
                    )}
                    {canApprove && logistics.advancedLifeSupportDetailsObj?.status !== 'Reddedildi' && (
                      <button onClick={() => handleLogisticStatus('advancedLifeSupport', null, 'Reddedildi')} disabled={processing} className="btn btn-outline" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', borderColor: 'var(--status-danger)', color: 'var(--status-danger)' }}>Reddet</button>
                    )}
                  </div>
                </div>
              )}

              {/* Sütur Eğitimi */}
              {logistics.hasSutureTraining && (
                <div style={{ backgroundColor: 'var(--bg-nested, var(--bg-nested))', padding: '1.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                  <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text-main)' }}>🪡 Sütur Eğitimi Malzemeleri</h4>
                  <p style={{ fontSize: '0.875rem', margin: 0 }}>{logistics.sutureTrainingDetailsObj?.text || logistics.sutureTrainingDetails || 'Detay belirtilmemiş.'}</p>
                  
                  {logistics.sutureTrainingDetailsObj?.adminNote && (
                    <div style={{ marginTop: '1rem', padding: '0.75rem', backgroundColor: 'var(--bg-info-light)', borderRadius: 'var(--radius-sm)', fontSize: '0.875rem', color: 'var(--status-info)' }}>
                      <strong>Yönetici Notu:</strong> {logistics.sutureTrainingDetailsObj.adminNote}
                    </div>
                  )}
                  
                  <div className="no-print" style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
                    <span className={`badge ${logistics.sutureTrainingDetailsObj?.status === 'Onaylandı' ? 'badge-success' : logistics.sutureTrainingDetailsObj?.status === 'Reddedildi' ? 'badge-danger' : 'badge-pending'}`}>
                      {logistics.sutureTrainingDetailsObj?.status || 'Bekliyor'}
                    </span>
                    {canApprove && logistics.sutureTrainingDetailsObj?.status !== 'Onaylandı' && (
                      <button onClick={() => handleLogisticStatus('sutureTraining', null, 'Onaylandı')} disabled={processing} className="btn btn-outline" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', borderColor: 'var(--status-success)', color: 'var(--status-success)' }}>Onayla</button>
                    )}
                    {canApprove && logistics.sutureTrainingDetailsObj?.status !== 'Reddedildi' && (
                      <button onClick={() => handleLogisticStatus('sutureTraining', null, 'Reddedildi')} disabled={processing} className="btn btn-outline" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', borderColor: 'var(--status-danger)', color: 'var(--status-danger)' }}>Reddet</button>
                    )}
                  </div>
                </div>
              )}

              {/* Custom Requests */}
              {(logistics.customRequests || []).length > 0 && (
                <div style={{ backgroundColor: 'var(--bg-nested, var(--bg-nested))', padding: '1.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                  <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-main)' }}>â­ Özel Talepler</h4>
                  <div style={{ display: 'grid', gap: '1rem' }}>
                    {(logistics.customRequests || []).map((req: any, i: number) => (
                      <div key={i} style={{ padding: '1rem', backgroundColor: 'var(--bg-card)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', fontSize: '0.875rem' }}>
                        <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{req.name || 'İsimsiz Talep'}</div>
                        <div style={{ color: 'var(--text-muted)' }}>{req.note || '-'}</div>
                        
                        {req.adminNote && (
                          <div style={{ marginTop: '0.75rem', padding: '0.5rem', backgroundColor: 'var(--bg-info-light)', borderRadius: '4px', color: 'var(--status-info)' }}>
                            <strong>Yönetici Notu:</strong> {req.adminNote}
                          </div>
                        )}
                        
                        <div className="no-print" style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px dashed #eaeaea' }}>
                          <span className={`badge ${req.status === 'Onaylandı' ? 'badge-success' : req.status === 'Reddedildi' ? 'badge-danger' : 'badge-pending'}`}>
                            {req.status || 'Bekliyor'}
                          </span>
                          {canApprove && req.status !== 'Onaylandı' && (
                            <button onClick={() => handleLogisticStatus('custom', i, 'Onaylandı')} disabled={processing} className="btn btn-outline" style={{ padding: '0.2rem 0.4rem', fontSize: '0.7rem', borderColor: 'var(--status-success)', color: 'var(--status-success)' }}>Onayla</button>
                          )}
                          {canApprove && req.status !== 'Reddedildi' && (
                            <button onClick={() => handleLogisticStatus('custom', i, 'Reddedildi')} disabled={processing} className="btn btn-outline" style={{ padding: '0.2rem 0.4rem', fontSize: '0.7rem', borderColor: 'var(--status-danger)', color: 'var(--status-danger)' }}>Reddet</button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Extra Notes */}
              {logistics.extraNotes && (
                <div style={{ backgroundColor: 'var(--bg-warning-light)', padding: '1.5rem', borderRadius: 'var(--radius-md)', border: '1px solid #fde68a' }}>
                  <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.5rem', color: '#92400e' }}>📝 Ekstra İletilen Notlar</h4>
                  <p style={{ fontSize: '0.875rem', margin: 0, color: '#b45309' }}>{logistics.extraNotes}</p>
                </div>
              )}

            </div>
          </div>
        )}

        {/* Revision History */}
        {revisions.length > 0 && (
          <div style={{ marginBottom: '2rem', backgroundColor: 'var(--bg-nested, var(--bg-nested))', padding: '1.5rem', borderRadius: 'var(--radius-md)' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Clock size={18} /> Revizyon Geçmişi
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', borderLeft: '2px solid var(--border-color)', paddingLeft: '1rem' }}>
              {revisions.map((rev, idx) => (
                <div key={idx} style={{ position: 'relative' }}>
                  <div style={{ position: 'absolute', width: '10px', height: '10px', backgroundColor: 'var(--color-primary)', borderRadius: '50%', left: '-1.35rem', top: '0.35rem' }}></div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>{new Date(rev.created_at).toLocaleString('tr-TR')}</div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Revize eden: {rev.users?.full_name || 'Birim Sorumlusu'}</div>
                  <div style={{ fontSize: '0.875rem', marginTop: '0.25rem', padding: '0.5rem', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)' }}>
                    <strong>Not:</strong> {rev.revision_notes || 'Not girilmedi.'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* Admin Actions */}
      {canApprove && (
        <div className="card" style={{ marginTop: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--bg-success-light)', border: '1px solid var(--status-success)' }}>
          <div>
            <h4 style={{ margin: '0 0 0.25rem 0', color: '#0f766e', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><AlertTriangle size={18} /> Yönetim İşlemleri</h4>
            <p style={{ margin: 0, fontSize: '0.875rem', color: '#0d9488' }}>Taleplerle ilgili bir not girerek etkinliği onaylayabilir veya reddedebilirsiniz.</p>
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button 
              className="btn btn-outline" 
              style={{ color: 'var(--status-danger)', borderColor: 'var(--status-danger)', backgroundColor: 'var(--bg-card)' }}
              onClick={() => { setPendingStatus('Reddedildi'); setShowAdminNoteModal(true); }}
              disabled={processing || event.status === 'Reddedildi'}
            >
              <X size={16} /> Reddet
            </button>
            <button 
              className="btn btn-primary"
              style={{ backgroundColor: 'var(--status-success)', borderColor: 'var(--status-success)' }}
              onClick={() => { setPendingStatus('Onaylandı'); setShowAdminNoteModal(true); }}
              disabled={processing || event.status === 'Onaylandı'}
            >
              <Check size={16} /> Onayla
            </button>
          </div>
        </div>
      )}

      {PromptModal}
    </div>
  );
}





