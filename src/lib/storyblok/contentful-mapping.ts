export type LegacyContentType =
	| 'about'
	| 'project'
	| 'experience'
	| 'socialLink';

export type ContentfulLink = {
	sys?: {
		type?: string;
		linkType?: string;
		id?: string;
	};
};

export type LegacyContentfulEntry = {
	sys?: {
		id?: string;
		contentType?: {
			sys?: {
				id?: string;
			};
		};
	};
	fields?: Record<string, unknown>;
};

export type StoryblokRichText = {
	type: 'doc';
	content: Array<{
		type: 'paragraph';
		content?: Array<{
			type: 'text';
			text: string;
		}>;
	}>;
};

export type StoryblokSeoMeta = {
	component: 'seo_meta';
	meta_title: string;
	meta_description: string;
	noindex: false;
	canonical_url?: string;
	og_image?: string;
};

export type StoryblokSocialLinkRecord = {
	source_entry_id: string;
	relation_key: string;
	content_type: 'item_social_link';
	content: {
		component: 'item_social_link';
		name: string;
		url: string;
		icon: string;
	};
};

export type StoryblokExperienceRecord = {
	source_entry_id: string;
	relation_key: string;
	content_type: 'item_experience';
	content: {
		component: 'item_experience';
		title: string;
		company_name: string;
		description: StoryblokRichText;
		start_date: string;
		end_date?: string;
		skills: string[];
		image?: string;
	};
};

export type StoryblokProjectStory = {
	source_entry_id: string;
	relation_key: string;
	content_type: 'page_project';
	slug: string;
	content: {
		component: 'page_project';
		title: string;
		slug: string;
		summary: string;
		content: StoryblokRichText;
		published_date: string;
		project_url: string;
		repository_url?: string;
		type: string;
		portfolio_priority?: number;
		stack: string[];
		logo?: string;
		seo: StoryblokSeoMeta[];
	};
};

export type StoryblokHomeStory = {
	source_entry_id: string;
	content_type: 'page_home';
	slug: 'home';
	content: {
		component: 'page_home';
		headline: string;
		role: string;
		hero_intro: StoryblokRichText;
		about_intro: StoryblokRichText;
		profile_image?: string;
		roles: string[];
		availability_note: string;
		availability_status: string;
		availability_timezone: string;
		availability_response_time: string;
		social_links: StoryblokSocialLinkRecord['content'][];
		featured_projects: string[];
		experience: string[];
		seo: StoryblokSeoMeta[];
	};
	diagnostics: {
		missing_social_links: string[];
		missing_experience: string[];
		missing_projects: string[];
	};
};

export type LegacyContentfulMappingResult = {
	home: StoryblokHomeStory | null;
	projects: StoryblokProjectStory[];
	experience: StoryblokExperienceRecord[];
	social_links: StoryblokSocialLinkRecord[];
};

function asRecord(value: unknown): Record<string, unknown> {
	if (!value || typeof value !== 'object' || Array.isArray(value)) {
		return {};
	}
	return value as Record<string, unknown>;
}

function getEntryId(entry: LegacyContentfulEntry): string {
	return entry.sys?.id ?? 'unknown';
}

function getContentTypeId(entry: LegacyContentfulEntry): string {
	return entry.sys?.contentType?.sys?.id ?? '';
}

function getFields(entry: LegacyContentfulEntry): Record<string, unknown> {
	return asRecord(entry.fields);
}

function getString(
	fields: Record<string, unknown>,
	key: string,
	fallback: string,
): string {
	const value = fields[key];
	if (typeof value !== 'string') {
		return fallback;
	}
	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : fallback;
}

function getStringArray(
	fields: Record<string, unknown>,
	key: string,
): string[] {
	const value = fields[key];
	if (!Array.isArray(value)) {
		return [];
	}
	return value
		.filter((item): item is string => typeof item === 'string')
		.map((item) => item.trim())
		.filter((item) => item.length > 0);
}

function getLinkIds(fields: Record<string, unknown>, key: string): string[] {
	const value = fields[key];
	if (!Array.isArray(value)) {
		return [];
	}
	return value
		.map((item) => {
			const link = asRecord(item) as ContentfulLink;
			const linkId = link.sys?.id;
			return typeof linkId === 'string' ? linkId : '';
		})
		.filter((linkId) => linkId.length > 0);
}

