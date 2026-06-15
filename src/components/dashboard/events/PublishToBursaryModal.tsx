import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { X, Upload, Plus, Trash2, Eye, Calendar, MapPin, User, ArrowRight, XCircle } from 'lucide-react';
import BursiyerEventCard from '../bursary-panel/BursiyerEventCard';

interface PublishToBursaryModalProps {
  event: any;
  onClose: () => void;
  onSuccess: () => void;
}

export default function PublishToBursaryModal({ event, onClose, onSuccess }: PublishToBursaryModalProps) {
  const [formData, setFormData] = useState({
    participant_type: 'university_only',
    display_title: event.event_name || '',
    event_date: event.event_date ? new Date(event.event_date).toISOString().slice(0, 16) : '',
    event_end_date: '',
    city: event.region || '',
    venue: event.location || '',
    description: event.description || '',
    speakers: [{ name: '', title: '' }],
    requires_registration: false,
    registration_url: '',
    registration_deadline: '',
    registration_required_warning: false,
    contact_person: { name: '', phone: '', email: '' }
  });

  const [posterFile, setPosterFile] = useState<File | null>(null);
  const [posterPreview, setPosterPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Turkey's cities for the dropdown
  const cities = ["Adana", "Adıyaman", "Afyonkarahisar", "Ağrı", "Amasya", "Ankara", "Antalya", "Artvin", "Aydın", "Balıkesir", "Bilecik", "Bingöl", "Bitlis", "Bolu", "Burdur", "Bursa", "Çanakkale", "Çankırı", "Çorum", "Denizli", "Diyarbakır", "Edirne", "Elazığ", "Erzincan", "Erzurum", "Eskişehir", "Gaziantep", "Giresun", "Gümüşhane", "Hakkari", "Hatay", "Isparta", "Mersin", "İstanbul", "İzmir", "Kars", "Kastamonu", "Kayseri", "Kırklareli", "Kırşehir", "Kocaeli", "Konya", "Kütahya", "Malatya", "Manisa", "Kahramanmaraş", "Mardin", "Muğla", "Muş", "Nevşehir", "Niğde", "Ordu", "Rize", "Sakarya", "Samsun", "Siirt", "Sinop", "Sivas", "Tekirdağ", "Tokat", "Trabzon", "Tunceli", "Şanlıurfa", "Uşak", "Van", "Yozgat", "Zonguldak", "Aksaray", "Bayburt", "Karaman", "Kırıkkale", "Batman", "Şırnak", "Bartın", "Ardahan", "Iğdır", "Yalova", "Karabük", "Kilis", "Osmaniye", "Düzce"];

  const handleSpeakerChange = (index: number, field: string, value: string) => {
    const newSpeakers = [...formData.speakers];
    newSpeakers[index] = { ...newSpeakers[index], [field]: value };
    setFormData({ ...formData, speakers: newSpeakers });
  };

  const addSpeaker = () => setFormData({ ...formData, speakers: [...formData.speakers, { name: '', title: '' }] });
  
  const removeSpeaker = (index: number) => {
    const newSpeakers = [...formData.speakers];
    newSpeakers.splice(index, 1);
    setFormData({ ...formData, speakers: newSpeakers });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 2 * 1024 * 1024) {
        alert("Dosya boyutu 2MB'ı geçemez.");
        return;
      }
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        alert("Sadece JPG, PNG veya WEBP formatları desteklenir.");
        return;
      }
      setPosterFile(file);
      setPosterPreview(URL.createObjectURL(file));
    }
  };

  const validateAndShowPreview = () => {
    if (!formData.display_title || !formData.event_date || !formData.city) {
      alert("Lütfen zorunlu alanları (Etkinlik Adı, Tarih ve Şehir) doldurunuz.");
      return;
    }
    if (formData.requires_registration && !formData.registration_url.startsWith('https://')) {
      alert("Başvuru linki 'https://' ile başlamalıdır.");
      return;
    }
    setShowPreview(true);
  };

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [progressState, setProgressState] = useState<string>('');

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);
    setProgressState('1/5: Oturum kontrol ediliyor...');
    
    // Genel bir zaman aşımı koruması (tüm süreç için 15 saniye)
    const timeoutId = setTimeout(() => {
      setErrorMessage("İşlem çok uzun sürdüğü için iptal edildi. Lütfen sayfayı yenileyip tekrar deneyin.");
      setIsSubmitting(false);
    }, 15000);

    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData?.user) throw new Error("Oturum bulunamadı");
      
      setProgressState('2/5: Kullanıcı profili çekiliyor...');
      const { data: profileData, error: profileError } = await supabase.from('users').select('university').eq('id', userData.user.id).single();
      if (profileError) throw new Error("Profil çekilirken hata: " + profileError.message);
      if (!profileData?.university) throw new Error("Kullanıcının üniversite bilgisi bulunamadı");

      let finalPosterUrl = '';
      if (posterFile) {
        setProgressState('3/5: Afiş yükleniyor...');
        const fileExt = posterFile.name.split('.').pop();
        const fileName = `${event.id}_${Math.random()}.${fileExt}`;
        const { error: uploadError, data } = await supabase.storage.from('posters').upload(fileName, posterFile);
        if (uploadError) throw new Error("Afiş yüklenemedi. Lütfen 'posters' adında bir storage bucket olduğundan emin olun. Detay: " + uploadError.message);
        
        const { data: urlData } = supabase.storage.from('posters').getPublicUrl(fileName);
        finalPosterUrl = urlData.publicUrl;
      } else {
        setProgressState('3/5: Afiş adımı geçiliyor...');
      }

      const validSpeakers = formData.speakers.filter(s => s.name.trim() !== '');

      const payload = {
        event_id: event.id,
        published_by: userData.user.id,
        participant_type: formData.participant_type,
        display_title: formData.display_title,
        event_date: formData.event_date,
        event_end_date: formData.event_end_date || null,
        city: formData.city,
        venue: formData.venue,
        description: formData.description,
        speakers: validSpeakers,
        poster_url: finalPosterUrl || null,
        requires_registration: formData.requires_registration,
        registration_url: formData.requires_registration ? formData.registration_url : null,
        registration_deadline: formData.requires_registration && formData.registration_deadline ? formData.registration_deadline : null,
        registration_required_warning: formData.registration_required_warning,
        contact_person: formData.contact_person.name ? formData.contact_person : null,
        university: profileData.university,
        is_published: true
      };

      setProgressState('4/5: Veritabanına kayıt atılıyor...');
      const { error: insertError } = await supabase.from('bursiyer_events').insert(payload);
      if (insertError) {
        throw new Error("Veritabanına ekleme hatası. Tablo oluşturulmamış veya yetki sorunu olabilir. Detay: " + insertError.message);
      }

      setProgressState('5/5: Başarılı, tamamlanıyor...');
      clearTimeout(timeoutId);
      onSuccess();
    } catch (error: any) {
      clearTimeout(timeoutId);
      console.error("Yayınlama hatası:", error);
      setErrorMessage(error.message || JSON.stringify(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (showPreview) {
    // Generate a mock event object for the preview card
    const previewEvent = {
      id: 'preview',
      display_title: formData.display_title,
      participant_type: formData.participant_type,
      event_date: formData.event_date,
      city: formData.city,
      venue: formData.venue,
      description: formData.description,
      speakers: formData.speakers.filter(s => s.name.trim() !== ''),
      poster_url: posterPreview || undefined,
      requires_registration: formData.requires_registration,
      registration_url: formData.registration_url,
      registration_deadline: formData.registration_deadline,
      registration_required_warning: formData.registration_required_warning,
      contact_person: formData.contact_person.name ? formData.contact_person : undefined
    };

    return (
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 9999, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--text-main)', color: '#fff' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Bursiyer Panelinde Böyle Görünecek</h2>
            <p style={{ fontSize: '0.875rem', color: '#aaa' }}>Bu önizleme bursiyer gözünden mobil formattaki görünümdür.</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            {errorMessage && (
              <div style={{ color: '#ef4444', fontSize: '0.875rem', maxWidth: '300px', textAlign: 'right' }}>
                {errorMessage}
              </div>
            )}
            {isSubmitting && !errorMessage && (
              <div style={{ color: '#eab308', fontSize: '0.875rem', maxWidth: '300px', textAlign: 'right' }}>
                {progressState}
              </div>
            )}
            <button onClick={() => setShowPreview(false)} className="btn btn-outline" style={{ color: '#fff', borderColor: '#555' }}>
              Düzenle
            </button>
            <button onClick={handleSubmit} className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Yayınlanıyor...' : 'Yayınla'}
            </button>
          </div>
        </div>
        
        <div style={{ flexGrow: 1, overflowY: 'auto', display: 'flex', justifyContent: 'center', padding: '2rem 1rem' }}>
          <div style={{ 
            maxWidth: '400px', width: '100%', height: 'max-content',
            backgroundColor: 'var(--bg-main)', borderRadius: '1.5rem', padding: '0.5rem',
            border: '8px solid #333', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
          }}>
            <BursiyerEventCard event={previewEvent as any} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '2rem' }}>
      <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: '800px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
        
        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fcdbd9', color: '#da1c15' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>Bursiyer Paneline Ekle</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#da1c15' }}><X size={24} /></button>
        </div>

        <div style={{ padding: '1.5rem', overflowY: 'auto', flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Katılımcı Tipi */}
          <div>
            <label className="label">Katılımcı Tipi *</label>
            <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.5rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input type="radio" checked={formData.participant_type === 'university_only'} onChange={() => setFormData({...formData, participant_type: 'university_only'})} />
                Sadece kendi üniversitemizin bursiyerleri
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input type="radio" checked={formData.participant_type === 'all'} onChange={() => setFormData({...formData, participant_type: 'all'})} />
                Tüm bursiyerlere açık (dış katılımcı)
              </label>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <div>
              <label className="label">Etkinlik Adı *</label>
              <input type="text" className="input" value={formData.display_title} onChange={e => setFormData({...formData, display_title: e.target.value})} required />
            </div>
            
            <div>
              <label className="label">Şehir *</label>
              <select className="input" value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} required>
                <option value="">Seçiniz</option>
                {cities.sort().map(city => <option key={city} value={city}>{city}</option>)}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <div>
              <label className="label">Başlangıç Tarihi ve Saati *</label>
              <input type="datetime-local" className="input" value={formData.event_date} onChange={e => setFormData({...formData, event_date: e.target.value})} required />
            </div>
            <div>
              <label className="label">Bitiş Tarihi ve Saati (Opsiyonel)</label>
              <input type="datetime-local" className="input" value={formData.event_end_date} onChange={e => setFormData({...formData, event_end_date: e.target.value})} />
            </div>
          </div>

          <div>
            <label className="label">Mekan / Konum</label>
            <input type="text" className="input" placeholder="Örn: Konferans Salonu B" value={formData.venue} onChange={e => setFormData({...formData, venue: e.target.value})} />
          </div>

          <div>
            <label className="label">İçerik / Açıklama</label>
            <textarea 
              className="input" 
              rows={4} 
              maxLength={500}
              placeholder="Etkinlik hakkında detaylı bilgi..." 
              value={formData.description} 
              onChange={e => setFormData({...formData, description: e.target.value})} 
            />
            <div style={{ textAlign: 'right', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              {formData.description.length}/500
            </div>
          </div>

          <div style={{ padding: '1rem', backgroundColor: 'var(--bg-main)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <label className="label" style={{ margin: 0 }}>Konuşmacılar</label>
              <button onClick={addSpeaker} type="button" style={{ background: 'none', border: 'none', color: '#da1c15', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <Plus size={16} /> Ekle
              </button>
            </div>
            {formData.speakers.map((speaker, index) => (
              <div key={index} style={{ display: 'flex', gap: '1rem', marginBottom: '0.5rem', alignItems: 'center' }}>
                <input type="text" className="input" placeholder="Ad Soyad" value={speaker.name} onChange={e => handleSpeakerChange(index, 'name', e.target.value)} style={{ flex: 1 }} />
                <input type="text" className="input" placeholder="Unvan / Kurum" value={speaker.title} onChange={e => handleSpeakerChange(index, 'title', e.target.value)} style={{ flex: 1 }} />
                {formData.speakers.length > 1 && (
                  <button onClick={() => removeSpeaker(index)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><Trash2 size={18} /></button>
                )}
              </div>
            ))}
          </div>

          <div>
            <label className="label">Afiş Yükle (Maksimum 2MB, JPG/PNG/WEBP)</label>
            <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', border: '2px dashed #cbd5e1', borderRadius: 'var(--radius-md)', cursor: 'pointer', backgroundColor: '#f8fafc', transition: 'border-color 0.2s' }}>
                  <Upload size={24} color="#94a3b8" style={{ marginBottom: '0.5rem' }} />
                  <span style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: 500 }}>Görsel seçmek için tıklayın</span>
                  <input type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} onChange={handleFileChange} />
                </label>
              </div>
              {posterPreview && (
                <div style={{ width: '160px', height: '90px', borderRadius: 'var(--radius-sm)', overflow: 'hidden', border: '1px solid var(--border-color)', position: 'relative' }}>
                   <img src={posterPreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              )}
            </div>
          </div>

          <div style={{ padding: '1rem', backgroundColor: 'var(--bg-main)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', fontWeight: 600, color: 'var(--text-main)', marginBottom: formData.requires_registration ? '1rem' : 0 }}>
              <input type="checkbox" style={{ width: '18px', height: '18px' }} checked={formData.requires_registration} onChange={e => setFormData({...formData, requires_registration: e.target.checked})} />
              Başvuru gerekli mi?
            </label>
            
            {formData.requires_registration && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', paddingLeft: '2rem' }}>
                <div>
                  <label className="label">Başvuru Formu URL&apos;si *</label>
                  <input type="url" className="input" placeholder="https://..." value={formData.registration_url} onChange={e => setFormData({...formData, registration_url: e.target.value})} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', alignItems: 'end' }}>
                  <div>
                    <label className="label">Son Başvuru Tarihi</label>
                    <input type="date" className="input" value={formData.registration_deadline} onChange={e => setFormData({...formData, registration_deadline: e.target.value})} />
                  </div>
                  <div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem' }}>
                      <input type="checkbox" checked={formData.registration_required_warning} onChange={e => setFormData({...formData, registration_required_warning: e.target.checked})} />
                      Kartta &quot;Başvuru zorunludur&quot; uyarısı göster
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div style={{ padding: '1rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
             <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '1rem' }}>İletişim Kişisi (Opsiyonel)</h3>
             <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                <input type="text" className="input" placeholder="Ad Soyad" value={formData.contact_person.name} onChange={e => setFormData({...formData, contact_person: {...formData.contact_person, name: e.target.value}})} />
                <input type="tel" className="input" placeholder="Telefon" value={formData.contact_person.phone} onChange={e => setFormData({...formData, contact_person: {...formData.contact_person, phone: e.target.value}})} />
                <input type="email" className="input" placeholder="E-posta" value={formData.contact_person.email} onChange={e => setFormData({...formData, contact_person: {...formData.contact_person, email: e.target.value}})} />
             </div>
          </div>

        </div>

        <div style={{ padding: '1.5rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end', gap: '1rem', backgroundColor: 'var(--bg-main)' }}>
          <button className="btn btn-outline" onClick={onClose}>İptal</button>
          <button className="btn btn-primary" onClick={validateAndShowPreview} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Eye size={18} /> Önizle ve Yayınla
          </button>
        </div>

      </div>
    </div>
  );
}
