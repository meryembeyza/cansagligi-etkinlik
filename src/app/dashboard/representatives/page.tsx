'use client';
import { toast } from 'react-hot-toast';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import EmptyState from '@/components/ui/EmptyState';
import LoadingState from '@/components/ui/LoadingState';
import { useRole } from '@/context/RoleContext';
import { createClient } from '@/utils/supabase/client';
const supabase = createClient();
import { Users, Filter, MessageSquare, Trash2, Edit2, Download, Search, CheckCircle, XCircle, AlertCircle, Eye, Clock } from 'lucide-react';
import ExcelJS from 'exceljs';
import Link from 'next/link';

interface Representative {
  id: string;
  full_name: string;
  email: string;
  phone_number: string;
  university: string;
  department: string;
  grade: string;
  region: string;
  representative_profiles: {
    status: 'Aktif' | 'Pasif' | 'Mezun';
    start_date: string;
    end_date: string | null;
    last_contact_date: string | null;
    notes: string | null;
  } | null;
}

const REGIONS = [
  'Akdeniz', 'Doğu Anadolu', 'Ege', 'Güneydoğu Anadolu', 'Ankara', 'İç Anadolu', 'Karadeniz', 'İstanbul Anadolu', 'İstanbul Avrupa', 'Marmara'
];

