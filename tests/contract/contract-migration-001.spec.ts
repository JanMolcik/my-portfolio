import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import {
	mapLegacyContentfulEntries,
	mapLegacyProject,
	type LegacyContentfulEntry,
} from '@/lib/storyblok/contentful-mapping';

type ContentfulEntriesExport = {
	items?: LegacyContentfulEntry[];
};

function getContentTypeId(entry: LegacyContentfulEntry): string {
	return entry.sys?.contentType?.sys?.id ?? '';
}

async function loadEntries(): Promise<LegacyContentfulEntry[]> {
	const raw = await readFile('data/contentful-export/entries.json', 'utf8');
	const parsed = JSON.parse(raw) as ContentfulEntriesExport;
	return parsed.items ?? [];
}

describe('CONTRACT-MIGRATION-001', () => {
	it('maps about to page_home with linked project/experience/social payloads', async () => {
		const entries = await loadEntries();
		const result = mapLegacyContentfulEntries(entries);
		const about = entries.find((entry) => getContentTypeId(entry) === 'about');

		expect(about).toBeDefined();
		expect(result.home).not.toBeNull();
		expect(result.home?.content_type).toBe('page_home');
		expect(result.home?.content.component).toBe('page_home');
		expect(result.home?.content.headline).toBe(about?.fields?.name);
		expect(result.home?.content.role).toBe(about?.fields?.description);
		expect(result.home?.content.profile_image).toBeDefined();
		expect('roles' in (result.home?.content ?? {})).toBe(false);
		expect(result.home?.diagnostics).toEqual({
			missing_social_links: [],
			missing_experience: [],
			missing_projects: [],
		});

		const socialLinks = Array.isArray(about?.fields?.socialLinks)
			? about.fields.socialLinks
			: [];
		const experience = Array.isArray(about?.fields?.experience)
			? about.fields.experience
			: [];
		const projects = Array.isArray(about?.fields?.projects)
			? about.fields.projects
			: [];
		expect(result.home?.content.social_links).toHaveLength(socialLinks.length);
		expect(result.home?.content.experience).toHaveLength(experience.length);
		expect(result.home?.content.featured_projects).toHaveLength(
			projects.length,
		);
	});

	it('maps project entries to page_project stories', async () => {
		const entries = await loadEntries();
		const projectEntry = entries.find(
			(entry) => getContentTypeId(entry) === 'project',
		);

		expect(projectEntry).toBeDefined();
		const mappedProject = mapLegacyProject(
			projectEntry as LegacyContentfulEntry,
		);

		expect(mappedProject.content_type).toBe('page_project');
		expect(mappedProject.content.component).toBe('page_project');
		expect(mappedProject.content.title).toBe(projectEntry?.fields?.name);
		expect(mappedProject.content.project_url).toBe(
			projectEntry?.fields?.projectUrl,
		);
		expect(mappedProject.content.summary).toBe(
			projectEntry?.fields?.description,
		);
		expect(mappedProject.content.slug.length).toBeGreaterThan(0);
	});

	it('maps experience and socialLink entries to reusable Storyblok records', async () => {
		const entries = await loadEntries();
		const result = mapLegacyContentfulEntries(entries);
		const experienceEntries = entries.filter(
			(entry) => getContentTypeId(entry) === 'experience',
		);
		const socialLinkEntries = entries.filter(
			(entry) => getContentTypeId(entry) === 'socialLink',
		);

		expect(result.experience).toHaveLength(experienceEntries.length);
		expect(result.social_links).toHaveLength(socialLinkEntries.length);
		expect(
			result.experience.every(
				(entry) => entry.content_type === 'item_experience',
			),
		).toBe(true);
		expect(
			result.social_links.every(
				(entry) => entry.content_type === 'item_social_link',
			),
		).toBe(true);
	});
});
