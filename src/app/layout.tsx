import type { Metadata } from 'next';
import './globals.css';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'], display: 'swap' });

export const metadata: Metadata = {
  title: 'Cansağlığı Vakfı Etkinlik Yönetim Sistemi',
  description: 'Üniversite kulüplerinin etkinlik süreçlerini dijitalleştiren yönetim paneli.',
  manifest: '/manifest.json',
};

export const viewport = {
  themeColor: '#da1c15',
};

import { RoleProvider } from '@/context/RoleContext';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import CookieBanner from '@/components/ui/CookieBanner';
import { Toaster } from 'react-hot-toast';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr" suppressHydrationWarning className={inter.className}>
      <body>
        <ThemeProvider attribute="data-theme" defaultTheme="system" enableSystem>
          <RoleProvider>
            {children}
            <CookieBanner />
            <Toaster position="bottom-right" toastOptions={{ duration: 4000, style: { background: 'var(--bg-card)', color: 'var(--text-main)', border: '1px solid var(--border-color)' } }} />
          </RoleProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
