import { createHash } from 'node:crypto';
import {
	copyFileSync,
	existsSync,
	mkdirSync,
	readFileSync,
	readdirSync,
	rmSync,
} from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';

const DEFAULT_SPACE_ID = process.env.STORYBLOK_SPACE_ID || '290927119725014';

function parseArgs(argv) {
	const args = {
		spaceId: DEFAULT_SPACE_ID,
		dryRun: false,
		publish: false,
		pullAfterPush: true,
	};

	for (let index = 0; index < argv.length; index += 1) {
		const token = argv[index];
		if ((token === '--space' || token === '-s') && argv[index + 1]) {
			args.spaceId = argv[index + 1];
			index += 1;
			continue;
		}

		if ((token === '--file' || token === '-f') && argv[index + 1]) {
			args.filePath = argv[index + 1];
			index += 1;
			continue;
		}

		if (token === '--dry-run' || token === '-d') {
			args.dryRun = true;
			continue;
		}

		if (token === '--publish') {
			args.publish = true;
			continue;
		}

		if (token === '--no-pull') {
			args.pullAfterPush = false;
			continue;
		}
	}

	return args;
}

function resolveImportFilePath(spaceId, explicitPath) {
	if (explicitPath) {
		return explicitPath;
	}
	return path.join(
		'data',
		'storyblok',
		'imports',
		spaceId,
		'baseline-content-import-v1.json',
	);
}

function getStoryblokManagementToken() {
	if (process.env.STORYBLOK_MANAGEMENT_TOKEN) {
		return process.env.STORYBLOK_MANAGEMENT_TOKEN;
	}

	if (process.env.STORYBLOK_OAUTH_TOKEN) {
		return process.env.STORYBLOK_OAUTH_TOKEN;
	}

	if (process.env.STORYBLOK_PERSONAL_ACCESS_TOKEN) {
		return process.env.STORYBLOK_PERSONAL_ACCESS_TOKEN;
	}

	const credentialsPath = path.join(
		process.env.HOME || '',
		'.storyblok',
		'credentials.json',
	);
	if (!existsSync(credentialsPath)) {
		return null;
	}

	try {
		const raw = readFileSync(credentialsPath, 'utf8');
		const parsed = JSON.parse(raw);
		const domainCredentials = parsed['api.storyblok.com'];
		if (
			domainCredentials &&
			typeof domainCredentials.password === 'string' &&
			domainCredentials.password.length > 0
		) {
			return domainCredentials.password;
		}
	} catch (error) {
		console.error('Failed to parse ~/.storyblok/credentials.json');
		console.error(error);
	}

	return null;
}

