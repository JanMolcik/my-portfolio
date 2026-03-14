import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

const criticalStyleFiles = [
	'src/app/globals.css',
	'src/components/home/terminal-noir-home.module.css',
	'src/components/projects/terminal-noir-project.module.css',
	'src/components/writing/terminal-noir-writing.module.css',
];

describe('HARNESS-PERFORMANCE-001', () => {
	it('avoids render-blocking remote CSS and font imports on critical templates', async () => {
		const styles = await Promise.all(
			criticalStyleFiles.map((filePath) => readFile(filePath, 'utf8')),
		);

		for (const source of styles) {
			expect(source).not.toMatch(
				/@import\s+url\(\s*['"]https?:\/\/[^'"]+['"]\s*\)/i,
			);
			expect(source).not.toContain('https://fonts.googleapis.com');
			expect(source).not.toContain('https://a.storyblok.com');
		}
	});

	it('uses next/font in root layout and does not wrap routes with legacy client provider', async () => {
		const layout = await readFile('src/app/layout.tsx', 'utf8');
		expect(layout).toContain("from 'next/font/google'");
		expect(layout).not.toContain('StoryblokProvider');
	});

	it('avoids costly scroll-path effects on critical templates', async () => {
		const styles = await Promise.all(
			criticalStyleFiles.map((filePath) => readFile(filePath, 'utf8')),
		);

		for (const source of styles) {
			expect(source).not.toContain('scroll-behavior: smooth');
			expect(source).not.toContain('will-change: transform');
			expect(source).not.toContain('backdrop-filter: blur');
		}
	});

	it('disables automatic breadcrumb prefetch on detail routes to avoid duplicate RSC traffic', async () => {
		const detailRouteFiles = [
			'src/components/projects/terminal-noir-project.tsx',
			'src/components/writing/terminal-noir-writing.tsx',
		];
		const sources = await Promise.all(
			detailRouteFiles.map((filePath) => readFile(filePath, 'utf8')),
		);

		for (const source of sources) {
			expect(source).toContain('href="/" prefetch={false}');
			expect(source).toContain('prefetch={false}');
		}
	});
});
