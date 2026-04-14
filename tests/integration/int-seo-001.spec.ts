import { describe, expect, it } from 'vitest';
import {
	buildHomeJsonLd,
	buildProjectJsonLd,
	buildWritingJsonLd,
	serializeJsonLd,
} from '@/lib/seo/json-ld';
import { buildRouteMetadata, buildStoryMetadata } from '@/lib/seo/metadata';
import type { HomePageModel } from '@/lib/storyblok/home-page';
import type { ProjectDomain, WritingDomain } from '@/lib/storyblok/mappers';
import type { StoryblokStory } from '@/lib/storyblok/content';

describe('INT-SEO-001', () => {
	it('uses deterministic fallback SEO values when fields are missing', () => {
		const previous = process.env.NEXT_PUBLIC_SITE_URL;
		process.env.NEXT_PUBLIC_SITE_URL = 'https://example.com';

		const story = {
			name: 'Project Alpha',
			content: {},
		} as StoryblokStory;

		const metadata = buildStoryMetadata(story, '/projects/project-alpha');
		expect(metadata.title).toBe('Project Alpha | Project');
		expect(metadata.description).toBe('Project page for Project Alpha.');
		expect(metadata.alternates?.canonical).toBe(
			'https://example.com/projects/project-alpha',
		);
		expect(metadata.openGraph?.images).toEqual([
			{ url: 'https://example.com/favicon.ico' },
		]);

		process.env.NEXT_PUBLIC_SITE_URL = previous;
	});

	it('includes all required metadata fields when SEO block is populated', () => {
		const previous = process.env.NEXT_PUBLIC_SITE_URL;
		process.env.NEXT_PUBLIC_SITE_URL = 'https://example.com';

		const story = {
			name: 'Test Story',
			content: {
				seo: [
					{
						meta_title: 'Custom Title',
						meta_description: 'Custom description',
						canonical_url: 'https://example.com/custom',
						og_image: { filename: 'https://cdn.example.com/img.jpg' },
					},
				],
			},
		} as StoryblokStory;

		const metadata = buildStoryMetadata(story, '/projects/test');

		expect(metadata.title).toBe('Custom Title');
		expect(metadata.description).toBe('Custom description');
		expect(metadata.alternates?.canonical).toBe('https://example.com/custom');
		const og = metadata.openGraph as {
			title?: string;
			description?: string;
			url?: string;
			type?: string;
			images?: Array<{ url: string }>;
		};
		expect(og.title).toBe('Custom Title');
		expect(og.description).toBe('Custom description');
		expect(og.url).toBe('https://example.com/custom');
		expect(og.type).toBe('website');
		expect(og.images).toEqual([{ url: 'https://cdn.example.com/img.jpg' }]);

		process.env.NEXT_PUBLIC_SITE_URL = previous;
	});

	it('uses article OG type for writing pages', () => {
		const previous = process.env.NEXT_PUBLIC_SITE_URL;
		process.env.NEXT_PUBLIC_SITE_URL = 'https://example.com';

		const story = {
			name: 'My Article',
			content: {},
		} as StoryblokStory;

		const metadata = buildStoryMetadata(
			story,
			'/writing/my-article',
			'article',
		);
		const og = metadata.openGraph as { type?: string };
		expect(og.type).toBe('article');

		process.env.NEXT_PUBLIC_SITE_URL = previous;
	});

	it('builds deterministic metadata for writing index and paginated routes', () => {
		const previous = process.env.NEXT_PUBLIC_SITE_URL;
		process.env.NEXT_PUBLIC_SITE_URL = 'https://example.com';

		const indexMetadata = buildRouteMetadata({
			title: 'Writing / notes',
			description: 'Engineering notes.',
			path: '/writing',
		});
		const paginatedMetadata = buildRouteMetadata({
			title: 'Writing / notes — page 2',
			description: 'Engineering notes page 2.',
			path: '/writing/page/2',
		});

		expect(indexMetadata.alternates?.canonical).toBe(
			'https://example.com/writing',
		);
		expect(paginatedMetadata.alternates?.canonical).toBe(
			'https://example.com/writing/page/2',
		);
		expect(indexMetadata.openGraph).toMatchObject({
			url: 'https://example.com/writing',
			type: 'website',
		});

		process.env.NEXT_PUBLIC_SITE_URL = previous;
	});

	it('keeps fallback title and description unique across indexable route families', () => {
		const previous = process.env.NEXT_PUBLIC_SITE_URL;
		process.env.NEXT_PUBLIC_SITE_URL = 'https://example.com';

		const story = {
			name: 'Shared Entry',
			content: {},
		} as StoryblokStory;

		const metadataByRoute = [
			buildStoryMetadata(story, '/'),
			buildStoryMetadata(story, '/projects/shared-entry'),
			buildStoryMetadata(story, '/writing/shared-entry'),
		];

		const titles = metadataByRoute.map((metadata) => metadata.title);
		const descriptions = metadataByRoute.map(
			(metadata) => metadata.description,
		);
		expect(new Set(titles).size).toBe(3);
		expect(new Set(descriptions).size).toBe(3);

		process.env.NEXT_PUBLIC_SITE_URL = previous;
	});

	it('builds home JSON-LD with deterministic canonical URL and profile links', () => {
		const previous = process.env.NEXT_PUBLIC_SITE_URL;
		process.env.NEXT_PUBLIC_SITE_URL = 'https://example.com/';

		const homeModel: HomePageModel = {
			headline: 'Alex Doe',
			role: 'Frontend Engineer',
			heroParagraphs: [],
			aboutParagraphs: [],
			techStack: ['TypeScript', 'Next.js'],
			contactIntro: 'Available for frontend work.',
			contactStatus: 'OPEN',
			contactTimezone: 'Europe',
			contactResponseTime: 'within 48h',
			socialLinks: [
				{ name: 'GitHub', url: 'https://github.com/alex', icon: 'github' },
			],
			projects: [],
			experience: [],
		};

		const jsonLd = buildHomeJsonLd(homeModel);
		expect(jsonLd).toMatchObject({
			'@context': 'https://schema.org',
			'@type': 'Person',
			name: 'Alex Doe',
			url: 'https://example.com/',
			knowsAbout: ['TypeScript', 'Next.js'],
		});
		expect(jsonLd.sameAs).toEqual(['https://github.com/alex']);

		process.env.NEXT_PUBLIC_SITE_URL = previous;
	});

	it('builds project and writing JSON-LD via central seo helper', () => {
		const previous = process.env.NEXT_PUBLIC_SITE_URL;
		process.env.NEXT_PUBLIC_SITE_URL = 'https://example.com';

		const project: ProjectDomain = {
			title: 'Project Alpha',
			slug: 'project-alpha',
			summary: 'Project summary',
			publishedDate: '2025-02-14T00:00:00.000Z',
			projectUrl: 'https://project.example.com',
			repositoryUrl: 'https://github.com/example/project-alpha',
			type: 'Web App',
			stack: ['Next.js'],
			seo: {
				metaTitle: '',
				metaDescription: 'Project SEO description',
				canonicalUrl: '',
				noindex: false,
			},
		};

		const writing: WritingDomain = {
			title: 'Writing Note',
			slug: 'writing-note',
			excerpt: 'Writing excerpt',
			content: { type: 'doc', content: [] },
			publishedDate: '2025-02-15T00:00:00.000Z',
			updatedDate: '2025-03-15T00:00:00.000Z',
			coverImageUrl: 'https://cdn.example.com/writing.png',
			tags: ['seo', 'nextjs'],
			featured: false,
			seo: {
				metaTitle: '',
				metaDescription: 'Writing SEO description',
				canonicalUrl: '',
				noindex: false,
			},
		};

		const projectJsonLd = buildProjectJsonLd(project);
		const writingJsonLd = buildWritingJsonLd(writing);

		expect(projectJsonLd).toMatchObject({
			'@type': 'CreativeWork',
			url: 'https://example.com/projects/project-alpha',
		});
		expect(writingJsonLd).toMatchObject({
			'@type': 'Article',
			url: 'https://example.com/writing/writing-note',
			dateModified: '2025-03-15T00:00:00.000Z',
			image: 'https://cdn.example.com/writing.png',
			keywords: ['seo', 'nextjs'],
			author: {
				'@type': 'Person',
				name: 'Jan Molcik',
			},
			publisher: {
				'@type': 'Person',
				name: 'Jan Molcik',
			},
		});

		process.env.NEXT_PUBLIC_SITE_URL = previous;
	});

	it('serializes JSON-LD safely for script embedding', () => {
		const payload = {
			'@context': 'https://schema.org',
			'@type': 'Thing',
			name: '</script><section>',
		};
		const serialized = serializeJsonLd(payload);

		expect(serialized).toContain('\\u003c/script>');
		expect(serialized).toContain('\\u003csection>');
		expect(serialized).not.toContain('</script>');
	});
});
