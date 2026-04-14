import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

const routeFiles = [
	'src/app/page.tsx',
	'src/app/projects/[slug]/page.tsx',
	'src/app/writing/page.tsx',
	'src/app/writing/page/[page]/page.tsx',
	'src/app/writing/[slug]/page.tsx',
];

describe('INT-ROUTE-001', () => {
	it('keeps public routes static-first with ISR', async () => {
		for (const routeFile of routeFiles) {
			const source = await readFile(routeFile, 'utf8');
			expect(source).toContain("export const dynamic = 'force-static';");
			expect(source).toContain('export const revalidate = 3600;');
		}
	});

	it('keeps home route bound to terminal-noir module and Storyblok home content model', async () => {
		const homeRoute = await readFile('src/app/page.tsx', 'utf8');
		const projectRoute = await readFile(
			'src/app/projects/[slug]/page.tsx',
			'utf8',
		);
		const writingRoute = await readFile(
			'src/app/writing/[slug]/page.tsx',
			'utf8',
		);
		const writingIndexRoute = await readFile(
			'src/app/writing/page.tsx',
			'utf8',
		);
		const writingPaginatedRoute = await readFile(
			'src/app/writing/page/[page]/page.tsx',
			'utf8',
		);
		const homeComponent = await readFile(
			'src/components/home/terminal-noir-home.tsx',
			'utf8',
		);
		const writingIndexComponent = await readFile(
			'src/components/writing/terminal-noir-writing-index.tsx',
			'utf8',
		);
		const writingComponent = await readFile(
			'src/components/writing/terminal-noir-writing.tsx',
			'utf8',
		);
		const writingRichTextRenderer = await readFile(
			'src/components/writing/storyblok-rich-text-renderer.tsx',
			'utf8',
		);

		expect(homeRoute).toContain('getPublishedHomeStory');
		expect(homeRoute).toContain('buildHomePageModel');
		expect(homeRoute).toContain('TerminalNoirHome');
		expect(homeRoute).not.toContain('StoryblokStory');

		expect(homeComponent).toContain('id="hero"');
		expect(homeComponent).toContain('id="projects"');
		expect(homeComponent).toContain('id="experience"');
		expect(homeComponent).toContain('id="contact"');

		expect(projectRoute).toContain('TerminalNoirProject');
		expect(projectRoute).toContain('mapProjectDtoToDomain');
		expect(projectRoute).toContain('notFound()');
		expect(projectRoute).not.toContain('StoryblokStory');

		expect(writingRoute).toContain('TerminalNoirWriting');
		expect(writingRoute).toContain('mapWritingDtoToDomain');
		expect(writingRoute).toContain('notFound()');
		expect(writingRoute).not.toContain('StoryblokStory');

		expect(writingIndexRoute).toContain('TerminalNoirWritingIndex');
		expect(writingIndexRoute).toContain('getPublishedWritingList');
		expect(writingPaginatedRoute).toContain('getPublishedWritingPageParams');
		expect(writingPaginatedRoute).toContain("redirect('/writing')");
		expect(writingPaginatedRoute).toContain('notFound()');
		expect(writingIndexComponent).toContain(
			'data-testid="terminal-noir-writing-index"',
		);
		expect(writingIndexComponent).toContain('Writing pagination');
		expect(writingIndexComponent).not.toContain('rw-r--');

		expect(writingComponent).toContain('data-testid="terminal-noir-writing"');
		expect(writingComponent).toContain('cat article.md');
		expect(writingComponent).toContain('StoryblokRichTextRenderer');
		expect(writingComponent).not.toContain('dangerouslySetInnerHTML');
		expect(writingRichTextRenderer).not.toContain('dangerouslySetInnerHTML');
	});
});
