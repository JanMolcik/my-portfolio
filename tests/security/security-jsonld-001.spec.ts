/**
 * SEC-JSONLD-001
 *
 * Tests that serializeJsonLd() prevents script tag breakout when the
 * serialized JSON is embedded in a <script type="application/ld+json"> tag.
 *
 * Attack vector: if a JSON-LD value contains </script>, the browser interprets
 * it as the closing tag for the surrounding <script> element, ending the JSON
 * context and allowing arbitrary HTML/JS injection after it.
 *
 * Defence (src/lib/seo/json-ld.ts:54–56):
 *   JSON.stringify(value).replace(/</g, '\\u003c')
 *
 * All '<' characters are Unicode-escaped to \u003c, which is semantically
 * identical JSON but safe for inline <script> embedding. A browser cannot
 * parse \u003c/script> as a closing script tag.
 */

import { describe, expect, it } from 'vitest';
import { serializeJsonLd } from '@/lib/seo/json-ld';

describe('SEC-JSONLD-001: serializeJsonLd prevents script tag breakout', () => {
	it('blocks </script> breakout by replacing < with \\u003c', () => {
		const result = serializeJsonLd({
			name: '</script><script>alert(1)</script>',
		});
		expect(result).not.toContain('</script>');
		expect(result).not.toContain('<script>');
		expect(result).toContain('\\u003c');
	});

	it('encodes every < in the serialized output, not just the first', () => {
		const result = serializeJsonLd({
			description: '<b>text</b> and <i>more</i>',
		});
		expect(result).not.toContain('<');
		expect(result).toContain('\\u003c');
	});

	it('encodes < in deeply nested object values', () => {
		const result = serializeJsonLd({
			outer: {
				inner: {
					deep: '</script>',
				},
			},
		});
		expect(result).not.toContain('<');
		expect(result).toContain('\\u003c');
	});

	it('encodes < in array item values', () => {
		const result = serializeJsonLd({
			keywords: ['typescript', '</script><script>alert(1)</script>', 'react'],
		});
		expect(result).not.toContain('<');
		expect(result).toContain('\\u003c');
	});

	it('encodes < in object key names', () => {
		const result = serializeJsonLd({ '<evil>': 'value' });
		expect(result).not.toContain('<');
	});

	it('handles the < character expressed as a Unicode escape in the input string', () => {
		// '\u003c' in JS source is the < character (U+003C) — not a bypass.
		// JSON.stringify produces the literal <, which the replace then encodes.
		const result = serializeJsonLd({ key: '\u003c/script>' });
		expect(result).not.toContain('<');
		expect(result).toContain('\\u003c');
	});

	it('does not corrupt values that contain the literal text \\u003c (not the < char)', () => {
		// A value with a backslash followed by u003c is not the < character.
		// JSON.stringify escapes the backslash; no < appears for the replace to touch.
		const result = serializeJsonLd({ key: '\\u003c' });
		expect(result).not.toContain('<');
	});

	it('produces valid JSON that a parser round-trips correctly', () => {
		const input = { name: 'Jan <Test>', url: 'https://example.com' };
		const serialized = serializeJsonLd(input);
		// \u003c is a valid JSON Unicode escape — round-trip must preserve the value.
		const parsed = JSON.parse(serialized) as typeof input;
		expect(parsed.name).toBe('Jan <Test>');
		expect(parsed.url).toBe('https://example.com');
	});
});
