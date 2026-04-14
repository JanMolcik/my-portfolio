import Image from 'next/image';
import Link from 'next/link';
import { parseStoryblokDate } from '@/lib/storyblok/dates';
import type { WritingListResult } from '@/lib/storyblok/writing';
import styles from './terminal-noir-writing-index.module.css';

type TerminalNoirWritingIndexProps = {
	result: WritingListResult;
	currentPage?: number;
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

function pageHref(page: number): string {
	return page <= 1 ? '/writing' : `/writing/page/${page}`;
}

export default function TerminalNoirWritingIndex({
	result,
	currentPage = result.page,
}: TerminalNoirWritingIndexProps) {
	const latestUpdate =
		result.items[0]?.updatedDate ?? result.items[0]?.publishedDate;
	const sourceTypes = [
		...new Set(
			result.items
				.map((item) => item.sourceType ?? item.contentOrigin)
				.filter((item): item is string => Boolean(item)),
		),
	];

	return (
		<main
			className={styles.writingIndex}
			data-testid="terminal-noir-writing-index"
		>
			<section className={styles.hero}>
				<p className={styles.prompt}>
					~/writing $ find ./notes -type f -name &quot;*.md&quot;
				</p>
				<h1>Writing / notes</h1>
				<p>
					Curated engineering notes, experiments, sourced summaries, and
					long-form writing published through Storyblok.
				</p>
			</section>

			<div className={styles.layout}>
				<aside className={styles.manifest} aria-label="Writing manifest">
					<div>
						<span>total entries</span>
						<strong>{result.total}</strong>
					</div>
					<div>
						<span>latest update</span>
						<strong>
							{latestUpdate ? formatDateLabel(latestUpdate) : 'pending'}
						</strong>
					</div>
					<div>
						<span>source mix</span>
						<strong>
							{sourceTypes.length > 0 ? sourceTypes.join(', ') : 'notes'}
						</strong>
					</div>
					<p>Summaries and translations are credited in each article.</p>
				</aside>

				<section className={styles.list} aria-label="Latest writing">
					{result.items.length > 0 ? (
						result.items.map((item) => (
							<article className={styles.card} key={item.slug}>
								<div className={styles.cardBody}>
									<div className={styles.cardMeta}>
										<span>{formatDateLabel(item.publishedDate)}</span>
										{item.sourceType ? <span>{item.sourceType}</span> : null}
										{item.readingTimeMinutes ? (
											<span>{item.readingTimeMinutes} min read</span>
										) : null}
									</div>
									<h2>
										<Link href={`/writing/${item.slug}`} prefetch={false}>
											{item.slug || item.title}.md
										</Link>
									</h2>
									<p>{item.excerpt}</p>
									<div className={styles.tags}>
										{item.tags.map((tag) => (
											<span key={tag}>{tag}</span>
										))}
									</div>
								</div>
								<div className={styles.cover}>
									{item.coverImageUrl ? (
										<Image
											alt={
												item.coverImageAlt ?? `Cover image for ${item.title}`
											}
											height={120}
											sizes="(max-width: 900px) 100vw, 180px"
											src={item.coverImageUrl}
											width={180}
										/>
									) : (
										<span>[ no cover ]</span>
									)}
								</div>
							</article>
						))
					) : (
						<div className={styles.empty}>
							No published writing entries yet.
						</div>
					)}

					{result.totalPages > 1 ? (
						<nav className={styles.pagination} aria-label="Writing pagination">
							{currentPage > 1 ? (
								<Link href={pageHref(currentPage - 1)} prefetch={false}>
									← prev
								</Link>
							) : null}
							{Array.from({ length: result.totalPages }, (_, index) => {
								const page = index + 1;
								return page === currentPage ? (
									<span aria-current="page" key={page}>
										{page}
									</span>
								) : (
									<Link href={pageHref(page)} key={page} prefetch={false}>
										{page}
									</Link>
								);
							})}
							{currentPage < result.totalPages ? (
								<Link href={pageHref(currentPage + 1)} prefetch={false}>
									next →
								</Link>
							) : null}
						</nav>
					) : null}
				</section>
			</div>
		</main>
	);
}
