import type { Metadata } from 'next';
import { Providers } from '@/components/shared/Providers';

export const metadata: Metadata = {
  title: 'NPA ECM',
  description: 'Electronic Correspondence Management System',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}