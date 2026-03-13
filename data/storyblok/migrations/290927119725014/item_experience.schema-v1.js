function moveLegacyField(block, legacyField, canonicalField) {
	if (block[canonicalField] === undefined && block[legacyField] !== undefined) {
		block[canonicalField] = block[legacyField];
	}
	delete block[legacyField];
}

export default function migrateItemExperience(block) {
	if (!block || typeof block !== 'object') {
		return block;
	}

	moveLegacyField(block, 'companyName', 'company_name');
	moveLegacyField(block, 'startDate', 'start_date');
	moveLegacyField(block, 'endDate', 'end_date');

	return block;
}
