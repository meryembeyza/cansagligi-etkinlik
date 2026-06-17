import React, { useEffect, useState } from 'react';
import { AppEvent,  createClient } from '@/utils/supabase/client';
const supabase = createClient();
import { AppEvent,  Loader2, X } from 'lucide-react';

interface EventDiffViewerProps {
  eventId: string;
  currentevent: AppEvent;
  onClose: () => void;
}

export default function EventDiffViewer({ eventId, currentEvent, onClose }: EventDiffViewerProps) {
  const [oldEventData, setOldEventData] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchLastRevision = async () => {
      try {
        const { data, error } = await supabase
          .from('event_revisions')
          .select('revision_data, revision_notes')
          .eq('event_id', eventId)
          .order('created_at', { ascending: false })
          .limit(1);

        if (!error && data && data.length > 0) {
          setOldEventData(data[0].revision_data);
        }
      } catch (err) {
        console.error('Revizyon çekilemedi:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLastRevision();
  }, [eventId]);

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 className="animate-spin text-white" size={32} />
      </div>
    );
  }

  const renderField = (label: string, fieldKey: string, isArray = false) => {
    const oldVal = oldEventData ? oldEventData[fieldKey] : null;
    const newVal = currentEvent[fieldKey];
    
    let isChanged = false;
    let oldDisplay = oldVal;
    let newDisplay = newVal;

    if (isArray) {
      isChanged = JSON.stringify(oldVal || []) !== JSON.stringify(newVal || []);
      oldDisplay = (oldVal || []).join(', ');
      newDisplay = (newVal || []).join(', ');
    } else {
      isChanged = oldVal !== newVal;
      if (fieldKey === 'event_date') {
        oldDisplay = oldVal ? new Date(oldVal).toLocaleString('tr-TR') : 'Belirtilmedi';
        newDisplay = newVal ? new Date(newVal).toLocaleString('tr-TR') : 'Belirtilmedi';
      }
    }

    // Only show if it changed, or just show everything and highlight changes?
    // "hangi alanlarının son revizyonda değiştiği sarı arka planla vurgulanmalı"
    
    return (
      <div style={{ marginBottom: '1rem', padding: '0.75rem', borderRadius: '4px', backgroundColor: isChanged && oldEventData ? '#fef3c7' : 'transparent', border: isChanged && oldEventData ? '1px solid #fde68a' : 'none' }}>
        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>{label}</div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          {isChanged && oldEventData && (
            <div style={{ flex: 1, textDecoration: 'line-through', color: 'var(--status-danger)', fontSize: '0.875rem' }}>
              {oldDisplay || '-'}
            </div>
          )}
          <div style={{ flex: 1, fontSize: '0.9rem', color: 'var(--text-main)', fontWeight: isChanged && oldEventData ? 600 : 400 }}>
            {newDisplay || '-'}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: '8px', width: '100%', maxWidth: '600px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        
        <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--bg-main)' }}>
          <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600 }}>Değişiklik Özeti</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            <X size={20} color="var(--text-muted)" />
          </button>
        </div>

        <div style={{ padding: '1.5rem', overflowY: 'auto' }}>
          {!oldEventData ? (
            <div style={{ padding: '1rem', backgroundColor: '#e0f2fe', color: '#0369a1', borderRadius: '4px', marginBottom: '1rem', fontSize: '0.875rem' }}>
              Bu etkinlik için henüz bir revizyon kaydı bulunamadı. (İlk onay süreci)
            </div>
          ) : (
             <div style={{ padding: '0.75rem', backgroundColor: 'var(--bg-warning-light)', color: '#b45309', borderRadius: '4px', marginBottom: '1.5rem', fontSize: '0.875rem', border: '1px solid #fde68a' }}>
               Sarı ile vurgulanan alanlar bir önceki sürüme göre değiştirilmiştir. Çizili olanlar eski veriyi gösterir.
             </div>
          )}

          {renderField('Etkinlik Adı', 'event_name')}
          {renderField('Etkinlik Türü', 'event_type')}
          {renderField('Etkinlik Amacı', 'event_purpose')}
          {renderField('Yer / Konum', 'location')}
          {renderField('Tarih', 'event_date')}
          {renderField('Hedef Kitle', 'target_audience', true)}
          {renderField('Tahmini Katılımcı', 'expected_participants')}
          {renderField('Bütçe Talebi', 'budget_request')}
          
          <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn btn-outline" onClick={onClose}>Kapat</button>
          </div>
        </div>
      </div>
    </div>
  );
}



