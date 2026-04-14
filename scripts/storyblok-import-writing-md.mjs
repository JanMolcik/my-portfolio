#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import process from 'node:process';

const DEFAULT_LANGUAGE = 'cs';
const WORDS_PER_MINUTE = 200;
const SUPPORTED_SOURCE_TYPES = new Set([
	'work-note',
	'twitter-thread',
	'youtube-summary',
	'article-summary',
	'translation',
	'experiment',
]);
const SUPPORTED_CONTENT_ORIGINS = new Set([
	'original',
	'summary',
	'translation',
	'annotated-notes',
]);

function parseArgs(argv) {
	const args = { dryRun: true, publish: false, file: '' };
	for (let index = 0; index < argv.length; index += 1) {
		const arg = argv[index];
		if (arg === '--file') {
			args.file = argv[index + 1] ?? '';
			index += 1;
			continue;
		}
		if (arg === '--dry-run') {
			args.dryRun = true;
			continue;
		}
		if (arg === '--publish') {
			args.publish = true;
			args.dryRun = false;
			continue;
		}
		if (!args.file && !arg.startsWith('--')) {
			args.file = arg;
		}
	}
	return args;
}

function splitFrontmatter(source) {
	if (!source.startsWith('---\n')) {
		throw new Error(
			'Markdown file must start with YAML frontmatter delimited by ---',
		);
	}
	const end = source.indexOf('\n---', 4);
	if (end === -1) {
		throw new Error('Markdown frontmatter closing delimiter not found');
	}
	return {
		frontmatter: source.slice(4, end),
		body: source.slice(end + 4).replace(/^\n/, ''),
	};
}

function parseScalar(value) {
	const trimmed = value.trim();
	if (trimmed === 'true') return true;
	if (trimmed === 'false') return false;
	if (/^\d+(\.\d+)?$/.test(trimmed)) return Number(trimmed);
	if (
		(trimmed.startsWith('"') && trimmed.endsWith('"')) ||
		(trimmed.startsWith("'") && trimmed.endsWith("'"))
	) {
		return trimmed.slice(1, -1);
	}
	if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
		const inner = trimmed.slice(1, -1).trim();
		if (!inner) return [];
		return inner
			.split(',')
			.map((item) => parseScalar(item))
			.filter((item) => item !== '');
	}
	return trimmed;
}

function parseFrontmatter(frontmatter) {
	const result = {};
	let currentObjectKey = '';
	for (const rawLine of frontmatter.split('\n')) {
		const line = rawLine.replace(/\s+#.*$/, '');
		if (!line.trim()) continue;
		const nested = line.match(/^\s{2,}([\w-]+):\s*(.*)$/);
		if (nested && currentObjectKey) {
			result[currentObjectKey] ??= {};
			result[currentObjectKey][nested[1]] = parseScalar(nested[2] ?? '');
			continue;
		}
		const match = line.match(/^([\w-]+):\s*(.*)$/);
		if (!match) continue;
		const [, key, value = ''] = match;
		if (value.trim().length === 0) {
			currentObjectKey = key;
			result[key] = {};
			continue;
		}
		currentObjectKey = '';
		result[key] = parseScalar(value);
	}
	return result;
}

function asString(value) {
	return typeof value === 'string' && value.trim().length > 0
		? value.trim()
		: undefined;
}

function asStringArray(value) {
	if (Array.isArray(value)) {
		return value.map((item) => asString(item)).filter(Boolean);
	}
	const stringValue = asString(value);
	return stringValue
		? stringValue
				.split(',')
				.map((item) => item.trim())
				.filter(Boolean)
		: [];
}

function slugify(value) {
	return value
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 80);
}

function hasRawHtml(body) {
	return /<\/?(script|iframe|object|embed|style|div|span|section|article|img|a|p|br|hr|table|tr|td|th|ul|ol|li|h[1-6])(?:\s[^>]*)?>/i.test(
		body,
	);
}

function countWords(value) {
	return (value.match(/[\p{L}\p{N}]+/gu) ?? []).length;
}

