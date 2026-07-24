'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Loader2, Clock, Pencil, CheckCircle2, AlertTriangle, ArrowRight, CalendarDays } from 'lucide-react';
import Link from 'next/link';

export default function DesignTeamPanel() {
  const [requests, setRequests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchRequests() {
      const supabase = createClient();
      try {
        const { data, error } = await supabase
          .from('poster_requests')
          .select(`
            *,
            events:event_id (
              id, event_name, event_date, location, university
            )
          `)
          .order('created_at', { ascending: false });

        if (!error && data) {
          setRequests(data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchRequests();
  }, []);

  const countBekliyor = requests.filter(r => r.status === 'Bekliyor').length;
  const countHazirlaniyor = requests.filter(r => r.status === 'Hazırlanıyor').length;
  // Tamamlandı bu ay
  const countTamamlandi = requests.filter(r => {
    if (r.status !== 'Tamamlandı') return false;
    const date = new Date(r.updated_at || r.created_at);
    const now = new Date();
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  }).length;
  const countRevizyon = requests.filter(r => r.status === 'Revizyon Gerekli' || r.status === 'Revizyon').length;

  const urgentBekleyenler = requests
    .filter(r => r.status === 'Bekliyor' && r.events?.event_date)
    .sort((a, b) => new Date(a.events.event_date).getTime() - new Date(b.events.event_date).getTime())
    .slice(0, 2);

  const getDaysDifference = (targetDate: string) => {
    const diffTime = new Date(targetDate).getTime() - new Date('2026-07-24T00:00:00+03:00').getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  if (isLoading) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}><Loader2 className="animate-spin" size={32} color="#da1c15" /></div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        
        {/* Card 1: Bekliyor */}
        <div style={{ background: 'var(--bg-card)', borderRadius: '12px', padding: '20px', border: '1px solid var(--border-color)', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: '-15px', right: '-15px', opacity: 0.05, color: '#da1c15' }}><Clock size={100} /></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <div style={{ padding: '8px', background: '#fff0ef', borderRadius: '8px', color: '#da1c15' }}><Clock size={20} /></div>
            <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)' }}>Bekleyen Talepler</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', marginBottom: '16px' }}>
            <span style={{ fontSize: '32px', fontWeight: 700, color: 'var(--text-main)', lineHeight: 1 }}>{countBekliyor}</span>
            {countBekliyor > 0 && <span style={{ background: '#da1c15', color: 'white', fontSize: '11px', padding: '2px 8px', borderRadius: '12px', fontWeight: 600 }}>Acil</span>}
          </div>
          <Link href="/dashboard/afis-talepleri?tab=Bekliyor" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '13px', fontWeight: 600, color: '#da1c15', textDecoration: 'none' }}>
            Görüntüle <ArrowRight size={14} />
          </Link>
        </div>

        {/* Card 2: Hazırlanıyor */}
        <div style={{ background: 'var(--bg-card)', borderRadius: '12px', padding: '20px', border: '1px solid var(--border-color)', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: '-15px', right: '-15px', opacity: 0.05, color: '#F39C12' }}><Pencil size={100} /></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <div style={{ padding: '8px', background: '#fef5e7', borderRadius: '8px', color: '#F39C12' }}><Pencil size={20} /></div>
            <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)' }}>Hazırlanıyor</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', marginBottom: '16px' }}>
            <span style={{ fontSize: '32px', fontWeight: 700, color: 'var(--text-main)', lineHeight: 1 }}>{countHazirlaniyor}</span>
          </div>
          <Link href="/dashboard/afis-talepleri?tab=Hazırlanıyor" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '13px', fontWeight: 600, color: '#F39C12', textDecoration: 'none' }}>
            Görüntüle <ArrowRight size={14} />
          </Link>
        </div>

        {/* Card 3: Tamamlandı */}
        <div style={{ background: 'var(--bg-card)', borderRadius: '12px', padding: '20px', border: '1px solid var(--border-color)', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: '-15px', right: '-15px', opacity: 0.05, color: '#27AE60' }}><CheckCircle2 size={100} /></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <div style={{ padding: '8px', background: '#e9f7ef', borderRadius: '8px', color: '#27AE60' }}><CheckCircle2 size={20} /></div>
            <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)' }}>Tamamlandı (Bu Ay)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', marginBottom: '16px' }}>
            <span style={{ fontSize: '32px', fontWeight: 700, color: 'var(--text-main)', lineHeight: 1 }}>{countTamamlandi}</span>
          </div>
          <Link href="/dashboard/afis-talepleri?tab=Tamamlandı" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '13px', fontWeight: 600, color: '#27AE60', textDecoration: 'none' }}>
            Görüntüle <ArrowRight size={14} />
          </Link>
        </div>

        {/* Card 4: Revizyon */}
        <div style={{ background: 'var(--bg-card)', borderRadius: '12px', padding: '20px', border: '1px solid var(--border-color)', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: '-15px', right: '-15px', opacity: 0.05, color: '#da1c15' }}><AlertTriangle size={100} /></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <div style={{ padding: '8px', background: '#fff0ef', borderRadius: '8px', color: '#da1c15' }}><AlertTriangle size={20} /></div>
            <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)' }}>Revizyon Bekliyor</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', marginBottom: '16px' }}>
            <span style={{ fontSize: '32px', fontWeight: 700, color: 'var(--text-main)', lineHeight: 1 }}>{countRevizyon}</span>
          </div>
          <Link href="/dashboard/afis-talepleri?tab=Revizyon" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '13px', fontWeight: 600, color: '#da1c15', textDecoration: 'none' }}>
            Görüntüle <ArrowRight size={14} />
          </Link>
        </div>
      </div>

      <div style={{ background: 'var(--bg-card)', borderRadius: '12px', padding: '20px', border: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-main)', margin: 0 }}>En Acil Bekleyen Talepler</h3>
        </div>
        
        {urgentBekleyenler.length === 0 ? (
          <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Harika! Bekleyen acil talep yok.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {urgentBekleyenler.map(req => {
              const days = getDaysDifference(req.events?.event_date);
              return (
                <div key={req.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'var(--bg-nested)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: '#fff0ef', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#da1c15' }}>
                      <CalendarDays size={20} />
                    </div>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-main)' }}>{req.events?.event_name || 'Bilinmeyen Etkinlik'}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>{new Date(req.events?.event_date).toLocaleDateString('tr-TR')}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 600, background: days <= 7 ? '#fef2f2' : '#f3f4f6', color: days <= 7 ? '#da1c15' : '#4b5563', padding: '4px 10px', borderRadius: '12px' }}>
                      {days >= 0 ? `${days} gün kaldı` : 'Geçti'}
                    </span>
                    <Link href="/dashboard/afis-talepleri?tab=Bekliyor" style={{ padding: '6px 12px', background: '#da1c15', color: 'white', fontSize: '13px', fontWeight: 500, borderRadius: '6px', textDecoration: 'none' }}>
                      İşleme Al
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div style={{ marginTop: '20px', textAlign: 'center' }}>
          <Link href="/dashboard/afis-talepleri" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '14px', fontWeight: 500, color: 'var(--text-secondary)', textDecoration: 'none' }}>
            Tüm talepler <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </div>
  );
}
