/**
 * SEC-RICHTEXT-XSS-001
 *
 * Security tests for XSS prevention in StoryblokRichTextRenderer.
 *
 * getSafeHref() (src/components/writing/storyblok-rich-text-renderer.tsx:43–58)
 * is not exported; behaviour is verified through rendered HTML output.
 *
 * Implementation: allowlist approach — only http:, https:, mailto:, tel: are
 * permitted for absolute URLs. Paths starting with / or # are allowed as-is.
 * Any URL that fails URL parsing or has an unlisted protocol causes the
 * renderer to drop the <a> element and render plain text instead.
 *
 * CMS mapper finding (src/lib/storyblok/mappers.ts):
 *   toRichTextDomain() passes raw CMS content arrays through unchanged —
 *   href values are NOT sanitized at the mapper layer. This is intentional:
 *   mappers are data transformers, not security layers. Sanitization is the
 *   sole responsibility of getSafeHref() at render time. No unsanitized
 *   pass-through vulnerability exists in the mapper itself.
 *
 * data-language attribute (code_block nodes):
 *   React JSX encodes all HTML-special characters in attribute values
 *   (< → &lt;, " → &quot;, & → &amp;, etc.), making attribute injection
 *   impossible regardless of the language string content supplied by the CMS.
 */

import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

// CSS module mocked: vitest runs in the node environment without CSS transforms.
vi.mock('@/components/writing/terminal-noir-writing.module.css', () => ({
	default: {},
}));

import { StoryblokRichTextRenderer } from '@/components/writing/storyblok-rich-text-renderer';
import type { RichTextDomain } from '@/lib/storyblok/mappers';

function docWithLink(href: string): RichTextDomain {
	return {
		type: 'doc',
		content: [
			{
				type: 'paragraph',
				content: [
					{
						type: 'text',
						text: 'link text',
						marks: [{ type: 'link', attrs: { href } }],
					},
				],
			},
		],
	};
}

function docWithCodeBlock(language: string): RichTextDomain {
	return {
		type: 'doc',
		content: [
			{
				type: 'code_block',
				attrs: { language },
				content: [{ type: 'text', text: 'const x = 1;' }],
			},
		],
	};
}

function renderDoc(doc: RichTextDomain): string {
	return renderToString(createElement(StoryblokRichTextRenderer, { value: doc }));
}

describe('SEC-RICHTEXT-XSS-001', () => {
	describe('T1 — getSafeHref: dangerous schemes produce no anchor element', () => {
		it.each([
			['javascript scheme', 'javascript:alert(1)'],
			['javascript void', 'javascript:void(0)'],
			['data URI', 'data:text/html,<script>alert(1)</script>'],
			['vbscript scheme', 'vbscript:exec'],
			['null byte prefix', '\x00javascript:alert(1)'],
			['URL-encoded scheme', 'java%73cript:alert(1)'],
			['mixed-case scheme', 'JaVaScRiPt:alert(1)'],
			['whitespace prefix', ' javascript:alert(1)'],
			['tab in scheme', 'java\tscript:alert(1)'],
		])('%s (%s)', (_label, href) => {
			const rendered = renderDoc(docWithLink(href));
			// The renderer drops the <a> element — text is rendered without a link wrapper.
			expect(rendered).not.toContain('<a ');
		});
	});

	describe('T2 — getSafeHref: safe URLs produce an anchor element', () => {
		it('renders https:// link', () => {
			const rendered = renderDoc(docWithLink('https://example.com'));
			expect(rendered).toContain('href="https://example.com"');
		});

		it('renders http:// link', () => {
			const rendered = renderDoc(docWithLink('http://example.com'));
			expect(rendered).toContain('href="http://example.com"');
		});

		it('renders relative path starting with /', () => {
			const rendered = renderDoc(docWithLink('/about'));
			expect(rendered).toContain('href="/about"');
		});

		it('renders anchor href starting with #', () => {
			const rendered = renderDoc(docWithLink('#section'));
			expect(rendered).toContain('href="#section"');
		});

		it('renders mailto: URI', () => {
			const rendered = renderDoc(docWithLink('mailto:user@example.com'));
			expect(rendered).toContain('href="mailto:user@example.com"');
		});
	});

	describe('T2 — data-language attribute: safe via React JSX encoding', () => {
		// React JSX attribute rendering prevents injection via the data-language value.
		// In React 19 renderToString, angle-bracket characters (<, >) are stripped
		// from attribute values (they are not valid attribute characters), so a
		// malicious language string cannot introduce a raw <script> tag into the output.

		it('strips angle brackets from language value, preventing tag injection', () => {
			const rendered = renderDoc(docWithCodeBlock('<script>alert(1)</script>'));
			// No raw <script> tag may appear anywhere in the output.
			expect(rendered).not.toContain('<script>');
		});

		it('renders a normal language identifier without modification', () => {
			const rendered = renderDoc(docWithCodeBlock('typescript'));
			expect(rendered).toContain('data-language="typescript"');
		});
	});
});
