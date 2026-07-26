'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem('cookie_consent')) setVisible(true);
    } catch {}
  }, []);

  if (!visible) return null;

  const accept = () => {
    try {
      localStorage.setItem('cookie_consent', 'accepted');
      localStorage.setItem('cookie_consent_date', new Date().toISOString());
    } catch {}
    setVisible(false);
  };

  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 9999,
      backgroundColor: '#1a1a1a', color: '#f3f4f6',
      padding: '1rem 1.5rem',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem',
      flexWrap: 'wrap',
      boxShadow: '0 -4px 20px rgba(0,0,0,0.25)',
      fontSize: '0.875rem',
    }}>
      <p style={{ margin: 0, lineHeight: 1.6, maxWidth: '700px' }}>
        Bu sistem oturum yönetimi için zorunlu çerezler kullanmaktadır.{' '}
        <Link href="/kvkk" style={{ color: '#fca5a5', textDecoration: 'underline' }}>
          KVKK Aydınlatma Metni
        </Link>
        &apos;ni ve{' '}
        <Link href="/gizlilik-politikasi" style={{ color: '#fca5a5', textDecoration: 'underline' }}>
          Gizlilik Politikası
        </Link>
        &apos;nı okuyabilirsiniz.
      </p>
      <button
        onClick={accept}
        style={{
          background: '#da1c15', color: 'white', border: 'none', borderRadius: '8px',
          padding: '0.6rem 1.5rem', fontWeight: 600, cursor: 'pointer',
          fontSize: '0.875rem', whiteSpace: 'nowrap', flexShrink: 0,
          transition: 'background 0.15s',
        }}
        onMouseEnter={e => (e.currentTarget.style.background = '#b91c1c')}
        onMouseLeave={e => (e.currentTarget.style.background = '#da1c15')}
      >
        Anladım
      </button>
    </div>
  );
}
