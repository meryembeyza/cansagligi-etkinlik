import Link from 'next/link';

export default function KVKKPage() {
  const sections: [string, string][] = [
    ['1. Veri Sorumlusu', 'Canan Bayraktar Toplum Sağlığı Vakfı (Cansağlığı Vakfı), 6698 sayılı Kişisel Verilerin Korunması Kanunu kapsamında veri sorumlusudur.'],
    ['2. İşlenen Kişisel Veriler', 'Sisteme kayıt sırasında şu veriler işlenmektedir: ad-soyad, e-posta adresi, telefon numarası (WhatsApp bildirimleri için), üniversite ve bölüm bilgisi, öğrenci numarası.'],
    ['3. İşleme Amacı ve Hukuki Dayanak', 'Verileriniz; sistem üyeliği oluşturma, etkinlik bildirimleri gönderme ve onay süreçlerini yürütme amacıyla KVKK Madde 5/2(c) — sözleşmenin ifası hukuki dayanağıyla işlenmektedir.'],
    ['4. Veri Saklama Süresi', 'Kişisel verileriniz üyeliğinizin aktif olduğu süre boyunca ve üyelik sonrası yasal zorunluluklar kapsamında 2 yıl saklanmaktadır.'],
    ['5. Veri Güvenliği ve Aktarım', 'Verileriniz Supabase (supabase.com) altyapısında şifreli biçimde saklanmaktadır. Üçüncü taraflarla ticari amaçla paylaşılmamaktadır.'],
    ['6. Haklarınız (KVKK Madde 11)', 'Verilerinize erişim, düzeltme, silme, işlemenin kısıtlanması ve işlemeye itiraz haklarına sahipsiniz. Talepler için: kvkk@cansagligivakfi.org'],
  ];

  return (
    <div style={{ maxWidth: '720px', margin: '0 auto', padding: '3rem 1.5rem', fontFamily: 'sans-serif' }}>
      <Link href="/login" style={{ fontSize: '0.875rem', color: '#da1c15', textDecoration: 'none', display: 'inline-block', marginBottom: '2rem' }}>
        ← Giriş sayfasına dön
      </Link>
      <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text-main, #111)' }}>
        KVKK Aydınlatma Metni
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

      <div style={{ marginTop: '3rem', padding: '1rem 1.25rem', backgroundColor: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '0.85rem', color: '#6b7280' }}>
        Bu metin bilgilendirme amaçlıdır. Tüm talepler için:{' '}
        <a href="mailto:kvkk@cansagligivakfi.org" style={{ color: '#da1c15' }}>kvkk@cansagligivakfi.org</a>
      </div>
    </div>
  );
}