function firstParagraph(body) {
	const paragraph = body
		.split(/\n\s*\n/)
		.map((block) => block.trim())
		.find(
			(block) => block && !block.startsWith('#') && !block.startsWith('```'),
		);
	return paragraph
		?.replace(/[#>*_`\[\]()]/g, '')
		.replace(/\s+/g, ' ')
		.trim();
}

function normalizeFrontmatter(frontmatter, body) {
	const title = asString(frontmatter.title);
	if (!title) throw new Error('frontmatter.title is required');
	const sourceUrl =
		asString(frontmatter.source_url) ?? asString(frontmatter.source);
	const sourceTitle =
		asString(frontmatter.source_title) ?? asString(frontmatter.based_on);
	const publishedDate =
		asString(frontmatter.published_date) ?? asString(frontmatter.created);
	const slug = asString(frontmatter.slug) ?? slugify(title);
	const excerpt =
		asString(frontmatter.excerpt) ??
		asString(frontmatter.subtitle) ??
		firstParagraph(body) ??
		'';
	if (!slug) throw new Error('Unable to derive slug from frontmatter.title');
	if (!excerpt) throw new Error('frontmatter.excerpt or subtitle is required');
	if (!publishedDate) {
		throw new Error('frontmatter.published_date or created is required');
	}
	const sourceType =
		asString(frontmatter.source_type) ??
		(sourceUrl?.includes('youtube.com') || sourceUrl?.includes('youtu.be')
			? 'youtube-summary'
			: sourceUrl
				? 'article-summary'
				: 'work-note');
	const contentOrigin =
		asString(frontmatter.content_origin) ??
		(sourceUrl ? 'summary' : 'original');
	if (!SUPPORTED_SOURCE_TYPES.has(sourceType)) {
		throw new Error(`Unsupported source_type: ${sourceType}`);
	}
	if (!SUPPORTED_CONTENT_ORIGINS.has(contentOrigin)) {
		throw new Error(`Unsupported content_origin: ${contentOrigin}`);
	}
	if (
		['summary', 'translation', 'annotated-notes'].includes(contentOrigin) &&
		(!sourceUrl || !sourceTitle)
	) {
		throw new Error(
			'source_url and source_title are required for sourced writing',
		);
	}
	const seo =
		typeof frontmatter.seo === 'object' && frontmatter.seo
			? frontmatter.seo
			: {};
	return {
		title,
		slug,
		excerpt,
		published_date: publishedDate,
		updated_date: asString(frontmatter.updated_date),
		cover_image: asString(frontmatter.cover_image),
		cover_image_alt:
			typeof frontmatter.cover_image_alt === 'string'
				? frontmatter.cover_image_alt.trim()
				: undefined,
		tags: asStringArray(frontmatter.tags),
		source_type: sourceType,
		source_url: sourceUrl,
		source_title: sourceTitle,
		content_origin: contentOrigin,
		language: asString(frontmatter.language) ?? DEFAULT_LANGUAGE,
		reading_time_minutes: Math.max(
			1,
			Math.ceil(countWords(body) / WORDS_PER_MINUTE),
		),
		featured: Boolean(frontmatter.featured),
		seo: [
			{
				component: 'seo_meta',
				meta_title: asString(seo.meta_title) ?? title,
				meta_description:
					asString(seo.meta_description) ?? excerpt.slice(0, 155),
				canonical_url: asString(seo.canonical_url),
				noindex: Boolean(seo.noindex),
			},
		],
	};
}

function textNode(text, marks = []) {
	return marks.length > 0
		? { type: 'text', text, marks }
		: { type: 'text', text };
}

function parseInline(text) {
	const nodes = [];
	const pattern = /(\[[^\]]+\]\([^)]+\)|\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;
	let lastIndex = 0;
	for (const match of text.matchAll(pattern)) {
		if (match.index > lastIndex)
			nodes.push(textNode(text.slice(lastIndex, match.index)));
		const token = match[0];
		if (token.startsWith('[')) {
			const link = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
			if (link)
				nodes.push(
					textNode(link[1], [{ type: 'link', attrs: { href: link[2] } }]),
				);
		} else if (token.startsWith('**')) {
			nodes.push(textNode(token.slice(2, -2), [{ type: 'bold' }]));
		} else if (token.startsWith('*')) {
			nodes.push(textNode(token.slice(1, -1), [{ type: 'italic' }]));
		} else if (token.startsWith('`')) {
			nodes.push(textNode(token.slice(1, -1), [{ type: 'code' }]));
		}
		lastIndex = match.index + token.length;
	}
	if (lastIndex < text.length) nodes.push(textNode(text.slice(lastIndex)));
	return nodes.filter((node) => node.text.length > 0);
}

function paragraphNode(lines) {
	return { type: 'paragraph', content: parseInline(lines.join(' ').trim()) };
}

function convertMarkdownToStoryblokRichtext(body) {
	if (hasRawHtml(body)) {
		throw new Error('Raw HTML is not allowed in writing Markdown');
	}
	const warnings = [];
	const lines = body.replace(/\r\n/g, '\n').split('\n');
	const content = [];
	for (let index = 0; index < lines.length; index += 1) {
		const line = lines[index] ?? '';
		if (!line.trim()) continue;
		const fence = line.match(/^```([^`]*)\s*$/);
		if (fence) {
			const codeLines = [];
			index += 1;
			while (index < lines.length && !/^```\s*$/.test(lines[index] ?? '')) {
				codeLines.push(lines[index] ?? '');
				index += 1;
			}
			content.push({
				type: 'code_block',
				attrs: { language: fence[1]?.trim() || 'text' },
				content: [textNode(codeLines.join('\n'))],
			});
			continue;
		}
		if (/^\|.*\|\s*$/.test(line.trim())) {
			const tableLines = [line];
			while (/^\|.*\|\s*$/.test(lines[index + 1]?.trim() ?? '')) {
				index += 1;
				tableLines.push(lines[index] ?? '');
			}
			warnings.push('Markdown table converted to text code_block fallback');
			content.push({
				type: 'code_block',
				attrs: { language: 'text' },
				content: [textNode(tableLines.join('\n'))],
			});
			continue;
		}
		const heading = line.match(/^(#{1,4})\s+(.+)$/);
		if (heading) {
			content.push({
				type: 'heading',
				attrs: { level: Math.min(Math.max(heading[1].length, 2), 4) },
				content: parseInline(heading[2]),
			});
			continue;
		}
		if (line.startsWith('>')) {
			const quoteLines = [line.replace(/^>\s?/, '')];
			while (lines[index + 1]?.startsWith('>')) {
				index += 1;
				quoteLines.push((lines[index] ?? '').replace(/^>\s?/, ''));
			}
			content.push({
				type: 'blockquote',
				content: [paragraphNode(quoteLines)],
			});
			continue;
		}
		const unordered = line.match(/^[-*]\s+(.+)$/);
		const ordered = line.match(/^\d+\.\s+(.+)$/);
		if (unordered || ordered) {
			const listItems = [];
			const orderedList = Boolean(ordered);
			let current = ordered?.[1] ?? unordered?.[1] ?? '';
			while (current) {
				listItems.push({
					type: 'list_item',
					content: [paragraphNode([current])],
				});
				const next = lines[index + 1] ?? '';
				const nextMatch = orderedList
					? next.match(/^\d+\.\s+(.+)$/)
					: next.match(/^[-*]\s+(.+)$/);
				if (!nextMatch) break;
				index += 1;
				current = nextMatch[1];
			}
			content.push({
				type: orderedList ? 'ordered_list' : 'bullet_list',
				content: listItems,
			});
			continue;
		}
		const paragraphLines = [line];
		while (
			lines[index + 1]?.trim() &&
			!/^(```|#{1,4}\s+|>|[-*]\s+|\d+\.\s+|\|.*\|\s*$)/.test(
				lines[index + 1]?.trim() ?? '',
			)
		) {
			index += 1;
			paragraphLines.push(lines[index] ?? '');
		}
		content.push(paragraphNode(paragraphLines));
	}
	return { richtext: { type: 'doc', content }, warnings };
}

