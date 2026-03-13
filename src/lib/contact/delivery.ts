import { Resend } from 'resend';
import type { ContactServerConfig } from '@/lib/contact/config';
import type { ContactSubmission } from '@/lib/contact/schema';
import { logInfo } from '@/lib/monitoring/logger';

function escapeHtml(value: string): string {
	return value
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&#39;');
}

function buildPlainTextMessage(submission: ContactSubmission): string {
	return [
		`Name: ${submission.name}`,
		`Email: ${submission.email}`,
		`Company: ${submission.company ?? 'n/a'}`,
		'',
		submission.message,
	].join('\n');
}

function buildHtmlMessage(submission: ContactSubmission): string {
	return `
		<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111;">
			<h2 style="margin: 0 0 16px;">New portfolio contact message</h2>
			<p><strong>Name:</strong> ${escapeHtml(submission.name)}</p>
			<p><strong>Email:</strong> ${escapeHtml(submission.email)}</p>
			<p><strong>Company:</strong> ${escapeHtml(submission.company ?? 'n/a')}</p>
			<hr style="margin: 24px 0;" />
			<p style="white-space: pre-wrap;">${escapeHtml(submission.message)}</p>
		</div>
	`;
}

export async function deliverContactMessage(
	submission: ContactSubmission,
	config: ContactServerConfig,
) {
	if (
		!config.resendApiKey ||
		!config.contactFromEmail ||
		!config.contactToEmail
	) {
		if (config.allowsMockDelivery) {
			logInfo('contact_form_delivery_mocked', {
				route: '/api/contact',
				email: submission.email,
			});
			return { mocked: true };
		}

		throw new Error('Contact delivery is not configured');
	}

	const resend = new Resend(config.resendApiKey);
	const response = await resend.emails.send({
		from: config.contactFromEmail,
		to: [config.contactToEmail],
		replyTo: submission.email,
		subject: `Portfolio contact: ${submission.name}`,
		text: buildPlainTextMessage(submission),
		html: buildHtmlMessage(submission),
	});

	if (response.error) {
		throw new Error(response.error.message || 'Resend delivery failed');
	}

	return { mocked: false };
}
