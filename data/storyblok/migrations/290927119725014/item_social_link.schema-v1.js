function moveLegacyField(block, legacyField, canonicalField) {
	if (block[canonicalField] === undefined && block[legacyField] !== undefined) {
		block[canonicalField] = block[legacyField];
	}
	delete block[legacyField];
}

export default function migrateItemSocialLink(block) {
	if (!block || typeof block !== 'object') {
		return block;
	}

	moveLegacyField(block, 'label', 'name');

	return block;
}
