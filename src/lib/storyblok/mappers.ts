export type RichTextDomain = {
	type: string;
	content?: unknown[];
};

export type SeoDomain = {
	metaTitle: string;
	metaDescription: string;
	canonicalUrl?: string;
	ogImageUrl?: string;
	noindex: boolean;
};

export type SocialDomain = {
	name: string;
	url: string;
	icon: string;
};

export type ExperienceDomain = {
	title: string;
	companyName: string;
	description: RichTextDomain;
	startDate: string;
	endDate?: string;
	skills: string[];
	imageUrl?: string;
};

export type ProjectDomain = {
	title: string;
	slug: string;
	summary: string;
	content?: RichTextDomain;
	publishedDate: string;
	projectUrl: string;
	repositoryUrl?: string;
	type: string;
	portfolioPriority?: number;
	logoUrl?: string;
	seo: SeoDomain;
	stack: string[];
};

export type WritingDomain = {
	title: string;
	slug: string;
	excerpt: string;
	content: RichTextDomain;
	publishedDate: string;
	coverImageUrl?: string;
	tags: string[];
	seo: SeoDomain;
};

export type HomeDomain = {
	headline: string;
	role: string;
	heroIntro: RichTextDomain;
	aboutIntro: RichTextDomain;
	profileImageUrl?: string;
	availabilityNote: string;
	availabilityStatus: string;
	availabilityTimezone: string;
	availabilityResponseTime: string;
	socialLinks: SocialDomain[];
	featuredProjectRefs: string[];
	experienceRefs: string[];
	seo: SeoDomain;
};

const EMPTY_RICH_TEXT: RichTextDomain = {
	type: 'doc',
	content: [],
};

function asRecord(value: unknown): Record<string, unknown> {
	if (!value || typeof value !== 'object' || Array.isArray(value)) {
		return {};
	}
	return value as Record<string, unknown>;
}

function asString(value: unknown): string | undefined {
	if (typeof value !== 'string') {
		return undefined;
	}
	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : undefined;
}

function asBoolean(value: unknown, fallback: boolean): boolean {
	if (typeof value === 'boolean') {
		return value;
	}
	return fallback;
}

function asNumber(value: unknown): number | undefined {
	if (typeof value === 'number' && Number.isFinite(value)) {
		return value;
	}
	if (typeof value === 'string') {
		const parsed = Number(value);
		if (Number.isFinite(parsed)) {
			return parsed;
		}
	}
	return undefined;
}

function toAssetUrl(value: unknown): string | undefined {
	if (typeof value === 'string') {
		return asString(value);
	}
	const record = asRecord(value);
	return (
		asString(record.filename) ??
		asString(record.src) ??
		asString(record.url) ??
		asString(record.file_name)
	);
}

function toStringList(value: unknown): string[] {
	if (Array.isArray(value)) {
		return value
			.map((item) => asString(item))
			.filter((item): item is string => Boolean(item));
	}
	if (typeof value === 'string') {
		return value
			.split(',')
			.map((item) => item.trim())
			.filter((item) => item.length > 0);
	}
	return [];
}

function toRichTextDomain(value: unknown): RichTextDomain {
	const record = asRecord(value);
	const type = asString(record.type);
	const content = Array.isArray(record.content) ? record.content : [];
	return {
		type: type ?? EMPTY_RICH_TEXT.type,
		content,
	};
}

function toRelationRef(value: unknown): string | undefined {
	if (typeof value === 'number') {
		return String(value);
	}
	if (typeof value === 'string') {
		return asString(value);
	}
	const record = asRecord(value);
	return (
		asString(record.full_slug) ??
		asString(record.slug) ??
		asString(record.uuid) ??
		asString(record.id)
	);
}

function toRelationRefs(value: unknown): string[] {
	if (!Array.isArray(value)) {
		return [];
	}
	return value
		.map((item) => toRelationRef(item))
		.filter((item): item is string => Boolean(item));
}

