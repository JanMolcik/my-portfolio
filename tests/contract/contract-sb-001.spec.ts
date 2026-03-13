import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFile } from 'node:fs/promises';

const getMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/storyblok/client', () => {
	return {
		getStoryblokApi: () => ({
			get: getMock,
		}),
	};
});

import {
	getPublishedHomeStory,
	getPublishedRouteParamsByPrefix,
	getPublishedSitemapPaths,
	getPublishedStoriesByPrefix,
	getPublishedStory,
} from '@/lib/storyblok/content';

describe('CONTRACT-SB-001', () => {
	const originalPreviewToken = process.env.STORYBLOK_PREVIEW_TOKEN;

	beforeEach(() => {
		getMock.mockReset();
		if (originalPreviewToken) {
			process.env.STORYBLOK_PREVIEW_TOKEN = originalPreviewToken;
		} else {
			delete process.env.STORYBLOK_PREVIEW_TOKEN;
		}
	});

	it('returns null on fetch failure for single-story queries', async () => {
		getMock.mockRejectedValueOnce(new Error('network error'));
		await expect(getPublishedStory('projects/alpha')).resolves.toBeNull();
	});

	it('switches to draft version with preview token when draft mode is requested', async () => {
		process.env.STORYBLOK_PREVIEW_TOKEN = 'preview-token';
		getMock.mockResolvedValueOnce({
			data: {
				story: {
					name: 'Draft Project',
					content: {
						component: 'page_project',
					},
				},
			},
		});

		await getPublishedStory('projects/alpha', 'draft');

		expect(getMock).toHaveBeenCalledWith(
			'cdn/stories/projects/alpha',
			expect.objectContaining({
				version: 'draft',
				token: 'preview-token',
			}),
		);
	});

	it('fails closed for draft requests when preview token is missing', async () => {
		delete process.env.STORYBLOK_PREVIEW_TOKEN;
		await expect(
			getPublishedStory('projects/alpha', 'draft'),
		).resolves.toBeNull();
		expect(getMock).not.toHaveBeenCalled();
	});

	it('returns published stories ordered from Storyblok list payload', async () => {
		getMock.mockResolvedValueOnce({
			data: {
				stories: [
					{ full_slug: 'projects/beta', content: {} },
					{ full_slug: 'projects/alpha', content: {} },
				],
			},
		});

		const stories = await getPublishedStoriesByPrefix('projects/');
		expect(stories).toHaveLength(2);
		expect(getMock).toHaveBeenCalledWith('cdn/stories', {
			version: 'published',
			starts_with: 'projects/',
			resolve_relations: 'page_home.featured_projects,page_home.experience',
			per_page: 100,
			sort_by: 'published_at:desc',
		});
	});

	it('normalizes static params from slug prefixes', async () => {
		getMock.mockResolvedValueOnce({
			data: {
				stories: [
					{ full_slug: 'projects/alpha', content: {} },
					{ full_slug: 'projects/beta', content: {} },
					{ full_slug: 'projects/nested/path', content: {} },
				],
			},
		});

		const params = await getPublishedRouteParamsByPrefix('projects/');
		expect(params).toEqual([{ slug: 'alpha' }, { slug: 'beta' }]);
	});

	it('fails closed when Storyblok single-story payload does not match render schema', async () => {
		const raw = await readFile(
			'tests/fixtures/storyblok/invalid-single-story-payload.json',
			'utf8',
		);
		getMock.mockResolvedValueOnce({
			data: JSON.parse(raw),
		});

		await expect(getPublishedStory('projects/invalid')).resolves.toBeNull();
	});

	it('fetches home story with resolved relation payload for terminal-noir sections', async () => {
		getMock.mockResolvedValueOnce({
			data: {
				story: {
					name: 'Home',
					content: {
						component: 'page_home',
						headline: 'Terminal Noir',
					},
				},
				rels: [
					{
						full_slug: 'projects/portfolio',
						slug: 'portfolio',
						content: {
							component: 'page_project',
							title: 'Portfolio',
						},
					},
				],
			},
		});

		const payload = await getPublishedHomeStory();
		expect(payload).not.toBeNull();
		expect(payload?.rels).toHaveLength(1);
		expect(getMock).toHaveBeenCalledWith('cdn/stories/home', {
			version: 'published',
			resolve_relations: 'page_home.featured_projects,page_home.experience',
		});
	});

	it('derives sitemap paths from Storyblok links index and excludes non-indexable links', async () => {
		getMock.mockResolvedValueOnce({
			data: {
				links: {
					home: { slug: 'home', is_folder: false, published: true },
					project: {
						slug: 'projects/alpha',
						is_folder: false,
						published: true,
					},
					writing: {
						slug: 'writing/notes',
						is_folder: false,
						published: true,
					},
					nested: {
						slug: 'projects/team/nested',
						is_folder: false,
						published: true,
					},
					folder: {
						slug: 'projects',
						is_folder: true,
						published: true,
					},
					unpublished: {
						slug: 'writing/draft',
						is_folder: false,
						published: false,
					},
				},
			},
		});

		const paths = await getPublishedSitemapPaths();
		expect(paths).toEqual(['/', '/projects/alpha', '/writing/notes']);
		expect(getMock).toHaveBeenCalledWith('cdn/links', {
			version: 'published',
			per_page: 1000,
		});
	});

	it('fails closed for sitemap path derivation when links payload is invalid', async () => {
		getMock.mockResolvedValueOnce({
			data: {
				links: [],
			},
		});

		await expect(getPublishedSitemapPaths()).resolves.toEqual([]);
	});
});
