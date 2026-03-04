# Local Ticket System

This repository uses a local markdown-first ticketing system.

## Structure

- `tickets/epics/*.md`
- `tickets/user-stories/*.md`
- `tickets/bugs/*.md`
- `tickets/MATRIX.md` (generated overview)

## Status values

- `backlog`
- `ready`
- `in_progress`
- `review`
- `blocked`
- `done`

## Workflow

1. Fragment canonical spec into markdown tickets (`pnpm tickets:fragment`).
2. Sync matrix overview (`pnpm tickets:sync`).
3. Generate queue for ralph loop (`pnpm tickets:queue`).
4. Run sequential agent loop (`pnpm ralph:once` or `pnpm ralph:loop`).
5. Re-sync matrix after changes (`pnpm tickets:sync`).
