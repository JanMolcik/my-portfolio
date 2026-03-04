import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'node:path';

const SOURCE_PATH = 'docs/spec/EPICS_AND_USER_STORIES.md';
const EPIC_DIR = 'tickets/epics';
const STORY_DIR = 'tickets/user-stories';

function parseTableRows(markdown) {
	return markdown
		.split('\n')
		.filter((line) => line.startsWith('|'))
		.map((line) => line.trim())
		.filter((line) => !line.includes('---'));
}

function splitColumns(row) {
	return row
		.split('|')
		.slice(1, -1)
		.map((column) => column.trim());
}

function stripTicks(value) {
	return value.replace(/^`|`$/g, '').trim();
}

function parseEpics(markdown) {
	const start = markdown.indexOf('## Epic Overview');
	if (start === -1) {
		return [];
	}
	const rest = markdown.slice(start);
	const rows = parseTableRows(rest).slice(1);
	const epics = [];
	for (const row of rows) {
		const [idCol, nameCol, outcomeCol] = splitColumns(row);
		const id = stripTicks(idCol || '');
		if (!/^E\d+$/.test(id)) {
			continue;
		}
		epics.push({
			id,
			title: nameCol,
			outcome: outcomeCol,
		});
	}
	return epics;
}

function parseStories(markdown) {
	const rows = parseTableRows(markdown);
	const stories = [];
	for (const row of rows) {
		const cols = splitColumns(row);
		if (cols.length < 5) {
			continue;
		}
		const id = stripTicks(cols[0] || '');
		if (!/^E\d+-S\d+$/.test(id)) {
			continue;
		}
		stories.push({
			id,
			userStory: cols[1],
			acceptance: cols[2],
			dependsOn: stripTicks(cols[3] || ''),
			parallelGroup: stripTicks(cols[4] || ''),
		});
	}
	return stories;
}

function inferInvariants(text) {
	const matches = [...text.matchAll(/`(INV(?:-A)?-?\d+)`/gi)].map((match) =>
		match[1].toUpperCase().replace('INV-A-', 'INV-A').replace('INV--', 'INV-'),
	);
	return [...new Set(matches)];
}

async function ensureDir(dirPath) {
	await mkdir(dirPath, { recursive: true });
}

async function writeIfMissing(filePath, content) {
	try {
		await access(filePath, constants.F_OK);
		return false;
	} catch {
		await writeFile(filePath, content, 'utf8');
		return true;
	}
}

function epicMarkdown(epic) {
	return `---
id: ${epic.id}
type: epic
title: ${epic.title}
status: backlog
priority: P1
owner: unassigned
invariants: [INV-5]
depends_on: []
source: docs/spec/EPICS_AND_USER_STORIES.md
---

## Goal
- ${epic.outcome}

## Scope
- Expand this epic into executable user stories.

## Non-goals
- Avoid cross-epic scope creep.

## Acceptance
- Ticket decomposition complete for this epic.
- Related user stories are tracked in tickets/user-stories/.
`;
}

function storyMarkdown(story) {
	const inferred = inferInvariants(story.acceptance);
	const invariants = inferred.length > 0 ? inferred.join(', ') : 'INV-5';
	const dependsOn =
		story.dependsOn && story.dependsOn !== '-' ? story.dependsOn : '';

	return `---
id: ${story.id}
type: user_story
title: ${story.userStory}
status: ready
priority: P1
owner: unassigned
invariants: [${invariants}]
depends_on: [${dependsOn}]
source: docs/spec/EPICS_AND_USER_STORIES.md
---

## Goal
- ${story.userStory}

## Scope
- Delivery aligned with ${story.parallelGroup || 'assigned'} execution group.

## Non-goals
- Unrelated module rewrites.

## Acceptance
- ${story.acceptance}
`;
}

async function main() {
	const markdown = await readFile(SOURCE_PATH, 'utf8');
	const epics = parseEpics(markdown);
	const stories = parseStories(markdown);

	await Promise.all([ensureDir(EPIC_DIR), ensureDir(STORY_DIR)]);

	let createdEpics = 0;
	for (const epic of epics) {
		const filePath = path.join(EPIC_DIR, `${epic.id}.md`);
		if (await writeIfMissing(filePath, epicMarkdown(epic))) {
			createdEpics += 1;
		}
	}

	let createdStories = 0;
	for (const story of stories) {
		const filePath = path.join(STORY_DIR, `${story.id}.md`);
		if (await writeIfMissing(filePath, storyMarkdown(story))) {
			createdStories += 1;
		}
	}

	console.log(
		`spec-fragmenter complete: epics=${epics.length} (created ${createdEpics}), stories=${stories.length} (created ${createdStories})`,
	);
}

main().catch((error) => {
	console.error(`spec-fragmenter failed: ${error.message}`);
	process.exit(1);
});
