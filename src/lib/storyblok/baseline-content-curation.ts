import type { StoryblokBaselineImportBundle } from '@/lib/storyblok/contentful-import';
import type { StoryblokRichText } from '@/lib/storyblok/contentful-mapping';

function richTextParagraphs(paragraphs: string[]): StoryblokRichText {
	return {
		type: 'doc',
		content: paragraphs.map((paragraph) => ({
			type: 'paragraph',
			content: [{ type: 'text', text: paragraph }],
		})),
	};
}

const curatedHome = {
	role: 'Frontend Engineer',
	heroIntro: richTextParagraphs([
		'I build production web applications with React, Next.js, Storyblok, and modern frontend architecture.',
		'Over the last 7+ years, I have worked across fintech, B2B platforms, internal tools, e-commerce foundations, and interactive products, delivering responsive interfaces, state-heavy applications, and maintainable frontend systems for real teams and clients.',
		'I currently work on frontend platform development at Shopsys and recently moved onto an ABUGO migration initiative where I combine hands-on frontend work with ownership of a new multi-brand Storyblok monorepo platform.',
	]),
	aboutIntro: richTextParagraphs([
		'I am a frontend engineer with a background in Computer Science and a strong focus on modern web applications.',
		'My experience spans Angular, React, and Next.js projects where I worked on application architecture, centralized state management, responsive UI systems, CMS-driven delivery, and frontend foundations used by product teams.',
		'At Shopsys, I work on a shared Next.js Pages Router core/platform used as the base for project implementations. In ABUGO, I am helping lead a migration toward a Storyblok-based monorepo that aims to become the single source of truth for multiple brands through configurable apps and automation-heavy workflows.',
		'I am especially effective in projects that need structured frontend ownership: turning product requirements into maintainable interfaces, improving messy state flows, and building UI systems that teams can extend without slowing down.',
	]),
	availabilityNote:
		'Available for senior frontend roles, contract work, and product-focused collaborations. The best conversations for me are projects that need strong frontend ownership, clean implementation, and a product-minded engineering approach.',
	availabilityStatus: 'OPEN',
	availabilityTimezone: 'Europe/Prague',
	availabilityResponseTime: 'within 48h',
	featuredProjects: [
		'curated:project:shopsys-platform-core',
		'curated:project:abugo-brand-platform-migration',
		'legacy:project:3K3B8rGeMpNIHlAXpcuOxc',
		'legacy:project:5paxSRHbAkmgMc4WSW8S66',
		'curated:project:lipa-waste-collection-calendar',
		'legacy:project:SzGET2EcNVB8Je8v7BsgL',
		'legacy:project:6Y7EIx73nUCWuoIWcsuM00',
		'legacy:project:1S8ST6kPWgL98MUE7BkNmV',
		'legacy:project:6Eby5J7DzhAXIBO6ib832p',
		'legacy:project:2GKNR2f4z6IwAg6a2MmKCc',
	],
};

const curatedProjects: Record<
	string,
	{
		type: string;
		summary: string;
		content: StoryblokRichText;
		priority: number;
		stack: string[];
		projectUrl?: string;
		repositoryUrl?: string;
	}
