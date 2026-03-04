import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';
import StoryblokProvider from '@/components/StoryblokProvider';

export const metadata: Metadata = {
  title: 'Storyblok Next.js TypeScript Blueprint',
  description: 'Starter blueprint for Next.js App Router + Storyblok (TypeScript).',
};

type RootLayoutProps = {
  children: ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  const currentYear = new Date().getFullYear();

  return (
    <html lang="en">
      <body>
        <StoryblokProvider>{children}</StoryblokProvider>
        <footer>All rights reserved © {currentYear}</footer>
      </body>
    </html>
  );
}
