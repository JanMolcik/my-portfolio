import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

function extractManifestCommands(harnessContent: string): string[] {
	const match = harnessContent.match(
		/## Normative Gate Manifest \(authoritative for `INV-5`\)[\s\S]*?```bash\n([\s\S]*?)\n```/,
	);
	if (!match?.[1]) {
		return [];
	}
	return match[1]
		.split('\n')
		.map((line) => line.trim())
		.filter((line) => line.length > 0);
}

describe('HARNESS-CI-001', () => {
	it('keeps CI workflow aligned with HARNESS normative gate manifest order', async () => {
		const [harness, ciWorkflow] = await Promise.all([
			readFile('docs/spec/HARNESS.md', 'utf8'),
			readFile('.github/workflows/ci.yml', 'utf8'),
		]);

		const commands = extractManifestCommands(harness);
		expect(commands.length).toBeGreaterThan(0);

		let lastIndex = -1;
		for (const command of commands) {
			const index = ciWorkflow.indexOf(command);
			expect(index).toBeGreaterThan(-1);
			expect(index).toBeGreaterThan(lastIndex);
			lastIndex = index;
		}
	});
});
