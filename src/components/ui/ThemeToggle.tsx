'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // useEffect only runs on the client, so now we can safely show the UI
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div style={{ width: '36px', height: '36px' }} />;
  }

  const isDark = theme === 'dark';

  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="btn btn-outline"
      style={{
        padding: '0.5rem',
        borderRadius: '50%',
        color: 'var(--text-main)',
        borderColor: 'var(--border-color)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '36px',
        height: '36px'
      }}
      title="Tema Değiştir"
    >
      {isDark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
