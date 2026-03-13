import { z } from 'zod';

export const CONTACT_FORM_MIN_SUBMIT_DELAY_MS = 3_000;

export const contactSubmissionSchema = z
	.object({
		name: z.string().trim().min(2).max(80),
		email: z.email().trim().max(320),
		company: z.string().trim().max(80).optional().or(z.literal('')),
		message: z.string().trim().min(20).max(2_000),
		website: z.string().trim().max(2_000).optional().or(z.literal('')),
		renderedAt: z.coerce.number().int().positive(),
		turnstileToken: z.string().trim().min(1),
	})
	.transform((input) => ({
		name: input.name.trim(),
		email: input.email.trim(),
		company: input.company?.trim() || null,
		message: input.message.trim(),
		website: input.website?.trim() || '',
		renderedAt: input.renderedAt,
		turnstileToken: input.turnstileToken.trim(),
	}));

export type ContactSubmission = z.infer<typeof contactSubmissionSchema>;

export function parseContactSubmission(
	value: unknown,
): { success: true; data: ContactSubmission } | { success: false } {
	const parsed = contactSubmissionSchema.safeParse(value);
	if (!parsed.success) {
		return { success: false };
	}
	return { success: true, data: parsed.data };
}

export function submittedTooQuickly(
	renderedAt: number,
	now = Date.now(),
): boolean {
	return now - renderedAt < CONTACT_FORM_MIN_SUBMIT_DELAY_MS;
}
