import type { HomePageModel } from '@/lib/storyblok/home-page';
import { richTextToParagraphs } from '@/lib/storyblok/home-page';
import { storyblokEditable, type SbBlokData } from '@storyblok/react/rsc';
import * as crypto from 'crypto';
import styles from './terminal-noir-home.module.css';

type TerminalNoirHomeProps = {
	model: HomePageModel;
	socialLinkBloks?: SbBlokData[];
};

function initialsFromHeadline(headline: string): string {
	const initials = headline
		.trim()
		.split(/\s+/)
		.filter((word) => word.length > 0)
		.slice(0, 2)
		.map((word) => word[0]?.toUpperCase() ?? '')
		.join('');
	return initials || 'TN';
}

function formatDateLabel(value?: string): string {
	if (!value) {
		return 'present';
	}
	const parsed = new Date(value);
	if (Number.isNaN(parsed.getTime())) {
		return value;
	}
	const year = parsed.getUTCFullYear();
	const month = String(parsed.getUTCMonth() + 1).padStart(2, '0');
	return `${year}-${month}`;
}

function formatExperienceRange(startDate: string, endDate?: string): string {
	return `${formatDateLabel(startDate)} -> ${formatDateLabel(endDate)}`;
}

function iconForContact(icon: string): string {
	const normalized = icon.trim().toLowerCase();
	if (normalized.includes('github') || normalized.includes('gitlab')) {
		return '⌥';
	}
	if (normalized.includes('linkedin')) {
		return '⊞';
	}
	if (normalized.includes('mail') || normalized.includes('envelope')) {
		return '✉';
	}
	if (normalized.includes('twitter') || normalized.includes('x')) {
		return '✗';
	}
	return '>';
}

function getPreferredContactLink(
	links: TerminalNoirHomeProps['model']['socialLinks'],
) {
	return (
		links.find((link) => {
			const name = link.name.trim().toLowerCase();
			const icon = link.icon.trim().toLowerCase();
			return (
				name.includes('contact') ||
				name.includes('email') ||
				icon.includes('envelope') ||
				icon.includes('mail')
			);
		}) ?? links[0]
	);
}

