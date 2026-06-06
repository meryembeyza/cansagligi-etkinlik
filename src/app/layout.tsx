import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Cansağlığı Vakfı Etkinlik Yönetim Sistemi',
  description: 'Üniversite kulüplerinin etkinlik süreçlerini dijitalleştiren yönetim paneli.',
  manifest: '/manifest.json',
  themeColor: '#C0392B',
};

import { RoleProvider } from '@/context/RoleContext';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr">
      <body>
        <RoleProvider>
          {children}
        </RoleProvider>
      </body>
    </html>
  );
}
