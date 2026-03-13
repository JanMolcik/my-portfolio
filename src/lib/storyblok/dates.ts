function pad(value: number): string {
	return String(value).padStart(2, '0');
}

export function parseStoryblokDate(value?: string | null): Date | null {
	if (!value) {
		return null;
	}

	const normalized = value.trim();
	if (normalized.length === 0) {
		return null;
	}

	const storyblokDateTimeMatch = normalized.match(
		/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?$/,
	);
	if (storyblokDateTimeMatch) {
		const [, year, month, day, hour = '00', minute = '00', second = '00'] =
			storyblokDateTimeMatch;
		return new Date(
			Date.UTC(
				Number(year),
				Number(month) - 1,
				Number(day),
				Number(hour),
				Number(minute),
				Number(second),
			),
		);
	}

	const parsed = new Date(normalized);
	if (Number.isNaN(parsed.getTime())) {
		return null;
	}

	return parsed;
}

export function formatStoryblokDateTime(value?: string | null): string | undefined {
	const parsed = parseStoryblokDate(value);
	if (!parsed) {
		return undefined;
	}

	return `${parsed.getUTCFullYear()}-${pad(parsed.getUTCMonth() + 1)}-${pad(
		parsed.getUTCDate(),
	)} ${pad(parsed.getUTCHours())}:${pad(parsed.getUTCMinutes())}`;
}
