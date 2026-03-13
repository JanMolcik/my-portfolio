type LogValue = string | number | boolean | null | undefined;

type LogMetadata = Record<string, LogValue>;

type SerializableError = {
	name: string;
	message: string;
	stack: string | null;
};

function normalizeError(error: unknown): SerializableError {
	if (error instanceof Error) {
		return {
			name: error.name,
			message: error.message,
			stack: error.stack ?? null,
		};
	}

	return {
		name: 'UnknownError',
		message: typeof error === 'string' ? error : 'Non-Error value thrown',
		stack: null,
	};
}

function buildLogEntry(
	level: 'info' | 'error',
	event: string,
	metadata?: LogMetadata,
) {
	return JSON.stringify({
		timestamp: new Date().toISOString(),
		level,
		event,
		metadata: metadata ?? {},
	});
}

export function logInfo(event: string, metadata?: LogMetadata) {
	console.info(buildLogEntry('info', event, metadata));
}

export function logServerError(
	event: string,
	error: unknown,
	metadata?: LogMetadata,
) {
	const normalizedError = normalizeError(error);
	console.error(
		buildLogEntry('error', event, {
			...metadata,
			error_name: normalizedError.name,
			error_message: normalizedError.message,
			error_stack: normalizedError.stack,
		}),
	);
}
