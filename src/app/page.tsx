'use client';

import Link from 'next/link';

export default function Home() {
  return (
    <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
      <style dangerouslySetInnerHTML={{__html: `
        .login-btn {
          border: 1.5px solid #dc2626;
          color: #dc2626;
          background-color: transparent;
          border-radius: 8px;
          padding: 8px 20px;
          font-weight: 500;
          text-decoration: none;
          transition: all 0.2s ease;
        }
        .login-btn:hover {
          background-color: #dc2626;
          color: white;
        }
        .primary-btn {
          background-color: #dc2626;
          color: white;
          padding: 14px 32px;
          border-radius: 10px;
          font-weight: 600;
          font-size: 1rem;
          text-decoration: none;
          transition: all 0.2s ease;
          box-shadow: 0 4px 14px rgba(220,38,38,0.35);
          display: inline-block;
        }
        .primary-btn:hover {
          background-color: #b91c1c;
          transform: translateY(-1px);
        }
        .stat-card {
          background: white;
          border: 1px solid #f3f4f6;
          border-radius: 16px;
          padding: 28px 40px;
          box-shadow: 0 2px 12px rgba(0,0,0,0.06);
          display: flex;
          flex-direction: column;
          align-items: center;
          min-width: 180px;
          transition: all 0.2s ease;
        }
        .stat-card:hover {
          box-shadow: 0 4px 20px rgba(0,0,0,0.10);
          transform: translateY(-2px);
        }
      `}} />

      <header style={{ 
        padding: '1.5rem', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        backgroundColor: '#ffffff', 
        borderBottom: '1px solid #e5e7eb',
        position: 'sticky',
        top: 0,
        zIndex: 50
      }}>
        <div style={{ display: 'flex', alignItems: 'center', paddingLeft: '24px' }}>
          <img src="/logo.png" alt="Cansağlığı Vakfı Logo" style={{ height: '60px', objectFit: 'contain' }} />
        </div>
        <nav style={{ display: 'flex', gap: '1rem' }}>
          <Link href="/dashboard" className="login-btn">Giriş Yap</Link>
        </nav>
      </header>

      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        padding: '6rem 2rem 4rem', 
        textAlign: 'center', 
        background: 'url("data:image/svg+xml,%3Csvg width=\'20\' height=\'20\' viewBox=\'0 0 20 20\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'%23000000\' fill-opacity=\'0.02\' fill-rule=\'evenodd\'%3E%3Ccircle cx=\'3\' cy=\'3\' r=\'1\'/%3E%3C/g%3E%3C/svg%3E"), radial-gradient(ellipse 600px 400px at 85% 20%, rgba(220,38,38,0.06) 0%, transparent 70%), linear-gradient(135deg, #ffffff 0%, #fafafa 50%, #fff5f5 100%)',
        position: 'relative',
        zIndex: 1
      }}>
        <h2 style={{ 
          fontSize: 'clamp(2.2rem, 5vw, 3.5rem)', 
          fontWeight: 800, 
          marginBottom: '1.5rem', 
          color: '#111827', 
          maxWidth: '900px',
          lineHeight: 1.15,
          letterSpacing: '-0.02em'
        }}>
          Üniversite Etkinliklerinizi <span style={{ color: '#dc2626' }}>Tek Noktadan</span> Yönetin
        </h2>
        <p style={{ 
          fontSize: '1.1rem', 
          color: '#6b7280', 
          marginBottom: '3rem', 
          maxWidth: '540px',
          margin: '0 auto 3rem',
          lineHeight: 1.7
        }}>
          Etkinlik planlama, kaynak rezervasyonu, onay süreçleri ve afiş taleplerini tek bir platformda kolayca takip edin.
        </p>
        
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <Link href="/dashboard" className="primary-btn">
            Hemen Başla
          </Link>
        </div>
      </div>

      <section style={{ backgroundColor: '#ffffff', padding: '4rem 2rem', display: 'flex', justifyContent: 'center', zIndex: 1 }}>
        <div style={{
          display: 'flex',
          gap: '2rem',
          flexWrap: 'wrap',
          justifyContent: 'center'
        }}>
          {[
            { label: 'Etkinlik', value: '248+' },
            { label: 'Katılımcı', value: '12.000+' },
            { label: 'Üniversite', value: '34' }
          ].map((stat, idx) => (
            <div key={idx} className="stat-card">
              <span style={{ fontSize: '2.25rem', fontWeight: 700, color: '#dc2626', lineHeight: 1 }}>{stat.value}</span>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.05em', color: '#6b7280', textTransform: 'uppercase', marginTop: '0.5rem' }}>{stat.label}</span>
            </div>
          ))}
        </div>
      </section>

      <footer style={{ padding: '2rem', textAlign: 'center', color: '#9ca3af', fontSize: '0.875rem', backgroundColor: '#ffffff' }}>
        &copy; {new Date().getFullYear()} Cansağlığı Vakfı. Tüm hakları saklıdır.
      </footer>
    </main>
  );
}
