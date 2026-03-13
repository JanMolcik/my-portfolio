import Link from 'next/link';
import { getProjectExternalLinks } from '@/lib/projects/project-links';
import { parseStoryblokDate } from '@/lib/storyblok/dates';
import type { ProjectDomain, RichTextDomain } from '@/lib/storyblok/mappers';
import styles from './terminal-noir-project.module.css';

type TerminalNoirProjectProps = {
	project: ProjectDomain;
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

function richTextToParagraphs(value?: RichTextDomain): string[] {
	if (!value) {
		return [];
	}
	const blocks = Array.isArray(value.content) ? value.content : [];
	return blocks
		.map((item) => extractText(item).replace(/\s+/g, ' ').trim())
		.filter((item) => item.length > 0);
}

function formatDateLabel(value: string): string {
	const parsed = parseStoryblokDate(value);
	if (!parsed) {
		return value;
	}
	const year = parsed.getUTCFullYear();
	const month = String(parsed.getUTCMonth() + 1).padStart(2, '0');
	return `${year}-${month}`;
}

export default function TerminalNoirProject({
	project,
}: TerminalNoirProjectProps) {
	const title = project.title || project.slug || 'Project';
	const paragraphs = richTextToParagraphs(project.content);
	const body = paragraphs.length > 0 ? paragraphs : [project.summary];
	const tags = project.stack;
	const cardLabel = project.type || 'project';
	const externalLinks = getProjectExternalLinks({
		slug: project.slug,
		projectUrl: project.projectUrl,
		repositoryUrl: project.repositoryUrl,
	});

	return (
		<main className={styles.projectPage} data-testid="terminal-noir-project">
			<nav className={styles.breadcrumbs}>
				<Link href="/">~/</Link>
				<span>/</span>
				<Link href="/#projects">projects</Link>
				<span>/</span>
				<strong>{project.slug || 'project'}</strong>
			</nav>

			<section className={styles.hero}>
				<div>
					<p className={styles.prompt}>~/projects $ cat README.md</p>
					<h1 className={styles.title}>{title}</h1>
					<p className={styles.summary}>{project.summary}</p>
					<div className={styles.meta}>
						<span>{cardLabel}</span>
						<span>{formatDateLabel(project.publishedDate)}</span>
					</div>
					{tags.length > 0 ? (
						<div className={styles.stack}>
							{tags.map((tag) => (
								<span className={styles.stackTag} key={`${project.slug}-${tag}`}>
									{tag}
								</span>
							))}
						</div>
					) : null}
					{externalLinks.length > 0 ? (
						<div className={styles.links}>
							{externalLinks.map((link) => (
								<a
									href={link.href}
									key={`${project.slug}-${link.label}`}
									rel="noreferrer"
									target="_blank"
								>
									{link.label}
								</a>
							))}
						</div>
					) : null}
				</div>

				<div className={styles.mediaCard}>
					{project.logoUrl ? (
						/* eslint-disable-next-line @next/next/no-img-element */
						<img
							alt={`${title} logo`}
							className={styles.logo}
							decoding="async"
							height={220}
							loading="lazy"
							src={project.logoUrl}
							width={280}
						/>
					) : (
						<div className={styles.mediaFallback}>media pending</div>
					)}
				</div>
			</section>

			<section className={styles.content}>
				<div className={styles.sectionLabel}>cat ./notes.md</div>
				<div className={styles.body}>
					{body.map((paragraph) => (
						<p key={paragraph}>{paragraph}</p>
					))}
				</div>
			</section>
		</main>
	);
}
