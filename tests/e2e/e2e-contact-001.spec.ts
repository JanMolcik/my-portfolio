import { expect, test, type Page } from '@playwright/test';

const TURNSTILE_SCRIPT_URL =
	'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

async function mockTurnstile(page: Page) {
	await page.route(TURNSTILE_SCRIPT_URL, async (route) => {
		await route.fulfill({
			contentType: 'application/javascript',
			body: `
				window.turnstile = {
					render(container, options) {
						container.setAttribute('data-turnstile-mock', 'ready');
						setTimeout(() => options.callback('playwright-turnstile-token'), 0);
						return 'mock-widget-id';
					},
					reset() {},
					remove() {},
				};
			`,
		});
	});
}

test.describe('E2E-CONTACT-001', () => {
	test('submits the homepage contact form and shows success feedback', async ({
		page,
	}) => {
		await mockTurnstile(page);
		await page.route('**/api/contact', async (route) => {
			await route.fulfill({
				status: 202,
				contentType: 'application/json',
				body: JSON.stringify({
					ok: true,
					message:
						'Local preview mode accepted your message. Configure email delivery for live inbox sending.',
				}),
			});
		});

		await page.goto('/');
		await page.getByRole('link', { name: '//contact' }).click();

		await expect(page.locator('[data-turnstile-mock="ready"]')).toBeVisible();
		const submitButton = page.getByRole('button', {
			name: 'send secure message',
		});
		await expect(submitButton).toBeEnabled();

		await page.getByRole('textbox', { name: 'name' }).fill('Jan Test');
		await page
			.getByRole('textbox', { name: 'email' })
			.fill('jan.test@example.com');
		await page.getByRole('textbox', { name: 'company' }).fill('ABUGO');
		await page
			.getByRole('textbox', { name: 'message' })
			.fill(
				'Testing the secure portfolio contact form from the homepage with a realistic project inquiry.',
			);

		await submitButton.click();

		await expect(page.getByRole('status')).toContainText(
			'Local preview mode accepted your message.',
		);
		await expect(page.getByRole('textbox', { name: 'name' })).toHaveValue('');
	});

	test('surfaces API errors without losing the page context', async ({
		page,
	}) => {
		await mockTurnstile(page);
		await page.route('**/api/contact', async (route) => {
			await route.fulfill({
				status: 429,
				contentType: 'application/json',
				body: JSON.stringify({
					error: 'Too many attempts. Try again later.',
				}),
			});
		});

		await page.goto('/');
		await page.getByRole('link', { name: '//contact' }).click();

		await expect(page.locator('[data-turnstile-mock="ready"]')).toBeVisible();
		const submitButton = page.getByRole('button', {
			name: 'send secure message',
		});
		await expect(submitButton).toBeEnabled();
		await page.getByRole('textbox', { name: 'name' }).fill('Jan Test');
		await page
			.getByRole('textbox', { name: 'email' })
			.fill('jan.test@example.com');
		await page
			.getByRole('textbox', { name: 'message' })
			.fill(
				'Testing the rate-limit error handling path from the homepage contact form.',
			);

		await submitButton.click();

		await expect(page.getByRole('status')).toContainText(
			'Too many attempts. Try again later.',
		);
		await expect(page).toHaveURL(/#contact$/);
	});
});