> = {
	'bitcoin-wallet': {
		type: 'Fintech Web App',
		priority: 4,
		summary:
			'Frontend work on a former Bitcoin wallet web client, built with Next.js, TypeScript, React hooks, and product-grade fintech UI patterns.',
		content: richTextParagraphs([
			'I worked on a Next.js web client for a Bitcoin wallet product, extending an existing frontend and shipping additional functionality on top of an already designed component system.',
			'The work combined product delivery with frontend structure: React functional components, hooks, Context API, routing, page management, and integration with API-driven wallet flows.',
			'The public product is no longer active and the codebase is private, so I keep this entry as a portfolio case-study detail rather than a live/source showcase.',
		]),
		stack: [
			'Next.js',
			'React',
			'TypeScript',
			'Context API',
			'Tailwind CSS',
			'Fintech UI',
		],
		projectUrl: '',
	},
	photobank: {
		type: 'Product UI Prototype',
		priority: 8,
		summary:
			'Responsive Next.js prototype for a photo library application, built with TypeScript, Sass, and atomic design principles across multiple breakpoints.',
		content: richTextParagraphs([
			'Photobank was a frontend prototype focused on structured UI delivery: reusable components, responsive layouts, and a clean design-system approach.',
			'The application was built with Next.js, TypeScript, and Sass, following atomic design principles and supporting a broad range of screen sizes.',
			'This project represents the kind of work I do well: taking visual direction, translating it into a component-driven frontend, and keeping the implementation scalable as the interface grows.',
		]),
		stack: [
			'Next.js',
			'TypeScript',
			'Sass',
			'Atomic Design',
			'Responsive UI',
			'Vercel',
		],
	},
	obytkujeme: {
		type: 'Booking Platform',
		priority: 7,
		summary:
			'Next.js motorhome booking website with landing pages, gallery, booking calendar, and admin-facing functionality, deployed with Vercel and built with ISR in mind.',
		content: richTextParagraphs([
			'Obytkujeme combined marketing pages with functional booking flows, making it a good example of product-oriented frontend work rather than a simple static site.',
			'The application included landing pages, image-heavy presentation, booking calendar flows, and supporting administrative functionality.',
			'It also reflects my interest in frontend delivery that balances user experience, maintainability, and practical production concerns such as deployment and incremental updates.',
		]),
		stack: [
			'Next.js',
			'TypeScript',
			'ISR',
			'Calendar UX',
			'Responsive UI',
			'Vercel',
		],
	},
	qapline: {
		type: 'Logistics ERP',
		priority: 3,
		summary:
			'Angular-based ERP frontend for logistics workflows, where I helped refactor decentralized state handling into a more structured Redux-based architecture.',
		content: richTextParagraphs([
			'Qapline was a web ERP system for a logistics company, focused on operational workflows rather than marketing presentation.',
			'My contribution centered on improving frontend structure by replacing fragmented two-way binding patterns with a more centralized state-management approach using Redux.',
			'This project shows the type of engineering work I bring to complex internal tools: untangling frontend state, improving predictability, and making the application easier to extend over time.',
		]),
		stack: [
			'Angular',
			'Redux',
			'Enterprise UI',
			'State Management',
			'B2B Workflows',
		],
	},
	aview: {
		type: 'Catalogue Management App',
		priority: 6,
		summary:
			'Angular client for product data and digital catalogue management, using RxJS and redux-observable style patterns for structured async state handling.',
		content: richTextParagraphs([
			'aView was built for product data and digital catalogue management, which meant the frontend had to handle richer operational flows than a typical content site.',
			'I worked on an Angular application using centralized state patterns and reactive tooling, including RxJS and Epics middleware.',
			'The project reflects my strength in applications where frontend complexity comes from business workflows, asynchronous state, and the need for UI predictability.',
		]),
		stack: [
			'Angular',
			'RxJS',
			'redux-observable',
			'TypeScript',
			'Internal Tools',
		],
	},
	'poohead-card-game': {
		type: 'Interactive Multiplayer App',
		priority: 9,
		summary:
			'Online multiplayer card game built with React on the client side and a Node-based game engine flow, focused on interactive frontend behavior.',
		content: richTextParagraphs([
			'Poohead Card Game was an online multiplayer card game, which made the frontend inherently interactive and state-driven.',
			'I built the client in React while integrating with a server-side game engine workflow, creating a user experience built around multiplayer game interaction rather than static content.',
			'This project is useful proof of range: I am comfortable not only with product dashboards and fintech interfaces, but also with interaction-heavy frontend experiences.',
		]),
		stack: [
			'React',
			'Node.js',
			'BoardGame.io',
			'Interactive UI',
			'Multiplayer Flows',
		],
		projectUrl: '',
	},
	'hearthstone-ai': {
		type: 'AI / Research Project',
		priority: 10,
		summary:
			"Master's thesis project focused on designing a Hearthstone AI agent using Monte Carlo Tree Search for game-state evaluation.",
		content: richTextParagraphs([
			"Hearthstone AI was developed as part of my master's thesis and stands apart from the commercial work in the portfolio.",
			'The project focused on designing an AI agent for card-game decision making, using Monte Carlo Tree Search for evaluating game states.',
			'While it is not a frontend product case study, it adds useful depth to the portfolio by showing analytical thinking, systems reasoning, and long-form technical problem solving.',
		]),
		stack: ['C#', 'AI', 'Monte Carlo Tree Search', 'Game Systems'],
	},
	'abugo-brand-platform-migration': {
		type: 'Multi-brand CMS Platform',
		priority: 2,
		summary:
			'Current ABUGO migration initiative focused on a shared Next.js and Storyblok monorepo platform intended to become the single source of truth for multiple brand homepages through configurable apps and automation-heavy delivery.',
		content: richTextParagraphs([
			'In ABUGO, I work on a new migration initiative that unifies homepage infrastructure for multiple brands into a shared monorepo built around Next.js and Storyblok.',
			'I am not only contributing as a frontend developer, but also acting as the codebase owner for the migration direction: shared frontend architecture, Storyblok contracts, reusable blocks, and the overall technical shape of the platform.',
			'The target model is a configurable core application that individual brands can adapt to their own needs while keeping one source of truth, shared delivery standards, and a heavily automated agent-oriented workflow.',
		]),
		stack: [
			'Next.js App Router',
			'Storyblok',
			'Turborepo',
			'Platform Architecture',
			'Multi-brand CMS',
			'Agentic Workflow',
		],
		projectUrl: '',
	},
	'shopsys-platform-core': {
		type: 'E-commerce Frontend Platform',
		priority: 1,
		summary:
			'Shared e-commerce storefront platform at Shopsys built on Next.js Pages Router, React, TypeScript, URQL, and generated GraphQL operations, with Cypress and Vitest coverage for reusable project implementations.',
		content: richTextParagraphs([
			'At Shopsys, I work on the shared storefront core used as the frontend base for multiple e-commerce implementations. The codebase is organized around Next.js Pages Router, React, TypeScript, Zustand, URQL, and generated GraphQL operations against the platform frontend API.',
			'The work is platform-oriented rather than project-local: reusable order and payment flows, generated types, storefront architecture, Tailwind export for admin integration, and delivery that fits Dockerized development together with branch review deployments and GitHub Actions workflows.',
			'My recent work has focused on GoPay and payment reliability: hardening return and confirmation flows, stabilizing payment-status handling and GTM deduplication, updating GraphQL operations and generated types, adding Vitest and Cypress regression coverage, and verifying iframe-sensitive changes on real HTTPS review branches with Playwright evidence.',
		]),
		stack: [
			'Next.js Pages Router',
			'React',
			'TypeScript',
			'URQL',
			'GraphQL Codegen',
			'Cypress',
			'Vitest',
			'Docker Review Apps',
		],
		projectUrl: 'https://www.shopsys.cz/',
		repositoryUrl: 'https://github.com/shopsys/shopsys',
	},
	'lipa-waste-collection-calendar': {
		type: 'Municipal Service Web App',
		priority: 5,
		summary:
			'Public-facing waste collection calendar for the municipality of Lipa, designed to make communal and sorted waste pickup dates clearer through focused calendar views and a simple annual data update workflow.',
		content: richTextParagraphs([
			'I built this application for a municipal office to make waste collection schedules easier for residents to understand than the original spreadsheet-based format.',
			'The product centers on practical clarity: a hero section showing the nearest pickup, plus day, week, and month calendar views that make upcoming communal and sorted waste collection dates easy to scan on desktop and mobile.',
			'Under the hood, the project uses a local XLSX-to-JSON parser so the yearly schedule can be refreshed with a low-risk workflow and deployed as a static Next.js application without adding unnecessary operational complexity.',
		]),
		stack: [
			'Next.js App Router',
			'TypeScript',
			'Static Deployment',
			'Calendar UI',
			'XLSX Parser',
			'Civic Tech',
		],
	},
};

