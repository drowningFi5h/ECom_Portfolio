import type { Metadata } from 'next';
import { Plus_Jakarta_Sans, DM_Serif_Display, DM_Sans } from 'next/font/google';
import './globals.css';

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-jakarta',
  display: 'swap',
  weight: ['400', '500', '600', '700', '800'],
});

const dmSerifDisplay = DM_Serif_Display({
  subsets: ['latin'],
  weight: ['400'],
  style: ['normal', 'italic'],
  variable: '--font-dm-serif',
  display: 'swap',
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-dm-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Rahul Business Services | Amazon Marketplace Growth Partner',
  description: 'A professional marketplace services landing page for Amazon seller operations, eCommerce support, digital engineering, creative production, and marketing.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${jakarta.variable} ${dmSerifDisplay.variable} ${dmSans.variable}`}>
      <head>
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body>{children}</body>
    </html>
  );
}
