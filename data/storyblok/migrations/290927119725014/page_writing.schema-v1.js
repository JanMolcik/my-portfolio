function moveLegacyField(block, legacyField, canonicalField) {
	if (block[canonicalField] === undefined && block[legacyField] !== undefined) {
		block[canonicalField] = block[legacyField];
	}
	delete block[legacyField];
}

export default function migratePageWriting(block) {
	if (!block || typeof block !== 'object') {
		return block;
	}

	moveLegacyField(block, 'publishedDate', 'published_date');
	moveLegacyField(block, 'coverImage', 'cover_image');

	return block;
}
