'use client';
import { toast } from 'react-hot-toast';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
const supabase = createClient();
import { X, Save, Loader2, Plus, Trash2, ChevronRight, ChevronLeft } from 'lucide-react';
import { AppEvent, EventSpeaker } from '@/types';
import ExpertiseMultiSelect from '@/components/ExpertiseMultiSelect';

type Step = 1 | 2 | 3 | 4;

interface RevisionModalProps {
  event: AppEvent;
  initialSpeakers: Record<string, unknown>[];
  isManager?: boolean;
  onClose: () => void;
  onSuccess: (updatedEvent: AppEvent) => void;
}

export default function RevisionModal({ event, initialSpeakers, isManager, onClose, onSuccess }: RevisionModalProps) {
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDraftLoaded, setIsDraftLoaded] = useState(false);
  
  const [revisionNotes, setRevisionNotes] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    eventName: event?.event_name || '',
    eventType: event?.event_type || '',
    targetAudience: (event?.target_audience || []).join(', ') || '',
    eventPurpose: event?.event_purpose || '',
    location: event?.location || '',
    eventDate: event?.event_date ? new Date(event.event_date).toISOString().slice(0, 16) : '',
    expectedCount: event?.expected_participants || '',
    preregRequired: event?.prereg_required || false,
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

  const [speakers, setSpeakers] = useState<any[]>([]);

  useEffect(() => {
    let parsedLogistics = {
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
    };
    
    // Parse logistics
    try {
      if (event?.budget_request) {
        parsedLogistics = { ...parsedLogistics, ...JSON.parse(event.budget_request) };
        setFormData(prev => ({
          ...prev,
          logistics: {
            ...prev.logistics,
            ...parsedLogistics
          }
        }));
      }
    } catch (e) {
      console.error('Logistics parse error:', e);
    }

    let mappedSpeakers: Record<string, unknown>[] = [];
    // Parse speakers
    if (initialSpeakers && initialSpeakers.length > 0) {
      mappedSpeakers = initialSpeakers.map(s => ({
        id: s.speakers?.id || null,
        eventSpeakerId: s.id || null,
        name: s.speakers?.full_name || '',
        title: s.speakers?.title || '',
        about: s.speakers?.about || '',
        socialLinks: s.speakers?.social_links || [s.speakers?.linkedin_url].filter(Boolean) || [''],
        reason: s.select_reason || '',
        status: s.status || 'Bekliyor', // Keep status for existing speakers
        is_cancelled: s.is_cancelled || false,
        expertiseFields: s.speakers?.expertise_fields || [],
        otherExpertise: s.speakers?.other_expertise || ''
      }));
      setSpeakers(mappedSpeakers);
    }

    // Load Draft from LocalStorage
    const draftKey = `revision_draft_${event?.id}`;
    const draft = localStorage.getItem(draftKey);
    if (draft) {
      try {
        const parsedDraft = JSON.parse(draft);
        if (parsedDraft.formData) {
          setFormData(prev => ({ ...prev, ...parsedDraft.formData, logistics: parsedDraft.formData.logistics || prev.logistics }));
        }
        if (parsedDraft.speakers) setSpeakers(parsedDraft.speakers);
        if (parsedDraft.currentStep) setCurrentStep(parsedDraft.currentStep);
        if (parsedDraft.revisionNotes) setRevisionNotes(parsedDraft.revisionNotes);
      } catch (e) {}
    }
    setIsDraftLoaded(true);
  }, [event, initialSpeakers]);

  useEffect(() => {
    if (isDraftLoaded && event?.id) {
      const draftKey = `revision_draft_${event.id}`;
      localStorage.setItem(draftKey, JSON.stringify({ formData, speakers, currentStep, revisionNotes }));
    }
  }, [formData, speakers, currentStep, revisionNotes, isDraftLoaded, event?.id]);

  const handleNext = () => setCurrentStep((prev) => (prev < 4 ? (prev + 1) as Step : prev));
  const handlePrev = () => setCurrentStep((prev) => (prev > 1 ? (prev - 1) as Step : prev));

  const addSpeaker = () => setSpeakers([...speakers, { name: '', title: '', socialLinks: [''], about: '', reason: '', expertiseFields: [], otherExpertise: '' }]);
  const updateSpeaker = (index: number, field: string, value: unknown) => {
    const newSpeakers = [...speakers];
    newSpeakers[index] = { ...newSpeakers[index], [field]: value };
    setSpeakers(newSpeakers);
  };
  const updateSpeakerSocialLink = (speakerIndex: number, linkIndex: number, value: string) => {
    const newSpeakers = [...speakers];
    const newLinks = [...(newSpeakers[speakerIndex].socialLinks || [''])];
    newLinks[linkIndex] = value;
    newSpeakers[speakerIndex].socialLinks = newLinks;
    setSpeakers(newSpeakers);
  };
  const addSpeakerSocialLink = (speakerIndex: number) => {
    const newSpeakers = [...speakers];
    newSpeakers[speakerIndex].socialLinks = [...(newSpeakers[speakerIndex].socialLinks || []), ''];
    setSpeakers(newSpeakers);
  };
  const removeSpeakerSocialLink = (speakerIndex: number, linkIndex: number) => {
    const newSpeakers = [...speakers];
    newSpeakers[speakerIndex].socialLinks = newSpeakers[speakerIndex].socialLinks.filter((_: unknown, i: number) => i !== linkIndex);
    setSpeakers(newSpeakers);
  };
  const removeSpeaker = (index: number) => {
    const s = speakers[index];
    if (s.eventSpeakerId) {
      // It's an existing speaker. We mark it as cancelled visually
      updateSpeaker(index, 'is_cancelled', true);
    } else {
      // New speaker, just remove it from array
      setSpeakers(speakers.filter((_, i) => i !== index));
    }
  };
  const restoreSpeaker = (index: number) => {
    updateSpeaker(index, 'is_cancelled', false);
  };

  const updateLogistics = (field: string, value: unknown) => setFormData(prev => ({ ...prev, logistics: { ...prev.logistics, [field]: value } }));
  const updateShuttle = (field: string, value: string) => setFormData(prev => ({ ...prev, logistics: { ...prev.logistics, shuttle: { ...prev.logistics.shuttle, [field]: value } } }));
  const updateAroma = (index: number, field: string, value: string) => {
    const newAroma = [...formData.logistics.aroma];
    newAroma[index] = { ...newAroma[index], [field]: value };
    updateLogistics('aroma', newAroma);
  };
  const addAroma = () => updateLogistics('aroma', [...formData.logistics.aroma, { oils: '', amount: '', peopleCount: '', notes: '' }]);
  const removeAroma = (index: number) => updateLogistics('aroma', formData.logistics.aroma.filter((_, i) => i !== index));
  const addCustomRequest = () => updateLogistics('customRequests', [...(formData.logistics.customRequests || []), { name: '', note: '' }]);
  const updateCustomRequest = (index: number, field: string, value: string) => {
    const requests = [...(formData.logistics.customRequests || [])];
    requests[index] = { ...requests[index], [field]: value };
    updateLogistics('customRequests', requests);
  };
  const removeCustomRequest = (index: number) => updateLogistics('customRequests', (formData.logistics.customRequests || []).filter((_, i) => i !== index));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!revisionNotes) {
      toast.success('Lütfen bir revizyon notu giriniz.');
      return;
    }

    setIsSubmitting(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Oturum bulunamadı.');

      // 1. Yedekleme
      const backupEvent = {
        ...event,
        speakers: initialSpeakers, // include speakers in backup
      };

      const { error: revError } = await supabase.from('event_revisions').insert([{
        event_id: event.id,
        revision_data: backupEvent,
        requested_by: user.id,
        revision_notes: revisionNotes
      }]);

      if (revError) throw revError;

      // 2. Etkinliği güncelle
      const eventDateValue = formData.eventDate ? new Date(formData.eventDate).toISOString() : new Date().toISOString();
      
      const updatedEventData = {
        event_name: formData.eventName,
        event_type: formData.eventType,
        event_purpose: formData.eventPurpose,
        location: formData.location,
        event_date: eventDateValue,
        expected_participants: parseInt(formData.expectedCount.toString()) || null,
        target_audience: formData.targetAudience ? formData.targetAudience.split(',').map((s: string) => s.trim()) : [],
        prereg_required: formData.preregRequired,
        budget_request: JSON.stringify(formData.logistics),
        status: isManager ? event.status : 'Yeniden Onay Bekliyor',
        updated_at: new Date().toISOString()
      };

      const { data: updatedEvent, error: updateError } = await supabase
        .from('events')
        .update(updatedEventData)
        .eq('id', event.id)
        .select()
        .single();

      if (updateError) throw updateError;

      // 3. Konuşmacıları Güncelle
      for (const s of speakers) {
        if (s.name) {
          if (s.eventSpeakerId) {
            // Var olan konuşmacıyı güncelle
            await supabase.from('speakers').update({
              full_name: s.name,
              title: s.title || 'Belirtilmedi',
              about: s.about || null,
              social_links: s.socialLinks || [],
              expertise_fields: s.expertiseFields || [],
              other_expertise: s.otherExpertise || null
            }).eq('id', s.id);
            
            await supabase.from('event_speakers').update({
              select_reason: s.reason || '',
              is_cancelled: s.is_cancelled || false,
              status: s.is_cancelled ? 'Reddedildi' : 'Bekliyor' // Revize edildiğinde durumu bekliyora al (eğer silinmemişse)
            }).eq('id', s.eventSpeakerId);
            
          } else if (!s.is_cancelled) {
            // Yeni konuşmacı ekle
            const { data: insertedSpeaker } = await supabase.from('speakers').insert([{
              full_name: s.name,
              title: s.title || 'Belirtilmedi',
              about: s.about || null,
              social_links: s.socialLinks || [],
              expertise_fields: s.expertiseFields || [],
              other_expertise: s.otherExpertise || null
            }]).select().single();
            
            if (insertedSpeaker) {
              await supabase.from('event_speakers').insert([{
                event_id: event.id,
                speaker_id: insertedSpeaker.id,
                select_reason: s.reason || '',
                status: 'Bekliyor'
              }]);
            }
          }
        }
      }

      // 4. Bölge Sorumlusuna bildirim (Sadece aynı birim ve aynı bölge)
      const { data: rmData } = await supabase
        .from('users')
        .select('id')
        .eq('role', 'region_manager')
        .eq('region', event.region)
        .eq('unit_name', event.unit_name); // Sadece aynı birimin bölge sorumlusu
      
      if (rmData && rmData.length > 0) {
        const notifications = rmData.map(rm => ({
          user_id: rm.id,
          event_id: event.id,
          message: `"${event.event_name}" etkinliği revize edildi ve yeniden onayınızı bekliyor.`,
          type: 'event_revision'
        }));
        await supabase.from('notifications').insert(notifications);
      }

      // Draft'ı temizle
      if (event?.id) {
        localStorage.removeItem(`revision_draft_${event.id}`);
      }

      toast.success('Revizyon başarıyla gönderildi.');
      onSuccess(updatedEvent);
    } catch (err) {
      console.error(err);
      toast.error('Hata: ' + ((err as Error).message || 'Revizyon kaydedilemedi.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div className="card" style={{ backgroundColor: 'var(--bg-card)', width: '100%', maxWidth: '900px', height: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRadius: 'var(--radius-lg)', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
        
        {/* Header */}
        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--bg-nested)' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)' }}>Etkinliği Revize Et</h2>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{event.event_name}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
            <X size={24} />
          </button>
        </div>

        {/* Revision Note (Always visible at top) */}
        <div style={{ padding: '1rem 1.5rem', backgroundColor: 'var(--bg-warning-light)', borderBottom: '1px solid #fde68a' }}>
          <label className="label" style={{ color: '#92400e', fontWeight: 600 }}>Revizyon Notu (Zorunlu) *</label>
          <input 
            required
            className="input" 
            style={{ borderColor: '#fcd34d', backgroundColor: 'var(--bg-card)' }}
            placeholder="Neleri değiştirdiniz? Kısaca özetleyin..."
            value={revisionNotes}
            onChange={e => setRevisionNotes(e.target.value)}
          />
        </div>

        {/* Progress Bar */}
        <div style={{ padding: '1rem 1.5rem', display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-card)' }}>
          {[
            { step: 1, title: 'Temel Bilgiler' },
            { step: 2, title: 'Program & Yer' },
            { step: 3, title: 'Konuşmacılar' },
            { step: 4, title: 'Lojistik & Onay' }
          ].map((s) => (
            <div key={s.step} style={{ flex: 1, cursor: 'pointer' }} onClick={() => setCurrentStep(s.step as Step)}>
              <div style={{ height: '4px', borderRadius: '2px', backgroundColor: currentStep >= s.step ? 'var(--color-primary)' : 'var(--border-color)', marginBottom: '0.25rem', transition: 'background-color 0.3s' }} />
              <div style={{ fontSize: '0.75rem', fontWeight: currentStep === s.step ? 700 : 500, color: currentStep >= s.step ? 'var(--text-main)' : 'var(--text-muted)' }}>
                {s.title}
              </div>
            </div>
          ))}
        </div>
        
        {/* Scrollable Form Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', backgroundColor: 'var(--bg-card)' }}>
          
          {/* STEP 1: Temel Bilgiler */}
          {currentStep === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                <div>
                  <label className="label">Etkinlik Adı *</label>
                  <input type="text" className="input" value={formData.eventName} onChange={(e) => setFormData({...formData, eventName: e.target.value})} />
                </div>
                <div>
                  <label className="label">Etkinlik Türü *</label>
                  <select className="input" value={formData.eventType} onChange={(e) => setFormData({...formData, eventType: e.target.value})}>
                    <option value="">Seçiniz...</option>
                    <option value="Panel">Panel</option>
                    <option value="Konferans">Konferans</option>
                    <option value="Atölye">Atölye</option>
                    <option value="Gezi">Gezi</option>
                  </select>
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <label className="label">Etkinlik Hedef Kitlesi *</label>
                  <input type="text" className="input" value={formData.targetAudience} onChange={(e) => setFormData({...formData, targetAudience: e.target.value})} />
                </div>
              </div>
              <div>
                <label className="label">Etkinlik Amacı *</label>
                <textarea className="input" rows={4} value={formData.eventPurpose} onChange={(e) => setFormData({...formData, eventPurpose: e.target.value})}></textarea>
              </div>
            </div>
          )}

          {/* STEP 2: Program & Yer */}
          {currentStep === 2 && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              <div>
                <label className="label">Tarih ve Saat *</label>
                <input type="datetime-local" className="input" value={formData.eventDate} onChange={(e) => setFormData({...formData, eventDate: e.target.value})} />
              </div>
              <div>
                <label className="label">Mekan veya Online Link *</label>
                <input type="text" className="input" value={formData.location} onChange={(e) => setFormData({...formData, location: e.target.value})} />
              </div>
              <div>
                <label className="label">Tahmini Katılımcı Sayısı</label>
                <input type="number" className="input" value={formData.expectedCount} onChange={(e) => setFormData({...formData, expectedCount: e.target.value})} />
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: '0.5rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input type="checkbox" checked={formData.preregRequired} onChange={(e) => setFormData({...formData, preregRequired: e.target.checked})} style={{ width: '18px', height: '18px' }} />
                  <span>Ön kayıt gerektirir</span>
                </label>
              </div>
            </div>
          )}

          {/* STEP 3: Konuşmacılar */}
          {currentStep === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>Konuşmacıları Düzenle</h3>
                <button type="button" onClick={addSpeaker} className="btn btn-outline" style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem' }}>
                  <Plus size={14} /> Yeni Ekle
                </button>
              </div>

              {speakers.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', backgroundColor: 'var(--bg-main)', borderRadius: 'var(--radius-md)', border: '1px dashed #d1d5db', color: 'var(--text-muted)' }}>Konuşmacı yok.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {speakers.map((s, index) => (
                    <div key={index} style={{ padding: '1.5rem', backgroundColor: s.is_cancelled ? 'var(--bg-danger-light)' : 'var(--bg-nested)', border: `1px solid ${s.is_cancelled ? 'var(--border-danger)' : '#eaeaea'}`, borderRadius: 'var(--radius-md)', position: 'relative', opacity: s.is_cancelled ? 0.7 : 1 }}>
                      {s.is_cancelled && (
                        <div style={{ position: 'absolute', top: '1rem', left: '1rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--status-danger)', textTransform: 'uppercase' }}>İPTAL EDİLECEK</div>
                      )}
                      
                      {s.is_cancelled ? (
                         <button type="button" onClick={() => restoreSpeaker(index)} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', color: 'var(--color-primary)', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}>GERİ AL</button>
                      ) : (
                        <button type="button" onClick={() => removeSpeaker(index)} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', color: 'var(--status-danger)', cursor: 'pointer' }}>
                          <Trash2 size={18} />
                        </button>
                      )}

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: s.is_cancelled ? '1.5rem' : 0, pointerEvents: s.is_cancelled ? 'none' : 'auto' }}>
                        <div><label className="label">Ad Soyad</label><input type="text" className="input" value={s.name} onChange={(e) => updateSpeaker(index, 'name', e.target.value)} /></div>
                        <div><label className="label">Unvan</label><input type="text" className="input" value={s.title} onChange={(e) => updateSpeaker(index, 'title', e.target.value)} /></div>
                        <div style={{ gridColumn: 'span 2' }}>
                          <ExpertiseMultiSelect 
                            selectedFields={s.expertiseFields || []}
                            onChange={(fields) => updateSpeaker(index, 'expertiseFields', fields)}
                            otherExpertise={s.otherExpertise || ''}
                            onOtherChange={(val) => updateSpeaker(index, 'otherExpertise', val)}
                          />
                        </div>
                        <div style={{ gridColumn: 'span 2' }}><label className="label">Konuşmacı Hakkında</label><textarea className="input" rows={2} value={s.about || ''} onChange={(e) => updateSpeaker(index, 'about', e.target.value)}></textarea></div>
                        <div style={{ gridColumn: 'span 2' }}>
                          <label className="label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            Sosyal Medya Linkleri
                            <button type="button" onClick={() => addSpeakerSocialLink(index)} style={{ background: 'none', border: 'none', color: 'var(--color-primary)', cursor: 'pointer', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Plus size={12} /> Ekle</button>
                          </label>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {(s.socialLinks || ['']).map((link: string, linkIndex: number) => (
                              <div key={linkIndex} style={{ display: 'flex', gap: '0.5rem' }}>
                                <input type="url" className="input" value={link} onChange={(e) => updateSpeakerSocialLink(index, linkIndex, e.target.value)} />
                                {(s.socialLinks || ['']).length > 1 && (
                                  <button type="button" onClick={() => removeSpeakerSocialLink(index, linkIndex)} style={{ background: 'none', border: 'none', color: 'var(--status-danger)', cursor: 'pointer' }}><Trash2 size={16} /></button>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                        <div style={{ gridColumn: 'span 2' }}><label className="label">Seçilme Nedeni</label><textarea className="input" rows={2} value={s.reason} onChange={(e) => updateSpeaker(index, 'reason', e.target.value)}></textarea></div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* STEP 4: Lojistik & Onay */}
          {currentStep === 4 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              
              {/* Shuttle */}
              <div style={{ border: `1px solid ${formData.logistics.hasShuttle ? 'var(--color-primary)' : '#eaeaea'}`, borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                <div onClick={() => updateLogistics('hasShuttle', !formData.logistics.hasShuttle)} style={{ padding: '1rem', cursor: 'pointer', backgroundColor: formData.logistics.hasShuttle ? 'var(--color-primary-light)' : 'var(--bg-nested)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
                  <input type="checkbox" checked={formData.logistics.hasShuttle} readOnly style={{ width: '18px', height: '18px' }} /> Araç / Servis Talebi
                </div>
                {formData.logistics.hasShuttle && (
                  <div style={{ padding: '1.5rem', backgroundColor: 'var(--bg-card)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div><label className="label">Tarih</label><input type="date" className="input" value={formData.logistics.shuttle.date} onChange={e => updateShuttle('date', e.target.value)} /></div>
                    <div><label className="label">Araç Talebi</label><input type="text" className="input" value={formData.logistics.shuttle.description} onChange={e => updateShuttle('description', e.target.value)} /></div>
                    <div><label className="label">Kalkış Noktası</label><input type="text" className="input" value={formData.logistics.shuttle.departurePoint} onChange={e => updateShuttle('departurePoint', e.target.value)} /></div>
                    <div><label className="label">Varış Noktası</label><input type="text" className="input" value={formData.logistics.shuttle.arrivalPoint} onChange={e => updateShuttle('arrivalPoint', e.target.value)} /></div>
                    <div><label className="label">Hareket Saati (Gidiş)</label><input type="time" className="input" value={formData.logistics.shuttle.departureTime} onChange={e => updateShuttle('departureTime', e.target.value)} /></div>
                    <div><label className="label">Dönüş Yeri</label><input type="text" className="input" value={formData.logistics.shuttle.returnPoint} onChange={e => updateShuttle('returnPoint', e.target.value)} /></div>
                    <div><label className="label">Hareket Saati (Dönüş)</label><input type="time" className="input" value={formData.logistics.shuttle.returnTime} onChange={e => updateShuttle('returnTime', e.target.value)} /></div>
                    <div><label className="label">Konum Linki</label><input type="text" className="input" value={formData.logistics.shuttle.locationLink} onChange={e => updateShuttle('locationLink', e.target.value)} /></div>
                    <div style={{ gridColumn: 'span 2' }}><label className="label">Araç Sorumlusu (Ad, Tel)</label><input type="text" className="input" value={formData.logistics.shuttle.vehicleManager} onChange={e => updateShuttle('vehicleManager', e.target.value)} /></div>
                  </div>
                )}
              </div>

              {/* Aroma */}
              <div style={{ border: `1px solid ${formData.logistics.hasAroma ? 'var(--color-primary)' : '#eaeaea'}`, borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                <div onClick={() => updateLogistics('hasAroma', !formData.logistics.hasAroma)} style={{ padding: '1rem', cursor: 'pointer', backgroundColor: formData.logistics.hasAroma ? 'var(--color-primary-light)' : 'var(--bg-nested)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
                  <input type="checkbox" checked={formData.logistics.hasAroma} readOnly style={{ width: '18px', height: '18px' }} /> Aromaterapi Yağ Talebi
                </div>
                {formData.logistics.hasAroma && (
                  <div style={{ padding: '1.5rem', backgroundColor: 'var(--bg-card)', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {formData.logistics.aroma.map((a, index) => (
                      <div key={index} style={{ padding: '1rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', position: 'relative' }}>
                        {formData.logistics.aroma.length > 1 && <button type="button" onClick={() => removeAroma(index)} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', color: 'var(--status-danger)', cursor: 'pointer' }}><Trash2 size={16} /></button>}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                          <div><label className="label">Yağ Çeşitleri</label><input type="text" className="input" value={a.oils} onChange={e => updateAroma(index, 'oils', e.target.value)} /></div>
                          <div><label className="label">Miktarları</label><input type="text" className="input" value={a.amount} onChange={e => updateAroma(index, 'amount', e.target.value)} /></div>
                          <div><label className="label">Kişi Sayısı</label><input type="number" className="input" value={a.peopleCount} onChange={e => updateAroma(index, 'peopleCount', e.target.value)} /></div>
                          <div style={{ gridColumn: 'span 2' }}><label className="label">Ekstra Not</label><textarea className="input" rows={2} value={a.notes} onChange={e => updateAroma(index, 'notes', e.target.value)} /></div>
                        </div>
                      </div>
                    ))}
                    <button type="button" onClick={addAroma} className="btn btn-outline" style={{ alignSelf: 'flex-start', fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}><Plus size={14}/> Formülasyon Ekle</button>
                  </div>
                )}
              </div>

              {/* Temel Yağam Desteği */}
              <div style={{ border: `1px solid ${formData.logistics.hasBasicLifeSupport ? 'var(--color-primary)' : '#eaeaea'}`, borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                <div onClick={() => updateLogistics('hasBasicLifeSupport', !formData.logistics.hasBasicLifeSupport)} style={{ padding: '1rem', cursor: 'pointer', backgroundColor: formData.logistics.hasBasicLifeSupport ? 'var(--color-primary-light)' : 'var(--bg-nested)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
                  <input type="checkbox" checked={formData.logistics.hasBasicLifeSupport} readOnly style={{ width: '18px', height: '18px' }} /> ?? Temel Yağam Desteği Malzemeleri
                </div>
                {formData.logistics.hasBasicLifeSupport && (
                  <div style={{ padding: '1.5rem', backgroundColor: 'var(--bg-card)' }}>
                    <label className="label">Malzeme Detayları</label>
                    <textarea className="input" rows={2} value={formData.logistics.basicLifeSupportDetails} onChange={e => updateLogistics('basicLifeSupportDetails', e.target.value)}></textarea>
                  </div>
                )}
              </div>

              {/* İleri Yağam Desteği */}
              <div style={{ border: `1px solid ${formData.logistics.hasAdvancedLifeSupport ? 'var(--color-primary)' : '#eaeaea'}`, borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                <div onClick={() => updateLogistics('hasAdvancedLifeSupport', !formData.logistics.hasAdvancedLifeSupport)} style={{ padding: '1rem', cursor: 'pointer', backgroundColor: formData.logistics.hasAdvancedLifeSupport ? 'var(--color-primary-light)' : 'var(--bg-nested)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
                  <input type="checkbox" checked={formData.logistics.hasAdvancedLifeSupport} readOnly style={{ width: '18px', height: '18px' }} /> ?? İleri Yağam Desteği Malzemeleri
                </div>
                {formData.logistics.hasAdvancedLifeSupport && (
                  <div style={{ padding: '1.5rem', backgroundColor: 'var(--bg-card)' }}>
                    <label className="label">Malzeme Detayları</label>
                    <textarea className="input" rows={2} value={formData.logistics.advancedLifeSupportDetails} onChange={e => updateLogistics('advancedLifeSupportDetails', e.target.value)}></textarea>
                  </div>
                )}
              </div>

              {/* Sütur Eğitimi */}
              <div style={{ border: `1px solid ${formData.logistics.hasSutureTraining ? 'var(--color-primary)' : '#eaeaea'}`, borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                <div onClick={() => updateLogistics('hasSutureTraining', !formData.logistics.hasSutureTraining)} style={{ padding: '1rem', cursor: 'pointer', backgroundColor: formData.logistics.hasSutureTraining ? 'var(--color-primary-light)' : 'var(--bg-nested)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
                  <input type="checkbox" checked={formData.logistics.hasSutureTraining} readOnly style={{ width: '18px', height: '18px' }} /> ?? Sütur Eğitimi Malzemeleri
                </div>
                {formData.logistics.hasSutureTraining && (
                  <div style={{ padding: '1.5rem', backgroundColor: 'var(--bg-card)' }}>
                    <label className="label">Malzeme Detayları</label>
                    <textarea className="input" rows={2} value={formData.logistics.sutureTrainingDetails} onChange={e => updateLogistics('sutureTrainingDetails', e.target.value)}></textarea>
                  </div>
                )}
              </div>

              {/* Custom Requests */}
              <div style={{ border: `1px solid ${(formData.logistics.customRequests || []).length > 0 ? 'var(--color-primary)' : '#eaeaea'}`, borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                <div style={{ padding: '1rem', backgroundColor: (formData.logistics.customRequests || []).length > 0 ? 'var(--color-primary-light)' : 'var(--bg-nested)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 600 }}>
                  <span>Özel Talepler</span>
                  <button type="button" onClick={addCustomRequest} className="btn btn-outline" style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem', backgroundColor: 'var(--bg-card)' }}><Plus size={14} /> Yeni Talep</button>
                </div>
                {(formData.logistics.customRequests || []).length > 0 && (
                  <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', backgroundColor: 'var(--bg-card)' }}>
                    {(formData.logistics.customRequests || []).map((req: string, index: number) => (
                      <div key={index} style={{ padding: '1rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', position: 'relative' }}>
                        <button type="button" onClick={() => removeCustomRequest(index)} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', color: 'var(--status-danger)', cursor: 'pointer' }}><Trash2 size={16} /></button>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
                          <div><label className="label">Talep Adı</label><input type="text" className="input" value={req.name} onChange={e => updateCustomRequest(index, 'name', e.target.value)} /></div>
                          <div><label className="label">Detaylar</label><textarea className="input" rows={2} value={req.note} onChange={e => updateCustomRequest(index, 'note', e.target.value)}></textarea></div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Extra Notes */}
              <div>
                <label className="label">Ekstra İletmek İstedikleriniz</label>
                <textarea className="input" rows={3} value={formData.logistics.extraNotes} onChange={e => updateLogistics('extraNotes', e.target.value)}></textarea>
              </div>

            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div style={{ padding: '1.5rem', borderTop: '1px solid var(--border-color)', backgroundColor: 'var(--bg-nested)', display: 'flex', justifyContent: 'space-between' }}>
          <button type="button" onClick={handlePrev} disabled={currentStep === 1} className="btn btn-outline" style={{ opacity: currentStep === 1 ? 0.5 : 1 }}>
            <ChevronLeft size={16} /> Önceki Adım
          </button>
          
          <div style={{ display: 'flex', gap: '1rem' }}>
            {currentStep < 4 ? (
              <button type="button" onClick={handleNext} className="btn btn-primary">
                Sonraki Adım <ChevronRight size={16} />
              </button>
            ) : (
              <button type="button" onClick={handleSubmit} disabled={isSubmitting} className="btn btn-primary" style={{ backgroundColor: 'var(--status-success)' }}>
                {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                Revizeyi Onaya Gönder
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}