function deterministicUid(seed) {
	const hash = createHash('sha1').update(seed).digest('hex').slice(0, 32);
	return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-${hash.slice(12, 16)}-${hash.slice(16, 20)}-${hash.slice(20, 32)}`;
}

function asString(value) {
	if (typeof value !== 'string') {
		return undefined;
	}
	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : undefined;
}

function toAssetUrl(value) {
	if (typeof value === 'string') {
		return asString(value);
	}
	if (!value || typeof value !== 'object' || Array.isArray(value)) {
		return undefined;
	}

	return (
		asString(value.url) ||
		asString(value.filename) ||
		asString(value.file_name) ||
		asString(value.src)
	);
}

function sanitizeRichText(value) {
	if (!value || typeof value !== 'object' || Array.isArray(value)) {
		return { type: 'doc', content: [{ type: 'paragraph' }] };
	}
	const content = Array.isArray(value.content) ? value.content : [];
	const type = asString(value.type) || 'doc';
	return { type, content };
}

function sanitizeSeoBlocks(seoBlocks, seedPrefix) {
	const entries = Array.isArray(seoBlocks) ? seoBlocks : [];
	const sanitized = entries
		.map((item, index) => {
			if (!item || typeof item !== 'object' || Array.isArray(item)) {
				return null;
			}

			const metaTitle = asString(item.meta_title) || '';
			const metaDescription = asString(item.meta_description) || '';
			const canonicalUrl = asString(item.canonical_url);
			const ogImage = toAssetUrl(item.og_image);
			const noindex = Boolean(item.noindex);

			const normalized = {
				_uid: deterministicUid(`${seedPrefix}:seo:${index}:${metaTitle}`),
				component: 'seo_meta',
				meta_title: metaTitle,
				meta_description: metaDescription,
				noindex,
			};
			if (canonicalUrl) {
				normalized.canonical_url = canonicalUrl;
			}
			if (ogImage) {
				normalized.og_image = ogImage;
			}
			return normalized;
		})
		.filter(Boolean);

	return sanitized.length > 0
		? [sanitized[0]]
		: [
				{
					_uid: deterministicUid(`${seedPrefix}:seo:fallback`),
					component: 'seo_meta',
					meta_title: '',
					meta_description: '',
					noindex: false,
				},
			];
}

function slugify(value, fallback) {
	const normalized = (value || '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
	return normalized.length > 0 ? normalized : fallback;
}

function sanitizeSocialLinks(blocks) {
	const input = Array.isArray(blocks) ? blocks : [];
	return input
		.map((item, index) => {
			if (!item || typeof item !== 'object' || Array.isArray(item)) {
				return null;
			}
			const name = asString(item.name) || '';
			const url = asString(item.url) || '';
			const icon = asString(item.icon) || '';
			return {
				_uid: deterministicUid(`social:${index}:${name}:${url}`),
				component: 'item_social_link',
				name,
				url,
				icon,
			};
		})
		.filter(Boolean);
}

async function sleep(ms) {
	await new Promise((resolve) => {
		setTimeout(resolve, ms);
	});
}

async function storyblokRequest({ token, method, spaceId, pathName, body }) {
	const url = `https://api.storyblok.com/v1/spaces/${spaceId}${pathName}`;
	const maxAttempts = 6;

	for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
		const response = await fetch(url, {
			method,
			headers: {
				Authorization: token,
				'Content-Type': 'application/json',
			},
			body: body ? JSON.stringify(body) : undefined,
		});

		if (response.ok) {
			return response.json();
		}

		const retryAfter = Number(response.headers.get('retry-after')) || 0;
		const isRateLimited = response.status === 429;
		const isRetriableServerError = response.status >= 500;

		let payload = '';
		try {
			payload = await response.text();
		} catch {
			payload = '<unable to read response body>';
		}

		if (attempt < maxAttempts && (isRateLimited || isRetriableServerError)) {
			const backoffMs =
				retryAfter > 0
					? retryAfter * 1000
					: Math.min(500 * 2 ** (attempt - 1), 5000);
			console.warn(
				`Storyblok API ${method} ${pathName} returned ${response.status}, retrying in ${backoffMs}ms (attempt ${attempt}/${maxAttempts}).`,
			);
			await sleep(backoffMs);
			continue;
		}

		throw new Error(
			`Storyblok API ${method} ${pathName} failed (${response.status}): ${payload}`,
		);
	}

	throw new Error(`Storyblok API ${method} ${pathName} failed after retries.`);
}

async function fetchAllStories({ token, spaceId }) {
	const stories = [];
	let page = 1;
	while (true) {
		const data = await storyblokRequest({
			token,
			method: 'GET',
			spaceId,
			pathName: `/stories?per_page=100&page=${page}`,
		});

		const pageStories = Array.isArray(data.stories) ? data.stories : [];
		stories.push(...pageStories);
		if (pageStories.length < 100) {
			break;
		}
		page += 1;
	}
	return stories;
}

function buildStoryIndexes(stories) {
	const byFullSlug = new Map();
	for (const story of stories) {
		if (typeof story.full_slug === 'string' && story.full_slug.length > 0) {
			byFullSlug.set(story.full_slug, story);
		}
	}
	return { byFullSlug };
}

