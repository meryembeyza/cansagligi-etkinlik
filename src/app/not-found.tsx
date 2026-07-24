import Link from 'next/link';

export default function NotFound() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '2rem', textAlign: 'center' }}>
      <h1 style={{ fontSize: '4rem', fontWeight: 700, margin: '0', color: '#da1c15' }}>404</h1>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '2rem' }}>Sayfa bulunamadı</h2>
      <Link href="/" style={{ padding: '0.5rem 1rem', borderRadius: '4px', backgroundColor: '#da1c15', color: 'white', textDecoration: 'none' }}>
        Ana sayfaya dön →
      </Link>
    </div>
  );
}
