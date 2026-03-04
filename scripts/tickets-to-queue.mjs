import { mkdir, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { listTicketFiles, readTicket } from './tickets-lib.mjs';

const DEFAULT_QUEUE_PATH = 'artifacts/ralph/task-queue.json';
const DEFAULT_STATUSES = ['ready', 'in_progress'];

function parseStatuses() {
	const raw = process.env.TICKETS_QUEUE_STATUSES;
	if (!raw) {
		return DEFAULT_STATUSES;
	}
	return raw
		.split(',')
		.map((status) => status.trim().toLowerCase())
		.filter(Boolean);
}

async function writeAtomic(filePath, payload) {
	await mkdir(path.dirname(filePath), { recursive: true });
	const tmp = `${filePath}.tmp`;
	await writeFile(tmp, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
	await rename(tmp, filePath);
}

async function main() {
	const queuePath = process.env.RALPH_QUEUE_PATH || DEFAULT_QUEUE_PATH;
	const activeStatuses = parseStatuses();
	const files = await listTicketFiles();
	const tickets = await Promise.all(
		files.map((filePath) => readTicket(filePath)),
	);

	const items = tickets
		.filter((ticket) => activeStatuses.includes(ticket.status.toLowerCase()))
		.sort((a, b) => a.id.localeCompare(b.id, 'en'))
		.map((ticket) => ({
			id: ticket.id,
			type: ticket.type,
			title: ticket.title,
			goal: ticket.goal,
			scope: ticket.scope,
			nonGoals: ticket.nonGoals,
			invariants: ticket.invariants.length > 0 ? ticket.invariants : ['INV-5'],
			acceptance: ticket.acceptance,
			status: 'pending',
			attempts: 0,
			source: ticket.filePath,
		}));

	const payload = {
		version: 'v1',
		source: 'local-markdown-ticket-system',
		generatedAt: new Date().toISOString(),
		filters: {
			statuses: activeStatuses,
		},
		items,
	};

	await writeAtomic(queuePath, payload);
	console.log(`queue generated: ${items.length} items -> ${queuePath}`);
}

main().catch((error) => {
	console.error(`tickets-to-queue failed: ${error.message}`);
	process.exit(1);
});
