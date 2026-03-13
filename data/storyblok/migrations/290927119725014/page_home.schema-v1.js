function moveLegacyField(block, legacyField, canonicalField) {
	if (block[canonicalField] === undefined && block[legacyField] !== undefined) {
		block[canonicalField] = block[legacyField];
	}
	delete block[legacyField];
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

	return block;
}
