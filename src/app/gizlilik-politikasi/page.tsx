import Link from 'next/link';

export default function GizlilikPolitikasiPage() {
  const sections: [string, string][] = [
    ['Toplanan Veriler', 'Kayıt formunda sağladığınız kişisel bilgiler (ad, e-posta, telefon, üniversite bilgisi) sistemimizde saklanmaktadır.'],
    ['Çerezler', 'Sistem yalnızca oturum yönetimi için zorunlu çerezler kullanmaktadır (Supabase sb-access-token, sb-refresh-token). Bu çerezler analitik veya reklam amacıyla kullanılmaz.'],
    ['Veri Paylaşımı', 'Kişisel verileriniz üçüncü taraflarla ticari amaçla paylaşılmaz. Sistem altyapısı Supabase (supabase.com) üzerinde çalışmaktadır.'],
    ['Veri Güvenliği', 'Verileriniz şifreli bağlantılar (HTTPS) ve güvenli veritabanı altyapısı üzerinden aktarılmakta ve saklanmaktadır.'],
  ];

  return (
    <div style={{ maxWidth: '720px', margin: '0 auto', padding: '3rem 1.5rem', fontFamily: 'sans-serif' }}>
      <Link href="/login" style={{ fontSize: '0.875rem', color: '#da1c15', textDecoration: 'none', display: 'inline-block', marginBottom: '2rem' }}>
        ← Giriş sayfasına dön
      </Link>
      <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text-main, #111)' }}>
        Gizlilik Politikası
      </h1>
      <p style={{ fontSize: '0.875rem', color: 'var(--text-muted, #6b7280)', marginBottom: '2.5rem' }}>
        Cansağlığı Vakfı · Son güncelleme: {new Date().getFullYear()}
      </p>

      {sections.map(([title, text]) => (
        <div key={title} style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main, #111)', marginBottom: '0.5rem' }}>{title}</h2>
          <p style={{ fontSize: '0.95rem', color: 'var(--text-muted, #374151)', lineHeight: 1.7 }}>{text}</p>
        </div>
      ))}
    </div>
  );
}