async function upsertStory({
	token,
	spaceId,
	existing,
	name,
	slug,
	parentId,
	content,
	isFolder = false,
	isStartpage = false,
	dryRun,
}) {
	const payload = {
		name,
		slug,
		parent_id: parentId,
		is_folder: isFolder,
		is_startpage: isStartpage,
		content: isFolder ? content || {} : content,
	};

	if (dryRun) {
		return {
			story: {
				...payload,
				id: existing?.id ?? -1,
				uuid: existing?.uuid ?? deterministicUid(`${parentId}:${slug}`),
				full_slug:
					existing?.full_slug ??
					(parentId === 0 ? slug : `${parentId}:${slug}`),
			},
			dryRun: true,
			action: existing ? 'update' : 'create',
		};
	}

	if (existing?.id) {
		const updated = await storyblokRequest({
			token,
			method: 'PUT',
			spaceId,
			pathName: `/stories/${existing.id}`,
			body: {
				story: {
					...payload,
					id: existing.id,
				},
			},
		});
		return { ...updated, action: 'update' };
	}

	const created = await storyblokRequest({
		token,
		method: 'POST',
		spaceId,
		pathName: '/stories',
		body: { story: payload },
	});
	return { ...created, action: 'create' };
}

async function publishStory({ token, spaceId, storyId, dryRun }) {
	if (dryRun) {
		return;
	}
	await storyblokRequest({
		token,
		method: 'GET',
		spaceId,
		pathName: `/stories/${storyId}/publish`,
	});
}

function ensureDate(value, fallback) {
	const parsed = new Date(value || '');
	if (Number.isNaN(parsed.getTime())) {
		return fallback;
	}
	return parsed.toISOString();
}

function pullStoriesSnapshot(spaceId) {
	const pull = spawnSync(
		'pnpm',
		[
			'exec',
			'storyblok',
			'stories',
			'pull',
			'-s',
			spaceId,
			'-p',
			'data/storyblok',
		],
		{
			stdio: 'inherit',
		},
	);

	if (pull.status !== 0) {
		throw new Error(`storyblok stories pull failed with code ${pull.status}`);
	}

	const canonicalDir = path.join('data', 'storyblok', 'stories', spaceId);
	const legacyDir = path.join(
		'data',
		'storyblok',
		'stories',
		'stories',
		spaceId,
	);

	if (existsSync(canonicalDir)) {
		rmSync(legacyDir, { recursive: true, force: true });
		mkdirSync(legacyDir, { recursive: true });
		for (const file of readdirSync(canonicalDir)) {
			if (!file.endsWith('.json')) {
				continue;
			}
			copyFileSync(path.join(canonicalDir, file), path.join(legacyDir, file));
		}
		rmSync(canonicalDir, { recursive: true, force: true });
	}
}