function buildStoryPayload(fields, richtext) {
	return {
		name: fields.title,
		slug: fields.slug,
		full_slug: `writing/${fields.slug}`,
		content: {
			component: 'page_writing',
			...Object.fromEntries(
				Object.entries(fields).filter(([, value]) => value !== undefined),
			),
			content: richtext,
		},
	};
}

async function storyblokManagementRequest(endpoint, token, body) {
	const baseUrl =
		process.env.STORYBLOK_MANAGEMENT_API_BASE_URL?.replace(/\/+$/, '') ??
		'https://mapi.storyblok.com/v1';
	const response = await fetch(`${baseUrl}${endpoint}`, {
		method: 'POST',
		headers: {
			Authorization: token,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify(body),
	});
	if (!response.ok) {
		throw new Error(
			`Storyblok Management API request failed: ${response.status}`,
		);
	}
	return response.json();
}

async function publishPayload(output) {
	const token = process.env.STORYBLOK_MANAGEMENT_TOKEN;
	const spaceId = process.env.STORYBLOK_SPACE_ID;
	if (!token || !spaceId) {
		throw new Error(
			'Publishing requires STORYBLOK_MANAGEMENT_TOKEN and STORYBLOK_SPACE_ID',
		);
	}
	const storyId = process.env.STORYBLOK_WRITING_STORY_ID;
	const parentId = process.env.STORYBLOK_WRITING_PARENT_ID;
	const storyPayload = {
		story: {
			name: output.story.name,
			slug: output.story.slug,
			parent_id: parentId ? Number(parentId) : undefined,
			content: output.story.content,
		},
		publish: 1,
	};
	if (storyId) {
		return storyblokManagementRequest(
			`/spaces/${spaceId}/stories/${storyId}`,
			token,
			storyPayload,
		);
	}
	if (!parentId) {
		throw new Error(
			'Publishing new writing stories requires STORYBLOK_WRITING_PARENT_ID or STORYBLOK_WRITING_STORY_ID',
		);
	}
	return storyblokManagementRequest(
		`/spaces/${spaceId}/stories`,
		token,
		storyPayload,
	);
}

async function main() {
	const args = parseArgs(process.argv.slice(2));
	if (!args.file)
		throw new Error(
			'Usage: storyblok-import-writing-md --file <path> [--dry-run|--publish]',
		);
	const raw = await readFile(args.file, 'utf8');
	const { frontmatter, body } = splitFrontmatter(raw);
	const parsedFrontmatter = parseFrontmatter(frontmatter);
	const fields = normalizeFrontmatter(parsedFrontmatter, body);
	const { richtext, warnings } = convertMarkdownToStoryblokRichtext(body);
	const story = buildStoryPayload(fields, richtext);
	const output = {
		mode: args.publish ? 'publish' : 'dry-run',
		target: `writing/${fields.slug}`,
		warnings,
		story,
	};
	if (args.publish) {
		await publishPayload(output);
	}
	console.log(JSON.stringify(output, null, 2));
}

main().catch((error) => {
	console.error(error instanceof Error ? error.message : String(error));
	process.exit(1);
});