const curatedExperience: Record<string, StoryblokRichText> = {
	'Frontend Developer - Shopsys': richTextParagraphs([
		'Since June 6, 2024, I have worked at Shopsys on a shared storefront/platform used as the frontend base for project implementations. The stack centers on Next.js Pages Router, React, TypeScript, Zustand, URQL, and GraphQL code generation inside a larger Symfony-based e-commerce platform.',
		'My work spans reusable storefront architecture, order and payment flows, generated GraphQL operations, UI behavior, and regression coverage with Vitest and Cypress, all shipped through Dockerized development, review-branch deployments, and GitHub Actions workflows.',
		'Most recently I have been driving GoPay and GTM-related reliability work: hardening return and callback flows, stabilizing payment state behavior, keeping generated types in sync, and validating iframe-touching changes on HTTPS review branches with Playwright evidence. In parallel, I also moved onto the ABUGO migration initiative where I stay hands-on in frontend while owning the codebase direction for a new Storyblok monorepo platform.',
	]),
	'Senior Frontend Web Developer - Solwee': richTextParagraphs([
		'I led the frontend implementation of a Next.js prototype, translating an existing visual direction into a reusable and responsive UI system the client could extend with low friction.',
	]),
	'Senior Frontend Web Developer - DEAP': richTextParagraphs([
		'I helped deliver the first version of an energy comparison product, contributing React and TypeScript work across form flows, state management, and reusable UI inside a fast-moving product team.',
	]),
	'Frontend Web Developer - Numbrs': richTextParagraphs([
		'I worked on a Next.js Bitcoin wallet client, extending an existing codebase with new features while keeping hooks, Context API, routing, and API-driven flows coherent.',
	]),
	'Frontend Web Developer - Hark': richTextParagraphs([
		'I worked on Angular business applications for product data and digital catalogue management, contributing across reactive state patterns, integrations, and broader frontend delivery.',
	]),
	'Frontend Web Developer - Koala': richTextParagraphs([
		'I worked on a logistics ERP, helping move frontend complexity toward centralized state management while also contributing React work on a 3D configurator interface.',
	]),
};

