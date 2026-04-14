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
	moveLegacyField(block, 'updatedDate', 'updated_date');
	moveLegacyField(block, 'coverImage', 'cover_image');
	moveLegacyField(block, 'coverImageAlt', 'cover_image_alt');
	moveLegacyField(block, 'sourceType', 'source_type');
	moveLegacyField(block, 'sourceUrl', 'source_url');
	moveLegacyField(block, 'sourceTitle', 'source_title');
	moveLegacyField(block, 'contentOrigin', 'content_origin');
	moveLegacyField(block, 'readingTimeMinutes', 'reading_time_minutes');

	// Pilot markdown-import aliases from legacy local notes are normalized here so
	// content migration and write-side import tooling share the same field names.
	moveLegacyField(block, 'source', 'source_url');
	moveLegacyField(block, 'based_on', 'source_title');
	moveLegacyField(block, 'created', 'published_date');

	return block;
}
