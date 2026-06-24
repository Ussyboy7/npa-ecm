import type { Metadata, Viewport } from 'next';
import { Providers } from '@/components/shared/Providers';
import { fetchBootstrap } from '@/lib/server-bootstrap';
import './globals.css';

export const metadata: Metadata = {
  title: 'NPA ECM',
  description: 'Electronic Correspondence Management System',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const bootstrap = await fetchBootstrap();

  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans antialiased">
        <Providers
          initialOrgData={bootstrap}
          initialSidebarCounts={bootstrap?.sidebarCounts ?? null}
        >
          {children}
        </Providers>
      </body>
    </html>
  );
}
