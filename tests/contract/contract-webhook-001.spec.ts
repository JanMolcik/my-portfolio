import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

describe('CONTRACT-WEBHOOK-001', () => {
	it('keeps webhook authorization and idempotency contract explicit in PROJECT_SPEC', async () => {
		const spec = await readFile('docs/spec/PROJECT_SPEC.md', 'utf8');
		expect(spec).toContain('Webhook endpoint must validate shared secret');
		expect(spec).toContain(
			'Webhook handler must be idempotent by event signature',
		);
		expect(spec).toContain('accepts only publish/unpublish/delete events');
	});
});
