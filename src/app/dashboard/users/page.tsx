'use client';
import { toast } from 'react-hot-toast';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
const supabase = createClient();
import { useRole } from '@/context/RoleContext';
import { CheckCircle, XCircle, Users, ChevronDown, ChevronRight, User as UserIcon } from 'lucide-react';

export default function UsersAdminPage() {
  const { currentRole } = useRole();
  const [activeTab, setActiveTab] = useState<'pending' | 'active'>('pending');
  
  const [pendingUsers, setPendingUsers] = useState<any[]>([]);
  const [activeUsers, setActiveUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Hiyerarþik aðaç için state (hangi bölgelerin açýk olduðunu tutar)
  const [expandedRegions, setExpandedRegions] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (currentRole === 'general_admin') {
      fetchUsers();
    }
  }, [currentRole, activeTab]);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const pUsers = data?.filter(u => !u.is_approved) || [];
      const aUsers = data?.filter(u => u.is_approved) || [];
      
      setPendingUsers(pUsers);
      setActiveUsers(aUsers);
    } catch (err) {
      console.error('Kullanýcýlar çekilirken hata:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (userId: string, userName: string) => {
    if (!confirm(`${userName} adlý kullanýcýnýn hesabýný onaylamak istiyor musunuz?`)) return;

    try {
      const { error } = await supabase.from('users').update({ is_approved: true }).eq('id', userId);
      if (error) throw error;
      toast.success(`${userName} baþarýyla onaylandý.`);
      fetchUsers();
    } catch (err) {
      toast.error('Onaylama sýrasýnda hata oluþtu: ' + (err as Error).message);
    }
  };

  const handleReject = async (userId: string, userName: string) => {
    if (!confirm(`${userName} adlý kullanýcýnýn kaydýný tamamen SÝLMEK istiyor musunuz?`)) return;

    try {
      const { error } = await supabase.from('users').delete().eq('id', userId);
      if (error) throw error;
      toast.success(`${userName} kaydý silindi.`);
      fetchUsers();
    } catch (err) {
      toast.error('Silme sýrasýnda hata oluþtu: ' + (err as Error).message);
    }
  };

  const toggleRegion = (region: string) => {
    setExpandedRegions(prev => ({ ...prev, [region]: !prev[region] }));
  };

  if (currentRole !== 'general_admin') {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Yetkisiz Eriþim</div>;
  }

  // Aktif kullanýcýlarý aðaç yapýsýna (Hiyerarþiye) dönüþtür
  // Yapý: Region -> { manager: User[], universities: { UnivName: UnitHead[] } }
  const treeData: Record<string, { managers: unknown[], universities: Record<string, unknown[]> }> = {};

  activeUsers.forEach(user => {
    const region = user.region || 'Belirtilmeyen Bölge';
    if (!treeData[region]) {
      treeData[region] = { managers: [], universities: {} };
    }

    if (user.role === 'region_manager') {
      treeData[region].managers.push(user);
    } else if (user.role === 'unit_head') {
      const univ = user.university || 'Belirtilmeyen Üniversite';
      if (!treeData[region].universities[univ]) {
        treeData[region].universities[univ] = [];
      }
      treeData[region].universities[univ].push(user);
    }
    // Diðer roller (general_admin, design_team vb.) bu aðaçta görünmeyebilir veya "Sistem Yöneticileri" bölgesine atýlabilir
  });

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '4rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Users size={24} color="var(--color-primary)" /> Kullanýcý ve Aðaç Yönetimi
        </h1>
        <p style={{ color: 'var(--text-muted)' }}>Sistemdeki kullanýcýlarý onaylayýn veya hiyerarþik yapýyý inceleyin.</p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--border-color)', marginBottom: '2rem' }}>
        <button 
          onClick={() => setActiveTab('pending')}
          style={{ padding: '1rem', background: 'none', border: 'none', borderBottom: activeTab === 'pending' ? '2px solid var(--color-primary)' : '2px solid transparent', color: activeTab === 'pending' ? 'var(--color-primary)' : 'var(--text-muted)', fontWeight: activeTab === 'pending' ? 600 : 400, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          Bekleyen Onaylar {pendingUsers.length > 0 && <span className="badge badge-danger" style={{ borderRadius: '50%', padding: '0.1rem 0.4rem', fontSize: '0.65rem' }}>{pendingUsers.length}</span>}
        </button>
        <button 
          onClick={() => setActiveTab('active')}
          style={{ padding: '1rem', background: 'none', border: 'none', borderBottom: activeTab === 'active' ? '2px solid var(--color-primary)' : '2px solid transparent', color: activeTab === 'active' ? 'var(--color-primary)' : 'var(--text-muted)', fontWeight: activeTab === 'active' ? 600 : 400, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          Aktif Kullanýcý Aðacý
        </button>
      </div>

      <div className="card">
        {isLoading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Yükleniyor...</div>
        ) : activeTab === 'pending' ? (
          // BEKLEYEN ONAYLAR TAB'i
          pendingUsers.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', backgroundColor: 'var(--bg-main)', borderRadius: 'var(--radius-md)' }}>
              <p style={{ color: 'var(--text-muted)' }}>Bekleyen onay yoktur.</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ backgroundColor: 'var(--bg-main)', color: 'var(--text-muted)', textAlign: 'left' }}>
                    <th style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border-color)' }}>Kullanýcý</th>
                    <th style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border-color)' }}>Üniversite & Bölge</th>
                    <th style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border-color)' }}>Talep Ettiði Rol</th>
                    <th style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border-color)' }}>Ýletiþim & Öðr. No</th>
                    <th style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border-color)', textAlign: 'right' }}>Ýþlemler</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingUsers.map(user => (
                    <tr key={user.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '1rem' }}>
                        <div style={{ fontWeight: 600 }}>{user.full_name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{new Date(user.created_at).toLocaleDateString('tr-TR')}</div>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <div>{user.university || '-'}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{user.region || '-'}</div>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <span className="badge badge-primary">{user.role}</span>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{user.unit_name}</div>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <div>{user.phone_number}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Öðr No: {user.student_id || '-'}</div>
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'right', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                        <button onClick={() => handleApprove(user.id, user.full_name)} className="btn" style={{ padding: '0.5rem', backgroundColor: 'var(--status-success)', color: 'white' }}>
                          <CheckCircle size={16} /> Onayla
                        </button>
                        <button onClick={() => handleReject(user.id, user.full_name)} className="btn" style={{ padding: '0.5rem', backgroundColor: 'var(--status-danger)', color: 'white' }}>
                          <XCircle size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : (
          // AKTÝF KULLANICI AÄžACI TAB'i
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {Object.keys(treeData).length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Sistemde aktif kullanýcý bulunmuyor.</div>
            ) : (
              Object.entries(treeData).sort(([a], [b]) => a.localeCompare(b)).map(([region, data]) => (
                <div key={region} style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                  
                  {/* BÖLGE BAÅžLIÄžI */}
                  <div 
                    onClick={() => toggleRegion(region)}
                    style={{ padding: '1rem', backgroundColor: expandedRegions[region] ? 'var(--color-primary-light)' : 'var(--bg-nested)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', transition: 'all 0.2s' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, color: expandedRegions[region] ? 'var(--color-primary)' : 'var(--text-main)' }}>
                      {expandedRegions[region] ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                      {region} Bölgesi
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', gap: '1rem' }}>
                      <span>Sorumlu: {data.managers.length}</span>
                      <span>Üniversite: {Object.keys(data.universities).length}</span>
                    </div>
                  </div>

                  {/* BÖLGE ÝÇERÝÄžÝ */}
                  {expandedRegions[region] && (
                    <div style={{ padding: '1.5rem', backgroundColor: 'var(--bg-card)', borderTop: '1px solid var(--border-color)' }}>
                      
                      {/* BÖLGE SORUMLULARI */}
                      <div style={{ marginBottom: '1.5rem' }}>
                        <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Bölge Sorumlularý</h4>
                        {data.managers.length === 0 ? (
                          <div style={{ fontSize: '0.875rem', color: 'var(--status-danger)', fontStyle: 'italic' }}>Atanmýþ bölge sorumlusu yok!</div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {data.managers.map(mgr => (
                              <div key={mgr.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 'var(--radius-sm)' }}>
                                <UserIcon size={18} color="#16a34a" />
                                <div style={{ flex: 1 }}>
                                  <div style={{ fontWeight: 600, color: '#166534' }}>{mgr.full_name}</div>
                                  <div style={{ fontSize: '0.75rem', color: '#15803d' }}>{mgr.phone_number} | {mgr.email}</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* ÜNÝVERSÝTELER VE BÝRÝM BAÅžKANLARI */}
                      <div>
                        <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Baðlý Üniversiteler</h4>
                        {Object.keys(data.universities).length === 0 ? (
                          <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Bu bölgeye baðlý üniversite baþkaný bulunmuyor.</div>
                        ) : (
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
                            {Object.entries(data.universities).sort(([a], [b]) => a.localeCompare(b)).map(([univ, heads]) => (
                              <div key={univ} style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
                                <div style={{ padding: '0.5rem 1rem', backgroundColor: '#f3f4f6', fontWeight: 600, fontSize: '0.875rem', borderBottom: '1px solid var(--border-color)' }}>
                                  {univ}
                                </div>
                                <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                  {heads.map(head => (
                                    <div key={head.id} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                                      {head.avatar_url ? (
                                        <img src={head.avatar_url} alt="" style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }} />
                                      ) : (
                                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                          <UserIcon size={16} color="#9ca3af" />
                                        </div>
                                      )}
                                      <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{head.full_name}</div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--color-primary)', fontWeight: 500 }}>{head.unit_name}</div>
                                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                                          <div>Sýnýf: {head.class_year || 'Belirtilmedi'} | Bölüm: {head.department || 'Belirtilmedi'}</div>
                                          <div>No: {head.student_id || '-'}</div>
                                          <div>{head.phone_number}</div>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}





