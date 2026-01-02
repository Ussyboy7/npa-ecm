import { Metadata } from 'next';

export const verifyPageMetadata: Metadata = {
  title: 'Verify Digital Executive Seal | NPA ECM',
  description: 'Verify the authenticity of digitally approved documents from the Nigerian Ports Authority. Enter a seal serial number or scan a QR code to verify document authenticity.',
  keywords: ['NPA', 'seal verification', 'digital seal', 'document verification', 'Nigerian Ports Authority', 'ECM'],
  openGraph: {
    title: 'Verify Digital Executive Seal | NPA ECM',
    description: 'Verify the authenticity of digitally approved documents from the Nigerian Ports Authority.',
    type: 'website',
    siteName: 'NPA ECM',
  },
  twitter: {
    card: 'summary',
    title: 'Verify Digital Executive Seal | NPA ECM',
    description: 'Verify the authenticity of digitally approved documents from the Nigerian Ports Authority.',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export function getVerifySerialMetadata(serial: string): Metadata {
  return {
    title: `Seal Verification: ${serial} | NPA ECM`,
    description: `Verify seal ${serial} from the Nigerian Ports Authority. Check the authenticity of this digitally approved document.`,
    openGraph: {
      title: `Seal Verification: ${serial} | NPA ECM`,
      description: `Verify seal ${serial} from the Nigerian Ports Authority.`,
      type: 'website',
      siteName: 'NPA ECM',
    },
    twitter: {
      card: 'summary',
      title: `Seal Verification: ${serial} | NPA ECM`,
      description: `Verify seal ${serial} from the Nigerian Ports Authority.`,
    },
    robots: {
      index: false, // Don't index individual verification pages
      follow: true,
    },
  };
}

