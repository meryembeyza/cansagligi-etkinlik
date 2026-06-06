'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useRole } from '@/context/RoleContext';
import { supabase } from '@/lib/supabase';
import { Package, Plus, ClipboardList, CheckCircle2, Search, Edit2, Phone, Briefcase, FileText, Check, X, ShieldAlert } from 'lucide-react';

interface EnvanterRequest {
  id: string;
  representative_id: string;
  talep_tarihi: string;
  gerekli_tarih: string;
  is_kulup: boolean;
  status: string; // 'Onay Bekliyor', 'Onaylandı', 'Reddedildi', 'Rapor Bekleniyor', 'Tamamlandı'
  bez_canta: number;
  etiket: number;
  rozet: number;
  cepli_dosya: number;
  defter: number;
  kalem: number;
  brosur: number;
  other_items_json: any[];
  notes: string | null;
  created_at: string;
  requester_user?: {
    full_name: string;
    phone_number: string;
    university: string;
    region: string;
  };
  envanter_usage_report?: {
    id: string;
    katilimci_sayisi: number;
    kullanilan_items_json: any;
  } | null;
}

const REGIONS = [
  'Akdeniz', 'Doğu Anadolu', 'Ege', 'Güneydoğu Anadolu', 'Ankara', 'İç Anadolu', 'Karadeniz', 'İstanbul Anadolu', 'İstanbul Avrupa', 'Marmara'
];