export default function RepresentativesPage() {
  const { currentRole, userData, user, isLoading: authLoading } = useRole();
  const [activeTab, setActiveTab] = useState<'active' | 'pending'>('active');
  const [reps, setReps] = useState<Representative[]>([]);
  const [pendingReps, setPendingReps] = useState<any[]>([]);
  const [filteredReps, setFilteredReps] = useState<Representative[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [selectedRegion, setSelectedRegion] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals state
  const [isCommModalOpen, setIsCommModalOpen] = useState(false);
  const [activeRep, setActiveRep] = useState<Representative | null>(null);
  const [commChannel, setCommChannel] = useState<'WhatsApp' | 'Email' | 'SMS' | 'Yüzyüze'>('WhatsApp');
  const [commMessage, setCommMessage] = useState('');
  const [commHistory, setCommHistory] = useState<any[]>([]);

  // Edit / Add modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({
    fullName: '',
    phone: '',
    email: '',
    university: '',
    department: '',
    grade: '',
    region: '',
    status: 'Aktif' as 'Aktif' | 'Pasif' | 'Mezun',
    notes: ''
  });

  const isRegionManager = currentRole === 'rep_region_manager';
  const canDelete = currentRole === 'rep_head' || currentRole === 'general_admin';
  const userRegion = userData?.region || '';

  // Fetch representatives
  const fetchReps = async () => {
    try {
      setIsLoading(true);

      // Fetch active (approved) reps
      let activeQuery = supabase
        .from('users')
        .select(`
          id, full_name, email, phone_number, university, department, grade, region,
          representative_profiles(status, start_date, end_date, last_contact_date, notes)
        `)
        .eq('role', 'representative')
        .eq('is_approved', true);

      if (isRegionManager && userRegion) {
        activeQuery = activeQuery.eq('region', userRegion);
      }

      const { data: activeData, error: activeErr } = await activeQuery;
      if (activeErr) throw activeErr;
      setReps(activeData as any || []);

      // Fetch pending (unapproved) reps
      let pendingQuery = supabase
        .from('users')
        .select('id, full_name, email, phone_number, university, department, grade, region, created_at')
        .eq('role', 'representative')
        .eq('is_approved', false);

      if (isRegionManager && userRegion) {
        pendingQuery = pendingQuery.eq('region', userRegion);
      }

      const { data: pendingData, error: pendingErr } = await pendingQuery;
      if (pendingErr) throw pendingErr;
      setPendingReps(pendingData || []);

    } catch (err) {
      console.error("Failed to fetch representatives:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReps();
  }, [currentRole, userRegion]);

  // Apply filters
  useEffect(() => {
    let result = [...reps];

    if (selectedRegion) {
      result = result.filter(r => r.region?.toLowerCase() === selectedRegion.toLowerCase());
    }
    if (selectedStatus) {
      result = result.filter(r => r.representative_profiles?.status === selectedStatus);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(r => 
        r.full_name?.toLowerCase().includes(q) || 
        r.university?.toLowerCase().includes(q) ||
        r.email?.toLowerCase().includes(q)
      );
    }

    setFilteredReps(result);
  }, [reps, selectedRegion, selectedStatus, searchQuery]);

  // Approve a pending representative
  const handleApprove = async (repId: string, repName: string) => {
    if (!confirm(`${repName} adlı temsilciyi onaylamak istiyor musunuz?`)) return;
    try {
      const { error: approveErr } = await supabase
        .from('users')
        .update({ is_approved: true })
        .eq('id', repId);
      if (approveErr) throw approveErr;

      // Create representative_profile as 'Aktif'
      await supabase
        .from('representative_profiles')
        .upsert([{ user_id: repId, status: 'Aktif', start_date: new Date().toISOString().split('T')[0] }]);

      toast.success(`${repName} başarıyla onaylandı!`);
      fetchReps();
    } catch (err) {
      toast.error('Onaylama sırasında hata: ' + (err as Error).message);
    }
  };

  // Reject (soft ââ‚¬â€ do NOT delete, just keep unapproved, mark as rejected)
  const handleReject = async (repId: string, repName: string) => {
    if (!confirm(`${repName} adlı temsilciyi reddetmek istiyor musunuz? Hesap silinmeyecek, onay bekleyenler listesinde kalıp "Reddedildi" olarak işaretlenecektir.`)) return;
    try {
      const { error } = await supabase
        .from('users')
        .update({ club_duty: `[Reddedildi: ${new Date().toLocaleDateString('tr-TR')}]` })
        .eq('id', repId);
      if (error) throw error;
      toast.success(`${repName} reddedildi ve işaretlendi.`);
      fetchReps();
    } catch (err) {
      toast.error('İşlem sırasında hata: ' + (err as Error).message);
    }
  };

  // Permanently delete a pending (unapproved) representative
  const handleDeletePending = async (repId: string, repName: string) => {
    if (!confirm(`âÅ¡Â Ã¯Â¸Â ${repName} adlı temsilcinin kaydını kalıcı olarak SILMEK istediğinizden emin misiniz? Bu işlem geri alınamaz!`)) return;
    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', repId);
      if (error) throw error;
      toast.success(`${repName} adlı temsilci kalıcı olarak silindi.`);
      fetchReps();
    } catch (err) {
      toast.error('Silme işlemi sırasında hata: ' + (err as Error).message);
    }
  };

  if (authLoading) {
    return <div style={{ padding: '3rem', textAlign: 'center' }}>Yükleniyor...</div>;
  }

  const isAuthorized = currentRole === 'rep_head' || currentRole === 'rep_coordinator' || currentRole === 'rep_region_manager' || currentRole === 'general_admin';

  if (!isAuthorized) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', textAlign: 'center', gap: '1rem' }}>
        <AlertCircle size={48} color="var(--status-danger)" />
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Yetkisiz Erişim</h2>
        <p style={{ color: 'var(--text-muted)' }}>Bu sayfayı görüntülemek için yetkiniz bulunmamaktadır.</p>
        <Link href="/dashboard" className="btn btn-primary" style={{ textDecoration: 'none' }}>
          Panele Geri Dön
        </Link>
      </div>
    );
  }

  const exportToExcel = async () => {
    const data = filteredReps.map(r => ({
      'Ad Soyad': r.full_name,
      'E-posta': r.email,
      'Telefon': r.phone_number,
      'Üniversite': r.university,
      'Bölüm': r.department,
      'Sınıf': r.grade,
      'Bölge': r.region,
      'Durum': r.representative_profiles?.status || 'Aktif',
      'Başlangıç Tarihi': r.representative_profiles?.start_date || '',
      'Son İletişim': r.representative_profiles?.last_contact_date ? new Date(r.representative_profiles.last_contact_date).toLocaleDateString('tr-TR') : 'Hiç kurulmadı',
      'Notlar': r.representative_profiles?.notes || ''
    }));

    const workbook = new ExcelJS.Workbook();
    const ws = workbook.addWorksheet('Temsilciler');
    if (data.length > 0) {
      ws.columns = Object.keys(data[0]).map(key => ({ header: key, key: key, width: 20 }));
      ws.addRows(data);
    }
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Cansagligi_Temsilciler_${selectedRegion || 'Tum_Bolgeler'}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Open communication history modal
  const openCommHistory = async (rep: Representative) => {
    setActiveRep(rep);
    setIsCommModalOpen(true);
    setCommMessage('');
    
    try {
      const { data, error } = await supabase
        .from('rep_communications')
        .select('channel, message, created_at, sender_id')
        .eq('representative_id', rep.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCommHistory(data || []);
    } catch (err) {
      console.error("Failed to fetch comm history:", err);
    }
  };

  // Submit communication log
  const handleLogCommunication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRep || !commMessage) return;

    try {
      // 1. Log communication
      const { error: commError } = await supabase
        .from('rep_communications')
        .insert([
          {
            representative_id: activeRep.id,
            sender_id: user?.id,
            channel: commChannel,
            message: commMessage
          }
        ]);

      if (commError) throw commError;

      // 2. Update last contact date
      const { error: profileError } = await supabase
        .from('representative_profiles')
        .upsert([
          {
            user_id: activeRep.id,
            last_contact_date: new Date().toISOString()
          }
        ]);

      if (profileError) throw profileError;

      // Reset & refresh
      setIsCommModalOpen(false);
      fetchReps();
      toast.success('İletişim başarıyla kaydedildi!');
    } catch (err) {
      console.error("Communication logging error:", err);
      toast.error('Hata oluştu, iletişim kaydedilemedi.');
    }
  };

  // Open edit modal
  const openEdit = (rep: Representative) => {
    setActiveRep(rep);
    setEditFormData({
      fullName: rep.full_name || '',
      phone: rep.phone_number || '',
      email: rep.email || '',
      university: rep.university || '',
      department: rep.department || '',
      grade: rep.grade || '',
      region: rep.region || '',
      status: rep.representative_profiles?.status || 'Aktif',
      notes: rep.representative_profiles?.notes || ''
    });
    setIsEditModalOpen(true);
  };

  // Save changes
  const handleSaveChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRep) return;

    try {
      // Update public.users
      const { error: userError } = await supabase
        .from('users')
        .update({
          full_name: editFormData.fullName,
          phone_number: editFormData.phone,
          university: editFormData.university,
          department: editFormData.department,
          grade: editFormData.grade,
          region: isRegionManager ? userRegion : editFormData.region // Sorumlu bölgesini değiştiremez
        })
        .eq('id', activeRep.id);

      if (userError) throw userError;

      // Update representative_profiles
      const { error: profileError } = await supabase
        .from('representative_profiles')
        .upsert([
          {
            user_id: activeRep.id,
            status: editFormData.status,
            notes: editFormData.notes
          }
        ]);

      if (profileError) throw profileError;

      setIsEditModalOpen(false);
      fetchReps();
      toast.success('Temsilci başarıyla güncellendi!');
    } catch (err) {
      console.error("Save representative changes error:", err);
      toast.error('Güncelleme sırasında hata oluştu.');
    }
  };

  // Delete representative
  const handleDeleteRep = async (repId: string) => {
    if (!window.confirm('Bu temsilci kaydını tamamen silmek istediğinizden emin misiniz?')) return;

    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', repId);

      if (error) throw error;
      fetchReps();
      toast.success('Temsilci başarıyla silindi!');
    } catch (err) {
      console.error("Delete representative error:", err);
      toast.error('Silme işlemi başarısız oldu.');
    }
  };

  // Calculate stats
  const activeCount = reps.filter(r => (r.representative_profiles?.status || 'Aktif') === 'Aktif').length;
  const passiveCount = reps.filter(r => r.representative_profiles?.status === 'Pasif' || r.representative_profiles?.status === 'Mezun').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Upper header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700 }}>Temsilcilikler Birimi</h1>
          <p style={{ color: 'var(--text-muted)' }}>Tüm bölge ve üniversite temsilcilerinin listesi ve yönetimi</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={exportToExcel} className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <Download size={16} /> Excel Rapor İndir
          </button>
        </div>
      </div>

      {/* Summary Stats cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
        <div className="card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', borderLeft: '4px solid var(--color-primary)' }}>
          <div style={{ padding: '0.5rem', backgroundColor: 'var(--color-primary-light)', borderRadius: 'var(--radius-md)' }}>
            <Users size={20} color="var(--color-primary)" />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Aktif Temsilci</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{reps.length}</div>
          </div>
        </div>

        <div className="card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', borderLeft: '4px solid var(--status-success)' }}>
          <div style={{ padding: '0.5rem', backgroundColor: '#ecfdf5', borderRadius: 'var(--radius-md)' }}>
            <Users size={20} color="var(--status-success)" />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Aktif Üyeler</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--status-success)' }}>{activeCount}</div>
          </div>
        </div>

        <div className="card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', borderLeft: '4px solid #f59e0b' }}>
          <div style={{ padding: '0.5rem', backgroundColor: '#fef3c7', borderRadius: 'var(--radius-md)' }}>
            <Clock size={20} color="#d97706" />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Onay Bekleyen</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#d97706' }}>{pendingReps.length}</div>
          </div>
        </div>

        <div className="card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', borderLeft: '4px solid var(--text-muted)' }}>
          <div style={{ padding: '0.5rem', backgroundColor: 'var(--bg-nested)', borderRadius: 'var(--radius-md)' }}>
            <Users size={20} color="var(--text-muted)" />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Pasif / Mezun</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{passiveCount}</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0', borderBottom: '2px solid #eaeaea' }}>
        <button
          onClick={() => setActiveTab('active')}
          style={{ padding: '0.75rem 1.5rem', background: 'none', border: 'none', borderBottom: activeTab === 'active' ? '2px solid var(--color-primary)' : '2px solid transparent', marginBottom: '-2px', color: activeTab === 'active' ? 'var(--color-primary)' : 'var(--text-muted)', fontWeight: activeTab === 'active' ? 700 : 400, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.925rem' }}
        >
          <Users size={16} /> Aktif Temsilciler ({reps.length})
        </button>
        <button
          onClick={() => setActiveTab('pending')}
          style={{ padding: '0.75rem 1.5rem', background: 'none', border: 'none', borderBottom: activeTab === 'pending' ? '2px solid #d97706' : '2px solid transparent', marginBottom: '-2px', color: activeTab === 'pending' ? '#d97706' : 'var(--text-muted)', fontWeight: activeTab === 'pending' ? 700 : 400, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.925rem' }}
        >
          <Clock size={16} /> Onay Bekleyenler
          {pendingReps.length > 0 && (
            <span style={{ backgroundColor: '#d97706', color: 'white', borderRadius: '999px', padding: '0.1rem 0.45rem', fontSize: '0.7rem', fontWeight: 700 }}>
              {pendingReps.length}
            </span>
          )}
        </button>
      </div>

      {/* PENDING TAB */}
      {activeTab === 'pending' && (
        <div className="card" style={{ padding: '2rem' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.5rem', color: '#92400e' }}>?? Onay Bekleyen Temsilci Kayıtları</h2>
          {isLoading ? (
            <LoadingState message="Temsilciler yükleniyor..." />
          ) : pendingReps.length === 0 ? (
            <EmptyState 
              icon={CheckCircle} 
              title="Her Şey Tamam" 
              description="Onay bekleyen temsilci kaydı bulunmuyor. ??" 
            />
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ backgroundColor: '#fef3c7', textAlign: 'left' }}>
                    <th style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #fde68a' }}>Ad Soyad</th>
                    <th style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #fde68a' }}>Üniversite</th>
                    <th style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #fde68a' }}>Bölge</th>
                    <th style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #fde68a' }}>İletişim</th>
                    <th style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #fde68a' }}>Kayıt Tarihi</th>
                    <th style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #fde68a', textAlign: 'right' }}>İşlemler</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingReps.map(rep => (
                    <tr key={rep.id} style={{ borderBottom: '1px solid #fef3c7' }}>
                      <td style={{ padding: '1rem' }}>
                        <div style={{ fontWeight: 600 }}>{rep.full_name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{rep.email}</div>
                        {rep.club_duty?.startsWith('[Reddedildi') && (
                          <span style={{ fontSize: '0.7rem', color: 'var(--status-danger)', fontWeight: 600 }}>{rep.club_duty}</span>
                        )}
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <div>{rep.university || '-'}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{rep.department} {rep.grade ? `(${rep.grade})` : ''}</div>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>{rep.region || '-'}</span>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <div>{rep.phone_number}</div>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          {new Date(rep.created_at).toLocaleDateString('tr-TR')}
                        </div>
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                          <button
                            onClick={() => handleApprove(rep.id, rep.full_name)}
                            className="btn"
                            style={{ padding: '0.4rem 0.8rem', backgroundColor: 'var(--status-success)', color: 'white', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8rem' }}
                          >
                            <CheckCircle size={14} /> Onayla
                          </button>
                          <button
                            onClick={() => handleReject(rep.id, rep.full_name)}
                            className="btn btn-outline"
                            style={{ padding: '0.4rem 0.8rem', color: '#d97706', borderColor: '#d97706', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8rem' }}
                          >
                            <XCircle size={14} /> Reddet
                          </button>
                          {(currentRole === 'rep_head' || currentRole === 'rep_coordinator' || currentRole === 'general_admin') && (
                            <button
                              onClick={() => handleDeletePending(rep.id, rep.full_name)}
                              className="btn btn-outline"
                              title="Kaydı kalıcı olarak sil"
                              style={{ padding: '0.4rem 0.8rem', color: 'var(--status-danger)', borderColor: 'var(--status-danger)', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8rem' }}
                            >
                              <Trash2 size={14} /> Sil
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
      )}

      {/* ACTIVE TAB - Main view Grid */}
      {activeTab === 'active' && <div style={{ display: 'grid', gridTemplateColumns: '250px 1fr', gap: '2rem' }}>
        
        {/* Left Side: Filtering */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          <div className="card" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Filter size={16} /> Bölge Seçimi
            </h3>
            
            {isRegionManager ? (
              <div style={{ padding: '0.5rem', backgroundColor: 'var(--color-primary-light)', color: 'var(--color-primary)', fontWeight: 700, borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                ?? {userRegion.toUpperCase()}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <button 
                  onClick={() => setSelectedRegion('')}
                  style={{ display: 'block', width: '100%', padding: '0.5rem', textAlign: 'left', border: 'none', backgroundColor: selectedRegion === '' ? 'var(--color-primary-light)' : 'transparent', color: selectedRegion === '' ? 'var(--color-primary)' : 'inherit', borderRadius: 'var(--radius-md)', fontWeight: selectedRegion === '' ? 700 : 500 }}
                >
                  Tüm Bölgeler ({reps.length})
                </button>
                {REGIONS.map(reg => {
                  const count = reps.filter(r => r.region?.toLowerCase() === reg.toLowerCase()).length;
                  return (
                    <button 
                      key={reg}
                      onClick={() => setSelectedRegion(reg)}
                      style={{ display: 'block', width: '100%', padding: '0.5rem', textAlign: 'left', border: 'none', backgroundColor: selectedRegion === reg ? 'var(--color-primary-light)' : 'transparent', color: selectedRegion === reg ? 'var(--color-primary)' : 'inherit', borderRadius: 'var(--radius-md)', fontWeight: selectedRegion === reg ? 700 : 500 }}
                    >
                      {reg.toUpperCase()} ({count})
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="card" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem' }}>Durum Filtresi</h3>
            <select className="input" value={selectedStatus} onChange={e => setSelectedStatus(e.target.value)}>
              <option value="">Tümü</option>
              <option value="Aktif">Aktif</option>
              <option value="Pasif">Pasif</option>
              <option value="Mezun">Mezun</option>
            </select>
          </div>

        </div>

        {/* Right Side: Representatives table list */}
        <div className="card" style={{ padding: '2rem' }}>
          
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <Search size={18} color="var(--text-muted)" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />
              <input 
                type="text" 
                className="input" 
                placeholder="Temsilci adı, e-posta veya üniversite ile ara..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ paddingLeft: '2.5rem' }}
              />
            </div>
          </div>

          {isLoading ? (
            <LoadingState message="Temsilciler yükleniyor..." />
          ) : filteredReps.length === 0 ? (
            <EmptyState 
              icon={Users} 
              title="Temsilci Bulunamadı" 
              description="Arama kriterlerine uygun temsilci bulunamadı." 
            />
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #eaeaea' }}>
                    <th style={{ padding: '1rem 0.5rem' }}>Ad Soyad</th>
                    <th style={{ padding: '1rem 0.5rem' }}>Üniversite / Bölüm</th>
                    <th style={{ padding: '1rem 0.5rem' }}>Bölge</th>
                    <th style={{ padding: '1rem 0.5rem' }}>Son İletişim</th>
                    <th style={{ padding: '1rem 0.5rem' }}>Durum</th>
                    <th style={{ padding: '1rem 0.5rem', textAlign: 'right' }}>İşlemler</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReps.map(rep => {
                    const status = rep.representative_profiles?.status || 'Aktif';
                    const lastContact = rep.representative_profiles?.last_contact_date;
                    
                    // Communication status coloring logic
                    let statusColor = '#10b981'; // Green
                    let lastContactLabel = 'Hiç Kurulmadı';

                    if (lastContact) {
                      const diffTime = Math.abs(new Date().getTime() - new Date(lastContact).getTime());
                      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                      lastContactLabel = new Date(lastContact).toLocaleDateString('tr-TR');

                      if (diffDays > 90) {
                        statusColor = '#ef4444'; // Red (Over 3 months)
                      } else if (diffDays > 30) {
                        statusColor = '#f59e0b'; // Orange (Over 1 month)
                      }
                    } else {
                      statusColor = '#ef4444'; // Red by default if no contact
                    }

                    return (
                      <tr key={rep.id} style={{ borderBottom: '1px solid var(--border-inner)' }}>
                        <td style={{ padding: '1rem 0.5rem' }}>
                          <div style={{ fontWeight: 600 }}>{rep.full_name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{rep.phone_number}</div>
                        </td>
                        <td style={{ padding: '1rem 0.5rem' }}>
                          <div>{rep.university}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{rep.department} ({rep.grade})</div>
                        </td>
                        <td style={{ padding: '1rem 0.5rem' }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>{rep.region}</span>
                        </td>
                        <td style={{ padding: '1rem 0.5rem' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', fontWeight: 600, color: statusColor }}>
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: statusColor }}></span>
                            {lastContactLabel}
                          </span>
                        </td>
                        <td style={{ padding: '1rem 0.5rem' }}>
                          <span className={`badge ${
                            status === 'Aktif' ? 'badge-success' :
                            status === 'Mezun' ? 'badge-pending' : 'badge-danger'
                          }`}>
                            {status}
                          </span>
                        </td>
                        <td style={{ padding: '1rem 0.5rem', textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '0.35rem' }}>
                            <Link 
                              href={`/dashboard/representatives/${rep.id}`}
                              className="btn btn-outline" 
                              title="Temsilci Detay Sayfası"
                              style={{ padding: '0.35rem', color: 'var(--color-primary)', borderColor: 'var(--color-primary-light)' }}
                            >
                              <Eye size={16} />
                            </Link>
                            <button 
                              onClick={() => openCommHistory(rep)}
                              className="btn btn-outline" 
                              title="İletişime Geç & İletişim Geçmişi"
                              style={{ padding: '0.35rem', color: 'var(--color-primary)', borderColor: 'var(--color-primary-light)' }}
                            >
                              <MessageSquare size={16} />
                            </button>
                            <button 
                              onClick={() => openEdit(rep)}
                              className="btn btn-outline" 
                              title="Düzenle"
                              style={{ padding: '0.35rem' }}
                            >
                              <Edit2 size={16} />
                            </button>
                            {canDelete && (
                              <button 
                                onClick={() => handleDeleteRep(rep.id)}
                                className="btn btn-outline" 
                                title="Kayıt Sil"
                                style={{ padding: '0.35rem', color: 'var(--status-danger)', borderColor: 'var(--status-danger)' }}
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

        </div>

      </div>}

      {/* Communication & Log Modal */}
      {isCommModalOpen && activeRep && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ backgroundColor: 'var(--bg-card)', padding: '2rem', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: '600px', display: 'flex', flexDirection: 'column', gap: '1.5rem', maxHeight: '90vh', overflowY: 'auto' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>?? İletişim: {activeRep.full_name}</h2>
              <button onClick={() => setIsCommModalOpen(false)} className="btn btn-outline" style={{ padding: '0.25rem 0.5rem' }}>X</button>
            </div>

            {/* Direct Communication Channels */}
            <div style={{ backgroundColor: 'var(--bg-main)', padding: '1rem', borderRadius: 'var(--radius-md)', display: 'flex', gap: '0.75rem', justifyContent: 'space-around' }}>
              <a 
                href={`https://wa.me/${activeRep.phone_number.replace(/[^0-9]/g, '')}`} 
                target="_blank" 
                rel="noreferrer"
                className="btn btn-primary"
                style={{ backgroundColor: '#25d366', borderColor: '#25d366', flex: 1, display: 'inline-flex', justifyContent: 'center', alignItems: 'center', gap: '0.25rem', textDecoration: 'none', color: 'white', fontSize: '0.875rem' }}
              >
                ?? WhatsApp Başlat
              </a>
              <a 
                href={`mailto:${activeRep.email}`}
                className="btn btn-primary"
                style={{ flex: 1, display: 'inline-flex', justifyContent: 'center', alignItems: 'center', gap: '0.25rem', textDecoration: 'none', color: 'white', fontSize: '0.875rem' }}
              >
                âÅ“â€°Ã¯Â¸Â E-posta Gönder
              </a>
            </div>

            {/* Form to log communication */}
            <form onSubmit={handleLogCommunication} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>İletişim Kaydı Ekle</h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label className="label">Kanal *</label>
                  <select className="input" value={commChannel} onChange={e => setCommChannel(e.target.value as any)}>
                    <option value="WhatsApp">WhatsApp</option>
                    <option value="Email">E-posta</option>
                    <option value="SMS">SMS</option>
                    <option value="Yüzyüze">Yüz Yüze Görüşme</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="label">Görüşme Detayları / Mesaj *</label>
                <textarea 
                  className="input" 
                  rows={3} 
                  required 
                  placeholder="Görüşülen konuyu, alınan kararları veya iletilen mesajı özetleyin..."
                  value={commMessage}
                  onChange={e => setCommMessage(e.target.value)}
                />
              </div>

              <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-end' }}>
                Kaydet & Kapat
              </button>
            </form>

            {/* Communication History list */}
            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem' }}>Geçmiş Görüşmeler ({commHistory.length})</h3>
              {commHistory.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', textAlign: 'center' }}>Bu temsilciyle henüz geçmiş bir iletişim kaydı bulunmuyor.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '200px', overflowY: 'auto' }}>
                  {commHistory.map((item, idx) => (
                    <div key={idx} style={{ backgroundColor: 'var(--bg-main)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', fontSize: '0.85rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                        <strong style={{ textTransform: 'uppercase', color: 'var(--color-primary)' }}>{item.channel}</strong>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{new Date(item.created_at).toLocaleString('tr-TR')}</span>
                      </div>
                      <div style={{ color: 'var(--text-muted)' }}>{item.message}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* Edit / Detail Modal */}
      {isEditModalOpen && activeRep && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ backgroundColor: 'var(--bg-card)', padding: '2rem', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: '650px', maxHeight: '90vh', overflowY: 'auto' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>?? Temsilci Bilgilerini Güncelle</h2>
              <button onClick={() => setIsEditModalOpen(false)} className="btn btn-outline" style={{ padding: '0.25rem 0.5rem' }}>X</button>
            </div>

            <form onSubmit={handleSaveChanges} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label className="label">Ad Soyad *</label>
                  <input type="text" className="input" required value={editFormData.fullName} onChange={e => setEditFormData({...editFormData, fullName: e.target.value})} />
                </div>
                <div>
                  <label className="label">Telefon Numarası *</label>
                  <input type="text" className="input" required value={editFormData.phone} onChange={e => setEditFormData({...editFormData, phone: e.target.value})} />
                </div>
                <div>
                  <label className="label">E-posta Adresi *</label>
                  <input type="email" className="input" required value={editFormData.email} onChange={e => setEditFormData({...editFormData, email: e.target.value})} />
                </div>
                <div>
                  <label className="label">Üniversite *</label>
                  <input type="text" className="input" required value={editFormData.university} onChange={e => setEditFormData({...editFormData, university: e.target.value})} />
                </div>
                <div>
                  <label className="label">Bölüm *</label>
                  <input type="text" className="input" required value={editFormData.department} onChange={e => setEditFormData({...editFormData, department: e.target.value})} />
                </div>
                <div>
                  <label className="label">Sınıf / Sene *</label>
                  <select className="input" required value={editFormData.grade} onChange={e => setEditFormData({...editFormData, grade: e.target.value})}>
                    <option value="Hazırlık">Hazırlık</option>
                    <option value="1. Sınıf">1. Sınıf</option>
                    <option value="2. Sınıf">2. Sınıf</option>
                    <option value="3. Sınıf">3. Sınıf</option>
                    <option value="4. Sınıf">4. Sınıf</option>
                    <option value="Mezun">Mezun</option>
                  </select>
                </div>
                <div>
                  <label className="label">Temsil Durumu *</label>
                  <select className="input" required value={editFormData.status} onChange={e => setEditFormData({...editFormData, status: e.target.value as any})}>
                    <option value="Aktif">Aktif</option>
                    <option value="Pasif">Pasif</option>
                    <option value="Mezun">Mezun</option>
                  </select>
                </div>
                {!isRegionManager && (
                  <div>
                    <label className="label">Atandığı Bölge *</label>
                    <select className="input" required value={editFormData.region} onChange={e => setEditFormData({...editFormData, region: e.target.value})}>
                      {REGIONS.map(reg => (
                        <option key={reg} value={reg}>{reg.toUpperCase()}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div>
                <label className="label">Özel Notlar</label>
                <textarea 
                  className="input" 
                  rows={2} 
                  value={editFormData.notes || ''} 
                  onChange={e => setEditFormData({...editFormData, notes: e.target.value})} 
                  placeholder="Gönüllü katılımı, etkinlik kalitesi veya genel değerlendirmeleriniz..."
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <button type="button" onClick={() => setIsEditModalOpen(false)} className="btn btn-outline">İptal</button>
                <button type="submit" className="btn btn-primary">Değişiklikleri Kaydet</button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}




