import Link from 'next/link';
import type { RichTextDomain, WritingDomain } from '@/lib/storyblok/mappers';
import styles from './terminal-noir-writing.module.css';

type TerminalNoirWritingProps = {
	writing: WritingDomain;
};

function asRecord(value: unknown): Record<string, unknown> {
	if (!value || typeof value !== 'object' || Array.isArray(value)) {
		return {};
	}
	return value as Record<string, unknown>;
}

function extractText(value: unknown): string {
	if (!value) {
		return '';
	}
	if (typeof value === 'string') {
		return value;
	}
	if (Array.isArray(value)) {
		return value
			.map((item) => extractText(item))
			.join(' ')
			.trim();
	}
	const source = asRecord(value);
	if (typeof source.text === 'string') {
		return source.text;
	}
	return extractText(source.content);
}

function richTextToParagraphs(value: RichTextDomain): string[] {
	const blocks = Array.isArray(value.content) ? value.content : [];
	return blocks
		.map((item) => extractText(item).replace(/\s+/g, ' ').trim())
		.filter((item) => item.length > 0);
}

function formatDateLabel(value: string): string {
	const parsed = new Date(value);
	if (Number.isNaN(parsed.getTime())) {
		return value;
	}
	const year = parsed.getUTCFullYear();
	const month = String(parsed.getUTCMonth() + 1).padStart(2, '0');
	const day = String(parsed.getUTCDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
}

export default function TerminalNoirWriting({
	writing,
}: TerminalNoirWritingProps) {
	const title = writing.title || writing.slug || 'Writing';
	const paragraphs = richTextToParagraphs(writing.content);
	const body = paragraphs.length > 0 ? paragraphs : [writing.excerpt];

	return (
		<main className={styles.writingPage} data-testid="terminal-noir-writing">
			<nav className={styles.breadcrumbs}>
				<Link href="/">~/</Link>
				<span>/</span>
				<Link href="/#writing">writing</Link>
				<span>/</span>
				<strong>{writing.slug || 'entry'}</strong>
			</nav>

			<section className={styles.hero}>
				<div>
					<p className={styles.prompt}>~/writing $ cat article.md</p>
					<h1 className={styles.title}>{title}</h1>
					<p className={styles.excerpt}>{writing.excerpt}</p>
					<div className={styles.meta}>
						<span>{formatDateLabel(writing.publishedDate)}</span>
						{writing.tags.map((tag) => (
							<span key={tag}>{tag}</span>
						))}
					</div>
				</div>

				<div className={styles.mediaCard}>
					{writing.coverImageUrl ? (
						/* eslint-disable-next-line @next/next/no-img-element */
						<img
							alt={`${title} cover`}
							className={styles.coverImage}
							decoding="async"
							height={220}
							loading="lazy"
							src={writing.coverImageUrl}
							width={280}
						/>
					) : (
						<div className={styles.mediaFallback}>cover pending</div>
					)}
				</div>
			</section>

			<section className={styles.content}>
				<div className={styles.sectionLabel}>cat ./article.md</div>
				<div className={styles.body}>
					{body.map((paragraph, index) => (
						<p key={`${paragraph}-${index}`}>{paragraph}</p>
					))}
				</div>
			</section>
		</main>
	);
}
