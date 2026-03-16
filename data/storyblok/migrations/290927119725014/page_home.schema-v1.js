function moveLegacyField(block, legacyField, canonicalField) {
	if (block[canonicalField] === undefined && block[legacyField] !== undefined) {
		block[canonicalField] = block[legacyField];
	}
	delete block[legacyField];
}

function normalizeStringList(value) {
	if (Array.isArray(value)) {
		return value
			.filter((item) => typeof item === 'string')
			.map((item) => item.trim())
			.filter((item) => item.length > 0);
	}

	if (typeof value === 'string') {
		return value
			.split(',')
			.map((item) => item.trim())
			.filter((item) => item.length > 0);
	}

	return [];
}

export default function migratePageHome(block) {
	if (!block || typeof block !== 'object') {
		return block;
	}

	moveLegacyField(block, 'socialLinks', 'social_links');
	moveLegacyField(block, 'featuredProjects', 'featured_projects');
	moveLegacyField(block, 'heroIntro', 'hero_intro');
	moveLegacyField(block, 'aboutIntro', 'about_intro');
	moveLegacyField(block, 'availabilityNote', 'availability_note');
	moveLegacyField(block, 'availabilityStatus', 'availability_status');
	moveLegacyField(block, 'availabilityTimezone', 'availability_timezone');
	moveLegacyField(
		block,
		'availabilityResponseTime',
		'availability_response_time',
	);
	moveLegacyField(block, 'profileImage', 'profile_image');
	moveLegacyField(block, 'techStack', 'tech_stack');

	if (block.profile_image === undefined && Array.isArray(block.seo)) {
		const primarySeo = block.seo.find(
			(item) => item && typeof item === 'object' && !Array.isArray(item),
		);
		const ogImage =
			primarySeo && typeof primarySeo === 'object' ? primarySeo.og_image : undefined;
		if (ogImage !== undefined) {
			block.profile_image = ogImage;
		}
	}

	if (block.tech_stack === undefined && block.roles !== undefined) {
		block.tech_stack = block.roles;
	}

	if (Array.isArray(block.tech_stack) || typeof block.tech_stack === 'string') {
		block.tech_stack = {
			plugin: 'storyblok-tags',
			value: normalizeStringList(block.tech_stack),
		};
	} else if (
		block.tech_stack &&
		typeof block.tech_stack === 'object' &&
		!Array.isArray(block.tech_stack)
	) {
		block.tech_stack = {
			...block.tech_stack,
			plugin: 'storyblok-tags',
			value: normalizeStringList(block.tech_stack.value),
		};
	}

	delete block.roles;

	return block;
}
