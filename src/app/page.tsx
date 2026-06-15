import Link from 'next/link';

export default function Home() {
  return (
    <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--bg-card)', borderBottom: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <img src="/logo.png" alt="Cansağlığı Vakfı Logo" style={{ height: '60px', objectFit: 'contain' }} />
        </div>
        <nav style={{ display: 'flex', gap: '1rem' }}>
          <Link href="/dashboard" className="btn btn-outline">Giriş Yap</Link>
        </nav>
      </header>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', textAlign: 'center', background: 'linear-gradient(135deg, #fdfbfb 0%, #ebedee 100%)' }}>
        <h2 style={{ fontSize: '3rem', fontWeight: 800, marginBottom: '1rem', color: '#1a202c', maxWidth: '800px' }}>
          Üniversite Etkinliklerinizi <span style={{ color: 'var(--color-primary)' }}>Tek Noktadan</span> Yönetin
        </h2>
        <p style={{ fontSize: '1.25rem', color: 'var(--text-muted)', marginBottom: '2rem', maxWidth: '600px' }}>
          Etkinlik planlama, kaynak rezervasyonu, onay süreçleri ve afiş taleplerini tek bir platformda kolayca takip edin.
        </p>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <Link href="/dashboard" className="btn btn-primary" style={{ fontSize: '1.125rem', padding: '0.75rem 2rem' }}>
            Hemen Başla
          </Link>
        </div>
      </div>

      <footer style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
        &copy; {new Date().getFullYear()} Cansağlığı Vakfı. Tüm hakları saklıdır.
      </footer>
    </main>
  );
}
