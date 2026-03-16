import { describe, expect, it } from 'vitest';
import { buildHomePageModel } from '@/lib/storyblok/home-page';
import type {
	StoryblokResolvedRelationStory,
	StoryblokStory,
} from '@/lib/storyblok/content';

describe('UNIT-HOME-PAGE-001', () => {
	it('orders featured projects by cms portfolio priority', () => {
		const story = {
			name: 'Home',
			content: {
				headline: 'Jan Molcik',
				role: 'Frontend Engineer',
				hero_intro: { type: 'doc', content: [] },
				about_intro: { type: 'doc', content: [] },
				profile_image: {
					filename: 'https://cdn.example.com/profile.png',
				},
				roles: [],
				availability_note: 'Available',
				availability_status: 'OPEN',
				availability_timezone: 'Europe/Prague',
				availability_response_time: 'within 48h',
				social_links: [],
				featured_projects: ['project-b', 'project-a', 'project-c'],
				experience: [],
				seo: [],
			},
		} as unknown as StoryblokStory;

		const rels = [
			{
				uuid: 'project-a',
				slug: 'project-a',
				full_slug: 'projects/project-a',
				content: {
					component: 'page_project',
					title: 'Project A',
					slug: 'project-a',
					summary: 'A',
					published_date: '2026-01-01T00:00:00.000Z',
					project_url: 'https://example.com/a',
					type: 'App',
					portfolio_priority: 2,
					stack: [],
					seo: [],
				},
			},
			{
				uuid: 'project-b',
				slug: 'project-b',
				full_slug: 'projects/project-b',
				content: {
					component: 'page_project',
					title: 'Project B',
					slug: 'project-b',
					summary: 'B',
					published_date: '2026-01-01T00:00:00.000Z',
					project_url: 'https://example.com/b',
					type: 'App',
					portfolio_priority: 1,
					stack: [],
					seo: [],
				},
			},
			{
				uuid: 'project-c',
				slug: 'project-c',
				full_slug: 'projects/project-c',
				content: {
					component: 'page_project',
					title: 'Project C',
					slug: 'project-c',
					summary: 'C',
					published_date: '2026-01-01T00:00:00.000Z',
					project_url: 'https://example.com/c',
					type: 'App',
					portfolio_priority: 3,
					stack: [],
					seo: [],
				},
			},
		] as unknown as StoryblokResolvedRelationStory[];

		const model = buildHomePageModel(story, rels);

		expect(model.profileImageUrl).toBe('https://cdn.example.com/profile.png');
		expect(model.projects.map((project) => project.slug)).toEqual([
			'project-b',
			'project-a',
			'project-c',
		]);
	});
});
