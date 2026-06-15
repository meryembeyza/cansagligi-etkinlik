import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Cansağlığı Vakfı Etkinlik Yönetim Sistemi',
  description: 'Üniversite kulüplerinin etkinlik süreçlerini dijitalleştiren yönetim paneli.',
  manifest: '/manifest.json',
  themeColor: '#C0392B',
};

import { RoleProvider } from '@/context/RoleContext';
import { ThemeProvider } from '@/components/providers/ThemeProvider';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="data-theme" defaultTheme="system" enableSystem>
          <RoleProvider>
            {children}
          </RoleProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
