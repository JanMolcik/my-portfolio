import { describe, expect, it } from 'vitest';
import {
	formatStoryblokDateTime,
	parseStoryblokDate,
} from '@/lib/storyblok/dates';

describe('UNIT-STORYBLOK-DATES-001', () => {
	it('parses Storyblok editor datetime strings as UTC-safe dates', () => {
		const parsed = parseStoryblokDate('2024-06-06 00:00');

		expect(parsed?.toISOString()).toBe('2024-06-06T00:00:00.000Z');
	});

	it('keeps ISO timestamps round-trippable into editor-friendly datetime strings', () => {
		expect(formatStoryblokDateTime('2024-06-06T00:00:00.000Z')).toBe(
			'2024-06-06 00:00',
		);
		expect(formatStoryblokDateTime('2023-11-01T10:00:00.000Z')).toBe(
			'2023-11-01 10:00',
		);
	});

	it('returns undefined for invalid datetime input', () => {
		expect(formatStoryblokDateTime('not-a-date')).toBeUndefined();
		expect(parseStoryblokDate('')).toBeNull();
	});
});
