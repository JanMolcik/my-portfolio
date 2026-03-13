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
	applicationName: 'Jan Molcik | Terminal Noir',
	manifest: '/site.webmanifest',
	title: {
		template: '%s | Terminal Noir',
		default: 'Terminal Noir',
	},
	description: 'Portfolio built with Next.js App Router and Storyblok.',
	icons: {
		icon: [
			{ url: '/favicon.ico', sizes: '16x16 32x32', type: 'image/x-icon' },
			{ url: '/icon.svg', type: 'image/svg+xml' },
			{ url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
			{ url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
			{ url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
		],
		shortcut: [
			{ url: '/favicon.ico', type: 'image/x-icon' },
		],
		apple: [
			{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
		],
	},
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
