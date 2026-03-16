import Image from 'next/image';
import type { HomePageModel } from '@/lib/storyblok/home-page';
import { getContactPublicConfig } from '@/lib/contact/config';
import { getProjectCardLinks } from '@/lib/projects/project-links';
import { parseStoryblokDate } from '@/lib/storyblok/dates';
import { richTextToParagraphs } from '@/lib/storyblok/home-page';
import { storyblokEditable, type SbBlokData } from '@storyblok/react/rsc';
import * as crypto from 'crypto';
import ContactForm from './contact-form';
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

function terminalHandleFromHeadline(headline: string): string {
	return headline
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.replace(/\s+/g, '');
}

function formatDateLabel(value?: string): string {
	if (!value) {
		return 'present';
	}
	const parsed = parseStoryblokDate(value);
	if (!parsed) {
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
	const directLinks = links.filter((link) => {
		const normalizedUrl = link.url.trim().toLowerCase();
		return !(
			normalizedUrl.includes('typeform.com') ||
			normalizedUrl.includes('tally.so') ||
			normalizedUrl.includes('forms.gle')
		);
	});

	return (
		directLinks.find((link) => {
			const name = link.name.trim().toLowerCase();
			const icon = link.icon.trim().toLowerCase();
			return (
				name.includes('contact') ||
				name.includes('email') ||
				icon.includes('envelope') ||
				icon.includes('mail')
			);
		}) ??
		directLinks.find((link) => {
			const normalizedUrl = link.url.trim().toLowerCase();
			return normalizedUrl.includes('linkedin.com');
		}) ??
		directLinks[0] ??
		links[0]
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
	const contactPublicConfig = getContactPublicConfig();
	const featuredProjects = model.projects.slice(0, 3);
	const secondaryProjects = model.projects.slice(3);
	const currentExperience = model.experience[0];
	const previousExperience = model.experience.slice(1);
	const year = new Date().getUTCFullYear();

	function renderProjectCard(
		project: TerminalNoirHomeProps['model']['projects'][number],
		variant: 'lead' | 'featured' | 'compact',
	) {
		const cardClassName =
			variant === 'lead'
				? `${styles.projectCard} ${styles.projectCardLead}`
				: variant === 'featured'
					? `${styles.projectCard} ${styles.projectCardFeatured}`
					: `${styles.projectCard} ${styles.projectCardCompact}`;

		return (
			<article className={cardClassName} key={project.slug}>
				<div className={styles.projectType}>{project.type || 'project'}</div>
				{variant === 'lead' ? (
					<div className={styles.projectPriority}>priority case study</div>
				) : variant === 'featured' ? (
					<div className={styles.projectPriority}>featured build</div>
				) : null}
				<h3 className={styles.projectName}>{project.title || project.slug}</h3>
				<div className={styles.filePath}>
					~/projects/<span>{project.slug}</span>
				</div>
				<p className={styles.projectDesc}>{project.summary}</p>
				{project.stack.length > 0 ? (
					<div className={styles.techStack}>
						{project.stack.map((tag) => (
							<span className={styles.techTag} key={`${project.slug}-${tag}`}>
								{tag}
							</span>
						))}
					</div>
				) : null}
				<div className={styles.projectLinks}>
					{getProjectCardLinks({
						slug: project.slug,
						projectUrl: project.projectUrl,
						repositoryUrl: project.repositoryUrl,
					}).map((link) => (
						<a
							className={styles.projectLink}
							href={link.href}
							key={`${project.slug}-${link.label}`}
							rel={link.external ? 'noreferrer' : undefined}
							target={link.external ? '_blank' : undefined}
						>
							{link.label}
						</a>
					))}
				</div>
			</article>
		);
	}

	return (
		<main className={styles.terminalNoir} data-testid="terminal-noir-home">
			<nav className={styles.nav}>
				<div className={styles.navLogo}>
					{terminalHandleFromHeadline(model.headline)}
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
					<h2 className={styles.srOnly}>About</h2>
					<div className={styles.sectionLabel}>about.md</div>
					<div className={styles.aboutGrid}>
						<div className={styles.aboutAvatar}>
							{model.profileImageUrl ? (
								<Image
									alt={`${model.headline} profile picture`}
									className={styles.aboutAvatarImage}
									fill
									priority
									sizes="(max-width: 900px) 100vw, 320px"
									src={model.profileImageUrl}
								/>
							) : (
								<span>{initialsFromHeadline(model.headline)}</span>
							)}
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
						</div>
					</div>
				</div>
			</section>

			<section className={styles.projectsSection} id="projects">
				<div className={styles.container}>
					<h2 className={styles.srOnly}>Projects</h2>
					<div className={styles.sectionLabel}>ls ./projects</div>
					<div className={styles.projectsIntro}>
						<p className={styles.projectsLead}>selected case studies</p>
						<p className={styles.projectsBody}>
							The first projects are the strongest signal for product teams and
							hiring managers: platform ownership, migration scope, and
							production-grade frontend systems.
						</p>
					</div>
					<div className={styles.featuredProjectsGrid}>
						{featuredProjects[0]
							? renderProjectCard(featuredProjects[0], 'lead')
							: null}
						{featuredProjects.length > 1 ? (
							<div className={styles.featuredProjectsSecondary}>
								{featuredProjects
									.slice(1)
									.map((project) => renderProjectCard(project, 'featured'))}
							</div>
						) : null}
					</div>
					{secondaryProjects.length > 0 ? (
						<>
							<div className={styles.projectsSubsection}>
								<p className={styles.projectsLead}>additional work</p>
								<p className={styles.projectsBody}>
									Broader delivery across internal tools, prototypes, booking
									flows, interaction-heavy apps, and research work.
								</p>
							</div>
							<div className={styles.projectsGrid}>
								{secondaryProjects.map((project) => {
									return renderProjectCard(project, 'compact');
								})}
							</div>
						</>
					) : null}
				</div>
			</section>

			<section className={styles.experienceSection} id="experience">
				<div className={styles.container}>
					<h2 className={styles.srOnly}>Experience</h2>
					<div className={styles.sectionLabel}>git log --oneline</div>
					<div className={styles.experienceIntro}>
						<p className={styles.projectsLead}>current role</p>
						<p className={styles.projectsBody}>
							The current role should read as the strongest hiring signal:
							recent ownership, platform complexity, and the kind of frontend
							scope I can lead inside product teams.
						</p>
					</div>
					{currentExperience ? (
						<article className={styles.currentRoleCard}>
							<div className={styles.currentRoleMeta}>
								<span className={styles.currentRoleBadge}>current focus</span>
								<span className={styles.currentRoleRange}>
									{formatExperienceRange(
										currentExperience.startDate,
										currentExperience.endDate,
									)}
								</span>
							</div>
							<h3 className={styles.currentRoleTitle}>
								{currentExperience.title}
							</h3>
							<div className={styles.currentRoleCompany}>
								{currentExperience.companyName}
							</div>
							<div className={styles.currentRoleBody}>
								{richTextToParagraphs(currentExperience.description).map(
									(paragraph) => (
										<p key={paragraph}>{paragraph}</p>
									),
								)}
							</div>
							<div className={styles.currentRoleSkills}>
								{currentExperience.skills.map((skill) => (
									<span
										className={styles.diffAdd}
										key={`${currentExperience.title}-${skill}`}
									>
										+{skill}
									</span>
								))}
							</div>
						</article>
					) : null}
					{previousExperience.length > 0 ? (
						<>
							<div className={styles.experienceSubsection}>
								<p className={styles.projectsLead}>previous roles</p>
								<p className={styles.projectsBody}>
									A compact timeline of earlier work across fintech, Angular
									enterprise apps, prototypes, and contract delivery.
								</p>
							</div>
							<div className={styles.commitLog}>
								{previousExperience.map((entry) => {
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
												<div className={styles.commitHash}>
													commit {commitHash}
												</div>
												<div className={styles.commitDate}>
													{formatExperienceRange(
														entry.startDate,
														entry.endDate,
													)}
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
						</>
					) : null}
				</div>
			</section>

			<section className={styles.contactSection} id="contact">
				<div className={styles.container}>
					<h2 className={styles.srOnly}>Contact</h2>
					<div className={styles.sectionLabel}>ping --me</div>
					<div className={styles.contactGrid}>
						<div>
							<p className={styles.contactIntro}>{model.contactIntro}</p>
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
									↓ direct fallback contact
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
								<div className={styles.contactTerminalHeader}>
									<p className={styles.comment}># secure intake</p>
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
								</div>
								<ContactForm
									fallbackUrl={terminalPrimaryContact?.url ?? null}
									siteKey={contactPublicConfig.turnstileSiteKey}
								/>
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