function getAssetId(
	fields: Record<string, unknown>,
	key: string,
): string | undefined {
	const value = asRecord(fields[key]);
	const sys = asRecord(value.sys);
	const assetId = sys.id;
	if (typeof assetId !== 'string' || assetId.length === 0) {
		return undefined;
	}
	return assetId;
}

function toRichText(value: string): StoryblokRichText {
	if (value.length === 0) {
		return {
			type: 'doc',
			content: [{ type: 'paragraph' }],
		};
	}

	return {
		type: 'doc',
		content: [
			{
				type: 'paragraph',
				content: [{ type: 'text', text: value }],
			},
		],
	};
}

function normalizeDate(value: string): string {
	const parsed = new Date(value);
	if (Number.isNaN(parsed.getTime())) {
		return value;
	}
	return parsed.toISOString();
}

function toSlug(value: string, fallback: string): string {
	const normalized = value
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
	if (normalized.length > 0) {
		return normalized;
	}
	return `legacy-${fallback.toLowerCase()}`;
}

function toRelationKey(
	kind: 'project' | 'experience' | 'socialLink',
	id: string,
) {
	return `legacy:${kind}:${id}`;
}

function normalizeDescription(value: string): string {
	const normalized = value.replace(/\s+/g, ' ').trim();
	if (normalized.length <= 160) {
		return normalized;
	}
	return `${normalized.slice(0, 157)}...`;
}

function toSeoMeta(input: {
	title: string;
	description: string;
	assetId?: string;
}): StoryblokSeoMeta {
	return {
		component: 'seo_meta',
		meta_title: input.title,
		meta_description: normalizeDescription(input.description),
		noindex: false,
		og_image: input.assetId,
	};
}

export function mapLegacySocialLink(
	entry: LegacyContentfulEntry,
): StoryblokSocialLinkRecord {
	const fields = getFields(entry);
	const sourceId = getEntryId(entry);
	const name = getString(fields, 'name', `Legacy social ${sourceId}`);
	const url = getString(fields, 'url', '');
	const icon = getString(fields, 'fontAwesomeIcon', 'link');

	return {
		source_entry_id: sourceId,
		relation_key: toRelationKey('socialLink', sourceId),
		content_type: 'item_social_link',
		content: {
			component: 'item_social_link',
			name,
			url,
			icon,
		},
	};
}

export function mapLegacyExperience(
	entry: LegacyContentfulEntry,
): StoryblokExperienceRecord {
	const fields = getFields(entry);
	const sourceId = getEntryId(entry);
	const title = getString(fields, 'title', `Legacy experience ${sourceId}`);
	const companyName = getString(fields, 'companyName', title);
	const description = getString(fields, 'description', title);
	const startDate = getString(fields, 'startDate', '1970-01-01T00:00:00.000Z');
	const endDate = getString(fields, 'endDate', '');
	const skills = getStringArray(fields, 'skills');
	const image = getAssetId(fields, 'image');

	return {
		source_entry_id: sourceId,
		relation_key: toRelationKey('experience', sourceId),
		content_type: 'item_experience',
		content: {
			component: 'item_experience',
			title,
			company_name: companyName,
			description: toRichText(description),
			start_date: normalizeDate(startDate),
			end_date: endDate.length > 0 ? normalizeDate(endDate) : undefined,
			skills,
			image,
		},
	};
}

export function mapLegacyProject(
	entry: LegacyContentfulEntry,
): StoryblokProjectStory {
	const fields = getFields(entry);
	const sourceId = getEntryId(entry);
	const title = getString(fields, 'name', `Legacy project ${sourceId}`);
	const summary = getString(fields, 'description', title);
	const projectUrl = getString(fields, 'projectUrl', '');
	const repositoryUrl = getString(fields, 'repositoryUrl', '');
	const projectType = getString(fields, 'type', 'Unknown');
	const publishedDate = getString(
		fields,
		'publishedDate',
		'1970-01-01T00:00:00.000Z',
	);
	const logo = getAssetId(fields, 'logo');
	const slug = toSlug(title, sourceId);
	const seoMeta = toSeoMeta({
		title,
		description: summary,
		assetId: logo,
	});

	return {
		source_entry_id: sourceId,
		relation_key: toRelationKey('project', sourceId),
		content_type: 'page_project',
		slug,
		content: {
			component: 'page_project',
			title,
			slug,
			summary,
			content: toRichText(summary),
			published_date: normalizeDate(publishedDate),
			project_url: projectUrl,
			repository_url: repositoryUrl.length > 0 ? repositoryUrl : undefined,
			type: projectType,
			portfolio_priority: 999,
			stack: [],
			logo,
			seo: [seoMeta],
		},
	};
}

