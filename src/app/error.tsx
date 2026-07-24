'use client';
import { useEffect } from 'react';
import Link from 'next/link';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('Global error:', error.message);
  }, [error]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '2rem', textAlign: 'center' }}>
      <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
      <h1 style={{ fontSize: '2rem', fontWeight: 600, marginBottom: '1rem' }}>Bir hata oluştu</h1>
      <p style={{ color: '#666', marginBottom: '2rem', maxWidth: '400px' }}>
        Beklenmedik bir sorunla karşılaşıldı. Lütfen sayfayı yenileyin veya giriş sayfasına dönün.
      </p>
      <div style={{ display: 'flex', gap: '1rem' }}>
        <button onClick={() => reset()} style={{ padding: '0.5rem 1rem', borderRadius: '4px', border: '1px solid #ccc', cursor: 'pointer', backgroundColor: 'transparent' }}>
          Tekrar Dene
        </button>
        <Link href="/login" style={{ padding: '0.5rem 1rem', borderRadius: '4px', backgroundColor: '#da1c15', color: 'white', textDecoration: 'none' }}>
          Giriş Sayfası
        </Link>
      </div>
    </div>
  );
}
