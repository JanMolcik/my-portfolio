import Image from 'next/image';
import Link from 'next/link';
import type { WritingDomain } from '@/lib/storyblok/mappers';
import { parseStoryblokDate } from '@/lib/storyblok/dates';
import { StoryblokRichTextRenderer } from './storyblok-rich-text-renderer';
import styles from './terminal-noir-writing.module.css';

type TerminalNoirWritingProps = {
	writing: WritingDomain;
};

function formatDateLabel(value: string): string {
	const parsed = parseStoryblokDate(value);
	if (!parsed) {
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
	const coverAlt = writing.coverImageAlt ?? `Cover image for ${title}`;

	return (
		<main className={styles.writingPage} data-testid="terminal-noir-writing">
			<nav className={styles.breadcrumbs}>
				<Link href="/" prefetch={false}>
					~/
				</Link>
				<span>/</span>
				<Link href="/writing" prefetch={false}>
					writing
				</Link>
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
						<Image
							alt={coverAlt}
							className={styles.coverImage}
							height={220}
							priority
							sizes="(max-width: 900px) 100vw, 280px"
							src={writing.coverImageUrl}
							width={280}
						/>
					) : (
						<div className={styles.mediaFallback}>cover pending</div>
					)}
				</div>
			</section>

			<article className={styles.content}>
				<div className={styles.sectionLabel}>cat ./article.md</div>
				<div className={styles.body}>
					<StoryblokRichTextRenderer
						fallback={writing.excerpt}
						value={writing.content}
					/>
				</div>
			</article>
		</main>
	);
}