export function mapLegacyAboutToHome(
	entry: LegacyContentfulEntry,
	ctx: {
		projectsById: Map<string, StoryblokProjectStory>;
		experienceById: Map<string, StoryblokExperienceRecord>;
		socialLinksById: Map<string, StoryblokSocialLinkRecord>;
	},
): StoryblokHomeStory {
	const fields = getFields(entry);
	const sourceId = getEntryId(entry);
	const headline = getString(fields, 'name', 'Home');
	const role = getString(fields, 'description', headline);
	const aboutMe = getString(fields, 'aboutMe', role);
	const profileImage = getAssetId(fields, 'profile');
	const roleList = getStringArray(fields, 'roles');
	const socialIds = getLinkIds(fields, 'socialLinks');
	const experienceIds = getLinkIds(fields, 'experience');
	const projectIds = getLinkIds(fields, 'projects');

	const missing_social_links = socialIds.filter(
		(linkId) => !ctx.socialLinksById.has(linkId),
	);
	const missing_experience = experienceIds.filter(
		(linkId) => !ctx.experienceById.has(linkId),
	);
	const missing_projects = projectIds.filter(
		(linkId) => !ctx.projectsById.has(linkId),
	);

	const socialLinks = socialIds
		.map((linkId) => ctx.socialLinksById.get(linkId))
		.filter((record): record is StoryblokSocialLinkRecord => Boolean(record))
		.map((record) => record.content);
	const featuredProjects = projectIds
		.map((linkId) => ctx.projectsById.get(linkId))
		.filter((record): record is StoryblokProjectStory => Boolean(record))
		.map((record) => record.relation_key);
	const experience = experienceIds
		.map((linkId) => ctx.experienceById.get(linkId))
		.filter((record): record is StoryblokExperienceRecord => Boolean(record))
		.map((record) => record.relation_key);

	const seoMeta = toSeoMeta({
		title: headline,
		description: aboutMe,
		assetId: getAssetId(fields, 'profile'),
	});

	return {
		source_entry_id: sourceId,
		content_type: 'page_home',
		slug: 'home',
		content: {
			component: 'page_home',
			headline,
			role,
			hero_intro: toRichText(aboutMe),
			about_intro: toRichText(aboutMe),
			profile_image: profileImage,
			roles: roleList,
			availability_note:
				'Available for senior frontend roles, contract work, and product-focused collaborations.',
			availability_status: 'OPEN',
			availability_timezone: 'Europe',
			availability_response_time: 'within 48h',
			social_links: socialLinks,
			featured_projects: featuredProjects,
			experience,
			seo: [seoMeta],
		},
		diagnostics: {
			missing_social_links,
			missing_experience,
			missing_projects,
		},
	};
}

export function mapLegacyContentfulEntries(
	entries: LegacyContentfulEntry[],
): LegacyContentfulMappingResult {
	const projects = entries
		.filter((entry) => getContentTypeId(entry) === 'project')
		.map((entry) => mapLegacyProject(entry));
	const experience = entries
		.filter((entry) => getContentTypeId(entry) === 'experience')
		.map((entry) => mapLegacyExperience(entry));
	const social_links = entries
		.filter((entry) => getContentTypeId(entry) === 'socialLink')
		.map((entry) => mapLegacySocialLink(entry));

	const projectsById = new Map(
		projects.map((record) => [record.source_entry_id, record]),
	);
	const experienceById = new Map(
		experience.map((record) => [record.source_entry_id, record]),
	);
	const socialLinksById = new Map(
		social_links.map((record) => [record.source_entry_id, record]),
	);

	const aboutEntry = entries.find(
		(entry) => getContentTypeId(entry) === 'about',
	);
	const home = aboutEntry
		? mapLegacyAboutToHome(aboutEntry, {
				projectsById,
				experienceById,
				socialLinksById,
			})
		: null;

	return {
		home,
		projects,
		experience,
		social_links,
	};
}
