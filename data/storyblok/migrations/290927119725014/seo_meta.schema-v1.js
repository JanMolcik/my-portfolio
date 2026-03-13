function moveLegacyField(block, legacyField, canonicalField) {
	if (block[canonicalField] === undefined && block[legacyField] !== undefined) {
		block[canonicalField] = block[legacyField];
	}
	delete block[legacyField];
}

export default function migrateSeoMeta(block) {
	if (!block || typeof block !== 'object') {
		return block;
	}

	moveLegacyField(block, 'metaTitle', 'meta_title');
	moveLegacyField(block, 'metaDescription', 'meta_description');
	moveLegacyField(block, 'canonical', 'canonical_url');
	moveLegacyField(block, 'ogImage', 'og_image');

	return block;
}
