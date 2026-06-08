'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useRole } from '@/context/RoleContext';
import { supabase } from '@/lib/supabase';
import { Calendar, Plus, Users, Eye, CheckCircle, XCircle, Clock, BookOpen } from 'lucide-react';

interface BursaryEvent {
  id: string;
  title: string;
  description: string;
  event_date: string;
  location: string;
  created_at: string;
}

interface Attendance {
  id: string;
  user_id: string;
  rsvp_status: string;
  excuse_text: string | null;
  has_attended: boolean;
  users: {
    full_name: string;
    club_role: string | null;
  };
}

export default function BursaryAdminPage() {
  const { currentRole, user } = useRole();
  const [events, setEvents] = useState<BursaryEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Create Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    event_date: '',
    event_time: '',
    location: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Detail Modal State
  const [selectedEvent, setSelectedEvent] = useState<BursaryEvent | null>(null);
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('bursary_events')
        .select('*')
        .order('event_date', { ascending: false });

      if (error) throw error;
      setEvents(data || []);
    } catch (err: any) {
      console.error('Events load error:', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const combinedDate = new Date(`${formData.event_date}T${formData.event_time}:00`).toISOString();

      const { data: eventData, error } = await supabase
        .from('bursary_events')
        .insert([{
          title: formData.title,
          description: formData.description,
          event_date: combinedDate,
          location: formData.location,
          created_by: user?.id
        }])
        .select()
        .single();

      if (error) throw error;

      // Bildirim E-postası Gönderme (Bursiyerlere)
      try {
        const { data: bursaryUsers } = await supabase
          .from('users')
          .select('email')
          .eq('role', 'bursary_student');

        if (bursaryUsers && bursaryUsers.length > 0) {
          const emails = bursaryUsers.map(u => u.email).filter(Boolean);
          
          if (emails.length > 0) {
            // Asenkron gönder (Fire and forget)
            fetch('/api/send-email', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                to: emails.join(','),
                subject: `YENİ BURSİYER ETKİNLİĞİ: ${formData.title}`,
                html: `
                  <div style="font-family: sans-serif; line-height: 1.6; color: #333;">
                    <h2>Yeni Bursiyer Etkinliği: ${formData.title}</h2>
                    <p><strong>Tarih:</strong> ${new Date(combinedDate).toLocaleString('tr-TR')}</p>
                    <p><strong>Mekan:</strong> ${formData.location}</p>
                    <p><strong>Açıklama:</strong><br/>${formData.description}</p>
                    <br/>
                    <p>Lütfen sisteme giriş yaparak etkinliğe katılım durumunuzu (RSVP) ve mazeretiniz varsa mazeret beyanınızı gerçekleştiriniz.</p>
                    <p><a href="https://cansagligi-etkinlik.vercel.app/dashboard/bursary-panel" style="background: #16a34a; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Sisteme Giriş Yap</a></p>
                  </div>
                `
              })
            }).catch(e => console.error("Email API Hatası:", e));
          }
        }
      } catch (emailErr) {
        console.error("Email hazırlık hatası:", emailErr);
      }

      setIsCreateModalOpen(false);
      setFormData({ title: '', description: '', event_date: '', event_time: '', location: '' });
      fetchEvents();
      alert('Etkinlik başarıyla oluşturuldu ve bursiyerlere e-posta bildirimi kuyruğa alındı.');
    } catch (err: any) {
      alert('Hata: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEventDetails = async (ev: BursaryEvent) => {
    setSelectedEvent(ev);
    setIsLoadingDetails(true);
    try {
      // Fetch attendances with user details
      const { data, error } = await supabase
        .from('bursary_attendances')
        .select('id, rsvp_status, excuse_text, has_attended, user_id')
        .eq('event_id', ev.id);

      if (error) throw error;

      // Tüm bursiyerleri de çekip RSVP yapmayanları 'pending' olarak gösterebiliriz
      const { data: allBursary } = await supabase
        .from('users')
        .select('id, full_name, club_role')
        .eq('role', 'bursary_student');

      const attendanceMap = new Map();
      (data || []).forEach(a => attendanceMap.set(a.user_id, a));

      const finalAttendances: Attendance[] = (allBursary || []).map(u => {
        const existing = attendanceMap.get(u.id);
        if (existing) {
          return {
            id: existing.id,
            user_id: u.id,
            rsvp_status: existing.rsvp_status,
            excuse_text: existing.excuse_text,
            has_attended: existing.has_attended,
            users: { full_name: u.full_name, club_role: u.club_role }
          };
        } else {
          return {
            id: 'temp-' + u.id,
            user_id: u.id,
            rsvp_status: 'pending',
            excuse_text: null,
            has_attended: false,
            users: { full_name: u.full_name, club_role: u.club_role }
          };
        }
      });

      setAttendances(finalAttendances);
    } catch (err: any) {
      console.error(err);
      alert('Detaylar yüklenirken hata oluştu.');
    } finally {
      setIsLoadingDetails(false);
    }
  };

  if (currentRole !== 'general_admin' && currentRole !== 'rep_head') {
    return <div style={{ padding: '2rem' }}>Bu sayfayı görüntüleme yetkiniz yok.</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', paddingBottom: '4rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <BookOpen size={28} /> Bursiyer Takip (Admin)
          </h1>
          <p style={{ color: 'var(--text-muted)' }}>Bursiyerlere özel zorunlu etkinlikler oluşturun ve katılımlarını takip edin.</p>
        </div>
        <button onClick={() => setIsCreateModalOpen(true)} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Plus size={18} /> Yeni Etkinlik
        </button>
      </div>

      <div className="card" style={{ padding: '2rem' }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem' }}>Oluşturulan Etkinlikler</h3>
        
        {isLoading ? (
          <div style={{ padding: '2rem', textAlign: 'center' }}>Yükleniyor...</div>
        ) : events.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Henüz hiçbir etkinlik oluşturulmamış.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #eaeaea' }}>
                  <th style={{ padding: '1rem 0.5rem' }}>Etkinlik Adı</th>
                  <th style={{ padding: '1rem 0.5rem' }}>Tarih</th>
                  <th style={{ padding: '1rem 0.5rem' }}>Mekan</th>
                  <th style={{ padding: '1rem 0.5rem', textAlign: 'right' }}>İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {events.map(ev => (
                  <tr key={ev.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '1rem 0.5rem', fontWeight: 600 }}>{ev.title}</td>
                    <td style={{ padding: '1rem 0.5rem' }}>{new Date(ev.event_date).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' })}</td>
                    <td style={{ padding: '1rem 0.5rem' }}>{ev.location}</td>
                    <td style={{ padding: '1rem 0.5rem', textAlign: 'right' }}>
                      <button onClick={() => openEventDetails(ev)} className="btn btn-outline" style={{ padding: '0.5rem', color: 'var(--color-primary)', borderColor: 'var(--color-primary-light)' }}>
                        <Eye size={18} /> Raporları Gör
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE MODAL */}
      {isCreateModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Yeni Bursiyer Etkinliği</h2>
              <button onClick={() => setIsCreateModalOpen(false)} className="btn btn-outline" style={{ padding: '0.25rem 0.5rem' }}>X</button>
            </div>

            <form onSubmit={handleCreateEvent} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label className="label">Etkinlik Başlığı *</label>
                <input type="text" required className="input" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
              </div>
              <div>
                <label className="label">Açıklama (Zorunlu İçerik vb.)</label>
                <textarea className="input" rows={3} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label className="label">Tarih *</label>
                  <input type="date" required className="input" value={formData.event_date} onChange={e => setFormData({...formData, event_date: e.target.value})} />
                </div>
                <div>
                  <label className="label">Saat *</label>
                  <input type="time" required className="input" value={formData.event_time} onChange={e => setFormData({...formData, event_time: e.target.value})} />
                </div>
              </div>
              <div>
                <label className="label">Mekan *</label>
                <input type="text" required className="input" placeholder="Örn: Vakıf Merkezi" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <button type="button" onClick={() => setIsCreateModalOpen(false)} className="btn btn-outline">İptal</button>
                <button type="submit" disabled={isSubmitting} className="btn btn-primary">{isSubmitting ? 'Kaydediliyor...' : 'Oluştur ve Bildirim Gönder'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DETAILS MODAL */}
      {selectedEvent && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: '900px', maxHeight: '90vh', overflowY: 'auto' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
              <div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Rapor: {selectedEvent.title}</h2>
                <p style={{ color: 'var(--text-muted)' }}>{new Date(selectedEvent.event_date).toLocaleString('tr-TR', { dateStyle: 'long', timeStyle: 'short' })} • {selectedEvent.location}</p>
              </div>
              <button onClick={() => setSelectedEvent(null)} className="btn btn-outline" style={{ padding: '0.25rem 0.5rem' }}>X</button>
            </div>

            {/* İstatistikler */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
              <div style={{ backgroundColor: '#f9fafb', padding: '1rem', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', fontWeight: 700 }}>{attendances.length}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Toplam Bursiyer</div>
              </div>
              <div style={{ backgroundColor: '#ecfdf5', padding: '1rem', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--status-success)' }}>{attendances.filter(a => a.rsvp_status === 'attending').length}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--status-success)' }}>Katılacağım Diyenler</div>
              </div>
              <div style={{ backgroundColor: '#fef2f2', padding: '1rem', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--status-danger)' }}>{attendances.filter(a => a.rsvp_status === 'not_attending').length}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--status-danger)' }}>Mazeret Bildirenler</div>
              </div>
              <div style={{ backgroundColor: '#eff6ff', padding: '1rem', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', fontWeight: 700, color: '#3b82f6' }}>{attendances.filter(a => a.has_attended).length}</div>
                <div style={{ fontSize: '0.75rem', color: '#3b82f6' }}>Fiilen Katılanlar</div>
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table className="table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #eaeaea' }}>
                    <th style={{ padding: '1rem 0.5rem' }}>Bursiyer</th>
                    <th style={{ padding: '1rem 0.5rem' }}>Kulüp Görevi</th>
                    <th style={{ padding: '1rem 0.5rem' }}>RSVP Durumu</th>
                    <th style={{ padding: '1rem 0.5rem', width: '30%' }}>Mazeret (Varsa)</th>
                    <th style={{ padding: '1rem 0.5rem', textAlign: 'center' }}>Fiili Katılım Yoklaması</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoadingDetails ? (
                    <tr><td colSpan={5} style={{ padding: '2rem', textAlign: 'center' }}>Yükleniyor...</td></tr>
                  ) : attendances.length === 0 ? (
                    <tr><td colSpan={5} style={{ padding: '2rem', textAlign: 'center' }}>Sistemde bursiyer bulunamadı.</td></tr>
                  ) : (
                    attendances.map(a => (
                      <tr key={a.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                        <td style={{ padding: '1rem 0.5rem', fontWeight: 600 }}>{a.users?.full_name}</td>
                        <td style={{ padding: '1rem 0.5rem' }}>{a.users?.club_role || '-'}</td>
                        <td style={{ padding: '1rem 0.5rem' }}>
                          {a.rsvp_status === 'attending' && <span className="badge badge-success"><CheckCircle size={14} style={{display:'inline', marginRight:'4px'}}/> Katılacak</span>}
                          {a.rsvp_status === 'not_attending' && <span className="badge badge-danger"><XCircle size={14} style={{display:'inline', marginRight:'4px'}}/> Katılmayacak</span>}
                          {a.rsvp_status === 'pending' && <span className="badge badge-warning"><Clock size={14} style={{display:'inline', marginRight:'4px'}}/> Bekleniyor</span>}
                        </td>
                        <td style={{ padding: '1rem 0.5rem', fontStyle: 'italic', color: 'var(--text-muted)' }}>
                          {a.excuse_text || '-'}
                        </td>
                        <td style={{ padding: '1rem 0.5rem', textAlign: 'center' }}>
                          {a.has_attended ? (
                            <span style={{ color: 'var(--status-success)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                              <CheckCircle size={16} /> Katıldı
                            </span>
                          ) : (
                            <span style={{ color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                              <XCircle size={16} /> Yok
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
