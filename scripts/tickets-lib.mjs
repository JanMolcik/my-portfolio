import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

export const TICKET_DIRS = {
	epics: 'tickets/epics',
	userStories: 'tickets/user-stories',
	bugs: 'tickets/bugs',
};

export function parseList(value) {
	if (!value) {
		return [];
	}
	const trimmed = value.trim();
	if (!trimmed || trimmed === '[]') {
		return [];
	}
	if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
		const body = trimmed.slice(1, -1).trim();
		if (!body) {
			return [];
		}
		return body
			.split(',')
			.map((item) => item.trim().replace(/^['"]|['"]$/g, ''))
			.filter(Boolean);
	}
	return trimmed
		.split(',')
		.map((item) => item.trim())
		.filter(Boolean);
}

export function parseFrontmatter(raw) {
	if (!raw.startsWith('---\n')) {
		return { meta: {}, body: raw };
	}
	const end = raw.indexOf('\n---\n', 4);
	if (end === -1) {
		return { meta: {}, body: raw };
	}
	const metaBlock = raw.slice(4, end);
	const body = raw.slice(end + 5);
	const meta = {};
	for (const line of metaBlock.split('\n')) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith('#')) {
			continue;
		}
		const colon = trimmed.indexOf(':');
		if (colon <= 0) {
			continue;
		}
		const key = trimmed.slice(0, colon).trim();
		const value = trimmed.slice(colon + 1).trim();
		meta[key] = value;
	}
	return { meta, body };
}

export function parseSections(body) {
	const sections = {};
	let current = null;
	for (const line of body.split('\n')) {
		const heading = line.match(/^##\s+(.+)$/);
		if (heading) {
			current = heading[1].trim().toLowerCase();
			sections[current] = [];
			continue;
		}
		if (!current) {
			continue;
		}
		const trimmed = line.trim();
		if (!trimmed) {
			continue;
		}
		sections[current].push(trimmed.replace(/^[-*]\s*/, ''));
	}
	return sections;
}

export function normalizeInvariant(value) {
	const upper = String(value || '')
		.trim()
		.toUpperCase();
	if (!upper) {
		return '';
	}
	if (upper.startsWith('INV-A')) {
		return upper;
	}
	if (upper.startsWith('INV-')) {
		return upper;
	}
	return '';
}

export async function listTicketFiles() {
	const files = [];
	for (const dir of Object.values(TICKET_DIRS)) {
		let entries = [];
		try {
			entries = await readdir(dir, { withFileTypes: true });
		} catch {
			continue;
		}
		for (const entry of entries) {
			if (entry.isFile() && entry.name.endsWith('.md')) {
				files.push(path.join(dir, entry.name));
			}
		}
	}
	return files.sort();
}

export async function readTicket(filePath) {
	const raw = await readFile(filePath, 'utf8');
	const { meta, body } = parseFrontmatter(raw);
	const sections = parseSections(body);
	const invariants = parseList(meta.invariants)
		.map((item) => normalizeInvariant(item))
		.filter(Boolean);
	return {
		filePath,
		id: meta.id || path.basename(filePath, '.md'),
		type: meta.type || 'task',
		title: meta.title || path.basename(filePath, '.md'),
		status: meta.status || 'backlog',
		priority: meta.priority || 'P2',
		owner: meta.owner || 'unassigned',
		source: meta.source || '',
		dependsOn: parseList(meta.depends_on),
		invariants,
		goal:
			sections.goal?.join(' ') || meta.title || path.basename(filePath, '.md'),
		scope: sections.scope || [],
		nonGoals: sections['non-goals'] || [],
		acceptance: sections.acceptance || [],
	};
}
