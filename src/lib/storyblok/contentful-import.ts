import {
	mapLegacyContentfulEntries,
	type LegacyContentfulEntry,
	type StoryblokExperienceRecord,
	type StoryblokHomeStory,
	type StoryblokProjectStory,
	type StoryblokSeoMeta,
	type StoryblokSocialLinkRecord,
} from './contentful-mapping.ts';
import { applyBaselineContentCuration } from './baseline-content-curation.ts';

export type LegacyContentfulAsset = {
	sys?: {
		id?: string;
	};
	fields?: {
		title?: string;
		description?: string;
		file?: {
			url?: string;
			fileName?: string;
			contentType?: string;
		};
	};
};

export type StoryblokLinkedAsset = {
	id: string;
	url: string;
	file_name?: string;
	content_type?: string;
	title?: string;
	description?: string;
};

type LinkedSeoMeta = Omit<StoryblokSeoMeta, 'og_image'> & {
	og_image?: StoryblokLinkedAsset;
};

type LinkedProjectStory = Omit<StoryblokProjectStory, 'content'> & {
	content: Omit<StoryblokProjectStory['content'], 'logo' | 'seo'> & {
		logo?: StoryblokLinkedAsset;
		seo: LinkedSeoMeta[];
	};
};

type LinkedExperienceRecord = Omit<StoryblokExperienceRecord, 'content'> & {
	content: Omit<StoryblokExperienceRecord['content'], 'image'> & {
		image?: StoryblokLinkedAsset;
	};
};

type LinkedHomeStory = Omit<StoryblokHomeStory, 'content'> & {
	content: Omit<StoryblokHomeStory['content'], 'seo'> & {
		seo: LinkedSeoMeta[];
	};
};

export type StoryblokBaselineImportBundle = {
	version: 'baseline-content-import-v1';
	source: {
		exported_at?: string;
		entries_count: number;
		assets_count: number;
	};
	summary: {
		home_count: 0 | 1;
		project_count: number;
		experience_count: number;
		social_link_count: number;
	};
	content: {
		home: LinkedHomeStory | null;
		projects: LinkedProjectStory[];
		experience: LinkedExperienceRecord[];
		social_links: StoryblokSocialLinkRecord[];
	};
	assets: StoryblokLinkedAsset[];
	diagnostics: {
		referenced_asset_ids: string[];
		linked_asset_ids: string[];
		missing_asset_ids: string[];
	};
};

function toAbsoluteAssetUrl(url: string): string {
	if (url.startsWith('//')) {
		return `https:${url}`;
	}
	return url;
}

function toAssetInventory(
	assets: LegacyContentfulAsset[],
): StoryblokLinkedAsset[] {
	const linkedAssets: StoryblokLinkedAsset[] = [];

	for (const asset of assets) {
		const id = asset.sys?.id;
		const url = asset.fields?.file?.url;
		if (!id || !url) {
			continue;
		}

		linkedAssets.push({
			id,
			url: toAbsoluteAssetUrl(url),
			file_name: asset.fields?.file?.fileName,
			content_type: asset.fields?.file?.contentType,
			title: asset.fields?.title,
			description: asset.fields?.description,
		});
	}

	return linkedAssets.sort((a, b) => a.id.localeCompare(b.id));
}

function linkSeoMeta(
	seo: StoryblokSeoMeta[],
	linkAsset: (assetId: string | undefined) => StoryblokLinkedAsset | undefined,
): LinkedSeoMeta[] {
	return seo.map((item) => {
		const ogImageAssetId =
			typeof item.og_image === 'string' ? item.og_image : undefined;

		return {
			...item,
			og_image: linkAsset(ogImageAssetId),
		};
	});
}

export function buildStoryblokBaselineImportBundle(input: {
	entries: LegacyContentfulEntry[];
	assets: LegacyContentfulAsset[];
	exportedAt?: string;
}): StoryblokBaselineImportBundle {
	const mapped = mapLegacyContentfulEntries(input.entries);
	const assets = toAssetInventory(input.assets);
	const assetsById = new Map(assets.map((asset) => [asset.id, asset]));
	const referencedAssetIds = new Set<string>();
	const linkedAssetIds = new Set<string>();
	const missingAssetIds = new Set<string>();

	const linkAsset = (
		assetId: string | undefined,
	): StoryblokLinkedAsset | undefined => {
		if (!assetId) {
			return undefined;
		}
		referencedAssetIds.add(assetId);
		const linkedAsset = assetsById.get(assetId);
		if (!linkedAsset) {
			missingAssetIds.add(assetId);
			return undefined;
		}
		linkedAssetIds.add(assetId);
		return linkedAsset;
	};

	const projects: LinkedProjectStory[] = mapped.projects.map((project) => ({
		...project,
		content: {
			...project.content,
			logo:
				typeof project.content.logo === 'string'
					? linkAsset(project.content.logo)
					: undefined,
			seo: linkSeoMeta(project.content.seo, linkAsset),
		},
	}));

	const experience: LinkedExperienceRecord[] = mapped.experience.map(
		(item) => ({
			...item,
			content: {
				...item.content,
				image:
					typeof item.content.image === 'string'
						? linkAsset(item.content.image)
						: undefined,
			},
		}),
	);

	const home: LinkedHomeStory | null = mapped.home
		? {
				...mapped.home,
				content: {
					...mapped.home.content,
					seo: linkSeoMeta(mapped.home.content.seo, linkAsset),
				},
			}
		: null;

	return applyBaselineContentCuration({
		version: 'baseline-content-import-v1',
		source: {
			exported_at: input.exportedAt,
			entries_count: input.entries.length,
			assets_count: input.assets.length,
		},
		summary: {
			home_count: home ? 1 : 0,
			project_count: projects.length,
			experience_count: experience.length,
			social_link_count: mapped.social_links.length,
		},
		content: {
			home,
			projects,
			experience,
			social_links: mapped.social_links,
		},
		assets,
		diagnostics: {
			referenced_asset_ids: [...referencedAssetIds].sort(),
			linked_asset_ids: [...linkedAssetIds].sort(),
			missing_asset_ids: [...missingAssetIds].sort(),
		},
	});
}
