import { describe, expect, it } from 'vitest';
import {
	mapExperienceDtoToDomain,
	mapHomeDtoToDomain,
	mapProjectDtoToDomain,
	mapSeoDtoToDomain,
	mapSocialDtoToDomain,
	mapWritingDtoToDomain,
} from '@/lib/storyblok/mappers';

describe('UNIT-MAP-001', () => {
	it('maps seo DTO blocks to domain values', () => {
		const seo = mapSeoDtoToDomain([
			{
				meta_title: 'Home',
				meta_description: 'Portfolio intro',
				canonical_url: 'https://example.com',
				og_image: { filename: 'https://cdn.example.com/og.png' },
				noindex: true,
			},
		]);

		expect(seo).toEqual({
			metaTitle: 'Home',
			metaDescription: 'Portfolio intro',
			canonicalUrl: 'https://example.com',
			ogImageUrl: 'https://cdn.example.com/og.png',
			noindex: true,
		});
	});

	it('maps social DTO blocks to domain values', () => {
		const social = mapSocialDtoToDomain({
			name: 'GitHub',
			url: 'https://github.com/acme',
			icon: 'github',
		});

		expect(social).toEqual({
			name: 'GitHub',
			url: 'https://github.com/acme',
			icon: 'github',
		});
	});

	it('maps experience DTO blocks to domain values', () => {
		const experience = mapExperienceDtoToDomain({
			title: 'Staff Engineer',
			company_name: 'ACME',
			description: {
				type: 'doc',
				content: [],
			},
			start_date: '2024-01-01',
			end_date: '2025-01-01',
			skills: ['TypeScript', 'Next.js'],
			image: { src: 'https://cdn.example.com/acme.png' },
		});

		expect(experience).toEqual({
			title: 'Staff Engineer',
			companyName: 'ACME',
			description: {
				type: 'doc',
				content: [],
			},
			startDate: '2024-01-01',
			endDate: '2025-01-01',
			skills: ['TypeScript', 'Next.js'],
			imageUrl: 'https://cdn.example.com/acme.png',
		});
	});

	it('maps project DTO blocks to domain values', () => {
		const project = mapProjectDtoToDomain(
			{
				title: 'Portfolio',
				summary: 'New portfolio stack.',
				content: {
					type: 'doc',
					content: [],
				},
				published_date: '2026-01-01',
				project_url: 'https://example.com',
				repository_url: 'https://github.com/acme/portfolio',
				type: 'web',
				portfolio_priority: 3,
				logo: { filename: 'https://cdn.example.com/logo.png' },
				seo: [
					{
						meta_title: 'Portfolio project',
						meta_description: 'Project details',
						noindex: false,
					},
				],
			},
			'portfolio',
		);

		expect(project).toEqual({
			title: 'Portfolio',
			slug: 'portfolio',
			summary: 'New portfolio stack.',
			content: {
				type: 'doc',
				content: [],
			},
			publishedDate: '2026-01-01',
			projectUrl: 'https://example.com',
			repositoryUrl: 'https://github.com/acme/portfolio',
			type: 'web',
			portfolioPriority: 3,
			logoUrl: 'https://cdn.example.com/logo.png',
			stack: [],
			seo: {
				metaTitle: 'Portfolio project',
				metaDescription: 'Project details',
				noindex: false,
			},
		});
	});

	it('maps project media URLs from Storyblok asset url fields', () => {
		const project = mapProjectDtoToDomain(
			{
				title: 'Media Test',
				summary: 'Checks url-based logo field mapping.',
				published_date: '2026-01-01',
				project_url: 'https://example.com/media-test',
				type: 'web',
				logo: {
					url: 'https://cdn.example.com/media-test-logo.png',
				},
				seo: [
					{
						meta_title: 'Media Test',
						meta_description: 'Media logo mapping',
					},
				],
			},
			'media-test',
		);

		expect(project.logoUrl).toBe('https://cdn.example.com/media-test-logo.png');
	});

	it('maps writing DTO blocks to domain values', () => {
		const writing = mapWritingDtoToDomain(
			{
				title: 'Notes',
				excerpt: 'A short summary.',
				content: {
					type: 'doc',
					content: [],
				},
				published_date: '2026-02-01',
				cover_image: 'https://cdn.example.com/cover.png',
				tags: 'ai, engineering',
				seo: [
					{
						meta_title: 'Writing notes',
						meta_description: 'Writing details',
					},
				],
			},
			'notes',
		);

		expect(writing).toEqual({
			title: 'Notes',
			slug: 'notes',
			excerpt: 'A short summary.',
			content: {
				type: 'doc',
				content: [],
			},
			publishedDate: '2026-02-01',
			coverImageUrl: 'https://cdn.example.com/cover.png',
			tags: ['ai', 'engineering'],
			seo: {
				metaTitle: 'Writing notes',
				metaDescription: 'Writing details',
				noindex: false,
			},
		});
	});

	it('maps home DTO blocks to domain values', () => {
		const home = mapHomeDtoToDomain({
			headline: 'Hello',
			role: 'Engineer',
			hero_intro: {
				type: 'doc',
				content: [],
			},
			about_intro: {
				type: 'doc',
				content: [],
			},
			roles: ['Engineer', 'Writer'],
			social_links: [
				{
					name: 'GitHub',
					url: 'https://github.com/acme',
					icon: 'github',
				},
			],
			featured_projects: [{ full_slug: 'projects/portfolio' }],
			experience: [{ uuid: 'exp-1' }],
			seo: [
				{
					meta_title: 'Home',
					meta_description: 'Home page',
				},
			],
		});

		expect(home).toEqual({
			headline: 'Hello',
			role: 'Engineer',
			heroIntro: {
				type: 'doc',
				content: [],
			},
			aboutIntro: {
				type: 'doc',
				content: [],
			},
			roles: ['Engineer', 'Writer'],
			availabilityNote:
				'Available for senior frontend roles, contract work, and product-focused collaborations.',
			availabilityStatus: 'OPEN',
			availabilityTimezone: 'Europe',
			availabilityResponseTime: 'within 48h',
			socialLinks: [
				{
					name: 'GitHub',
					url: 'https://github.com/acme',
					icon: 'github',
				},
			],
			featuredProjectRefs: ['projects/portfolio'],
			experienceRefs: ['exp-1'],
			seo: {
				metaTitle: 'Home',
				metaDescription: 'Home page',
				noindex: false,
			},
		});
	});
});
