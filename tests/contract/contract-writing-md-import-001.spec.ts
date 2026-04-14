import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const SCRIPT_PATH = 'scripts/storyblok-import-writing-md.mjs';

describe('CONTRACT-WRITING-MD-IMPORT-001', () => {
	let tempDir = '';

	beforeEach(async () => {
		tempDir = await mkdtemp(path.join(tmpdir(), 'writing-md-import-'));
	});

	afterEach(async () => {
		if (tempDir) {
			await rm(tempDir, { recursive: true, force: true });
		}
	});

	async function writeMarkdownFixture(body: string) {
		const filePath = path.join(tempDir, 'article.md');
		await writeFile(filePath, body, 'utf8');
		return filePath;
	}

	it('dry-runs markdown into a Storyblok page_writing payload with pilot aliases', async () => {
		const filePath = await writeMarkdownFixture(`---
title: "Beyond LLM: Agentní workflow, prompty a RAG"
subtitle: "Poznámky k přednášce se zdrojem a vlastními komentáři."
source: "https://www.youtube.com/watch?v=abc123"
based_on: "Stanford CS230 Lecture 8"
language: "cs"
created: "2026-04-13 09:00"
tags: ["ai", "rag", "agents"]
---

# Beyond LLM

Úvod s **bold**, *italic*, [odkazem](https://example.com) a \`inline code\`.

## Workflow

- Retrieve context
- Verify answer

1. Draft
2. Publish

> Toto je moje shrnutí se zdrojem.

| Krok | Význam |
| --- | --- |
| RAG | Uzemnění |

\`\`\`text
# prompt comment stays inside code
agent -> retrieve -> answer
\`\`\`
`);

		const result = spawnSync('node', [SCRIPT_PATH, '--file', filePath], {
			encoding: 'utf8',
		});

		expect(result.status).toBe(0);
		const output = JSON.parse(result.stdout);
		expect(output.mode).toBe('dry-run');
		expect(output.target).toBe(
			'writing/beyond-llm-agentni-workflow-prompty-a-rag',
		);
		expect(output.warnings).toContain(
			'Markdown table converted to text code_block fallback',
		);
		expect(output.story.content).toMatchObject({
			component: 'page_writing',
			source_type: 'youtube-summary',
			source_url: 'https://www.youtube.com/watch?v=abc123',
			source_title: 'Stanford CS230 Lecture 8',
			content_origin: 'summary',
			language: 'cs',
			tags: ['ai', 'rag', 'agents'],
		});
		expect(output.story.content.content.content).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ type: 'heading' }),
				expect.objectContaining({ type: 'bullet_list' }),
				expect.objectContaining({ type: 'ordered_list' }),
				expect.objectContaining({ type: 'blockquote' }),
				expect.objectContaining({ type: 'code_block' }),
			]),
		);
	});

	it('rejects raw HTML before emitting a payload', async () => {
		const filePath = await writeMarkdownFixture(`---
title: "Unsafe"
excerpt: "Unsafe HTML"
published_date: "2026-04-13 09:00"
---

<script>alert(1)</script>
`);

		const result = spawnSync('node', [SCRIPT_PATH, '--file', filePath], {
			encoding: 'utf8',
		});

		expect(result.status).not.toBe(0);
		expect(result.stderr).toContain('Raw HTML is not allowed');
	});

	it('requires explicit credentials when publish mode is requested', async () => {
		const filePath = await writeMarkdownFixture(`---
title: "Publish"
excerpt: "Publish guard"
published_date: "2026-04-13 09:00"
---

Safe body.
`);

		const result = spawnSync(
			'node',
			[SCRIPT_PATH, '--file', filePath, '--publish'],
			{
				encoding: 'utf8',
				env: {
					...process.env,
					STORYBLOK_MANAGEMENT_TOKEN: '',
					STORYBLOK_SPACE_ID: '',
				},
			},
		);

		expect(result.status).not.toBe(0);
		expect(result.stderr).toContain(
			'Publishing requires STORYBLOK_MANAGEMENT_TOKEN and STORYBLOK_SPACE_ID',
		);
	});
});
