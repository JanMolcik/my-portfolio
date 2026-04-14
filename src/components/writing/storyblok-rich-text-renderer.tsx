import { Fragment, type ReactNode } from 'react';
import type { RichTextDomain } from '@/lib/storyblok/mappers';
import styles from './terminal-noir-writing.module.css';

type RichTextNode = {
	type?: string;
	text?: string;
	content?: unknown[];
	attrs?: Record<string, unknown>;
	marks?: unknown[];
};

type RichTextMark = {
	type?: string;
	attrs?: Record<string, unknown>;
};

type StoryblokRichTextRendererProps = {
	value: RichTextDomain;
	fallback?: string;
};

function asNode(value: unknown): RichTextNode {
	if (!value || typeof value !== 'object' || Array.isArray(value)) {
		return {};
	}
	return value as RichTextNode;
}

function asMark(value: unknown): RichTextMark {
	if (!value || typeof value !== 'object' || Array.isArray(value)) {
		return {};
	}
	return value as RichTextMark;
}

function asString(value: unknown): string | undefined {
	return typeof value === 'string' && value.trim().length > 0
		? value.trim()
		: undefined;
}

function getSafeHref(value: unknown): string | undefined {
	const href = asString(value);
	if (!href) {
		return undefined;
	}
	if (href.startsWith('/') || href.startsWith('#')) {
		return href;
	}
	try {
		const parsed = new URL(href);
		return ['http:', 'https:', 'mailto:', 'tel:'].includes(parsed.protocol)
			? href
			: undefined;
	} catch {
		return undefined;
	}
}

function getChildren(node: RichTextNode, keyPrefix: string): ReactNode[] {
	return (Array.isArray(node.content) ? node.content : []).map((child, index) =>
		renderNode(child, `${keyPrefix}-${index}`),
	);
}

function getPlainText(node: RichTextNode): string {
	if (node.text) {
		return node.text;
	}
	return (Array.isArray(node.content) ? node.content : [])
		.map((child) => getPlainText(asNode(child)))
		.join('');
}

function normalizeHeadingLevel(value: unknown): 2 | 3 | 4 {
	const numeric = typeof value === 'number' ? value : Number(value);
	if (numeric >= 4) {
		return 4;
	}
	if (numeric === 3) {
		return 3;
	}
	return 2;
}

function renderText(node: RichTextNode, key: string): ReactNode {
	let rendered: ReactNode = node.text ?? '';
	for (const mark of (node.marks ?? []).map(asMark)) {
		switch (mark.type) {
			case 'bold':
				rendered = <strong key={`${key}-bold`}>{rendered}</strong>;
				break;
			case 'italic':
				rendered = <em key={`${key}-italic`}>{rendered}</em>;
				break;
			case 'code':
				rendered = (
					<code className={styles.inlineCode} key={`${key}-code`}>
						{rendered}
					</code>
				);
				break;
			case 'link': {
				const href = getSafeHref(mark.attrs?.href);
				if (!href) {
					break;
				}
				const target = asString(mark.attrs?.target);
				rendered = (
					<a
						className={styles.richLink}
						href={href}
						key={`${key}-link`}
						rel={target === '_blank' ? 'noreferrer noopener' : undefined}
						target={target}
					>
						{rendered}
					</a>
				);
				break;
			}
			default:
				break;
		}
	}
	return rendered;
}

function renderHeading(node: RichTextNode, key: string): ReactNode {
	const level = normalizeHeadingLevel(node.attrs?.level);
	const HeadingTag = `h${level}` as 'h2' | 'h3' | 'h4';
	const prefix = '#'.repeat(level);

	return (
		<HeadingTag key={key}>
			<span aria-hidden="true" className={styles.headingPrefix}>
				{prefix}
			</span>
			{getChildren(node, key)}
		</HeadingTag>
	);
}

function renderNode(value: unknown, key: string): ReactNode {
	const node = asNode(value);

	switch (node.type) {
		case 'doc':
			return <Fragment key={key}>{getChildren(node, key)}</Fragment>;
		case 'text':
			return renderText(node, key);
		case 'hard_break':
			return <br key={key} />;
		case 'heading':
			return renderHeading(node, key);
		case 'paragraph':
			return <p key={key}>{getChildren(node, key)}</p>;
		case 'bullet_list':
			return <ul key={key}>{getChildren(node, key)}</ul>;
		case 'ordered_list':
			return <ol key={key}>{getChildren(node, key)}</ol>;
		case 'list_item':
			return <li key={key}>{getChildren(node, key)}</li>;
		case 'blockquote':
			return <blockquote key={key}>{getChildren(node, key)}</blockquote>;
		case 'code_block': {
			const language =
				asString(node.attrs?.class) ?? asString(node.attrs?.language);
			return (
				<pre className={styles.codeBlock} data-language={language} key={key}>
					<code>{getPlainText(node)}</code>
				</pre>
			);
		}
		default:
			return getChildren(node, key);
	}
}

export function StoryblokRichTextRenderer({
	value,
	fallback,
}: StoryblokRichTextRendererProps) {
	const blocks = Array.isArray(value.content) ? value.content : [];

	if (blocks.length === 0 && fallback) {
		return <p>{fallback}</p>;
	}

	return (
		<>{blocks.map((block, index) => renderNode(block, `block-${index}`))}</>
	);
}
