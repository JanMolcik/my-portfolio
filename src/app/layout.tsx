import type { Metadata, Viewport } from 'next';
import { JetBrains_Mono } from 'next/font/google';
import type { ReactNode } from 'react';
import { Analytics } from '@vercel/analytics/next';
import './globals.css';

const jetBrainsMono = JetBrains_Mono({
	subsets: ['latin'],
	weight: ['400', '700', '800'],
	display: 'optional',
	variable: '--font-jetbrains-mono',
});

export const viewport: Viewport = {
	width: 'device-width',
	initialScale: 1,
	maximumScale: 5,
};

export const metadata: Metadata = {
	metadataBase: new URL(
		process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
	),
	title: {
		template: '%s | Terminal Noir',
		default: 'Terminal Noir',
	},
	description: 'Portfolio built with Next.js App Router and Storyblok.',
};

type RootLayoutProps = {
	children: ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
	return (
		<html lang="en">
			<body className={jetBrainsMono.variable}>
				{children}
				<Analytics />
			</body>
		</html>
	);
}
