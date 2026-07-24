'use client';
import { toast } from 'react-hot-toast';
import { z } from 'zod';

import { useState, useEffect } from 'react';
import { ChevronRight, ChevronLeft, Save, Plus, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
const supabase = createClient();
import { useRole } from '@/context/RoleContext';
import ImageUpload from '@/components/ImageUpload';
import ExpertiseMultiSelect from '@/components/ExpertiseMultiSelect';

type Step = 1 | 2 | 3 | 4;

const eventSchema = z.object({
  eventName: z.string().min(3, 'Etkinlik adı en az 3 karakter olmalıdır.'),
  eventType: z.string().min(1, 'Etkinlik türü seçmelisiniz.'),
  otherEventType: z.string().optional(),
  eventPurpose: z.string().min(10, 'Etkinlik amacı en az 10 karakter olmalıdır.'),
  location: z.string().min(3, 'Mekan bilgisi gereklidir.'),
  eventDate: z.string().min(1, 'Etkinlik tarihi gereklidir.'),
  targetAudience: z.string().min(3, 'Hedef kitle gereklidir.'),
  expectedCount: z.string().optional()
});


export default function NewEventPage() {
  const { currentRole, isLoading, userData } = useRole();
  const isMesleki = userData?.unit_name?.includes('Mesleki');
  const router = useRouter();
  
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [isSaving, setIsSaving] = useState(false);
  const [speakers, setSpeakers] = useState<any[]>([]);
  const [isDraftLoaded, setIsDraftLoaded] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Client-side yetkilendirme kontrolü
  useEffect(() => {
    if (!isLoading && currentRole) {
      const allowedRoles = ['unit_head', 'general_admin', 'representative', 'rep_head', 'rep_coordinator', 'rep_region_manager'];
      if (!allowedRoles.includes(currentRole)) {
        router.push('/dashboard');
      }
    }
  }, [currentRole, isLoading, router]);

  // Form State
  const [formData, setFormData] = useState({
    unitName: '',
    eventName: '',
    eventType: '',
    otherEventType: '',
    targetAudience: '',
    eventPurpose: '',
    location: '',
    eventDate: '',
    expectedCount: '',
    preregRequired: false,
    posterUrl: '',
    ramadan: {
      isSahur: false,
      isIftar: false,
      foodCount: 0,
      driveLink: '',
      socialLink: '',
      cancelled: false,
      cancellationReason: '',
      okulIsmi: '',
      photoUrlsJson: '',
      receiptPhotosJson: ''
    },
    logistics: {
      hasShuttle: false,
      shuttle: { date: '', description: '', departurePoint: '', arrivalPoint: '', departureTime: '', returnPoint: '', returnTime: '', vehicleManager: '', locationLink: '' },
      hasAroma: false,
      aroma: [{ oils: '', amount: '', peopleCount: '', notes: '' }],
      hasBasicLifeSupport: false,
      basicLifeSupportDetails: '',
      hasAdvancedLifeSupport: false,
      advancedLifeSupportDetails: '',
      hasSutureTraining: false,
      sutureTrainingDetails: '',
      customRequests: [] as any[],
      extraNotes: ''
    }
  });

  useEffect(() => {
    const draft = localStorage.getItem('event_draft');
    if (draft) {
      try {
        const parsed = JSON.parse(draft);
        if (parsed.formData) {
          setFormData(prev => ({
            ...prev,
            ...parsed.formData,
            logistics: parsed.formData.logistics || prev.logistics
          }));
        }
        if (parsed.speakers) setSpeakers(parsed.speakers);
        if (parsed.currentStep) setCurrentStep(parsed.currentStep);
      } catch (e) {}
    }
    setIsDraftLoaded(true);
  }, []);

  useEffect(() => {
    if (isDraftLoaded) {
      localStorage.setItem('event_draft', JSON.stringify({ formData, speakers, currentStep }));
    }
  }, [formData, speakers, currentStep, isDraftLoaded]);

  useEffect(() => {
    if (currentRole === 'representative') {
      setFormData(prev => ({
        ...prev,
        eventType: 'Ramazan Etkinliği'
      }));
    } else if (currentRole && formData.eventType === 'Ramazan Etkinliği') {
      // Temsilci olmayan biri localStorage yüzünden Ramazan formunda kaldıysa temizle
      setFormData(prev => ({
        ...prev,
        eventType: ''
      }));
    }
  }, [currentRole, formData.eventType]);

  const handleNext = () => setCurrentStep((prev) => (prev < 4 ? (prev + 1) as Step : prev));
  const handlePrev = () => setCurrentStep((prev) => (prev > 1 ? (prev - 1) as Step : prev));

  const saveEventData = async (status: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Oturum bulunamadı.');

      const { data: profile, error: profileErr } = await supabase.from('users').select('unit_name, university, region').eq('id', user.id).single();
      if (profileErr) throw new Error('Kullanıcı profili alınamadı.');

      
      const finalEventType = formData.eventType === 'Diğer' ? formData.otherEventType : formData.eventType;

      if (formData.eventType !== 'Ramazan Etkinliği') {
        try {
          eventSchema.parse({
            ...formData,
            eventType: finalEventType
          });
        } catch (e) {
          if (e instanceof z.ZodError) {
            throw new Error(e.errors[0].message);
          }
          throw e;
        }
      }


      const eventDateValue = formData.eventDate ? new Date(formData.eventDate).toISOString() : new Date().toISOString();
      const expectedCount = formData.expectedCount ? parseInt(formData.expectedCount) : null;

      const safeUnitName = profile.unit_name || 'Genel Merkez';
      const safeUniversity = profile.university || 'Belirtilmedi';
      const safeRegion = profile.region || 'Marmara';

      const insertPromise = supabase.from('events').insert([
        {
          created_by: user.id,
          unit_name: safeUnitName,
          university: safeUniversity,
          region: safeRegion,
          event_name: formData.eventName,
          event_type: finalEventType,
          event_purpose: formData.eventPurpose,
          location: formData.location,
          event_date: eventDateValue,
          expected_participants: expectedCount,
          prereg_required: formData.preregRequired,
          poster_url: formData.posterUrl,
          budget_request: JSON.stringify(formData.logistics),
          target_audience: formData.targetAudience ? [formData.targetAudience] : [],
          status: status
        }
      ]).select().single();

      const { data: eventData, error: eventError } = await insertPromise;

      if (eventError) throw eventError;

      const postEventTasks: Promise<any>[] = [];

      // Save speakers if any
      const validSpeakers = speakers.filter(s => s.name);
      if (validSpeakers.length > 0) {
        const speakerTask = (async () => {
          const speakerInserts = validSpeakers.map(s => ({
            full_name: s.name,
            title: s.title || 'Belirtilmedi',
            linkedin_url: s.socialLinks?.[0] || null,
            about: s.about || null,
            social_links: s.socialLinks || [],
            expertise_fields: s.expertiseFields || [],
            other_expertise: s.otherExpertise || null
          }));

          // Upsert: if speaker with same full_name exists, update; otherwise insert
          const { data: insertedSpeakers, error: speakerErr } = await supabase
            .from('speakers')
            .upsert(speakerInserts, { 
              onConflict: 'full_name',
              ignoreDuplicates: false 
            })
            .select();

          if (insertedSpeakers && !speakerErr) {
            const eventSpeakerInserts = insertedSpeakers.map((s, idx) => ({
              event_id: eventData.id,
              speaker_id: s.id,
              select_reason: validSpeakers[idx].reason || ''
            }));
            await supabase.from('event_speakers').insert(eventSpeakerInserts);
          }
        })();
        postEventTasks.push(speakerTask);
      }

      // Save Ramadan specifics if it is a Ramadan Event
      if (formData.eventType === 'Ramazan Etkinliği') {
        const ramadanTask = (async () => {
          await supabase.from('ramazan_events').insert([
            {
              event_id: eventData.id,
              is_sahur: formData.ramadan.isSahur,
              is_iftar: formData.ramadan.isIftar,
              food_count: parseInt(formData.ramadan.foodCount as any) || 0,
              drive_link: formData.ramadan.driveLink || '',
              social_link: formData.ramadan.socialLink || '',
              cancelled: formData.ramadan.cancelled,
              cancellation_reason: formData.ramadan.cancellationReason || '',
              photo_urls_json: formData.ramadan.photoUrlsJson ? [formData.ramadan.photoUrlsJson] : [],
              receipt_photos_json: formData.ramadan.receiptPhotosJson ? [formData.ramadan.receiptPhotosJson] : []
            }
          ]);
        })();
        postEventTasks.push(ramadanTask);
      }

      // Bildirim oluşturma işlemi Supabase Database Trigger'a devredilmiştir.


      // Tüm bağımsız veritabanı işlemlerini aynı anda paralel çalıştır
      await Promise.allSettled(postEventTasks);

      return eventData;
    } catch (err) {
      console.error('Event Submit Error:', err);
      throw err;
    }
  };

  const submitEvent = async () => {
    setIsSaving(true);
    try {
      await saveEventData('Onay Bekliyor');
      localStorage.removeItem('event_draft');
      setIsSubmitted(true);
    } catch (err) {
      const errorMessage = err?.message || JSON.stringify(err) || 'Bilinmeyen bir hata oluştu.';
      toast.error('Kayıt sırasında bir hata oluştu:\n' + errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const addSpeaker = () => {
    setSpeakers([...speakers, { name: '', title: '', socialLinks: [''], about: '', reason: '', expertiseFields: [], otherExpertise: '' }]);
  };

  const updateSpeaker = (index: number, field: string, value: unknown) => {
    const newSpeakers = [...speakers];
    newSpeakers[index] = { ...newSpeakers[index], [field]: value };
    setSpeakers(newSpeakers);
  };

  const updateSpeakerSocialLink = (speakerIndex: number, linkIndex: number, value: string) => {
    const newSpeakers = [...speakers];
    const newLinks = [...newSpeakers[speakerIndex].socialLinks];
    newLinks[linkIndex] = value;
    newSpeakers[speakerIndex].socialLinks = newLinks;
    setSpeakers(newSpeakers);
  };

  const addSpeakerSocialLink = (speakerIndex: number) => {
    const newSpeakers = [...speakers];
    newSpeakers[speakerIndex].socialLinks.push('');
    setSpeakers(newSpeakers);
  };

  const removeSpeakerSocialLink = (speakerIndex: number, linkIndex: number) => {
    const newSpeakers = [...speakers];
    newSpeakers[speakerIndex].socialLinks = newSpeakers[speakerIndex].socialLinks.filter((_: unknown, i: number) => i !== linkIndex);
    setSpeakers(newSpeakers);
  };

  const removeSpeaker = (index: number) => {
    setSpeakers(speakers.filter((_, i) => i !== index));
  };

  const updateLogistics = (field: string, value: unknown) => {
    setFormData(prev => ({
      ...prev,
      logistics: { ...prev.logistics, [field]: value }
    }));
  };

  const updateShuttle = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      logistics: { ...prev.logistics, shuttle: { ...prev.logistics.shuttle, [field]: value } }
    }));
  };

  const updateAroma = (index: number, field: string, value: string) => {
    const newAroma = [...formData.logistics.aroma];
    newAroma[index] = { ...newAroma[index], [field]: value };
    updateLogistics('aroma', newAroma);
  };

  const addAroma = () => {
    updateLogistics('aroma', [...formData.logistics.aroma, { oils: '', amount: '', peopleCount: '', notes: '' }]);
  };

  const removeAroma = (index: number) => {
    const newAroma = formData.logistics.aroma.filter((_, i) => i !== index);
    updateLogistics('aroma', newAroma);
  };

  const addCustomRequest = () => {
    const requests = formData.logistics.customRequests || [];
    updateLogistics('customRequests', [...requests, { name: '', note: '' }]);
  };

  const updateCustomRequest = (index: number, field: string, value: string) => {
    const requests = [...(formData.logistics.customRequests || [])];
    requests[index] = { ...requests[index], [field]: value };
    updateLogistics('customRequests', requests);
  };

  const removeCustomRequest = (index: number) => {
    const requests = (formData.logistics.customRequests || []).filter((_, i) => i !== index);
    updateLogistics('customRequests', requests);
  };

  if (isSubmitted) {
    return (
      <div style={{ maxWidth: '900px', margin: '0 auto', paddingBottom: '4rem', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div className="card" style={{ maxWidth: '500px', width: '100%', padding: '3rem 2rem', textAlign: 'center' }}>
          <div style={{ width: '80px', height: '80px', backgroundColor: 'var(--color-primary-light)', color: 'var(--color-primary)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem', margin: '0 auto 1.5rem' }}>âÅ“â€œ</div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-main)' }}>Etkinlik Başvurunuz Alındı</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', lineHeight: '1.6' }}>
            Etkinliğiniz başarıyla sisteme kaydedildi ve Bölge Sorumlusunun onayına gönderildi. Onay durumuyla ilgili bildirim alacaksınız.
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <Link href="/dashboard/events" className="btn btn-primary">
              Etkinliklerime Git
            </Link>
            <Link href="/dashboard" className="btn btn-outline">
              Ana Sayfaya Dön
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', paddingBottom: '4rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Yeni Etkinlik Oluştur</h1>
          <p style={{ color: 'var(--text-muted)' }}>Etkinlik bilgilerinizi adım adım doldurun.</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic', marginRight: '0.5rem' }}>
            {isDraftLoaded ? 'Değişiklikler otomatik kaydediliyor...' : ''}
          </span>
          <Link href="/dashboard" className="btn btn-outline" style={{ color: 'var(--status-danger)', borderColor: 'var(--status-danger)' }}>
            İptal
          </Link>
        </div>
      </div>

      {/* Progress Bar */}
      {formData.eventType !== 'Ramazan Etkinliği' && (
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
          {[
            { step: 1, title: 'Temel Bilgiler' },
            { step: 2, title: 'Program & Yer' },
            { step: 3, title: 'Konuşmacılar' },
            { step: 4, title: 'Lojistik & Onay' }
          ].map((s) => (
            <div key={s.step} style={{ flex: 1 }}>
              <div style={{ height: '6px', borderRadius: '4px', backgroundColor: currentStep >= s.step ? 'var(--color-primary)' : 'var(--border-color)', marginBottom: '0.5rem', transition: 'background-color 0.3s' }} />
              <div style={{ fontSize: '0.875rem', fontWeight: currentStep >= s.step ? 600 : 400, color: currentStep >= s.step ? 'var(--text-main)' : 'var(--text-muted)' }}>
                Adım {s.step}: {s.title}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Form Content */}
      <div className="card" style={{ minHeight: '400px' }}>
        
        {/* STEP 1: Temel Bilgiler */}
        {currentStep === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
            {currentRole !== 'representative' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                <div style={{ gridColumn: 'span 2' }}>
                  <label className="label">Etkinlik Türü *</label>
                  <select className="input" value={formData.eventType} onChange={(e) => setFormData({...formData, eventType: e.target.value})}>
                    <option value="">Seçiniz...</option>
                    <option value="Atölye / Uygulamalı Eğitim">Atölye / Uygulamalı Eğitim</option>
                    <option value="Konferans / Panel / Söyleşi">Konferans / Panel / Söyleşi</option>
                    <option value="Teknik Gezi">Teknik Gezi</option>
                    <option value="Saha Çalışması">Saha Çalışması</option>
                    <option value="Diğer">Diğer</option>
                  </select>
                  {formData.eventType === 'Diğer' && (
                    <div style={{ marginTop: '0.75rem' }}>
                      <input 
                        type="text" 
                        className="input" 
                        placeholder="Lütfen etkinlik türünü belirtin" 
                        value={formData.otherEventType} 
                        onChange={(e) => setFormData({...formData, otherEventType: e.target.value})} 
                        required 
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {formData.eventType === 'Ramazan Etkinliği' ? (
              /* SPECIALIZED RAMADAN FORM - DIRECT ENTRY BYPASSING STEPS */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginTop: '0.5rem' }}>
                <div style={{ padding: '1rem', backgroundColor: 'var(--color-primary-light)', borderRadius: 'var(--radius-md)', borderLeft: '4px solid var(--color-primary)' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    🌙 Ramazan Takip Modülü Aktif
                  </h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                    Bu etkinlik türünde konuşmacı, afiş veya lojistik adımları olmadan doğrudan kayıt ve takibi gerçekleştirebilirsiniz.
                  </p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                  <div>
                    <label className="label">Okul İsmi (Üniversite) *</label>
                    <input 
                      type="text" 
                      className="input" 
                      placeholder="Örn: Cerrahpaşa Tıp Fakültesi" 
                      required 
                      value={formData.ramadan.okulIsmi || formData.location} 
                      onChange={(e) => {
                        setFormData({
                          ...formData,
                          location: e.target.value,
                          ramadan: { ...formData.ramadan, okulIsmi: e.target.value }
                        });
                      }} 
                    />
                  </div>

                  <div>
                    <label className="label">Etkinlik Tarihi *</label>
                    <input 
                      type="datetime-local" 
                      className="input" 
                      required 
                      value={formData.eventDate} 
                      onChange={(e) => setFormData({...formData, eventDate: e.target.value})} 
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '2rem', alignItems: 'center', height: '100%', paddingLeft: '0.5rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 600 }}>
                      <input 
                        type="checkbox" 
                        checked={formData.ramadan.isIftar} 
                        onChange={(e) => setFormData({
                          ...formData, 
                          eventName: e.target.checked ? 'Ramazan İftar Etkinliği' : 'Ramazan Sahur Etkinliği',
                          ramadan: { ...formData.ramadan, isIftar: e.target.checked }
                        })} 
                        style={{ width: '18px', height: '18px' }} 
                      />
                      İftar Etkinliği
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 600 }}>
                      <input 
                        type="checkbox" 
                        checked={formData.ramadan.isSahur} 
                        onChange={(e) => setFormData({
                          ...formData, 
                          eventName: e.target.checked ? 'Ramazan Sahur Etkinliği' : 'Ramazan İftar Etkinliği',
                          ramadan: { ...formData.ramadan, isSahur: e.target.checked }
                        })} 
                        style={{ width: '18px', height: '18px' }} 
                      />
                      Sahur Etkinliği
                    </label>
                  </div>

                  <div>
                    <label className="label">Katılımcı Sayısı (Kişi) *</label>
                    <input 
                      type="number" 
                      className="input" 
                      min={0} 
                      placeholder="Örn: 120" 
                      required 
                      value={formData.expectedCount} 
                      onChange={(e) => {
                        setFormData({
                          ...formData,
                          expectedCount: e.target.value,
                          ramadan: { ...formData.ramadan, foodCount: parseInt(e.target.value) || 0 }
                        });
                      }} 
                    />
                  </div>

                  <div>
                    <label className="label">Drive Linki (Fotoğraf Klasörü)</label>
                    <input 
                      type="text" 
                      className="input" 
                      placeholder="Örn: https://drive.google.com/..." 
                      value={formData.ramadan.driveLink} 
                      onChange={(e) => setFormData({
                        ...formData, 
                        ramadan: { ...formData.ramadan, driveLink: e.target.value }
                      })} 
                    />
                  </div>

                  <div>
                    <label className="label">Sosyal Paylaşım Linki</label>
                    <input 
                      type="text" 
                      className="input" 
                      placeholder="Örn: https://instagram.com/..." 
                      value={formData.ramadan.socialLink} 
                      onChange={(e) => setFormData({
                        ...formData, 
                        ramadan: { ...formData.ramadan, socialLink: e.target.value }
                      })} 
                    />
                  </div>

                  {/* ETKİNLİK FOTOĞRAFI UPLOAD */}
                  <div>
                    <label className="label" style={{ marginBottom: '0.75rem', display: 'block' }}>📸 Etkinlik Fotoğrafı Yükle</label>
                    <ImageUpload
                      bucket="posters"
                      value={formData.ramadan.photoUrlsJson}
                      onChange={(url) => setFormData({
                        ...formData,
                        ramadan: { ...formData.ramadan, photoUrlsJson: url }
                      })}
                      width="100%"
                      height="150px"
                      label="Fotoğraf Yükle"
                    />
                  </div>

                  {/* FİŞ / FATURA FOTOĞRAFI UPLOAD */}
                  <div>
                    <label className="label" style={{ marginBottom: '0.75rem', display: 'block' }}>🧾 Fiş / Fatura Görseli Yükle</label>
                    <ImageUpload
                      bucket="posters"
                      value={formData.ramadan.receiptPhotosJson}
                      onChange={(url) => setFormData({
                        ...formData,
                        ramadan: { ...formData.ramadan, receiptPhotosJson: url }
                      })}
                      width="100%"
                      height="150px"
                      label="Fiş / Fatura Yükle"
                    />
                  </div>

                  <div style={{ gridColumn: 'span 2', padding: '1rem', backgroundColor: 'var(--bg-danger-light)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-danger)' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 700, color: '#991b1b' }}>
                      <input 
                        type="checkbox" 
                        checked={formData.ramadan.cancelled} 
                        onChange={(e) => setFormData({
                          ...formData, 
                          ramadan: { ...formData.ramadan, cancelled: e.target.checked }
                        })} 
                        style={{ width: '18px', height: '18px' }} 
                      />❌ Bu etkinlik İPTAL oldu
                    </label>
                    
                    {formData.ramadan.cancelled && (
                      <div style={{ marginTop: '0.75rem' }}>
                        <label className="label" style={{ color: '#991b1b' }}>İptal Gerekçesi / Açıklama *</label>
                        <textarea 
                          className="input" 
                          rows={2} 
                          required 
                          placeholder="Etkinliğin neden iptal edildiğini kısaca belirtin..." 
                          value={formData.ramadan.cancellationReason}
                          onChange={(e) => setFormData({
                            ...formData,
                            ramadan: { ...formData.ramadan, cancellationReason: e.target.value }
                          })}
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
                  <button 
                    type="button"
                    onClick={submitEvent} 
                    disabled={isSaving} 
                    className="btn btn-primary" 
                    style={{ backgroundColor: 'var(--status-success)', padding: '0.75rem 2rem', fontSize: '1rem', fontWeight: 700 }}
                  >
                    {isSaving ? 'Kaydediliyor...' : '🌙 Ramazan Etkinliğini Kaydet ve Gönder'}
                  </button>
                </div>
              </div>
            ) : (
              /* TRADITIONAL MULTI-STEP WIZARD */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 600, borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>Temel Etkinlik Bilgileri</h2>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                  <div>
                    <label className="label">Etkinlik Adı *</label>
                    <input type="text" className="input" placeholder="Örn: Yapay Zeka Zirvesi" value={formData.eventName} onChange={(e) => setFormData({...formData, eventName: e.target.value})} />
                  </div>
                  <div style={{ display: 'none' }}>{/* hidden to preserve grid layout */}</div>
                  <div style={{ gridColumn: 'span 2' }}>
                    <label className="label">Etkinlik Hedef Kitlesi *</label>
                    <input type="text" className="input" placeholder="Örn: Üniversite Öğrencileri, Kulüp Üyeleri, Dış Katılımcılar" value={formData.targetAudience} onChange={(e) => setFormData({...formData, targetAudience: e.target.value})} />
                  </div>
                </div>

                <div>
                  <label className="label">Etkinlik Amacı *</label>
                  <textarea className="input" rows={4} placeholder="Bu etkinliğin temel amacı nedir?" value={formData.eventPurpose} onChange={(e) => setFormData({...formData, eventPurpose: e.target.value})}></textarea>
                </div>
                
                <div>
                  <ImageUpload
                    bucket="posters"
                    value={formData.posterUrl}
                    onChange={(url) => setFormData({...formData, posterUrl: url})}
                    width="200px"
                    height="300px"
                    label="Etkinlik Afişi Yükle (İsteğe Bağlı)"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 2: Program & Yer */}
        {currentStep === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>Tarih, Yer ve Kapasite</h2>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              <div>
                <label className="label">Tarih ve Saat *</label>
                <input 
                  type="datetime-local" 
                  className="input" 
                  min={new Date().toISOString().slice(0, 16)}
                  value={formData.eventDate} 
                  onChange={(e) => setFormData({...formData, eventDate: e.target.value})} 
                />
              </div>
              <div>
                <label className="label">Mekan veya Online Link *</label>
                <input type="text" className="input" placeholder="Örn: Ana Salon veya Zoom Linki" value={formData.location} onChange={(e) => setFormData({...formData, location: e.target.value})} />
              </div>
              <div>
                <label className="label">Tahmini Katılımcı Sayısı</label>
                <input type="number" className="input" placeholder="Örn: 150" value={formData.expectedCount} onChange={(e) => setFormData({...formData, expectedCount: e.target.value})} />
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: '0.5rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input type="checkbox" checked={formData.preregRequired} onChange={(e) => setFormData({...formData, preregRequired: e.target.checked})} style={{ width: '18px', height: '18px' }} />
                  <span>Ön kayıt gerektirir</span>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: Konuşmacılar */}
        {currentStep === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Konuşmacı Yönetimi</h2>
              <button onClick={addSpeaker} className="btn btn-outline" style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem' }}>
                <Plus size={14} /> Yeni Konuşmacı Ekle
              </button>
            </div>

            {speakers.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', backgroundColor: 'var(--bg-main)', borderRadius: 'var(--radius-md)', border: '1px dashed #d1d5db' }}>
                <p style={{ color: 'var(--text-muted)' }}>Bu etkinlik için henüz konuşmacı eklemediniz.</p>
                <button onClick={addSpeaker} className="btn btn-primary" style={{ marginTop: '1rem' }}>Konuşmacı Ekle</button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {speakers.map((s, index) => (
                  <div key={index} style={{ padding: '1.5rem', backgroundColor: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', position: 'relative' }}>
                    <button onClick={() => removeSpeaker(index)} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', color: 'var(--status-danger)', cursor: 'pointer' }}>
                      <Trash2 size={18} />
                    </button>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <div>
                        <label className="label">Ad Soyad</label>
                        <input type="text" className="input" placeholder="Örn: Prof. Dr. Ali Yılmaz" value={s.name} onChange={(e) => updateSpeaker(index, 'name', e.target.value)} />
                      </div>
                      <div>
                        <label className="label">Unvan</label>
                        <input type="text" className="input" placeholder="Örn: Profesör" value={s.title} onChange={(e) => updateSpeaker(index, 'title', e.target.value)} />
                      </div>
                      <div style={{ gridColumn: 'span 2' }}>
                        <ExpertiseMultiSelect 
                          selectedFields={s.expertiseFields || []}
                          onChange={(fields) => updateSpeaker(index, 'expertiseFields', fields)}
                          otherExpertise={s.otherExpertise || ''}
                          onOtherChange={(val) => updateSpeaker(index, 'otherExpertise', val)}
                        />
                      </div>
                      <div style={{ gridColumn: 'span 2' }}>
                        <label className="label">Konuşmacı Hakkında (Kısa Özgeçmiş)</label>
                        <textarea className="input" rows={2} placeholder="Konuşmacı hakkında özet bilgi..." value={s.about || ''} onChange={(e) => updateSpeaker(index, 'about', e.target.value)}></textarea>
                      </div>
                      <div style={{ gridColumn: 'span 2' }}>
                        <label className="label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          Sosyal Medya Linkleri
                          <button type="button" onClick={() => addSpeakerSocialLink(index)} style={{ background: 'none', border: 'none', color: 'var(--color-primary)', cursor: 'pointer', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <Plus size={12} /> Ekle
                          </button>
                        </label>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          {(s.socialLinks || ['']).map((link: string, linkIndex: number) => (
                            <div key={linkIndex} style={{ display: 'flex', gap: '0.5rem' }}>
                              <input type="url" className="input" placeholder="https://..." value={link} onChange={(e) => updateSpeakerSocialLink(index, linkIndex, e.target.value)} />
                              {(s.socialLinks || ['']).length > 1 && (
                                <button type="button" onClick={() => removeSpeakerSocialLink(index, linkIndex)} style={{ background: 'none', border: 'none', color: 'var(--status-danger)', cursor: 'pointer' }}>
                                  <Trash2 size={16} />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                      <div style={{ gridColumn: 'span 2' }}>
                        <label className="label">Seçilme Nedeni</label>
                        <textarea className="input" rows={2} placeholder="Neden bu konuşmacıyı tercih ettiniz?" value={s.reason} onChange={(e) => updateSpeaker(index, 'reason', e.target.value)}></textarea>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* STEP 4: Lojistik & Onay */}
        {currentStep === 4 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>Lojistik ve Kaynak Talepleri</h2>
            
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              Etkinliğiniz için ihtiyaç duyduğunuz özel talepleri detaylı bir şekilde giriniz.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Servis Talebi */}
              <div style={{ border: `1px solid ${formData.logistics.hasShuttle ? 'var(--color-primary)' : '#eaeaea'}`, borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                <div 
                  onClick={() => updateLogistics('hasShuttle', !formData.logistics.hasShuttle)} 
                  style={{ padding: '1rem', cursor: 'pointer', backgroundColor: formData.logistics.hasShuttle ? 'var(--color-primary-light)' : 'var(--bg-nested)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}
                >
                  <input type="checkbox" checked={formData.logistics.hasShuttle} readOnly style={{ width: '18px', height: '18px' }} />
                  Araç / Servis Talebi
                </div>
                
                {formData.logistics.hasShuttle && (
                  <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', backgroundColor: 'var(--bg-card)' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <div><label className="label">Tarih</label><input type="date" className="input" value={formData.logistics.shuttle.date} onChange={e => updateShuttle('date', e.target.value)} /></div>
                      <div><label className="label">Araç Talebi (Adet/Kişi)</label><input type="text" className="input" placeholder="Örn: 1 ADET 10-12 KİŞİLİK ARAÇ TALEBİMİZ BULUNMAKTADIR" value={formData.logistics.shuttle.description} onChange={e => updateShuttle('description', e.target.value)} /></div>
                      <div><label className="label">Kalkış Noktası</label><input type="text" className="input" value={formData.logistics.shuttle.departurePoint} onChange={e => updateShuttle('departurePoint', e.target.value)} /></div>
                      <div><label className="label">Varış Noktası</label><input type="text" className="input" value={formData.logistics.shuttle.arrivalPoint} onChange={e => updateShuttle('arrivalPoint', e.target.value)} /></div>
                      <div><label className="label">Hareket Saati (Gidiş)</label><input type="time" className="input" value={formData.logistics.shuttle.departureTime} onChange={e => updateShuttle('departureTime', e.target.value)} /></div>
                      <div><label className="label">Dönüş Yeri</label><input type="text" className="input" value={formData.logistics.shuttle.returnPoint} onChange={e => updateShuttle('returnPoint', e.target.value)} /></div>
                      <div><label className="label">Hareket Saati (Dönüş)</label><input type="time" className="input" value={formData.logistics.shuttle.returnTime} onChange={e => updateShuttle('returnTime', e.target.value)} /></div>
                      <div><label className="label">Gidilecek Yerin Konumu (Link)</label><input type="text" className="input" placeholder="Örn: Google Maps linki" value={formData.logistics.shuttle.locationLink} onChange={e => updateShuttle('locationLink', e.target.value)} /></div>
                      <div style={{ gridColumn: 'span 2' }}><label className="label">Araç Sorumlusu (Ad - Soyad - Tel No)</label><input type="text" className="input" placeholder="Örn: Ahmet Yılmaz - 0555..." value={formData.logistics.shuttle.vehicleManager} onChange={e => updateShuttle('vehicleManager', e.target.value)} /></div>
                    </div>
                  </div>
                )}
              </div>

              {/* Aromaterapi Yağ Talebi */}
              {isMesleki && (
              <div style={{ border: `1px solid ${formData.logistics.hasAroma ? 'var(--color-primary)' : '#eaeaea'}`, borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                <div 
                  onClick={() => updateLogistics('hasAroma', !formData.logistics.hasAroma)} 
                  style={{ padding: '1rem', cursor: 'pointer', backgroundColor: formData.logistics.hasAroma ? 'var(--color-primary-light)' : 'var(--bg-nested)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}
                >
                  <input type="checkbox" checked={formData.logistics.hasAroma} readOnly style={{ width: '18px', height: '18px' }} />
                  Aromaterapi Yağ Talebi
                </div>
                
                {formData.logistics.hasAroma && (
                  <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', backgroundColor: 'var(--bg-card)' }}>
                    {formData.logistics.aroma.map((a, index) => (
                      <div key={index} style={{ padding: '1rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', position: 'relative' }}>
                        <h4 style={{ marginBottom: '1rem', fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-primary)' }}>{index + 1}. Formülasyon</h4>
                        {formData.logistics.aroma.length > 1 && (
                           <button onClick={() => removeAroma(index)} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', color: 'var(--status-danger)', cursor: 'pointer' }}><Trash2 size={16} /></button>
                        )}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                          <div><label className="label">Yağ Çeşitleri</label><input type="text" className="input" placeholder="Örn: Lavanta, Papatya" value={a.oils} onChange={e => updateAroma(index, 'oils', e.target.value)} /></div>
                          <div><label className="label">Miktarları</label><input type="text" className="input" placeholder="Örn: 50ml, 100ml" value={a.amount} onChange={e => updateAroma(index, 'amount', e.target.value)} /></div>
                          <div><label className="label">Planlanan Kişi Sayısı</label><input type="number" className="input" placeholder="Örn: 30" value={a.peopleCount} onChange={e => updateAroma(index, 'peopleCount', e.target.value)} /></div>
                          <div style={{ gridColumn: 'span 2' }}><label className="label">Ekstra Not (Bu formülasyon için)</label><textarea className="input" rows={2} value={a.notes} onChange={e => updateAroma(index, 'notes', e.target.value)} /></div>
                        </div>
                      </div>
                    ))}
                    <button onClick={addAroma} className="btn btn-outline" style={{ alignSelf: 'flex-start', fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}><Plus size={14}/> Yeni Formülasyon Ekle</button>
                  </div>
                )}
              </div>
              )}

              {/* Temel Yaşam Desteği Malzeme Talebi */}
              {isMesleki && (
              <div style={{ border: `1px solid ${formData.logistics.hasBasicLifeSupport ? 'var(--color-primary)' : '#eaeaea'}`, borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                <div 
                  onClick={() => updateLogistics('hasBasicLifeSupport', !formData.logistics.hasBasicLifeSupport)} 
                  style={{ padding: '1rem', cursor: 'pointer', backgroundColor: formData.logistics.hasBasicLifeSupport ? 'var(--color-primary-light)' : 'var(--bg-nested)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}
                >
                  <input type="checkbox" checked={formData.logistics.hasBasicLifeSupport} readOnly style={{ width: '18px', height: '18px' }} />
                  🩺 Temel Yaşam Desteği Malzemeleri Talebi
                </div>
                
                {formData.logistics.hasBasicLifeSupport && (
                  <div style={{ padding: '1.5rem', backgroundColor: 'var(--bg-card)' }}>
                    <label className="label">Malzeme Detayları / Notlar</label>
                    <textarea className="input" rows={2} placeholder="Talep edilen temel yaşam desteği malzemeleri ve detayları..." value={formData.logistics.basicLifeSupportDetails} onChange={e => updateLogistics('basicLifeSupportDetails', e.target.value)}></textarea>
                  </div>
                )}
              </div>
              )}

              {/* İleri Yaşam Desteği Malzeme Talebi */}
              {isMesleki && (
              <div style={{ border: `1px solid ${formData.logistics.hasAdvancedLifeSupport ? 'var(--color-primary)' : '#eaeaea'}`, borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                <div 
                  onClick={() => updateLogistics('hasAdvancedLifeSupport', !formData.logistics.hasAdvancedLifeSupport)} 
                  style={{ padding: '1rem', cursor: 'pointer', backgroundColor: formData.logistics.hasAdvancedLifeSupport ? 'var(--color-primary-light)' : 'var(--bg-nested)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}
                >
                  <input type="checkbox" checked={formData.logistics.hasAdvancedLifeSupport} readOnly style={{ width: '18px', height: '18px' }} />
                  🩺 İleri Yaşam Desteği Malzemeleri Talebi
                </div>
                
                {formData.logistics.hasAdvancedLifeSupport && (
                  <div style={{ padding: '1.5rem', backgroundColor: 'var(--bg-card)' }}>
                    <label className="label">Malzeme Detayları / Notlar</label>
                    <textarea className="input" rows={2} placeholder="Talep edilen ileri yaşam desteği malzemeleri ve detayları..." value={formData.logistics.advancedLifeSupportDetails} onChange={e => updateLogistics('advancedLifeSupportDetails', e.target.value)}></textarea>
                  </div>
                )}
              </div>
              )}

              {/* Sütur Eğitimi Malzeme Talebi */}
              {isMesleki && (
              <div style={{ border: `1px solid ${formData.logistics.hasSutureTraining ? 'var(--color-primary)' : '#eaeaea'}`, borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                <div 
                  onClick={() => updateLogistics('hasSutureTraining', !formData.logistics.hasSutureTraining)} 
                  style={{ padding: '1rem', cursor: 'pointer', backgroundColor: formData.logistics.hasSutureTraining ? 'var(--color-primary-light)' : 'var(--bg-nested)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}
                >
                  <input type="checkbox" checked={formData.logistics.hasSutureTraining} readOnly style={{ width: '18px', height: '18px' }} />
                  🪡 Sütur Eğitimi Malzemeleri Talebi
                </div>
                
                {formData.logistics.hasSutureTraining && (
                  <div style={{ padding: '1.5rem', backgroundColor: 'var(--bg-card)' }}>
                    <label className="label">Malzeme Detayları / Notlar</label>
                    <textarea className="input" rows={2} placeholder="Talep edilen sütur eğitimi malzemeleri ve detayları..." value={formData.logistics.sutureTrainingDetails} onChange={e => updateLogistics('sutureTrainingDetails', e.target.value)}></textarea>
                  </div>
                )}
              </div>
              )}

              {/* Özel Talep Ekleme */}
              <div style={{ border: `1px solid ${(formData.logistics.customRequests || []).length > 0 ? 'var(--color-primary)' : '#eaeaea'}`, borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                <div 
                  style={{ padding: '1rem', backgroundColor: (formData.logistics.customRequests || []).length > 0 ? 'var(--color-primary-light)' : 'var(--bg-nested)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 600 }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    Diğer Özel Talepleriniz
                  </span>
                  <button type="button" onClick={addCustomRequest} className="btn btn-outline" style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem', backgroundColor: 'var(--bg-card)' }}>
                    <Plus size={14} /> Yeni Talep Ekle
                  </button>
                </div>
                
                {(formData.logistics.customRequests || []).length > 0 && (
                  <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', backgroundColor: 'var(--bg-card)' }}>
                    {(formData.logistics.customRequests || []).map((req: string, index: number) => (
                      <div key={index} style={{ padding: '1rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', position: 'relative' }}>
                        <button type="button" onClick={() => removeCustomRequest(index)} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', color: 'var(--status-danger)', cursor: 'pointer' }}><Trash2 size={16} /></button>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
                          <div><label className="label">Talep Adı / Başlığı</label><input type="text" className="input" placeholder="Talebinizin başlığını yazınız" value={req.name} onChange={e => updateCustomRequest(index, 'name', e.target.value)} /></div>
                          <div><label className="label">Talep Detayları ve Notlar</label><textarea className="input" rows={2} placeholder="Talebinizin detaylarını buraya yazınız..." value={req.note} onChange={e => updateCustomRequest(index, 'note', e.target.value)}></textarea></div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Ekstra Talepler */}
              <div style={{ marginTop: '1rem' }}>
                <label className="label">Başka Belirtmek İstediğiniz Bir Kısım Var Mı? (Ekstra İstek/Talep/Ayrıntı)</label>
                <textarea className="input" rows={3} placeholder="Tüm ekstra notlarınızı buraya girebilirsiniz..." value={formData.logistics.extraNotes} onChange={e => updateLogistics('extraNotes', e.target.value)}></textarea>
              </div>

            </div>

            <div style={{ marginTop: '2rem', padding: '1.5rem', backgroundColor: 'var(--bg-danger-light)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-danger)' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#991b1b', marginBottom: '0.5rem' }}>Son Kontrol</h3>
              <p style={{ fontSize: '0.875rem', color: '#7f1d1d' }}>
                Formu onaya gönderdiğinizde etkinlik Bölge Sorumlusunun paneline düşecektir. Onaylanana kadar etkinlik afiş süreci başlamaz.
              </p>
            </div>
          </div>
        )}

      </div>

      {/* Navigation Footer */}
      {formData.eventType !== 'Ramazan Etkinliği' && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1.5rem' }}>
          <button onClick={handlePrev} disabled={currentStep === 1} className="btn btn-outline" style={{ opacity: currentStep === 1 ? 0.5 : 1 }}>
            <ChevronLeft size={16} /> Önceki Adım
          </button>
          
          {currentStep < 4 ? (
            <button onClick={handleNext} className="btn btn-primary">
              Sonraki Adım <ChevronRight size={16} />
            </button>
          ) : (
            <button onClick={submitEvent} disabled={isSaving} className="btn btn-primary" style={{ backgroundColor: 'var(--status-success)' }}>
              {isSaving ? 'İşleniyor...' : 'Onaya Gönder'}
            </button>
          )}
        </div>
      )}

    </div>
  );
}






