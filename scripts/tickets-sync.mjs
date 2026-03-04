import { mkdir, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { listTicketFiles, readTicket } from './tickets-lib.mjs';

const MATRIX_PATH = 'tickets/MATRIX.md';

function row(ticket) {
	const depends =
		ticket.dependsOn.length > 0 ? ticket.dependsOn.join(', ') : '-';
	const invariants =
		ticket.invariants.length > 0 ? ticket.invariants.join(', ') : '-';
	const relativePath = ticket.filePath.replace(/^tickets\//, '');
	const fileLink = `[${path.basename(ticket.filePath)}](./${relativePath})`;
	return `| ${ticket.id} | ${ticket.type} | ${ticket.title} | ${ticket.status} | ${ticket.priority} | ${ticket.owner} | ${depends} | ${invariants} | ${fileLink} |`;
}

async function writeAtomic(filePath, content) {
	await mkdir(path.dirname(filePath), { recursive: true });
	const tmp = `${filePath}.tmp`;
	await writeFile(tmp, content, 'utf8');
	await rename(tmp, filePath);
}

async function main() {
	const files = await listTicketFiles();
	const tickets = await Promise.all(
		files.map((filePath) => readTicket(filePath)),
	);

	tickets.sort((a, b) => a.id.localeCompare(b.id, 'en'));

	const lines = [
		'# Ticket Matrix',
		'',
		`Generated at: ${new Date().toISOString()}`,
		'',
		'| ID | Type | Title | Status | Priority | Owner | Depends On | Invariants | File |',
		'| --- | --- | --- | --- | --- | --- | --- | --- | --- |',
		...tickets.map((ticket) => row(ticket)),
		'',
	];

	await writeAtomic(MATRIX_PATH, `${lines.join('\n')}\n`);
	console.log(
		`tickets matrix synced: ${tickets.length} tickets -> ${MATRIX_PATH}`,
	);
}

main().catch((error) => {
	console.error(`tickets-sync failed: ${error.message}`);
	process.exit(1);
});
