'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useRole } from '@/context/RoleContext';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, User, Calendar, Clipboard, Package, Award, Sparkles, MessageCircle, AlertCircle } from 'lucide-react';
import Link from 'next/link';

interface EventData {
  id: string;
  event_name: string;
  event_date: string;
  event_type: string;
  expected_participants: number | null;
  unit_name: string;
  status: string;
}

interface Recommendation {
  id: string;
  candidate_name: string;
  candidate_phone: string;
  candidate_email: string;
  candidate_university: string;
  candidate_department: string;
  candidate_grade: string;
  reason: string;
  created_at: string;
}

interface InventoryRequest {
  id: string;
  talep_tarihi: string;
  gerekli_tarih: string;
  status: string;
  bez_canta: number;
  rozet: number;
  etiket: number;
  defter: number;
  kalem: number;
}

interface RepresentativeProfile {
  id: string;
  full_name: string;
  phone_number: string;
  email: string;
  university: string;
  department: string;
  grade: string;
  region: string;
  role: string;
  created_at: string;
}

export default function RepresentativeDetailPage({ params }: { params: { id: string } }) {
  const { currentRole } = useRole();
  const [profile, setProfile] = useState<RepresentativeProfile | null>(null);
  const [events, setEvents] = useState<EventData[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [inventoryRequests, setInventoryRequests] = useState<InventoryRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Tabs state
  const [activeTab, setActiveTab] = useState<'profile' | 'events' | 'inventory' | 'recommendations'>('profile');

  // New recommendation form modal
  const [isRecModalOpen, setIsRecModalOpen] = useState(false);
  const [recFormData, setRecFormData] = useState({
    name: '',
    phone: '',
    email: '',
    department: '',
    grade: '1. Sınıf',
    reason: ''
  });

  const repId = params.id;

  const fetchAllDetails = async () => {
    try {
      setIsLoading(true);

      // 1. Fetch Representative Profile
      const { data: userProfile, error: profileErr } = await supabase
        .from('users')
        .select('id, full_name, phone_number, email, university, department, grade, region, role, created_at')
        .eq('id', repId)
        .single();

      if (profileErr) throw profileErr;

      // Yetkilendirme: rep_region_manager sadece kendi bölgesindeki temsilcileri görebilir
      if (currentRole === 'rep_region_manager') {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: managerData } = await supabase
            .from('users')
            .select('region')
            .eq('id', user.id)
            .single();
          
          if (managerData && managerData.region !== userProfile?.region) {
            // Farklı bölgedeki temsilci - erişim yasak
            setProfile(null);
            setIsLoading(false);
            return;
          }
        }
      }

      setProfile(userProfile as any);

      // 2. Fetch Representative Events
      const { data: eventData } = await supabase
        .from('events')
        .select('id, event_name, event_date, event_type, expected_participants, unit_name, status')
        .eq('created_by', repId)
        .order('event_date', { ascending: false });

      setEvents(eventData as any || []);

      // 3. Fetch Next-Year Recommendations
      const { data: recData } = await supabase
        .from('representative_recommendations')
        .select('*')
        .eq('recommended_by', repId)
        .order('created_at', { ascending: false });

      setRecommendations(recData as any || []);

      // 4. Fetch Inventory Requests
      const { data: invData } = await supabase
        .from('envanter_requests')
        .select('id, talep_tarihi, gerekli_tarih, status, bez_canta, rozet, etiket, defter, kalem')
        .eq('representative_id', repId)
        .order('talep_tarihi', { ascending: false });

      setInventoryRequests(invData as any || []);

    } catch (err) {
      console.error("Failed to fetch representative details:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (repId) fetchAllDetails();
  }, [repId]);

  // Submit next year representative recommendation
  const handleSubmitRecommendation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    try {
      const { error } = await supabase
        .from('representative_recommendations')
        .insert([
          {
            recommended_by: repId,
            candidate_name: recFormData.name,
            candidate_phone: recFormData.phone,
            candidate_email: recFormData.email,
            candidate_university: profile.university,
            candidate_department: recFormData.department,
            candidate_grade: recFormData.grade,
            reason: recFormData.reason
          }
        ]);

      if (error) throw error;

      setIsRecModalOpen(false);
      setRecFormData({ name: '', phone: '', email: '', department: '', grade: '1. Sınıf', reason: '' });
      fetchAllDetails();
      alert('Gelecek dönem temsilci önerisi başarıyla kaydedildi!');
    } catch (err) {
      console.error("Failed to submit recommendation:", err);
      alert('Öneri kaydedilirken hata oluştu.');
    }
  };

  if (isLoading) {
    return <div style={{ padding: '4rem', textAlign: 'center' }}>Yükleniyor...</div>;
  }

  if (!profile) {
    return (
      <div className="card" style={{ padding: '3rem', textAlign: 'center', maxWidth: '600px', margin: '2rem auto' }}>
        <AlertCircle size={48} color="var(--status-danger)" style={{ margin: '0 auto 1rem' }} />
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem' }}>Temsilci Profili Bulunamadı</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>İstenen kullanıcı ID&apos;sine sahip temsilci kaydına ulaşılamadı.</p>
        <Link href="/dashboard/representatives" className="btn btn-primary">Temsilcilere Dön</Link>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Back button */}
      <div>
        <Link href="/dashboard/representatives" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none', color: 'var(--color-primary)', fontWeight: 600 }}>
          <ArrowLeft size={16} /> Temsilciler Listesine Geri Dön
        </Link>
      </div>

      {/* Main header profile info summary card */}
      <div className="card" style={{ padding: '2rem', display: 'flex', gap: '2rem', alignItems: 'center', flexWrap: 'wrap', borderLeft: '5px solid var(--color-primary)' }}>
        <div style={{ width: '80px', height: '80px', backgroundColor: 'var(--color-primary-light)', color: 'var(--color-primary)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', fontWeight: 700 }}>
          {profile.full_name.charAt(0)}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700 }}>{profile.full_name}</h1>
            <span className="badge badge-success">Aktif Temsilci</span>
            <span className="badge badge-primary" style={{ textTransform: 'uppercase' }}>📍 {profile.region} BÖLGESİ</span>
          </div>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem', fontWeight: 600 }}>
            {profile.university} — {profile.department} ({profile.grade})
          </p>
        </div>

        {/* Action button */}
        <button onClick={() => setIsRecModalOpen(true)} className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          <Sparkles size={16} /> Dönem Sonu Yeni Temsilci Öner
        </button>
      </div>

      {/* Navigation tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid #eaeaea', gap: '1rem', flexWrap: 'wrap' }}>
        {[
          { id: 'profile', label: 'Temsilci Kartı', icon: <User size={16} /> },
          { id: 'events', label: `Etkinlik Geçmişi (${events.length})`, icon: <Calendar size={16} /> },
          { id: 'inventory', label: `Envanter Talepleri (${inventoryRequests.length})`, icon: <Package size={16} /> },
          { id: 'recommendations', label: `Gelecek Dönem Önerileri (${recommendations.length})`, icon: <Award size={16} /> }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '1rem 1.5rem',
              border: 'none',
              background: 'none',
              fontSize: '0.9rem',
              fontWeight: activeTab === tab.id ? 700 : 500,
              color: activeTab === tab.id ? 'var(--color-primary)' : 'var(--text-muted)',
              borderBottom: activeTab === tab.id ? '3px solid var(--color-primary)' : '3px solid transparent',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Contents */}
      <div className="card" style={{ padding: '2rem' }}>
        
        {/* PROFILE TAB */}
        {activeTab === 'profile' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '1.25rem', borderBottom: '1px solid #eaeaea', paddingBottom: '0.5rem' }}>Kişisel & İletişim Bilgileri</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div><span style={{ color: 'var(--text-muted)', width: '120px', display: 'inline-block' }}>E-posta:</span> <strong>{profile.email}</strong></div>
                <div><span style={{ color: 'var(--text-muted)', width: '120px', display: 'inline-block' }}>Telefon:</span> <strong>{profile.phone_number}</strong></div>
                <div><span style={{ color: 'var(--text-muted)', width: '120px', display: 'inline-block' }}>Kayıt Tarihi:</span> <strong>{new Date(profile.created_at).toLocaleDateString('tr-TR')}</strong></div>
              </div>
            </div>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '1.25rem', borderBottom: '1px solid #eaeaea', paddingBottom: '0.5rem' }}>Eğitim ve Görev Bilgileri</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div><span style={{ color: 'var(--text-muted)', width: '120px', display: 'inline-block' }}>Üniversite:</span> <strong>{profile.university}</strong></div>
                <div><span style={{ color: 'var(--text-muted)', width: '120px', display: 'inline-block' }}>Fakülte/Bölüm:</span> <strong>{profile.department}</strong></div>
                <div><span style={{ color: 'var(--text-muted)', width: '120px', display: 'inline-block' }}>Sınıf Düzeyi:</span> <strong>{profile.grade}</strong></div>
              </div>
            </div>
          </div>
        )}

        {/* EVENTS TAB */}
        {activeTab === 'events' && (
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '1.25rem' }}>Temsilcinin Organize Ettiği Etkinlikler</h3>
            {events.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>Temsilci henüz hiçbir etkinlik organize etmedi.</p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #eaeaea', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '0.75rem' }}>Etkinlik Adı</th>
                    <th style={{ padding: '0.75rem' }}>Tarih</th>
                    <th style={{ padding: '0.75rem' }}>Birim</th>
                    <th style={{ padding: '0.75rem' }}>Etkinlik Türü</th>
                    <th style={{ padding: '0.75rem' }}>Kapasite</th>
                    <th style={{ padding: '0.75rem' }}>Durum</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map(ev => (
                    <tr key={ev.id} style={{ borderBottom: '1px solid #eaeaea' }}>
                      <td style={{ padding: '1rem 0.75rem', fontWeight: 600 }}>{ev.event_name}</td>
                      <td style={{ padding: '1rem 0.75rem' }}>{new Date(ev.event_date).toLocaleDateString('tr-TR')}</td>
                      <td style={{ padding: '1rem 0.75rem' }}>{ev.unit_name}</td>
                      <td style={{ padding: '1rem 0.75rem' }}>
                        <span className={`badge ${ev.event_type === 'Ramazan Etkinliği' ? 'badge-warning' : 'badge-neutral'}`}>
                          {ev.event_type}
                        </span>
                      </td>
                      <td style={{ padding: '1rem 0.75rem', fontWeight: 600 }}>{ev.expected_participants || '-'}</td>
                      <td style={{ padding: '1rem 0.75rem' }}>
                        <span className={`badge ${ev.status === 'Onaylandı' || ev.status === 'Gerçekleşti' ? 'badge-success' : 'badge-pending'}`}>{ev.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* INVENTORY TAB */}
        {activeTab === 'inventory' && (
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '1.25rem' }}>Temsilciye Ait Malzeme & Envanter İstekleri</h3>
            {inventoryRequests.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>Temsilciye ait hiçbir malzeme talebi bulunmuyor.</p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #eaeaea', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '0.75rem' }}>Talep Tarihi</th>
                    <th style={{ padding: '0.75rem' }}>Gerekli Tarih</th>
                    <th style={{ padding: '0.75rem' }}>İçerik (Bez Çanta / Rozet / Defter / Kalem)</th>
                    <th style={{ padding: '0.75rem' }}>Durum</th>
                  </tr>
                </thead>
                <tbody>
                  {inventoryRequests.map(inv => (
                    <tr key={inv.id} style={{ borderBottom: '1px solid #eaeaea' }}>
                      <td style={{ padding: '1rem 0.75rem' }}>{new Date(inv.talep_tarihi).toLocaleDateString('tr-TR')}</td>
                      <td style={{ padding: '1rem 0.75rem' }}>{new Date(inv.gerekli_tarih).toLocaleDateString('tr-TR')}</td>
                      <td style={{ padding: '1rem 0.75rem', fontWeight: 600 }}>
                        🛍️ {inv.bez_canta} Bez Çanta | 🏅 {inv.rozet} Rozet | 📝 {inv.defter} Defter | 🖊️ {inv.kalem} Kalem
                      </td>
                      <td style={{ padding: '1rem 0.75rem' }}>
                        <span className={`badge ${
                          inv.status === 'Onaylandı' ? 'badge-success' :
                          inv.status === 'Reddedildi' ? 'badge-danger' : 'badge-pending'
                        }`}>{inv.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* RECOMMENDATIONS TAB */}
        {activeTab === 'recommendations' && (
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '1.25rem' }}>Gelecek Dönem Temsilci Adayı Önerileri</h3>
            {recommendations.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>Temsilci henüz bir sonraki sene için yeni aday önermedi.</p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
                {recommendations.map(rec => (
                  <div key={rec.id} className="card" style={{ padding: '1.5rem', border: '1px solid #eaeaea', position: 'relative' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                      <div style={{ width: '40px', height: '40px', backgroundColor: 'var(--color-primary-light)', color: 'var(--color-primary)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                        {rec.candidate_name.charAt(0)}
                      </div>
                      <div>
                        <h4 style={{ fontWeight: 700 }}>{rec.candidate_name}</h4>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{rec.candidate_department} ({rec.candidate_grade})</div>
                      </div>
                    </div>
                    
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '0.25rem', borderTop: '1px solid #eaeaea', paddingTop: '0.75rem', marginBottom: '0.75rem' }}>
                      <div>📞 Tel: {rec.candidate_phone}</div>
                      <div>✉️ E-posta: {rec.candidate_email}</div>
                    </div>

                    <div style={{ fontSize: '0.85rem', backgroundColor: '#f9fafb', padding: '0.75rem', borderRadius: 'var(--radius-sm)', borderLeft: '3px solid var(--color-primary)' }}>
                      <strong>Gerekçe:</strong> {rec.reason}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>

      {/* Recommendation Form Modal */}
      {isRecModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: '550px', maxHeight: '90vh', overflowY: 'auto' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>🔮 Yeni Dönem Temsilci Adayı Öner</h2>
              <button onClick={() => setIsRecModalOpen(false)} className="btn btn-outline" style={{ padding: '0.25rem 0.5rem' }}>X</button>
            </div>

            <form onSubmit={handleSubmitRecommendation} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label className="label">Aday Adı Soyadı *</label>
                  <input type="text" className="input" required value={recFormData.name} onChange={e => setRecFormData({...recFormData, name: e.target.value})} placeholder="Örn: Ayşe Kaya" />
                </div>
                <div>
                  <label className="label">Aday Telefonu *</label>
                  <input type="text" className="input" required value={recFormData.phone} onChange={e => setRecFormData({...recFormData, phone: e.target.value})} placeholder="Örn: +90 5XX XXX XX XX" />
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <label className="label">Aday E-posta Adresi *</label>
                  <input type="email" className="input" required value={recFormData.email} onChange={e => setRecFormData({...recFormData, email: e.target.value})} placeholder="Örn: ayse@mail.com" />
                </div>
                <div>
                  <label className="label">Aday Bölümü *</label>
                  <input type="text" className="input" required value={recFormData.department} onChange={e => setRecFormData({...recFormData, department: e.target.value})} placeholder="Örn: Eczacılık" />
                </div>
                <div>
                  <label className="label">Aday Sınıfı *</label>
                  <select className="input" required value={recFormData.grade} onChange={e => setRecFormData({...recFormData, grade: e.target.value})}>
                    <option value="Hazırlık">Hazırlık</option>
                    <option value="1. Sınıf">1. Sınıf</option>
                    <option value="2. Sınıf">2. Sınıf</option>
                    <option value="3. Sınıf">3. Sınıf</option>
                    <option value="4. Sınıf">4. Sınıf</option>
                    <option value="Mezun">Mezun</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="label">Önerme Gerekçesi / Açıklama *</label>
                <textarea 
                  className="input" 
                  rows={4} 
                  required 
                  value={recFormData.reason} 
                  onChange={e => setRecFormData({...recFormData, reason: e.target.value})} 
                  placeholder="Bu adayı neden yeni dönem temsilcisi olarak öneriyorsunuz? Kulüp başarıları veya gönüllülük motivasyonu hakkında kısa bilgi verin..."
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <button type="button" onClick={() => setIsRecModalOpen(false)} className="btn btn-outline">İptal</button>
                <button type="submit" className="btn btn-primary">Öneriyi Kaydet</button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}
