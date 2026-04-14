import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { StoryblokRichTextRenderer } from '@/components/writing/storyblok-rich-text-renderer';
import {
	longWritingRichTextFixture,
	longWritingWordCount,
} from '../fixtures/writing-richtext-long';

describe('UNIT-WRITING-RICHTEXT-RENDERER-001', () => {
	it('renders supported Storyblok richtext nodes as semantic article HTML', () => {
		const markup = renderToStaticMarkup(
			<StoryblokRichTextRenderer value={longWritingRichTextFixture} />,
		);

		expect(longWritingWordCount).toBeGreaterThanOrEqual(800);
		expect(markup).toContain('<h2>');
		expect(markup).toContain('<h3>');
		expect(markup).toContain('<h4>');
		expect(markup).toContain('aria-hidden="true"');
		expect(markup).toContain('<ul>');
		expect(markup).toContain('<ol>');
		expect(markup).toContain('<blockquote>');
		expect(markup).toContain('<pre');
		expect(markup).toContain('<code');
		expect(markup).toContain('<strong>');
		expect(markup).toContain('<em>');
		expect(markup).toContain('<a class=');
		expect(markup).toContain('rel="noreferrer noopener"');
		expect(markup).not.toContain('<script');
	});

	it('falls back to excerpt text when richtext content is empty', () => {
		const markup = renderToStaticMarkup(
			<StoryblokRichTextRenderer
				fallback="Fallback excerpt"
				value={{ type: 'doc', content: [] }}
			/>,
		);

		expect(markup).toBe('<p>Fallback excerpt</p>');
	});

	it('does not render unsafe link protocols from CMS richtext marks', () => {
		const markup = renderToStaticMarkup(
			<StoryblokRichTextRenderer
				value={{
					type: 'doc',
					content: [
						{
							type: 'paragraph',
							content: [
								{
									type: 'text',
									text: 'Unsafe link text',
									marks: [
										{
											type: 'link',
											attrs: { href: 'javascript:alert(1)' },
										},
									],
								},
							],
						},
					],
				}}
			/>,
		);

		expect(markup).toContain('Unsafe link text');
		expect(markup).not.toContain('<a');
		expect(markup).not.toContain('javascript:');
	});
});
