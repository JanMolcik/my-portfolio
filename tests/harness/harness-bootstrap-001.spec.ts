import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

const WAIVER_HEADING = '## Active Bootstrap Waiver (Blueprint Starter UI)';

function readWaiverSection(content: string): string {
	const start = content.indexOf(WAIVER_HEADING);
	if (start < 0) {
		return '';
	}
	const nextHeading = content.indexOf('\n## ', start + WAIVER_HEADING.length);
	return content.slice(start, nextHeading < 0 ? undefined : nextHeading);
}

function parseWaiverDate(section: string, label: string): Date | null {
	const match = section.match(
		new RegExp(`${label}:\\s*` + '`(\\d{4}-\\d{2}-\\d{2})`'),
	);
	if (!match?.[1]) {
		return null;
	}
	const parsed = new Date(`${match[1]}T00:00:00.000Z`);
	if (Number.isNaN(parsed.getTime())) {
		return null;
	}
	return parsed;
}

describe('HARNESS-BOOTSTRAP-001', () => {
	it('requires explicit, time-boxed waiver metadata while blueprint starter UI remains active', async () => {
		const [globalsCss, currentTruth] = await Promise.all([
			readFile('src/app/globals.css', 'utf8'),
			readFile('docs/spec/CURRENT_TRUTH.md', 'utf8'),
		]);

		const blueprintUiIsActive = globalsCss.includes('blueprint-blank.css');
		if (!blueprintUiIsActive) {
			return;
		}

		const waiverSection = readWaiverSection(currentTruth);
		expect(waiverSection).not.toEqual('');
		expect(waiverSection).toContain('Status: Active');
		expect(waiverSection).toContain('Owner:');
		expect(waiverSection).toContain('Exit criteria:');
		expect(waiverSection).toContain('Backlog evolution tasks:');
		expect(waiverSection).toContain('E4-S1');
		expect(waiverSection).toContain('E4-S2');
		expect(waiverSection).toContain('E4-S3');
		expect(waiverSection).toContain('E7-S5');

		const activatedOn = parseWaiverDate(waiverSection, 'Activated on');
		const expiresOn = parseWaiverDate(waiverSection, 'Expires on');

		expect(activatedOn).not.toBeNull();
		expect(expiresOn).not.toBeNull();

		const msPerDay = 24 * 60 * 60 * 1000;
		const waiverLengthDays =
			(expiresOn!.getTime() - activatedOn!.getTime()) / msPerDay;

		expect(waiverLengthDays).toBeGreaterThan(0);
		expect(waiverLengthDays).toBeLessThanOrEqual(14);
	});
});
