import { expect, test } from '@playwright/test';

test('E2E-SMOKE-001: core routes respond without runtime crash', async ({
	page,
	request,
}) => {
	const homeResponse = await request.get('/');
	expect([200, 404]).toContain(homeResponse.status());

	await page.goto('/');
	await expect(page.locator('body')).toBeVisible();

	const invalidProject = await request.get('/projects/__missing__');
	expect([404, 200]).toContain(invalidProject.status());

	const invalidWriting = await request.get('/writing/__missing__');
	expect([404, 200]).toContain(invalidWriting.status());
});