function shouldKeepCuratedSocialLink(url: string): boolean {
	const normalizedUrl = url.trim().toLowerCase();
	return !normalizedUrl.includes('typeform.com');
}

export function applyBaselineContentCuration(
	bundle: StoryblokBaselineImportBundle,
): StoryblokBaselineImportBundle {
	const home = bundle.content.home;
	const lipaWasteProject = {
		source_entry_id: 'curated-project-lipa-waste-collection-calendar',
		relation_key: 'curated:project:lipa-waste-collection-calendar',
		content_type: 'page_project' as const,
		slug: 'lipa-waste-collection-calendar',
		content: {
			component: 'page_project' as const,
			title: 'Lipa Waste Collection Calendar',
			slug: 'lipa-waste-collection-calendar',
			summary: curatedProjects['lipa-waste-collection-calendar'].summary,
			content: curatedProjects['lipa-waste-collection-calendar'].content,
			published_date: '2026-03-01T00:00:00.000Z',
			project_url: 'https://www.odpady-lipa.cz/',
			repository_url: 'https://github.com/JanMolcik/rubbish-collection',
			type: curatedProjects['lipa-waste-collection-calendar'].type,
			portfolio_priority:
				curatedProjects['lipa-waste-collection-calendar'].priority,
			stack: curatedProjects['lipa-waste-collection-calendar'].stack,
			seo: [
				{
					component: 'seo_meta' as const,
					meta_title: 'Lipa Waste Collection Calendar',
					meta_description:
						curatedProjects['lipa-waste-collection-calendar'].summary,
					noindex: false as const,
				},
			],
		},
	};
	const shopsysProject = {
		source_entry_id: 'curated-project-shopsys-platform-core',
		relation_key: 'curated:project:shopsys-platform-core',
		content_type: 'page_project' as const,
		slug: 'shopsys-platform-core',
		content: {
			component: 'page_project' as const,
			title: 'Shopsys Platform Core',
			slug: 'shopsys-platform-core',
			summary: curatedProjects['shopsys-platform-core'].summary,
			content: curatedProjects['shopsys-platform-core'].content,
			published_date: '2024-06-06T00:00:00.000Z',
			project_url: curatedProjects['shopsys-platform-core'].projectUrl ?? '',
			repository_url:
				curatedProjects['shopsys-platform-core'].repositoryUrl ?? '',
			type: curatedProjects['shopsys-platform-core'].type,
			portfolio_priority: curatedProjects['shopsys-platform-core'].priority,
			stack: curatedProjects['shopsys-platform-core'].stack,
			seo: [
				{
					component: 'seo_meta' as const,
					meta_title: 'Shopsys Platform Core',
					meta_description: curatedProjects['shopsys-platform-core'].summary,
					noindex: false as const,
				},
			],
		},
	};
	const currentProject = {
		source_entry_id: 'curated-project-abugo-brand-platform-migration',
		relation_key: 'curated:project:abugo-brand-platform-migration',
		content_type: 'page_project' as const,
		slug: 'abugo-brand-platform-migration',
		content: {
			component: 'page_project' as const,
			title: 'ABUGO Brand Platform Migration',
			slug: 'abugo-brand-platform-migration',
			summary: curatedProjects['abugo-brand-platform-migration'].summary,
			content: curatedProjects['abugo-brand-platform-migration'].content,
			published_date: '2026-02-20T00:00:00.000Z',
			project_url:
				curatedProjects['abugo-brand-platform-migration'].projectUrl ?? '',
			type: curatedProjects['abugo-brand-platform-migration'].type,
			portfolio_priority:
				curatedProjects['abugo-brand-platform-migration'].priority,
			stack: curatedProjects['abugo-brand-platform-migration'].stack,
			seo: [
				{
					component: 'seo_meta' as const,
					meta_title: 'ABUGO Brand Platform Migration',
					meta_description:
						curatedProjects['abugo-brand-platform-migration'].summary,
					noindex: false as const,
				},
			],
		},
	};
	const currentExperience = {
		source_entry_id: 'curated-experience-shopsys-2024',
		relation_key: 'curated:experience:shopsys-2024',
		content_type: 'item_experience' as const,
		content: {
			component: 'item_experience' as const,
			title: 'Frontend Developer - Shopsys',
			company_name: 'Shopsys · Full-time',
			description: curatedExperience['Frontend Developer - Shopsys'],
			start_date: '2024-06-06T00:00:00.000Z',
			skills: [
				'Next.js Pages Router',
				'React',
				'TypeScript',
				'URQL',
				'GraphQL Codegen',
				'Cypress',
				'Vitest',
				'Platform Architecture',
			],
		},
	};

	if (
		!bundle.content.projects.some(
			(project) => project.slug === lipaWasteProject.slug,
		)
	) {
		bundle.content.projects.unshift(lipaWasteProject);
	}

	if (
		!bundle.content.projects.some(
			(project) => project.slug === shopsysProject.slug,
		)
	) {
		bundle.content.projects.unshift(shopsysProject);
	}

	if (
		!bundle.content.projects.some(
			(project) => project.slug === currentProject.slug,
		)
	) {
		bundle.content.projects.unshift(currentProject);
	}

	if (
		!bundle.content.experience.some(
			(experience) =>
				experience.content.title === currentExperience.content.title,
		)
	) {
		bundle.content.experience.unshift(currentExperience);
	}

	if (home) {
		home.content.social_links = home.content.social_links.filter((link) =>
			shouldKeepCuratedSocialLink(link.url),
		);
		home.content.role = curatedHome.role;
		home.content.hero_intro = curatedHome.heroIntro;
		home.content.about_intro = curatedHome.aboutIntro;
		home.content.availability_note = curatedHome.availabilityNote;
		home.content.availability_status = curatedHome.availabilityStatus;
		home.content.availability_timezone = curatedHome.availabilityTimezone;
		home.content.availability_response_time =
			curatedHome.availabilityResponseTime;
		home.content.featured_projects = curatedHome.featuredProjects;
		home.content.experience = [
			'curated:experience:shopsys-2024',
			...home.content.experience.filter(
				(key) => key !== 'curated:experience:shopsys-2024',
			),
		];

		if (home.content.seo[0]) {
			home.content.seo[0].meta_description =
				'Frontend engineer building React, Next.js, Storyblok, and platform-driven product interfaces across fintech, B2B systems, and multi-brand CMS initiatives.';
		}
	}

	bundle.content.projects = bundle.content.projects.map((project) => {
		const override = curatedProjects[project.slug];
		if (!override) {
			return project;
		}

		return {
			...project,
			content: {
				...project.content,
				type: override.type,
				portfolio_priority: override.priority,
				summary: override.summary,
				content: override.content,
				stack: override.stack,
				project_url:
					override.projectUrl !== undefined
						? override.projectUrl
						: project.content.project_url,
				repository_url:
					override.repositoryUrl !== undefined
						? override.repositoryUrl
						: project.content.repository_url,
				seo: project.content.seo.map((seo, index) =>
					index === 0
						? {
								...seo,
								meta_description: override.summary,
							}
						: seo,
				),
			},
		};
	});

	bundle.content.experience = bundle.content.experience.map((experience) => {
		const override = curatedExperience[experience.content.title];
		if (!override) {
			return experience;
		}

		return {
			...experience,
			content: {
				...experience.content,
				description: override,
			},
		};
	});

	bundle.content.social_links = bundle.content.social_links.filter((link) =>
		shouldKeepCuratedSocialLink(link.content.url),
	);

	bundle.summary.project_count = bundle.content.projects.length;
	bundle.summary.experience_count = bundle.content.experience.length;
	bundle.summary.social_link_count = bundle.content.social_links.length;

	return bundle;
}
