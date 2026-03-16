import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import {
	buildStoryblokBaselineImportBundle,
	type LegacyContentfulAsset,
	type StoryblokBaselineImportBundle,
} from '@/lib/storyblok/contentful-import';
import type { LegacyContentfulEntry } from '@/lib/storyblok/contentful-mapping';

const SPACE_ID = '290927119725014';
const ENTRIES_PATH = 'data/contentful-export/entries.json';
const ASSETS_PATH = 'data/contentful-export/assets.json';
const META_PATH = 'data/contentful-export/meta.json';
const IMPORT_PATH = `data/storyblok/imports/${SPACE_ID}/baseline-content-import-v1.json`;

type EntriesExport = {
	items?: LegacyContentfulEntry[];
};

type AssetsExport = {
	items?: LegacyContentfulAsset[];
};

type MetaExport = {
	exportedAt?: string;
};

async function loadBundleFromFixtures(): Promise<StoryblokBaselineImportBundle> {
	const [entriesRaw, assetsRaw, metaRaw] = await Promise.all([
		readFile(ENTRIES_PATH, 'utf8'),
		readFile(ASSETS_PATH, 'utf8'),
		readFile(META_PATH, 'utf8'),
	]);

	const entries = JSON.parse(entriesRaw) as EntriesExport;
	const assets = JSON.parse(assetsRaw) as AssetsExport;
	const meta = JSON.parse(metaRaw) as MetaExport;

	return buildStoryblokBaselineImportBundle({
		entries: entries.items ?? [],
		assets: assets.items ?? [],
		exportedAt: meta.exportedAt,
	});
}

describe('CONTRACT-IMPORT-001', () => {
	it('keeps baseline Storyblok import artifact deterministic against Contentful export fixtures', async () => {
		const expectedBundle = await loadBundleFromFixtures();
		const actualRaw = await readFile(IMPORT_PATH, 'utf8');
		const actualBundle = JSON.parse(actualRaw) as StoryblokBaselineImportBundle;

		expect(actualBundle).toEqual(expectedBundle);
	});

	it('keeps full baseline content populated with linked assets', async () => {
		const bundle = await loadBundleFromFixtures();

		expect(bundle.summary).toEqual({
			home_count: 1,
			project_count: 10,
			experience_count: 6,
			social_link_count: 3,
		});
		expect(bundle.diagnostics.missing_asset_ids).toEqual([]);
		expect(bundle.content.home).not.toBeNull();
		expect(bundle.content.home?.content.social_links.length).toBe(3);
		expect(bundle.content.home?.content.featured_projects.length).toBe(10);
		expect(bundle.content.home?.content.experience.length).toBe(6);
		expect(bundle.content.home?.content.profile_image?.url).toMatch(
			/^https:\/\//,
		);
		expect(bundle.content.home?.content.tech_stack).toEqual({
			plugin: 'storyblok-tags',
			value: [
				'React',
				'Next.js',
				'TypeScript',
				'Angular',
				'Redux',
				'RxJS',
				'Frontend Architecture',
				'Design Systems',
				'Responsive UI',
				'State Management',
				'SSR / SSG / ISR',
				'Vercel',
				'Storyblok',
				'Monorepo',
			],
		});
		expect('roles' in (bundle.content.home?.content ?? {})).toBe(false);
		expect(bundle.content.projects).toHaveLength(10);
		expect(bundle.content.experience).toHaveLength(6);
		expect(bundle.content.social_links).toHaveLength(3);
		expect(
			bundle.content.projects.find(
				(project) => project.slug === 'shopsys-platform-core',
			)?.content.project_url,
		).toBe('https://www.shopsys.cz/');
		expect(
			bundle.content.projects.find((project) => project.slug === 'qapline')
				?.content.portfolio_priority,
		).toBe(3);
		expect(
			bundle.content.projects.find(
				(project) => project.slug === 'bitcoin-wallet',
			)?.content.project_url,
		).toBe('');
		expect(
			bundle.content.projects.find(
				(project) => project.slug === 'bitcoin-wallet',
			)?.content.portfolio_priority,
		).toBe(4);
		expect(
			bundle.content.projects.find(
				(project) => project.slug === 'abugo-brand-platform-migration',
			)?.content.project_url,
		).toBe('');
		expect(
			bundle.content.projects.find(
				(project) => project.slug === 'poohead-card-game',
			)?.content.project_url,
		).toBe('');

		expect(
			bundle.content.projects
				.map((project) => project.content.logo?.url)
				.filter((url): url is string => typeof url === 'string')
				.every((url) => url.startsWith('https://')),
		).toBe(true);
		expect(
			bundle.content.experience
				.map((item) => item.content.image?.url)
				.filter((url): url is string => typeof url === 'string')
				.every((url) => url.startsWith('https://')),
		).toBe(true);
		expect(
			bundle.content.home?.content.seo.every((meta) => {
				if (!meta.og_image) {
					return true;
				}
				return meta.og_image.url.startsWith('https://');
			}) ?? false,
		).toBe(true);
	});
});
