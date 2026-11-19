import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Verify Seal | NPA ECM',
  description: 'Check the seal record associated with an executive approval from the Nigerian Ports Authority using its serial number.',
  keywords: ['NPA', 'seal verification', 'digital seal', 'document verification', 'Nigerian Ports Authority', 'ECM'],
  openGraph: {
    title: 'Verify Seal | NPA ECM',
    description: 'Check the seal record associated with an executive approval from the Nigerian Ports Authority.',
    type: 'website',
    siteName: 'NPA ECM',
  },
  twitter: {
    card: 'summary',
    title: 'Verify Seal | NPA ECM',
    description: 'Check the seal record associated with an executive approval from the Nigerian Ports Authority.',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function VerifyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