async function main() {
	const args = parseArgs(process.argv.slice(2));
	const importFilePath = resolveImportFilePath(args.spaceId, args.filePath);
	const managementToken = getStoryblokManagementToken();

	if (!managementToken) {
		throw new Error(
			'Missing Storyblok management auth. Set STORYBLOK_MANAGEMENT_TOKEN or run `storyblok login`.',
		);
	}

	if (!existsSync(importFilePath)) {
		throw new Error(`Import bundle not found: ${importFilePath}`);
	}

	const importBundle = JSON.parse(readFileSync(importFilePath, 'utf8'));
	const homeBundle = importBundle?.content?.home;
	const projectsBundle = Array.isArray(importBundle?.content?.projects)
		? importBundle.content.projects
		: [];
	const experienceBundle = Array.isArray(importBundle?.content?.experience)
		? importBundle.content.experience
		: [];

	if (!homeBundle || typeof homeBundle !== 'object') {
		throw new Error('Import bundle does not contain content.home');
	}

	const existingStories = await fetchAllStories({
		token: managementToken,
		spaceId: args.spaceId,
	});
	const indexes = buildStoryIndexes(existingStories);

	const stats = {
		created: 0,
		updated: 0,
		published: 0,
		projects: 0,
		experience: 0,
	};
	const projectStoriesForPublish = [];
	const experienceStoriesForPublish = [];

	const projectFolderExisting = indexes.byFullSlug.get('projects');
	const projectFolderResult = await upsertStory({
		token: managementToken,
		spaceId: args.spaceId,
		existing: projectFolderExisting,
		name: 'Projects',
		slug: 'projects',
		parentId: 0,
		isFolder: true,
		content: {},
		dryRun: args.dryRun,
	});
	const projectsFolderId =
		projectFolderExisting?.id ?? projectFolderResult.story?.id;
	if (!projectFolderExisting) {
		stats.created += 1;
	} else {
		stats.updated += 1;
	}

	const experienceFolderExisting = indexes.byFullSlug.get('experience');
	const experienceFolderResult = await upsertStory({
		token: managementToken,
		spaceId: args.spaceId,
		existing: experienceFolderExisting,
		name: 'Experience',
		slug: 'experience',
		parentId: 0,
		isFolder: true,
		content: {},
		dryRun: args.dryRun,
	});
	const experienceFolderId =
		experienceFolderExisting?.id ?? experienceFolderResult.story?.id;
	if (!experienceFolderExisting) {
		stats.created += 1;
	} else {
		stats.updated += 1;
	}

	const projectRefsByRelationKey = new Map();
	for (const project of projectsBundle) {
		const relationKey = asString(project.relation_key);
		const slug = slugify(asString(project.slug) || '', 'project');
		const fullSlug = `projects/${slug}`;
		const existing = indexes.byFullSlug.get(fullSlug);

		const projectContent = project.content || {};
		const seo = sanitizeSeoBlocks(projectContent.seo, `project:${slug}`);
		const payloadContent = {
			component: 'page_project',
			title: asString(projectContent.title) || slug,
			slug,
			summary: asString(projectContent.summary) || '',
			content: sanitizeRichText(projectContent.content),
			published_date: ensureDate(
				asString(projectContent.published_date),
				'2024-01-01T12:00:00.000Z',
			),
			project_url:
				asString(projectContent.project_url) || 'https://example.com',
			repository_url: asString(projectContent.repository_url),
			type: asString(projectContent.type) || 'Web App',
			stack: Array.isArray(projectContent.stack)
				? projectContent.stack.map((item) => asString(item)).filter(Boolean)
				: [],
			logo: toAssetUrl(projectContent.logo),
			seo,
		};

		const result = await upsertStory({
			token: managementToken,
			spaceId: args.spaceId,
			existing,
			name: asString(projectContent.title) || slug,
			slug,
			parentId: projectsFolderId,
			content: payloadContent,
			dryRun: args.dryRun,
		});
		if (existing) {
			stats.updated += 1;
		} else {
			stats.created += 1;
		}
		stats.projects += 1;
		projectStoriesForPublish.push(result.story);

		const refUuid = asString(result.story?.uuid);
		const refId = result.story?.id;
		if (relationKey) {
			if (refUuid) {
				projectRefsByRelationKey.set(relationKey, refUuid);
			} else if (typeof refId === 'number') {
				projectRefsByRelationKey.set(relationKey, String(refId));
			}
		}
		indexes.byFullSlug.set(fullSlug, result.story);
	}

	const experienceRefsByRelationKey = new Map();
	for (const experience of experienceBundle) {
		const relationKey = asString(experience.relation_key);
		const experienceContent = experience.content || {};
		const title = asString(experienceContent.title) || 'Experience';
		const slug = slugify(title, 'experience');
		const fullSlug = `experience/${slug}`;
		const existing = indexes.byFullSlug.get(fullSlug);

		const payloadContent = {
			component: 'item_experience',
			title,
			company_name: asString(experienceContent.company_name) || '',
			description: sanitizeRichText(experienceContent.description),
			start_date: ensureDate(
				asString(experienceContent.start_date),
				'2024-01-01T12:00:00.000Z',
			),
			end_date: asString(experienceContent.end_date)
				? ensureDate(asString(experienceContent.end_date))
				: undefined,
			skills: Array.isArray(experienceContent.skills)
				? experienceContent.skills.map((item) => asString(item)).filter(Boolean)
				: [],
			image: toAssetUrl(experienceContent.image),
		};

		const result = await upsertStory({
			token: managementToken,
			spaceId: args.spaceId,
			existing,
			name: `${title} · ${asString(experienceContent.company_name) || 'Company'}`,
			slug,
			parentId: experienceFolderId,
			content: payloadContent,
			dryRun: args.dryRun,
		});
		if (existing) {
			stats.updated += 1;
		} else {
			stats.created += 1;
		}
		stats.experience += 1;
		experienceStoriesForPublish.push(result.story);

		const refUuid = asString(result.story?.uuid);
		const refId = result.story?.id;
		if (relationKey) {
			if (refUuid) {
				experienceRefsByRelationKey.set(relationKey, refUuid);
			} else if (typeof refId === 'number') {
				experienceRefsByRelationKey.set(relationKey, String(refId));
			}
		}
		indexes.byFullSlug.set(fullSlug, result.story);
	}

	const homeSeo = sanitizeSeoBlocks(homeBundle.content?.seo, 'home');
	const featuredProjects = Array.isArray(homeBundle.content?.featured_projects)
		? homeBundle.content.featured_projects
				.map((key) => projectRefsByRelationKey.get(key))
				.filter(Boolean)
		: [];
	const experienceRefs = Array.isArray(homeBundle.content?.experience)
		? homeBundle.content.experience
				.map((key) => experienceRefsByRelationKey.get(key))
				.filter(Boolean)
		: [];
	const socialLinks = sanitizeSocialLinks(homeBundle.content?.social_links);
	const roles = Array.isArray(homeBundle.content?.roles)
		? homeBundle.content.roles.map((item) => asString(item)).filter(Boolean)
		: [];

	const homePayload = {
		component: 'page_home',
		headline: asString(homeBundle.content?.headline) || 'Portfolio',
		role: asString(homeBundle.content?.role) || '',
		intro: sanitizeRichText(homeBundle.content?.intro),
		hero_intro: sanitizeRichText(
			homeBundle.content?.hero_intro ?? homeBundle.content?.intro,
		),
		about_intro: sanitizeRichText(
			homeBundle.content?.about_intro ?? homeBundle.content?.intro,
		),
		roles,
		availability_note:
			asString(homeBundle.content?.availability_note) ||
			'Available for frontend collaborations.',
		availability_status:
			asString(homeBundle.content?.availability_status) || 'OPEN',
		availability_timezone:
			asString(homeBundle.content?.availability_timezone) || 'Europe',
		availability_response_time:
			asString(homeBundle.content?.availability_response_time) ||
			'within 48h',
		social_links: socialLinks,
		featured_projects: featuredProjects,
		experience: experienceRefs,
		seo: homeSeo,
	};

	const homeExisting = indexes.byFullSlug.get('home');
	const homeResult = await upsertStory({
		token: managementToken,
		spaceId: args.spaceId,
		existing: homeExisting,
		name: 'Home',
		slug: 'home',
		parentId: 0,
		content: homePayload,
		isStartpage: false,
		dryRun: args.dryRun,
	});
	if (homeExisting) {
		stats.updated += 1;
	} else {
		stats.created += 1;
	}

	if (args.publish) {
		const publishTargets = [
			homeResult.story,
			...projectStoriesForPublish,
			...experienceStoriesForPublish,
		];

		for (const story of publishTargets) {
			if (typeof story.id === 'number') {
				await publishStory({
					token: managementToken,
					spaceId: args.spaceId,
					storyId: story.id,
					dryRun: args.dryRun,
				});
				stats.published += 1;
			}
		}
	}

	if (!args.dryRun && args.pullAfterPush) {
		pullStoriesSnapshot(args.spaceId);
	}

	console.log(
		[
			`space=${args.spaceId}`,
			`mode=${args.dryRun ? 'dry-run' : 'apply'}`,
			`folders=2`,
			`projects=${stats.projects}`,
			`experience=${stats.experience}`,
			`created=${stats.created}`,
			`updated=${stats.updated}`,
			`published=${stats.published}`,
			`home_component=${homePayload.component}`,
			`home_featured_projects=${featuredProjects.length}`,
			`home_experience=${experienceRefs.length}`,
			`home_social_links=${socialLinks.length}`,
		].join(' | '),
	);
}

main().catch((error) => {
	console.error('Failed to push baseline content to Storyblok.');
	console.error(error);
	process.exitCode = 1;
});
