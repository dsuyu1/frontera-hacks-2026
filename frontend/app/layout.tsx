import type { Metadata } from 'next';
import './globals.css';
import Providers from '@/components/Providers';

export const metadata: Metadata = {
  title: 'CivicWatch — RGV Local Government Feed',
  description: 'Daily feed of local government news and meeting clips for the Rio Grande Valley',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" style={{ height: '100%' }}>
      <body style={{ height: '100%', margin: 0, background: '#0d0d0d' }}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
