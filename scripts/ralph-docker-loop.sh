#!/usr/bin/env bash
set -euo pipefail

IMAGE_NAME="${RALPH_DOCKER_IMAGE:-my-portfolio-ralph:latest}"
QUEUE_PATH="${RALPH_QUEUE_PATH:-artifacts/ralph/task-queue.json}"
LOOP_ARGS="${RALPH_LOOP_ARGS:-}"

if [[ -z "${RALPH_AGENT_CMD_TEMPLATE:-}" ]]; then
	echo "Missing RALPH_AGENT_CMD_TEMPLATE env." >&2
	echo "Example: export RALPH_AGENT_CMD_TEMPLATE='codex exec --prompt-file {{TASK_PROMPT_FILE}}'" >&2
	exit 1
fi

docker build -f docker/ralph-sandbox/Dockerfile -t "$IMAGE_NAME" .

docker run --rm \
	-v "$PWD:/workspace" \
	-w /workspace \
	-e RALPH_QUEUE_PATH="$QUEUE_PATH" \
	-e RALPH_ENGINE="${RALPH_ENGINE:-codex}" \
	-e RALPH_AGENT_CMD_TEMPLATE="$RALPH_AGENT_CMD_TEMPLATE" \
	-e RALPH_VERIFY_CMD="${RALPH_VERIFY_CMD:-}" \
	-e RALPH_PROMPT_TEMPLATE_PATH="${RALPH_PROMPT_TEMPLATE_PATH:-docs/spec/RALPH_TASK_PROMPT_TEMPLATE.md}" \
	-e RALPH_REQUIRE_AGENTS_ACK="${RALPH_REQUIRE_AGENTS_ACK:-1}" \
	-e RALPH_CODEX_ARGS="${RALPH_CODEX_ARGS:-}" \
	-e RALPH_CLAUDE_ARGS="${RALPH_CLAUDE_ARGS:-}" \
	-e RALPH_CONTINUE_ON_FAIL="${RALPH_CONTINUE_ON_FAIL:-0}" \
	-e RALPH_ARTIFACTS_DIR="${RALPH_ARTIFACTS_DIR:-artifacts/ralph}" \
	-e TICKETS_QUEUE_STATUSES="${TICKETS_QUEUE_STATUSES:-ready,in_progress}" \
	"$IMAGE_NAME" \
	sh -lc "pnpm install --frozen-lockfile && node scripts/tickets-to-queue.mjs && node scripts/ralph-loop.mjs $LOOP_ARGS"
