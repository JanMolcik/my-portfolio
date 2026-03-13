function moveLegacyField(block, legacyField, canonicalField) {
	if (block[canonicalField] === undefined && block[legacyField] !== undefined) {
		block[canonicalField] = block[legacyField];
	}
	delete block[legacyField];
}

export default function migratePageProject(block) {
	if (!block || typeof block !== 'object') {
		return block;
	}

	moveLegacyField(block, 'publishedDate', 'published_date');
	moveLegacyField(block, 'projectUrl', 'project_url');
	moveLegacyField(block, 'repositoryUrl', 'repository_url');
	moveLegacyField(block, 'portfolioPriority', 'portfolio_priority');
	moveLegacyField(block, 'techStack', 'stack');
	moveLegacyField(block, 'projectStack', 'stack');

	return block;
}
