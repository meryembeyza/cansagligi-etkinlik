'use client';
import { toast } from 'react-hot-toast';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useRole } from '@/context/RoleContext';
import { createClient } from '@/utils/supabase/client';
const supabase = createClient();
import { Users, Plus, Award, Calendar, Phone, Mail, Trash2, Edit2, Search, Filter, BookOpen } from 'lucide-react';

interface Candidate {
  id: string;
  full_name: string;
  email: string;
  phone_number: string;
  university: string;
  department: string;
  grade: string;
  region: string;
  status: string; // 'Aday', 'Mülakat Planlandı', 'Mülakat Tamamlandı', 'Bursiyer', 'Reddedildi'
  interview_date: string | null;
  evaluation_notes: string | null;
}

const REGIONS = [
  'Akdeniz', 'Doğu Anadolu', 'Ege', 'Güneydoğu Anadolu', 'Ankara', 'İç Anadolu', 'Karadeniz', 'İstanbul Anadolu', 'İstanbul Avrupa', 'Marmara'
];

export default function BursaryPage() {
  const { currentRole, userData, user } = useRole();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [filteredCandidates, setFilteredCandidates] = useState<Candidate[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isInterviewModalOpen, setIsInterviewModalOpen] = useState(false);
  const [activeCandidate, setActiveCandidate] = useState<Candidate | null>(null);

  // Add form data
  const [addFormData, setAddFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    university: '',
    department: '',
    grade: '1. Sınıf',
    region: 'Marmara'
  });

  // Interview form data
  const [interviewDate, setInterviewDate] = useState('');
  const [interviewTime, setInterviewTime] = useState('');
  const [evaluationNotes, setEvaluationNotes] = useState('');
  const [candidateStatus, setCandidateStatus] = useState('Mülakat Planlandı');

  const isRegionManager = currentRole === 'rep_region_manager';
  const canModify = currentRole === 'rep_head' || currentRole === 'rep_coordinator' || currentRole === 'general_admin';
  const userRegion = userData?.region || '';

  // Fetch Candidates
  const fetchCandidates = async () => {
    try {
      setIsLoading(true);
      let query = supabase
        .from('bursary_candidates')
        .select('*')
        .order('created_at', { ascending: false });

      if (isRegionManager && userRegion) {
        query = query.eq('region', userRegion);
      }

      const { data, error } = await query;
      if (error) throw error;

      setCandidates(data || []);
    } catch (err) {
      console.error("Failed to fetch candidates:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCandidates();
  }, [currentRole, userRegion]);

  // Apply filters
  useEffect(() => {
    let result = [...candidates];

    if (selectedRegion && !isRegionManager) {
      result = result.filter(c => c.region?.toLowerCase() === selectedRegion.toLowerCase());
    }

    if (selectedStatus) {
      result = result.filter(c => c.status === selectedStatus);
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(c => 
        c.full_name?.toLowerCase().includes(q) ||
        c.university?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q)
      );
    }

    setFilteredCandidates(result);
  }, [candidates, selectedRegion, selectedStatus, searchQuery]);

  // Handle Add Candidate
  const handleAddCandidate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase
        .from('bursary_candidates')
        .insert([
          {
            full_name: addFormData.fullName,
            email: addFormData.email,
            phone_number: addFormData.phone,
            university: addFormData.university,
            department: addFormData.department,
            grade: addFormData.grade,
            region: isRegionManager ? userRegion : addFormData.region,
            status: 'Aday',
            created_by: user?.id
          }
        ]);

      if (error) throw error;

      setIsAddModalOpen(false);
      fetchCandidates();
      setAddFormData({ fullName: '', email: '', phone: '', university: '', department: '', grade: '1. Sınıf', region: 'Marmara' });
      toast.success('Bursiyer adayı başarıyla kaydedildi!');
    } catch (err) {
      console.error("Add candidate error:", err);
      toast.error('Aday eklenirken hata oluştu.');
    }
  };

  // Open Interview scheduling modal
  const openInterviewModal = (candidate: Candidate) => {
    setActiveCandidate(candidate);
    setCandidateStatus(candidate.status || 'Mülakat Planlandı');
    setEvaluationNotes(candidate.evaluation_notes || '');
    
    if (candidate.interview_date) {
      const dateObj = new Date(candidate.interview_date);
      setInterviewDate(dateObj.toISOString().split('T')[0]);
      setInterviewTime(dateObj.toTimeString().split(' ')[0].substring(0, 5));
    } else {
      setInterviewDate('');
      setInterviewTime('');
    }
    
    setIsInterviewModalOpen(true);
  };

  // Save Interview scheduling / evaluation notes
  const handleSaveInterview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCandidate) return;

    try {
      let combinedDate = null;
      if (interviewDate && interviewTime) {
        combinedDate = new Date(`${interviewDate}T${interviewTime}:00`).toISOString();
      }

      const { error } = await supabase
        .from('bursary_candidates')
        .update({
          status: candidateStatus,
          interview_date: combinedDate,
          evaluation_notes: evaluationNotes
        })
        .eq('id', activeCandidate.id);

      if (error) throw error;

      setIsInterviewModalOpen(false);
      fetchCandidates();
      toast.success('Mülakat ve değerlendirme verileri başarıyla kaydedildi!');
    } catch (err) {
      console.error("Save interview error:", err);
      toast.error('Kaydedilirken hata oluştu.');
    }
  };

  // Delete candidate
  const handleDeleteCandidate = async (id: string) => {
    if (!window.confirm('Bu bursiyer adayını tamamen silmek istediğinizden emin misiniz?')) return;

    try {
      const { error } = await supabase
        .from('bursary_candidates')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchCandidates();
      toast.success('Aday kaydı başarıyla silindi.');
    } catch (err) {
      console.error("Delete candidate error:", err);
      toast.error('Silme işlemi başarısız oldu.');
    }
  };

  // Count stats
  const totalCount = candidates.length;
  const interviewScheduledCount = candidates.filter(c => c.status === 'Mülakat Planlandı').length;
  const bursaryAwardedCount = candidates.filter(c => c.status === 'Bursiyer').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Upper header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            ?? Bursiyer ve Mülakat Sistemi
          </h1>
          <p style={{ color: 'var(--text-muted)' }}>Cansağlığı Vakfı bursiyer adayları mülakat planlama ve değerlendirme modülü</p>
        </div>
        {canModify && (
          <button onClick={() => setIsAddModalOpen(true)} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <Plus size={18} /> Yeni Aday Kaydet
          </button>
        )}
      </div>

      {/* Summary stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem' }}>
        <div className="card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', borderLeft: '4px solid var(--color-primary)' }}>
          <div style={{ padding: '0.5rem', backgroundColor: 'var(--color-primary-light)', borderRadius: 'var(--radius-md)' }}>
            <Users size={20} color="var(--color-primary)" />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Toplam Aday Kaydı</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{totalCount} Aday</div>
          </div>
        </div>

        <div className="card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', borderLeft: '4px solid #f59e0b' }}>
          <div style={{ padding: '0.5rem', backgroundColor: '#fef3c7', borderRadius: 'var(--radius-md)' }}>
            <Calendar size={20} color="#f59e0b" />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Mülakat Planlananlar</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f59e0b' }}>{interviewScheduledCount} Aday</div>
          </div>
        </div>

        <div className="card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', borderLeft: '4px solid var(--status-success)' }}>
          <div style={{ padding: '0.5rem', backgroundColor: '#ecfdf5', borderRadius: 'var(--radius-md)' }}>
            <Award size={20} color="var(--status-success)" />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Burs Verilen Temsilciler</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--status-success)' }}>{bursaryAwardedCount} Bursiyer</div>
          </div>
        </div>
      </div>

      {/* Filters Area */}
      <div className="card" style={{ padding: '1.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        
        {/* Search */}
        <div>
          <label className="label">Aday Ara</label>
          <div style={{ position: 'relative' }}>
            <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />
            <input 
              type="text" 
              className="input" 
              placeholder="Adı, okul veya e-posta..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ paddingLeft: '2.25rem' }}
            />
          </div>
        </div>

        {/* Region Filter */}
        {!isRegionManager && (
          <div>
            <label className="label">Bölge Seçimi</label>
            <select className="input" value={selectedRegion} onChange={e => setSelectedRegion(e.target.value)}>
              <option value="">Tüm Bölgeler</option>
              {REGIONS.map(reg => (
                <option key={reg} value={reg}>{reg.toUpperCase()}</option>
              ))}
            </select>
          </div>
        )}

        {isRegionManager && (
          <div>
            <label className="label">Bölge</label>
            <input type="text" className="input" disabled value={`?? ${userRegion.toUpperCase()}`} />
          </div>
        )}

        {/* Status Filter */}
        <div>
          <label className="label">Mülakat Durumu</label>
          <select className="input" value={selectedStatus} onChange={e => setSelectedStatus(e.target.value)}>
            <option value="">Tümü</option>
            <option value="Aday">Aday</option>
            <option value="Mülakat Planlandı">Mülakat Planlandı</option>
            <option value="Mülakat Tamamlandı">Mülakat Tamamlandı</option>
            <option value="Bursiyer">Bursiyer</option>
            <option value="Reddedildi">Reddedildi</option>
          </select>
        </div>

      </div>

      {/* Main Table area */}
      <div className="card" style={{ padding: '2rem' }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          ?? Mülakat Randevu ve Takip Havuzu
        </h3>

        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '3rem' }}>Yükleniyor...</div>
        ) : filteredCandidates.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
            Görüntülenecek bursiyer adayı kaydı bulunamadı.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #eaeaea' }}>
                  <th style={{ padding: '1rem 0.5rem' }}>Aday Ad Soyad</th>
                  <th style={{ padding: '1rem 0.5rem' }}>Üniversite / Bölüm</th>
                  <th style={{ padding: '1rem 0.5rem' }}>Bölge</th>
                  <th style={{ padding: '1rem 0.5rem' }}>Mülakat Tarihi</th>
                  <th style={{ padding: '1rem 0.5rem' }}>Durum</th>
                  <th style={{ padding: '1rem 0.5rem', textAlign: 'right' }}>İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {filteredCandidates.map(cand => (
                  <tr key={cand.id} style={{ borderBottom: '1px solid var(--border-inner)' }}>
                    <td style={{ padding: '1rem 0.5rem' }}>
                      <div style={{ fontWeight: 600 }}>{cand.full_name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', gap: '0.5rem', marginTop: '0.2rem' }}>
                        <span>{cand.phone_number}</span>
                        <span>|</span>
                        <span>{cand.email}</span>
                      </div>
                    </td>
                    <td style={{ padding: '1rem 0.5rem' }}>
                      <div>{cand.university}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{cand.department} ({cand.grade})</div>
                    </td>
                    <td style={{ padding: '1rem 0.5rem' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>{cand.region}</span>
                    </td>
                    <td style={{ padding: '1rem 0.5rem' }}>
                      {cand.interview_date ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontWeight: 600 }}>
                          ?? {new Date(cand.interview_date).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' })}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Planlanmadı</span>
                      )}
                    </td>
                    <td style={{ padding: '1rem 0.5rem' }}>
                      <span className={`badge ${
                        cand.status === 'Bursiyer' ? 'badge-success' :
                        cand.status === 'Mülakat Planlandı' ? 'badge-warning' :
                        cand.status === 'Mülakat Tamamlandı' ? 'badge-info' :
                        cand.status === 'Reddedildi' ? 'badge-danger' : 'badge-neutral'
                      }`}>
                        {cand.status}
                      </span>
                    </td>
                    <td style={{ padding: '1rem 0.5rem', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.35rem' }}>
                        <a 
                          href={`https://wa.me/${cand.phone_number.replace(/[^0-9]/g, '')}`} 
                          target="_blank" 
                          rel="noreferrer"
                          className="btn btn-outline"
                          title="WhatsApp İletişim"
                          style={{ padding: '0.35rem', color: '#25d366', borderColor: '#bbf7d0' }}
                        >
                          <Phone size={16} />
                        </a>
                        <button 
                          onClick={() => openInterviewModal(cand)}
                          className="btn btn-outline" 
                          title="Mülakat ve Değerlendirme Planla"
                          style={{ padding: '0.35rem', color: 'var(--color-primary)', borderColor: 'var(--color-primary-light)' }}
                        >
                          <Edit2 size={16} />
                        </button>
                        {canModify && (
                          <button 
                            onClick={() => handleDeleteCandidate(cand.id)}
                            className="btn btn-outline" 
                            title="Kaydı Sil"
                            style={{ padding: '0.35rem', color: 'var(--status-danger)', borderColor: 'var(--status-danger)' }}
                          >
                            <Trash2 size={16} />
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

      {/* Add Candidate Modal */}
      {isAddModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ backgroundColor: 'var(--bg-card)', padding: '2rem', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>âÂâ€¢ Yeni Bursiyer Adayı Ekle</h2>
              <button onClick={() => setIsAddModalOpen(false)} className="btn btn-outline" style={{ padding: '0.25rem 0.5rem' }}>X</button>
            </div>

            <form onSubmit={handleAddCandidate} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label className="label">Adı Soyadı *</label>
                  <input type="text" className="input" required value={addFormData.fullName} onChange={e => setAddFormData({...addFormData, fullName: e.target.value})} placeholder="Örn: Mehmet Öz" />
                </div>
                <div>
                  <label className="label">Telefon Numarası *</label>
                  <input type="text" className="input" required value={addFormData.phone} onChange={e => setAddFormData({...addFormData, phone: e.target.value})} placeholder="Örn: +90 5XX XXX XX XX" />
                </div>
                <div>
                  <label className="label">E-posta Adresi *</label>
                  <input type="email" className="input" required value={addFormData.email} onChange={e => setAddFormData({...addFormData, email: e.target.value})} placeholder="Örn: mehmet@mail.com" />
                </div>
                <div>
                  <label className="label">Üniversite *</label>
                  <input type="text" className="input" required value={addFormData.university} onChange={e => setAddFormData({...addFormData, university: e.target.value})} placeholder="Örn: Ege Üniversitesi" />
                </div>
                <div>
                  <label className="label">Bölüm *</label>
                  <input type="text" className="input" required value={addFormData.department} onChange={e => setAddFormData({...addFormData, department: e.target.value})} placeholder="Örn: Tıp Fakültesi" />
                </div>
                <div>
                  <label className="label">Sınıf *</label>
                  <select className="input" required value={addFormData.grade} onChange={e => setAddFormData({...addFormData, grade: e.target.value})}>
                    <option value="Hazırlık">Hazırlık</option>
                    <option value="1. Sınıf">1. Sınıf</option>
                    <option value="2. Sınıf">2. Sınıf</option>
                    <option value="3. Sınıf">3. Sınıf</option>
                    <option value="4. Sınıf">4. Sınıf</option>
                    <option value="Mezun">Mezun</option>
                  </select>
                </div>
                {!isRegionManager && (
                  <div>
                    <label className="label">Bölgesi *</label>
                    <select className="input" required value={addFormData.region} onChange={e => setAddFormData({...addFormData, region: e.target.value})}>
                      {REGIONS.map(reg => (
                        <option key={reg} value={reg}>{reg.toUpperCase()}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <button type="button" onClick={() => setIsAddModalOpen(false)} className="btn btn-outline">İptal</button>
                <button type="submit" className="btn btn-primary">Kaydet & Oluştur</button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* Interview & Evaluation Details Modal */}
      {isInterviewModalOpen && activeCandidate && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ backgroundColor: 'var(--bg-card)', padding: '2rem', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>?? Mülakat & Değerlendirme: {activeCandidate.full_name}</h2>
              <button onClick={() => setIsInterviewModalOpen(false)} className="btn btn-outline" style={{ padding: '0.25rem 0.5rem' }}>X</button>
            </div>

            <form onSubmit={handleSaveInterview} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label className="label">Mülakat Tarihi</label>
                  <input type="date" className="input" value={interviewDate} onChange={e => setInterviewDate(e.target.value)} />
                </div>
                <div>
                  <label className="label">Mülakat Saati</label>
                  <input type="time" className="input" value={interviewTime} onChange={e => setInterviewTime(e.target.value)} />
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <label className="label">Aday Mülakat Durumu *</label>
                  <select className="input" required value={candidateStatus} onChange={e => setCandidateStatus(e.target.value)}>
                    <option value="Aday">Aday</option>
                    <option value="Mülakat Planlandı">Mülakat Planlandı</option>
                    <option value="Mülakat Tamamlandı">Mülakat Tamamlandı</option>
                    <option value="Bursiyer">Onaylandı / Bursiyer</option>
                    <option value="Reddedildi">Reddedildi</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="label">Değerlendirme ve Mülakat Notları</label>
                <textarea 
                  className="input" 
                  rows={4} 
                  value={evaluationNotes} 
                  onChange={e => setEvaluationNotes(e.target.value)} 
                  placeholder="Mülakat değerlendirme kriterlerini, adayın sunumunu, katılım hevesini veya genel izlenimleri buraya not alın..."
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <button type="button" onClick={() => setIsInterviewModalOpen(false)} className="btn btn-outline">İptal</button>
                <button type="submit" className="btn btn-primary">Bilgileri Güncelle</button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}