export default function TerminalNoirHome({
	model,
	socialLinkBloks = [],
}: TerminalNoirHomeProps) {
	const heroParagraphs =
		model.heroParagraphs.length > 0
			? model.heroParagraphs
			: ['Portfolio content is available after Storyblok publishing.'];
	const aboutParagraphs =
		model.aboutParagraphs.length > 0 ? model.aboutParagraphs : heroParagraphs;
	const stats = [
		{
			value: '7+',
			label: 'Years building products',
		},
		{
			value: `${model.projects.length}`,
			label: 'Selected projects',
		},
		{
			value: '3',
			label: 'Core frontend stacks',
		},
	];
	const terminalPrimaryContact = getPreferredContactLink(model.socialLinks);
	const year = new Date().getUTCFullYear();

	return (
		<main className={styles.terminalNoir} data-testid="terminal-noir-home">
			<nav className={styles.nav}>
				<div className={styles.navLogo}>
					{model.headline.toLowerCase().replace(/\s+/g, '')}
					<span>@</span>terminal:~$
				</div>
				<ul className={styles.navList}>
					<li>
						<a href="#about">about</a>
					</li>
					<li>
						<a href="#projects">projects</a>
					</li>
					<li>
						<a href="#experience">experience</a>
					</li>
					<li>
						<a href="#contact">contact</a>
					</li>
				</ul>
			</nav>

			<section className={styles.heroSection} id="hero">
				<div className={styles.container}>
					<p className={styles.heroPre}>
						<span className={styles.prompt}>~/portfolio $</span> ./introduce.sh
					</p>
					<h1 className={styles.heroName}>
						{model.headline}
						<span className={styles.cursor} />
					</h1>
					<p className={styles.heroRole}>{model.role}</p>
					<div className={styles.heroTagline}>
						{heroParagraphs.map((paragraph) => (
							<p key={paragraph}>{paragraph}</p>
						))}
					</div>
					<div className={styles.heroCtas}>
						<a
							className={`${styles.btn} ${styles.btnPrimary}`}
							href="#projects"
						>
							$ ls ./projects
						</a>
						<a
							className={`${styles.btn} ${styles.btnSecondary}`}
							href="#contact"
						>
							$ ping --me
						</a>
					</div>
					<div className={styles.heroStats}>
						{stats.map((stat) => (
							<div key={stat.label}>
								<div className={styles.statValue}>{stat.value}</div>
								<div className={styles.statLabel}>{stat.label}</div>
							</div>
						))}
					</div>
				</div>
			</section>

			<section className={styles.aboutSection} id="about">
				<div className={styles.container}>
					<div className={styles.sectionLabel}>about.md</div>
					<div className={styles.aboutGrid}>
						<div className={styles.aboutAvatar}>
							<span>{initialsFromHeadline(model.headline)}</span>
							<span className={styles.aboutAvatarLabel}>
								{'// profile_pic.jpg'}
							</span>
						</div>
						<div>
							<h3 className={styles.blockTitle}>whoami</h3>
							<div className={styles.aboutBio}>
								{aboutParagraphs.map((paragraph) => (
									<p key={paragraph}>{paragraph}</p>
								))}
							</div>
							<h3 className={styles.blockTitle}>tech.json</h3>
							<div className={styles.skillsGrid}>
								{model.skills.map((skill) => (
									<span className={styles.skillTag} key={skill}>
										{skill}
									</span>
								))}
							</div>
						</div>
					</div>
				</div>
			</section>

			<section className={styles.projectsSection} id="projects">
				<div className={styles.container}>
					<div className={styles.sectionLabel}>ls ./projects</div>
					<div className={styles.projectsGrid}>
							{model.projects.map((project) => {
								return (
								<article className={styles.projectCard} key={project.slug}>
									<div className={styles.projectType}>
										{project.type || 'project'}
									</div>
									<h3 className={styles.projectName}>
										{project.title || project.slug}
									</h3>
									<div className={styles.filePath}>
										~/projects/<span>{project.slug}</span>
									</div>
									<p className={styles.projectDesc}>{project.summary}</p>
									{project.stack.length > 0 ? (
										<div className={styles.techStack}>
											{project.stack.map((tag) => (
												<span
													className={styles.techTag}
													key={`${project.slug}-${tag}`}
												>
													{tag}
												</span>
											))}
										</div>
									) : null}
									<div className={styles.projectLinks}>
										<a className={styles.projectLink} href={project.projectUrl}>
											live
										</a>
										<a
											className={styles.projectLink}
											href={
												project.repositoryUrl ?? `/projects/${project.slug}`
											}
										>
											{project.repositoryUrl ? 'source' : 'details'}
										</a>
									</div>
								</article>
							);
						})}
					</div>
				</div>
			</section>

			<section className={styles.experienceSection} id="experience">
				<div className={styles.container}>
					<div className={styles.sectionLabel}>git log --oneline</div>
						<div className={styles.commitLog}>
							{model.experience.map((entry) => {
								const description =
									richTextToParagraphs(entry.description)[0] ??
									'Experience details pending content publication.';
							const commitHash = crypto
								.createHash('sha1')
								.update(
									`${entry.title}-${entry.companyName}-${entry.startDate}`,
								)
								.digest('hex')
								.slice(0, 6);

							return (
								<article
									className={styles.commitEntry}
									key={`${entry.title}-${entry.startDate}`}
								>
									<div className={styles.commitDot}>⬡</div>
									<div>
										<div className={styles.commitHash}>commit {commitHash}</div>
										<div className={styles.commitDate}>
											{formatExperienceRange(entry.startDate, entry.endDate)}
										</div>
										<h3 className={styles.commitTitle}>{entry.title}</h3>
										<div className={styles.commitCompany}>
											{entry.companyName}
										</div>
										<p className={styles.commitDesc}>{description}</p>
										<div className={styles.diffTags}>
											{entry.skills.map((skill) => (
												<span
													className={styles.diffAdd}
													key={`${entry.title}-${skill}`}
												>
													+{skill}
												</span>
											))}
										</div>
									</div>
								</article>
							);
						})}
					</div>
				</div>
			</section>

			<section className={styles.contactSection} id="contact">
				<div className={styles.container}>
					<div className={styles.sectionLabel}>ping --me</div>
					<div className={styles.contactGrid}>
						<div>
							<p className={styles.contactIntro}>
								{model.contactIntro}
							</p>
							{model.socialLinks.map((link, index) => {
								const editableBlok = socialLinkBloks[index];

								return (
									<a
										className={styles.contactLine}
										href={link.url}
										key={link.url}
										{...(editableBlok ? storyblokEditable(editableBlok) : {})}
									>
										<span className={styles.contactIcon}>
											{iconForContact(link.icon)}
										</span>
										<span className={styles.contactHandle}>{link.url}</span>
										<span className={styles.contactMeta}>{link.name}</span>
									</a>
								);
							})}
							{terminalPrimaryContact ? (
								<a
									className={styles.cvDownload}
									href={terminalPrimaryContact.url}
								>
									↓ start a conversation
								</a>
							) : null}
						</div>

						<div className={styles.terminalWindow}>
							<div className={styles.terminalBar}>
								<div className={`${styles.terminalDot} ${styles.dotRed}`} />
								<div className={`${styles.terminalDot} ${styles.dotYellow}`} />
								<div className={`${styles.terminalDot} ${styles.dotGreen}`} />
								<div className={styles.terminalTitle}>contact.sh</div>
							</div>
							<div className={styles.terminalBody}>
								<p className={styles.comment}># send a message</p>
								<p>
									<span className={styles.path}>~/contact</span> ${' '}
									<span className={styles.cmd}>cat availability.txt</span>
								</p>
								<p className={styles.output}>
									Status:{' '}
									<span className={styles.outputHighlight}>
										{model.contactStatus}
									</span>
								</p>
								<p className={styles.output}>
									Timezone: {model.contactTimezone}
								</p>
								<p className={styles.output}>
									Response: {model.contactResponseTime}
								</p>
								<br />
								<p>
									<span className={styles.path}>~/contact</span> ${' '}
									<span className={styles.cmd}>curl -X POST /api/message</span>
								</p>
								<p className={styles.output}>
									target: {terminalPrimaryContact?.url ?? 'contact unavailable'}
								</p>
							</div>
						</div>
					</div>
				</div>
			</section>

			<footer className={styles.footer}>
				<span>{model.headline.toLowerCase().replace(/\s+/g, '')}:~$</span>
				portfolio v2 - Next.js + Storyblok
				<span>{`// built with obsession · © ${year}`}</span>
			</footer>
		</main>
	);
}
