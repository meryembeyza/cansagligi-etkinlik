'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CheckCircle } from 'lucide-react';

export default function PostEventReportPage() {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    actualCount: '',
    driveLink: '',
    socialLink: '',
    feedback: '',
    resourceIssues: '',
    resourcesWorking: true
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitted(true);
  };

  if (isSubmitted) {
    return (
      <div style={{ maxWidth: '600px', margin: '4rem auto', textAlign: 'center', backgroundColor: 'var(--bg-card)', padding: '3rem', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-md)' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem', color: 'var(--status-success)' }}>
          <CheckCircle size={64} />
        </div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem' }}>Rapor Başarıyla Gönderildi</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>Etkinlik raporunuz sisteme işlenmiş ve ilgili birimlere iletilmiştir. Etkinlik durumu &quot;Gerçekleşti&quot; olarak güncellendi.</p>
        <Link href="/dashboard" className="btn btn-primary">
          Ana Panele Dön
        </Link>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', paddingBottom: '4rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Etkinlik Sonrası Raporu</h1>
        <p style={{ color: 'var(--text-muted)' }}>Gerçekleşen etkinliğinizle ilgili bilgileri doldurun. Rapor doldurulmayan etkinlikler eksik kabul edilir.</p>
      </div>

      <div className="card" style={{ backgroundColor: 'var(--bg-warning-light)', border: '1px solid #fef3c7', marginBottom: '2rem' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#92400e', marginBottom: '0.25rem' }}>İlgili Etkinlik: Yapay Zeka Zirvesi</h3>
        <p style={{ fontSize: '0.875rem', color: '#b45309' }}>Tarih: 12 Mayıs 2026 | Beklenen Katılımcı: 150</p>
      </div>

      <form onSubmit={handleSubmit} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        
        <div>
          <label className="label">Gerçekleşen Katılımcı Sayısı *</label>
          <input type="number" required className="input" placeholder="Örn: 180" value={formData.actualCount} onChange={(e) => setFormData({...formData, actualCount: e.target.value})} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          <div>
            <label className="label">Google Drive Görsel Arşivi Linki *</label>
            <input type="url" required className="input" placeholder="https://drive.google.com/..." value={formData.driveLink} onChange={(e) => setFormData({...formData, driveLink: e.target.value})} />
          </div>
          <div>
            <label className="label">Sosyal Medya Paylaşım Linki</label>
            <input type="url" className="input" placeholder="https://instagram.com/p/..." value={formData.socialLink} onChange={(e) => setFormData({...formData, socialLink: e.target.value})} />
          </div>
        </div>

        <div>
          <label className="label">Genel Geri Bildirim *</label>
          <textarea required className="input" rows={4} placeholder="Etkinliğin olumlu ve olumsuz yanları nelerdi? Neler daha iyi olabilirdi?" value={formData.feedback} onChange={(e) => setFormData({...formData, feedback: e.target.value})}></textarea>
        </div>

        <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem' }}>Lojistik Durum Değerlendirmesi</h3>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>Kullandığınız 2x Projeksiyon Cihazı hakkında:</p>
          
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input type="radio" name="resources" checked={formData.resourcesWorking} onChange={() => setFormData({...formData, resourcesWorking: true})} />
              <span>Sorunsuz Kullanıldı</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input type="radio" name="resources" checked={!formData.resourcesWorking} onChange={() => setFormData({...formData, resourcesWorking: false})} />
              <span>Sorun Yaşandı</span>
            </label>
          </div>

          {!formData.resourcesWorking && (
            <div>
              <label className="label">Yaşanan Sorunu Açıklayın *</label>
              <textarea required className="input" rows={3} placeholder="Cihaz arızalıydı, eksik geldi vb." value={formData.resourceIssues} onChange={(e) => setFormData({...formData, resourceIssues: e.target.value})}></textarea>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
          <Link href="/dashboard" className="btn btn-outline">İptal</Link>
          <button type="submit" className="btn btn-primary">Raporu Gönder</button>
        </div>

      </form>
    </div>
  );
}