function resolveSeoBlock(value: unknown): Record<string, unknown> {
	if (!Array.isArray(value)) {
		return asRecord(value);
	}

	for (const item of value) {
		const record = asRecord(item);
		if (Object.keys(record).length > 0) {
			return record;
		}
	}

	return {};
}

export function mapSeoDtoToDomain(dto: unknown): SeoDomain {
	const source = resolveSeoBlock(dto);
	return {
		metaTitle: asString(source.meta_title) ?? '',
		metaDescription: asString(source.meta_description) ?? '',
		canonicalUrl: asString(source.canonical_url),
		ogImageUrl: toAssetUrl(source.og_image),
		noindex: asBoolean(source.noindex, false),
	};
}

export function mapSocialDtoToDomain(dto: unknown): SocialDomain {
	const source = asRecord(dto);
	return {
		name: asString(source.name) ?? '',
		url: asString(source.url) ?? '',
		icon: asString(source.icon) ?? '',
	};
}

export function mapExperienceDtoToDomain(dto: unknown): ExperienceDomain {
	const source = asRecord(dto);
	return {
		title: asString(source.title) ?? '',
		companyName: asString(source.company_name) ?? '',
		description: toRichTextDomain(source.description),
		startDate: asString(source.start_date) ?? '',
		endDate: asString(source.end_date),
		skills: toStringList(source.skills),
		imageUrl: toAssetUrl(source.image),
	};
}

export function mapProjectDtoToDomain(
	dto: unknown,
	fallbackSlug = '',
): ProjectDomain {
	const source = asRecord(dto);
	return {
		title: asString(source.title) ?? '',
		slug: toRelationRef(source.slug) ?? fallbackSlug,
		summary: asString(source.summary) ?? '',
		content: source.content ? toRichTextDomain(source.content) : undefined,
		publishedDate: asString(source.published_date) ?? '',
		projectUrl: asString(source.project_url) ?? '',
		repositoryUrl: asString(source.repository_url),
		type: asString(source.type) ?? '',
		portfolioPriority: asNumber(source.portfolio_priority),
		logoUrl: toAssetUrl(source.logo),
		seo: mapSeoDtoToDomain(source.seo),
		stack: toStringList(source.stack),
	};
}

export function mapWritingDtoToDomain(
	dto: unknown,
	fallbackSlug = '',
): WritingDomain {
	const source = asRecord(dto);
	return {
		title: asString(source.title) ?? '',
		slug: toRelationRef(source.slug) ?? fallbackSlug,
		excerpt: asString(source.excerpt) ?? '',
		content: toRichTextDomain(source.content),
		publishedDate: asString(source.published_date) ?? '',
		coverImageUrl: toAssetUrl(source.cover_image),
		tags: toStringList(source.tags),
		seo: mapSeoDtoToDomain(source.seo),
	};
}

export function mapHomeDtoToDomain(dto: unknown): HomeDomain {
	const source = asRecord(dto);
	const socialLinks = Array.isArray(source.social_links)
		? source.social_links.map((item) => mapSocialDtoToDomain(item))
		: [];

	return {
		headline: asString(source.headline) ?? '',
		role: asString(source.role) ?? '',
		heroIntro: toRichTextDomain(source.hero_intro),
		aboutIntro: toRichTextDomain(source.about_intro),
		profileImageUrl: toAssetUrl(source.profile_image),
		availabilityNote:
			asString(source.availability_note) ??
			'Available for senior frontend roles, contract work, and product-focused collaborations.',
		availabilityStatus: asString(source.availability_status) ?? 'OPEN',
		availabilityTimezone: asString(source.availability_timezone) ?? 'Europe',
		availabilityResponseTime:
			asString(source.availability_response_time) ?? 'within 48h',
		socialLinks,
		featuredProjectRefs: toRelationRefs(source.featured_projects),
		experienceRefs: toRelationRefs(source.experience),
		seo: mapSeoDtoToDomain(source.seo),
	};
}
