'use client';
import { toast } from 'react-hot-toast';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/utils/supabase/client';
const supabase = createClient();
import { useRole } from '@/context/RoleContext';
import { Camera, Save, User } from 'lucide-react';
import ImageUpload from '@/components/ImageUpload';

export default function ProfilePage() {
  const { user } = useRole();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    university: '',
    department: '',
    classYear: '',
    unitName: '',
    clubRole: ''
  });

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user?.id)
        .single();

      if (error) throw error;
      
      setProfile(data);
      setFormData({
        fullName: data.full_name || '',
        phone: data.phone_number || '',
        university: data.university || '',
        department: data.department || '',
        classYear: data.grade || '',
        unitName: data.unit_name || '',
        clubRole: data.club_role || ''
      });
      setAvatarUrl(data.avatar_url);
    } catch (err) {
      console.error('Profil yüklenirken hata:', (err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({
          full_name: formData.fullName,
          phone_number: formData.phone,
          department: formData.department,
          grade: formData.classYear,
          unit_name: formData.unitName,
          club_role: formData.clubRole
        })
        .eq('id', user?.id);

      if (error) {
        console.error('Arka planda kaydederken hata oluþtu:', error);
        toast.error('Kaydetme baþarýsýz: ' + (error as Error).message);
      } else {
        toast.success('Profil bilgileriniz baþarýyla güncellendi!');
      }
    } catch (err) {
      console.error(err);
      toast.error('Kaydetme baþarýsýz: ' + (err as Error).message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarChange = async (url: string) => {
    try {
      const { error: updateError } = await supabase
        .from('users')
        .update({ avatar_url: url })
        .eq('id', user?.id);

      if (updateError) throw updateError;
      setAvatarUrl(url);
    } catch (error) {
      toast.error('Profil fotoðrafý güncellenirken hata oluþtu: ' + (error as Error).message);
    }
  };

  if (isLoading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Profil Yükleniyor...</div>;

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', paddingBottom: '4rem' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem' }}>Profil Ayarlarým</h1>

      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        
        {/* Avatar Section */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', paddingBottom: '1.5rem', borderBottom: '1px solid var(--border-color)' }}>
          <ImageUpload
            bucket="avatars"
            value={avatarUrl}
            onChange={handleAvatarChange}
            width="100px"
            height="100px"
            label=""
          />
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Profil Fotoðrafý</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Kare formatta bir fotoðraf yüklemeniz önerilir.</p>
          </div>
        </div>

        {/* Form Section */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          <div>
            <label className="label">Ad Soyad</label>
            <input type="text" className="input" value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} />
          </div>
          <div>
            <label className="label">Telefon Numarasý</label>
            <input type="text" className="input" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
          </div>

          {/* Sistemden Gelen (Salt Okunur) Alanlar */}
          <div>
            <label className="label">Üniversite</label>
            <input type="text" className="input" value={formData.university} disabled style={{ backgroundColor: 'var(--bg-main)', color: '#6b7280' }} />
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Üniversite veya bölge deðiþiklikleri için merkeze baþvurun.</span>
          </div>

          <div>
            <label className="label">Baðlý Olduðu Birim</label>
            <select className="input" value={formData.unitName} onChange={e => setFormData({...formData, unitName: e.target.value})}>
              <option value="">Seçiniz...</option>
              <option value="Sosyal Çalýþmalar Birimi">Sosyal Çalýþmalar Birimi</option>
              <option value="Mesleki ve Kariyer Çalýþmalarý Birimi">Mesleki ve Kariyer Çalýþmalarý Birimi</option>
              <option value="Bilimsel ve Akademik Çalýþmalar Birimi">Bilimsel ve Akademik Çalýþmalar Birimi</option>
              <option value="Ýletiþim ve Planlama Birimi">Ýletiþim ve Planlama Birimi</option>
              <option value="Temsilcilikler Birimi">Temsilcilikler Birimi</option>
              <option value="Bursiyer">Bursiyer (Birim Yok)</option>
            </select>
          </div>

          {/* Sadece Bursiyerler Ýçin */}
          {profile?.role === 'bursary_student' && (
            <div style={{ gridColumn: 'span 2' }}>
              <label className="label">Kulüp Görevi / Rolü</label>
              <input type="text" className="input" placeholder="Örn: Organizasyon Ekibi Üyesi" value={formData.clubRole} onChange={e => setFormData({...formData, clubRole: e.target.value})} />
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Vakýf bünyesinde dahil olduðunuz bir kulüp veya görev varsa belirtiniz.</p>
            </div>
          )}

          {/* Yeni Eklenen Dinamik Alanlar */}
          <div>
            <label className="label">Bölüm</label>
            <input type="text" className="input" placeholder="Örn: Týp, Diþ Hekimliði, Hukuk" value={formData.department} onChange={e => setFormData({...formData, department: e.target.value})} />
          </div>
          <div>
            <label className="label">Sýnýf</label>
            <select className="input" value={formData.classYear} onChange={e => setFormData({...formData, classYear: e.target.value})}>
              <option value="">Seçiniz...</option>
              <option value="Hazýrlýk">Hazýrlýk</option>
              <option value="1. Sýnýf">1. Sýnýf</option>
              <option value="2. Sýnýf">2. Sýnýf</option>
              <option value="3. Sýnýf">3. Sýnýf</option>
              <option value="4. Sýnýf">4. Sýnýf</option>
              <option value="5. Sýnýf">5. Sýnýf</option>
              <option value="6. Sýnýf">6. Sýnýf</option>
              <option value="Mezun">Mezun</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
          <button onClick={handleSave} disabled={isSaving} className="btn btn-primary" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <Save size={18} /> {isSaving ? 'Kaydediliyor...' : 'Deðiþiklikleri Kaydet'}
          </button>
        </div>
      </div>
    </div>
  );
}