export default function V4InventoryPage() {
  const { currentRole, userData, user } = useRole();
  const [requests, setRequests] = useState<EnvanterRequest[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<EnvanterRequest[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [activeRequest, setActiveRequest] = useState<EnvanterRequest | null>(null);

  // New Request form state
  const [gerekliTarih, setGerekliTarih] = useState('');
  const [isKulup, setIsKulup] = useState(true);
  const [materials, setMaterials] = useState({
    bezCanta: 0,
    etiket: 0,
    rozet: 0,
    cepliDosya: 0,
    defter: 0,
    kalem: 0,
    brosur: 0
  });
  const [notes, setNotes] = useState('');

  // Usage Report form state
  const [selectedEventId, setSelectedEventId] = useState('');
  const [participantCount, setParticipantCount] = useState(0);
  const [usageStats, setUsageStats] = useState<any>({});

  // Review status
  const [reviewStatus, setReviewStatus] = useState('Onaylandı');

  const isRepresentative = currentRole === 'representative';
  const isRegionManager = currentRole === 'rep_region_manager';
  const isCoordinator = currentRole === 'rep_coordinator';
  const isPresident = currentRole === 'rep_head' || currentRole === 'general_admin';
  const userRegion = userData?.region || '';

  const fetchRequestsAndData = async () => {
    try {
      setIsLoading(true);

      // 1. Fetch envanter requests along with user metadata
      const { data, error } = await supabase
        .from('envanter_requests')
        .select(`
          *,
          requester_user:representative_id (full_name, phone_number, university, region),
          envanter_usage_report(id, katilimci_sayisi, kullanilan_items_json)
        `)
        .order('talep_tarihi', { ascending: false });

      if (error) throw error;

      // Safe mapping to prevent nested reading locks
      const mapped = (data || []).map((req: any) => ({
        ...req,
        requester_user: req.requester_user ? {
          full_name: req.requester_user.full_name,
          phone_number: req.requester_user.phone_number,
          university: req.requester_user.university,
          region: req.requester_user.region
        } : undefined,
        envanter_usage_report: req.envanter_usage_report && req.envanter_usage_report.length > 0
          ? req.envanter_usage_report[0]
          : null
      }));

      // Apply Region Sorumlusu visual isolation (RLS also covers this)
      let finalData = mapped;
      if (isRegionManager && userRegion) {
        finalData = mapped.filter((r: any) => r.requester_user?.region?.toLowerCase() === userRegion.toLowerCase());
      } else if (isRepresentative) {
        finalData = mapped.filter((r: any) => r.representative_id === user?.id);
      }

      setRequests(finalData);

      // 2. Fetch representative's events for the usage report dropdown
      if (isRepresentative && user) {
        const { data: eventData } = await supabase
          .from('events')
          .select('id, event_name, event_date')
          .eq('created_by', user.id);
        setEvents(eventData || []);
      }

    } catch (err) {
      console.error("Failed to load envanter data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRequestsAndData();
  }, [currentRole, userRegion, user]);

  // Filters application
  useEffect(() => {
    let result = [...requests];

    if (selectedRegion && !isRegionManager) {
      result = result.filter(r => r.requester_user?.region?.toLowerCase() === selectedRegion.toLowerCase());
    }

    if (selectedStatus) {
      result = result.filter(r => r.status === selectedStatus);
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(r => 
        r.requester_user?.full_name?.toLowerCase().includes(q) ||
        r.requester_user?.university?.toLowerCase().includes(q) ||
        r.notes?.toLowerCase().includes(q)
      );
    }

    setFilteredRequests(result);
  }, [requests, selectedRegion, selectedStatus, searchQuery]);

  // Handle request submission
  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gerekliTarih) {
      alert('Lütfen gerekli tarihi seçin.');
      return;
    }

    try {
      const { error } = await supabase
        .from('envanter_requests')
        .insert([
          {
            representative_id: user?.id,
            gerekli_tarih: new Date(gerekliTarih).toISOString(),
            is_kulup: isKulup,
            status: 'Onay Bekliyor',
            bez_canta: materials.bezCanta,
            etiket: materials.etiket,
            rozet: materials.rozet,
            cepli_dosya: materials.cepliDosya,
            defter: materials.defter,
            kalem: materials.kalem,
            brosur: materials.brosur,
            notes: notes
          }
        ]);

      if (error) throw error;

      setIsAddModalOpen(false);
      setMaterials({ bezCanta: 0, etiket: 0, rozet: 0, cepliDosya: 0, defter: 0, kalem: 0, brosur: 0 });
      setNotes('');
      setGerekliTarih('');
      fetchRequestsAndData();
      alert('Malzeme talebiniz başarıyla Koordinasyon Birimine gönderildi!');
    } catch (err) {
      console.error("Create request error:", err);
      alert('Talep gönderilirken hata oluştu.');
    }
  };

  // Open review modal
  const openReviewModal = (req: EnvanterRequest) => {
    setActiveRequest(req);
    setReviewStatus(req.status === 'Onay Bekliyor' ? 'Onaylandı' : req.status);
    setIsReviewModalOpen(true);
  };

  // Submit review / approval
  const handleSaveReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRequest) return;

    try {
      // If approved, status goes to 'Rapor Bekleniyor' so representative can log the usage after the event!
      const statusValue = reviewStatus === 'Onaylandı' ? 'Rapor Bekleniyor' : reviewStatus;

      const { error } = await supabase
        .from('envanter_requests')
        .update({ status: statusValue })
        .eq('id', activeRequest.id);

      if (error) throw error;

      setIsReviewModalOpen(false);
      fetchRequestsAndData();
      alert('Talebin onay/red durumu başarıyla güncellendi!');
    } catch (err) {
      console.error("Save review error:", err);
      alert('Kaydedilirken hata oluştu.');
    }
  };

  // Open usage report modal
  const openReportModal = (req: EnvanterRequest) => {
    setActiveRequest(req);
    setSelectedEventId(events[0]?.id || '');
    setParticipantCount(0);
    setUsageStats({
      bezCanta: { used: 0, remaining: req.bez_canta, notes: '' },
      etiket: { used: 0, remaining: req.etiket, notes: '' },
      rozet: { used: 0, remaining: req.rozet, notes: '' },
      cepliDosya: { used: 0, remaining: req.cepli_dosya, notes: '' },
      defter: { used: 0, remaining: req.defter, notes: '' },
      kalem: { used: 0, remaining: req.kalem, notes: '' },
      brosur: { used: 0, remaining: req.brosur, notes: '' }
    });
    setIsReportModalOpen(true);
  };

  // Submit usage report
  const handleSaveUsageReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRequest || !selectedEventId) {
      alert('Lütfen geçerli bir etkinlik seçin.');
      return;
    }

    try {
      // 1. Insert Usage Report
      const { error: reportErr } = await supabase
        .from('envanter_usage_report')
        .insert([
          {
            envanter_request_id: activeRequest.id,
            event_id: selectedEventId,
            katilimci_sayisi: participantCount,
            kullanilan_items_json: usageStats
          }
        ]);

      if (reportErr) throw reportErr;

      // 2. Mark request as 'Tamamlandı'
      const { error: reqErr } = await supabase
        .from('envanter_requests')
        .update({ status: 'Tamamlandı' })
        .eq('id', activeRequest.id);

      if (reqErr) throw reqErr;

      setIsReportModalOpen(false);
      fetchRequestsAndData();
      alert('Envanter kullanım raporunuz başarıyla sisteme kaydedildi!');
    } catch (err) {
      console.error("Save usage report error:", err);
      alert('Rapor kaydedilirken hata oluştu.');
    }
  };

  // Stats calculation
  const totalRequests = requests.length;
  const pendingCount = requests.filter(r => r.status === 'Onay Bekliyor').length;
  const activeReportPending = requests.filter(r => r.status === 'Rapor Bekleniyor').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            📦 Envanter Talepleri & Kullanım Takibi
          </h1>
          <p style={{ color: 'var(--text-muted)' }}>Cansağlığı kulüp tanıtımları, stantları ve etkinlikleri için malzeme lojistik modülü</p>
        </div>
        {isRepresentative && (
          <button onClick={() => setIsAddModalOpen(true)} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <Plus size={18} /> Malzeme Talep Formu Aç
          </button>
        )}
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem' }}>
        <div className="card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', borderLeft: '4px solid var(--color-primary)' }}>
          <div style={{ padding: '0.5rem', backgroundColor: 'var(--color-primary-light)', borderRadius: 'var(--radius-md)' }}>
            <Package size={20} color="var(--color-primary)" />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Toplam Kayıt</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{totalRequests} Talep</div>
          </div>
        </div>

        <div className="card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', borderLeft: '4px solid #f59e0b' }}>
          <div style={{ padding: '0.5rem', backgroundColor: '#fef3c7', borderRadius: 'var(--radius-md)' }}>
            <ClipboardList size={20} color="#f59e0b" />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Onay Bekleyenler</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f59e0b' }}>{pendingCount} Talep</div>
          </div>
        </div>

        <div className="card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', borderLeft: '4px solid #3b82f6' }}>
          <div style={{ padding: '0.5rem', backgroundColor: '#dbeafe', borderRadius: 'var(--radius-md)' }}>
            <FileText size={20} color="#3b82f6" />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Kullanım Raporu Bekleyen</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#3b82f6' }}>{activeReportPending} Temsilci</div>
          </div>
        </div>
      </div>

      {/* Filter panel */}
      <div className="card" style={{ padding: '1.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        <div>
          <label className="label">Üniversite / Temsilci Ara</label>
          <div style={{ position: 'relative' }}>
            <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />
            <input 
              type="text" 
              className="input" 
              placeholder="Aratın..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ paddingLeft: '2.25rem' }}
            />
          </div>
        </div>

        {!isRegionManager && !isRepresentative && (
          <div>
            <label className="label">Bölge</label>
            <select className="input" value={selectedRegion} onChange={e => setSelectedRegion(e.target.value)}>
              <option value="">Tüm Bölgeler</option>
              {REGIONS.map(reg => (
                <option key={reg} value={reg}>{reg.toUpperCase()}</option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="label">Durum</label>
          <select className="input" value={selectedStatus} onChange={e => setSelectedStatus(e.target.value)}>
            <option value="">Tümü</option>
            <option value="Onay Bekliyor">Onay Bekliyor</option>
            <option value="Rapor Bekleniyor">Rapor Bekleniyor (Onaylı)</option>
            <option value="Tamamlandı">Tamamlandı (Raporlu)</option>
            <option value="Reddedildi">Reddedildi</option>
          </select>
        </div>
      </div>

      {/* List table */}
      <div className="card" style={{ padding: '2rem' }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem' }}>📋 Malzeme Talep Başvuruları</h3>

        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '3rem' }}>Yükleniyor...</div>
        ) : filteredRequests.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
            Herhangi bir envanter talebi bulunamadı.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #eaeaea' }}>
                  <th style={{ padding: '1rem 0.5rem' }}>Talep Eden / Üniversite</th>
                  <th style={{ padding: '1rem 0.5rem' }}>Gerekli Tarih</th>
                  <th style={{ padding: '1rem 0.5rem' }}>Tür</th>
                  <th style={{ padding: '1rem 0.5rem', width: '35%' }}>Talep Edilen Malzemeler</th>
                  <th style={{ padding: '1rem 0.5rem' }}>Onay Durumu</th>
                  <th style={{ padding: '1rem 0.5rem', textAlign: 'right' }}>İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {filteredRequests.map(req => (
                  <tr key={req.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '1rem 0.5rem' }}>
                      <div style={{ fontWeight: 600 }}>{req.requester_user?.full_name || 'Temsilci'}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{req.requester_user?.university} ({req.requester_user?.region?.toUpperCase()})</div>
                    </td>
                    <td style={{ padding: '1rem 0.5rem' }}>
                      <div>{new Date(req.gerekli_tarih).toLocaleDateString('tr-TR')}</div>
                    </td>
                    <td style={{ padding: '1rem 0.5rem' }}>
                      <span className={`badge ${req.is_kulup ? 'badge-primary' : 'badge-neutral'}`}>
                        {req.is_kulup ? 'Kulüp' : 'Topluluk'}
                      </span>
                    </td>
                    <td style={{ padding: '1rem 0.5rem' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.25rem', fontSize: '0.8rem' }}>
                        {req.bez_canta > 0 && <div>🛍️ Bez Çanta: <strong>{req.bez_canta}</strong></div>}
                        {req.rozet > 0 && <div>🏅 Rozet: <strong>{req.rozet}</strong></div>}
                        {req.etiket > 0 && <div>🏷️ Etiket: <strong>{req.etiket}</strong></div>}
                        {req.cepli_dosya > 0 && <div>📂 Cepli Dosya: <strong>{req.cepli_dosya}</strong></div>}
                        {req.defter > 0 && <div>📓 Defter: <strong>{req.defter}</strong></div>}
                        {req.kalem > 0 && <div>🖋️ Kalem: <strong>{req.kalem}</strong></div>}
                        {req.brosur > 0 && <div>📄 Broşür: <strong>{req.brosur}</strong></div>}
                      </div>
                      {req.notes && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem', fontStyle: 'italic' }}>
                          Not: &quot;{req.notes}&quot;
                        </div>
                      )}
                      
                      {/* Render usage report summary if finished */}
                      {req.envanter_usage_report && (
                        <div style={{ marginTop: '0.5rem', padding: '0.5rem', backgroundColor: '#f0fdf4', borderRadius: '4px', borderLeft: '3px solid #16a34a', fontSize: '0.75rem' }}>
                          📊 <strong>Kullanım Raporu Girildi:</strong> Fiili Katılımcı: {req.envanter_usage_report.katilimci_sayisi} Kişi
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '1rem 0.5rem' }}>
                      <span className={`badge ${
                        req.status === 'Tamamlandı' ? 'badge-success' :
                        req.status === 'Reddedildi' ? 'badge-danger' :
                        req.status === 'Rapor Bekleniyor' ? 'badge-primary' : 'badge-warning'
                      }`}>
                        {req.status === 'Rapor Bekleniyor' ? 'Onaylandı (Rapor Bekliyor)' : req.status}
                      </span>
                    </td>
                    <td style={{ padding: '1rem 0.5rem', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.35rem' }}>
                        {req.requester_user?.phone_number && (
                          <a 
                            href={`https://wa.me/${req.requester_user.phone_number.replace(/[^0-9]/g, '')}`} 
                            target="_blank" 
                            rel="noreferrer"
                            className="btn btn-outline"
                            title="Temsilciyle WhatsApp"
                            style={{ padding: '0.35rem', color: '#25d366', borderColor: '#bbf7d0' }}
                          >
                            <Phone size={16} />
                          </a>
                        )}
                        {(isCoordinator || isPresident) && req.status === 'Onay Bekliyor' && (
                          <button 
                            onClick={() => openReviewModal(req)}
                            className="btn btn-outline" 
                            title="Talebi İncele / Onayla"
                            style={{ padding: '0.35rem', color: 'var(--color-primary)', borderColor: 'var(--color-primary-light)' }}
                          >
                            <Edit2 size={16} />
                          </button>
                        )}
                        {isRepresentative && req.status === 'Rapor Bekleniyor' && (
                          <button 
                            onClick={() => openReportModal(req)}
                            className="btn btn-primary"
                            style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                          >
                            <FileText size={14} /> Rapor Gir
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Request Modal */}
      {isAddModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: '650px', maxHeight: '90vh', overflowY: 'auto' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>➕ Yeni Envanter Talebi Oluştur</h2>
              <button onClick={() => setIsAddModalOpen(false)} className="btn btn-outline" style={{ padding: '0.25rem 0.5rem' }}>X</button>
            </div>

            <form onSubmit={handleCreateRequest} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label className="label">Gerekli Olduğu Tarih *</label>
                  <input type="date" required className="input" min={new Date().toISOString().split('T')[0]} value={gerekliTarih} onChange={e => setGerekliTarih(e.target.value)} />
                </div>
                <div>
                  <label className="label">Türü *</label>
                  <select className="input" value={isKulup ? 'true' : 'false'} onChange={e => setIsKulup(e.target.value === 'true')}>
                    <option value="true">Kulüp</option>
                    <option value="false">Topluluk</option>
                  </select>
                </div>
              </div>

              {/* V4 Material selection grid */}
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', borderBottom: '1px solid #eaeaea', paddingBottom: '0.25rem' }}>İstenen Malzemeler (Adet)</h3>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label className="label">🛍️ Bez Çanta</label>
                    <input type="number" min={0} className="input" value={materials.bezCanta} onChange={e => setMaterials({...materials, bezCanta: parseInt(e.target.value) || 0})} />
                  </div>
                  <div>
                    <label className="label">🏷️ Etiket</label>
                    <input type="number" min={0} className="input" value={materials.etiket} onChange={e => setMaterials({...materials, etiket: parseInt(e.target.value) || 0})} />
                  </div>
                  <div>
                    <label className="label">🏅 Rozet</label>
                    <input type="number" min={0} className="input" value={materials.rozet} onChange={e => setMaterials({...materials, rozet: parseInt(e.target.value) || 0})} />
                  </div>
                  <div>
                    <label className="label">📂 Cepli Dosya</label>
                    <input type="number" min={0} className="input" value={materials.cepliDosya} onChange={e => setMaterials({...materials, cepliDosya: parseInt(e.target.value) || 0})} />
                  </div>
                  <div>
                    <label className="label">📓 Defter</label>
                    <input type="number" min={0} className="input" value={materials.defter} onChange={e => setMaterials({...materials, defter: parseInt(e.target.value) || 0})} />
                  </div>
                  <div>
                    <label className="label">🖊️ Kalem</label>
                    <input type="number" min={0} className="input" value={materials.kalem} onChange={e => setMaterials({...materials, kalem: parseInt(e.target.value) || 0})} />
                  </div>
                  <div style={{ gridColumn: 'span 3' }}>
                    <label className="label">📄 Gönüllülük Broşürü</label>
                    <input type="number" min={0} className="input" value={materials.brosur} onChange={e => setMaterials({...materials, brosur: parseInt(e.target.value) || 0})} />
                  </div>
                </div>
              </div>

              <div>
                <label className="label">Kullanım Amacı / Özel İstekler</label>
                <textarea 
                  className="input" 
                  rows={3} 
                  value={notes} 
                  onChange={e => setNotes(e.target.value)} 
                  placeholder="Hangi etkinlikte kullanacağınızı ve varsa diğer özel malzeme isteklerinizi yazın..."
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <button type="button" onClick={() => setIsAddModalOpen(false)} className="btn btn-outline">İptal</button>
                <button type="submit" className="btn btn-primary">Talebi Gönder</button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* Review Modal */}
      {isReviewModalOpen && activeRequest && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: '500px' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>İnceleme: {activeRequest.requester_user?.full_name}</h2>
              <button onClick={() => setIsReviewModalOpen(false)} className="btn btn-outline" style={{ padding: '0.25rem 0.5rem' }}>X</button>
            </div>

            <form onSubmit={handleSaveReview} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              <div style={{ backgroundColor: '#f9fafb', padding: '1rem', borderRadius: 'var(--radius-md)', fontSize: '0.85rem' }}>
                <strong>Talep Edilen Malzemeler:</strong>
                <ul style={{ paddingLeft: '1.25rem', marginTop: '0.25rem' }}>
                  {activeRequest.bez_canta > 0 && <li>Bez Çanta: {activeRequest.bez_canta} Adet</li>}
                  {activeRequest.rozet > 0 && <li>Rozet: {activeRequest.rozet} Adet</li>}
                  {activeRequest.etiket > 0 && <li>Etiket: {activeRequest.etiket} Adet</li>}
                  {activeRequest.defter > 0 && <li>Defter: {activeRequest.defter} Adet</li>}
                  {activeRequest.kalem > 0 && <li>Kalem: {activeRequest.kalem} Adet</li>}
                </ul>
              </div>

              <div>
                <label className="label">Karar / Durum *</label>
                <select className="input" value={reviewStatus} onChange={e => setReviewStatus(e.target.value)}>
                  <option value="Onaylandı">Talebi Onayla (Gönderim Aşaması)</option>
                  <option value="Reddedildi">Talebi Reddet</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <button type="button" onClick={() => setIsReviewModalOpen(false)} className="btn btn-outline">Vazgeç</button>
                <button type="submit" className="btn btn-primary">Kaydet</button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* Usage Report Modal */}
      {isReportModalOpen && activeRequest && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: '650px', maxHeight: '90vh', overflowY: 'auto' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>📊 Envanter Kullanım Raporu</h2>
              <button onClick={() => setIsReportModalOpen(false)} className="btn btn-outline" style={{ padding: '0.25rem 0.5rem' }}>X</button>
            </div>

            <form onSubmit={handleSaveUsageReport} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label className="label">İlgili Etkinlik *</label>
                  <select className="input" required value={selectedEventId} onChange={e => setSelectedEventId(e.target.value)}>
                    <option value="">Seçiniz...</option>
                    {events.map(ev => (
                      <option key={ev.id} value={ev.id}>{ev.event_name} ({new Date(ev.event_date).toLocaleDateString('tr-TR')})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Gerçekleşen Katılımcı Sayısı *</label>
                  <input type="number" min={0} required className="input" value={participantCount} onChange={e => setParticipantCount(parseInt(e.target.value) || 0)} />
                </div>
              </div>

              {/* Usage tables */}
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', borderBottom: '1px solid #eaeaea', paddingBottom: '0.25rem' }}>Malzeme Dağıtım/Kullanım Detayları</h3>
                
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #eaeaea', color: 'var(--text-muted)' }}>
                      <th>Malzeme</th>
                      <th>Teslim Alınan</th>
                      <th>Kullanılan (Dağıtılan)</th>
                      <th>Kalan</th>
                      <th>Açıklama / Not</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { key: 'bezCanta', label: 'Bez Çanta', max: activeRequest.bez_canta },
                      { key: 'etiket', label: 'Etiket', max: activeRequest.etiket },
                      { key: 'rozet', label: 'Rozet', max: activeRequest.rozet },
                      { key: 'cepliDosya', label: 'Cepli Dosya', max: activeRequest.cepli_dosya },
                      { key: 'defter', label: 'Defter', max: activeRequest.defter },
                      { key: 'kalem', label: 'Kalem', max: activeRequest.kalem },
                      { key: 'brosur', label: 'Broşür', max: activeRequest.brosur }
                    ].filter(m => m.max > 0).map(m => {
                      const current = usageStats[m.key] || { used: 0, remaining: m.max, notes: '' };

                      return (
                        <tr key={m.key} style={{ borderBottom: '1px solid #f3f4f6' }}>
                          <td style={{ padding: '0.75rem 0', fontWeight: 600 }}>{m.label}</td>
                          <td style={{ padding: '0.75rem 0' }}>{m.max} Adet</td>
                          <td style={{ padding: '0.75rem 0' }}>
                            <input 
                              type="number" 
                              min={0} 
                              max={m.max}
                              className="input" 
                              style={{ width: '80px', padding: '0.25rem 0.5rem' }} 
                              value={current.used}
                              onChange={e => {
                                const used = Math.min(parseInt(e.target.value) || 0, m.max);
                                setUsageStats({
                                  ...usageStats,
                                  [m.key]: { ...current, used: used, remaining: m.max - used }
                                });
                              }}
                            />
                          </td>
                          <td style={{ padding: '0.75rem 0', fontWeight: 700 }}>
                            {current.remaining} Adet
                          </td>
                          <td style={{ padding: '0.75rem 0' }}>
                            <input 
                              type="text" 
                              className="input" 
                              style={{ padding: '0.25rem 0.5rem' }}
                              placeholder="Örn: 2 adet hasarlı"
                              value={current.notes}
                              onChange={e => {
                                setUsageStats({
                                  ...usageStats,
                                  [m.key]: { ...current, notes: e.target.value }
                                });
                              }}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <button type="button" onClick={() => setIsReportModalOpen(false)} className="btn btn-outline">İptal</button>
                <button type="submit" className="btn btn-primary">Raporu Kaydet & Tamamla</button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}
