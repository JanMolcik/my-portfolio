export type ProjectLink = {
	href: string;
	label: 'live' | 'source' | 'details';
	external: boolean;
};

type ProjectLinkInput = {
	slug: string;
	projectUrl?: string;
	repositoryUrl?: string;
};

function hasUrl(value?: string): value is string {
	return typeof value === 'string' && value.trim().length > 0;
}

export function getProjectCardLinks({
	slug,
	projectUrl,
	repositoryUrl,
}: ProjectLinkInput): ProjectLink[] {
	const links: ProjectLink[] = [];

	if (hasUrl(projectUrl)) {
		links.push({
			href: projectUrl,
			label: 'live',
			external: true,
		});
	}

	if (hasUrl(repositoryUrl)) {
		links.push({
			href: repositoryUrl,
			label: 'source',
			external: true,
		});
	}

	if (!hasUrl(projectUrl) || !hasUrl(repositoryUrl)) {
		links.push({
			href: `/projects/${slug}`,
			label: 'details',
			external: false,
		});
	}

	return links;
}

export function getProjectExternalLinks(input: ProjectLinkInput): ProjectLink[] {
	return getProjectCardLinks(input).filter((link) => link.external);
}
