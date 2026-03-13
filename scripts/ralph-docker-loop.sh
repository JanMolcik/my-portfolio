#!/usr/bin/env bash
set -euo pipefail

IMAGE_NAME="${RALPH_DOCKER_IMAGE:-my-portfolio-ralph:latest}"
QUEUE_PATH="${RALPH_QUEUE_PATH:-artifacts/ralph/task-queue.json}"
LOOP_ARGS="${RALPH_LOOP_ARGS:-}"
ENGINE="${RALPH_ENGINE:-codex}"
DOCKER_MODE="${RALPH_DOCKER_MODE:-isolated}"
DOCKER_SANDBOX_ROOT="${RALPH_DOCKER_SANDBOX_ROOT:-${TMPDIR:-/tmp}/my-portfolio-ralph-workspaces}"
DOCKER_SKIP_BUILD="${RALPH_DOCKER_SKIP_BUILD:-0}"
DOCKER_SKIP_QUEUE_BUILD="${RALPH_DOCKER_SKIP_QUEUE_BUILD:-0}"
DOCKER_INSTALL_DEPS="${RALPH_DOCKER_INSTALL_DEPS:-1}"
DOCKER_SYNC_BACK="${RALPH_DOCKER_SYNC_BACK:-0}"
DOCKER_USER="${RALPH_DOCKER_USER:-$(id -u):$(id -g)}"
DOCKER_NODE_MODULES_VOLUME="${RALPH_DOCKER_NODE_MODULES_VOLUME:-}"
DOCKER_PNPM_STORE_VOLUME="${RALPH_DOCKER_PNPM_STORE_VOLUME:-}"
DOCKER_SHARE_CLAUDE_AUTH="${RALPH_DOCKER_SHARE_CLAUDE_AUTH:-1}"
DOCKER_CLAUDE_DIR="${RALPH_DOCKER_CLAUDE_DIR:-${HOME:-}/.claude}"
DOCKER_CLAUDE_STATE_FILE="${RALPH_DOCKER_CLAUDE_STATE_FILE:-${HOME:-}/.claude.json}"
DOCKER_SHARE_CODEX_AUTH="${RALPH_DOCKER_SHARE_CODEX_AUTH:-0}"
DOCKER_CODEX_HOME="${RALPH_DOCKER_CODEX_HOME:-${CODEX_HOME:-${HOME:-}/.codex}}"
GIT_USER_NAME="${RALPH_GIT_USER_NAME:-Ralph Loop Bot}"
GIT_USER_EMAIL="${RALPH_GIT_USER_EMAIL:-ralph-loop@local}"
RUN_ID="$(date -u +%Y%m%dT%H%M%SZ)"
WORKSPACE_PATH="$PWD"
ISOLATED_WORKSPACE=""
DOCKER_SANDBOX_EXCLUDE="$DOCKER_SANDBOX_ROOT"

if [[ "$DOCKER_SANDBOX_ROOT" != /* ]]; then
	DOCKER_SANDBOX_EXCLUDE="$DOCKER_SANDBOX_ROOT"
	DOCKER_SANDBOX_ROOT="$PWD/$DOCKER_SANDBOX_ROOT"
elif [[ "$DOCKER_SANDBOX_ROOT" == "$PWD/"* ]]; then
	DOCKER_SANDBOX_EXCLUDE="${DOCKER_SANDBOX_ROOT#"$PWD/"}"
fi

if [[ -z "${RALPH_AGENT_CMD_TEMPLATE:-}" ]]; then
	echo "Missing RALPH_AGENT_CMD_TEMPLATE env." >&2
	echo "Example: export RALPH_AGENT_CMD_TEMPLATE='codex exec --prompt-file {{TASK_PROMPT_FILE}}'" >&2
	exit 1
fi

if [[ "$DOCKER_MODE" == "isolated" ]]; then
	if ! command -v rsync >/dev/null 2>&1; then
		echo "rsync is required for RALPH_DOCKER_MODE=isolated" >&2
		exit 1
	fi
	ISOLATED_WORKSPACE="$DOCKER_SANDBOX_ROOT/$RUN_ID"
	mkdir -p "$ISOLATED_WORKSPACE"
	rsync -a --delete \
		--exclude '.git' \
		--exclude 'node_modules' \
		--exclude '.next' \
		--exclude '.pnpm-store' \
		--exclude "$DOCKER_SANDBOX_EXCLUDE" \
		"$PWD/" "$ISOLATED_WORKSPACE/"
	WORKSPACE_PATH="$ISOLATED_WORKSPACE"
	echo "ralph-docker: isolated workspace -> $WORKSPACE_PATH"
elif [[ "$DOCKER_MODE" == "inplace" ]]; then
	echo "ralph-docker: inplace workspace -> $WORKSPACE_PATH"
else
	echo "Unsupported RALPH_DOCKER_MODE: $DOCKER_MODE (expected: isolated|inplace)" >&2
	exit 1
fi

if [[ "$DOCKER_SKIP_BUILD" != "1" ]]; then
	docker build -f docker/ralph-sandbox/Dockerfile -t "$IMAGE_NAME" .
fi

DOCKER_RUN_ARGS=(
	--rm
	--user "$DOCKER_USER"
	-v "$WORKSPACE_PATH:/workspace"
	-w /workspace
	-e HOME=/tmp
	-e CI=true
	-e RALPH_QUEUE_PATH="$QUEUE_PATH"
	-e RALPH_ENGINE="$ENGINE"
	-e RALPH_AGENT_CMD_TEMPLATE="$RALPH_AGENT_CMD_TEMPLATE"
	-e RALPH_VERIFY_CMD="${RALPH_VERIFY_CMD:-}"
	-e RALPH_PROMPT_TEMPLATE_PATH="${RALPH_PROMPT_TEMPLATE_PATH:-docs/spec/RALPH_TASK_PROMPT_TEMPLATE.md}"
	-e RALPH_REQUIRE_AGENTS_ACK="${RALPH_REQUIRE_AGENTS_ACK:-1}"
	-e RALPH_CODEX_ARGS="${RALPH_CODEX_ARGS:-}"
	-e RALPH_CLAUDE_ARGS="${RALPH_CLAUDE_ARGS:-}"
	-e RALPH_CONTINUE_ON_FAIL="${RALPH_CONTINUE_ON_FAIL:-0}"
	-e RALPH_ARTIFACTS_DIR="${RALPH_ARTIFACTS_DIR:-artifacts/ralph}"
	-e TICKETS_QUEUE_STATUSES="${TICKETS_QUEUE_STATUSES:-ready,in_progress}"
	-e COREPACK_ENABLE_DOWNLOAD_PROMPT="${COREPACK_ENABLE_DOWNLOAD_PROMPT:-0}"
	-e RALPH_GIT_USER_NAME="$GIT_USER_NAME"
	-e RALPH_GIT_USER_EMAIL="$GIT_USER_EMAIL"
	-e GIT_AUTHOR_NAME="$GIT_USER_NAME"
	-e GIT_AUTHOR_EMAIL="$GIT_USER_EMAIL"
	-e GIT_COMMITTER_NAME="$GIT_USER_NAME"
	-e GIT_COMMITTER_EMAIL="$GIT_USER_EMAIL"
)

if [[ "$DOCKER_MODE" == "inplace" ]]; then
	if [[ -n "$DOCKER_NODE_MODULES_VOLUME" ]]; then
		DOCKER_RUN_ARGS+=(-v "$DOCKER_NODE_MODULES_VOLUME:/workspace/node_modules")
	else
		DOCKER_RUN_ARGS+=(-v /workspace/node_modules)
	fi

	if [[ -n "$DOCKER_PNPM_STORE_VOLUME" ]]; then
		DOCKER_RUN_ARGS+=(-v "$DOCKER_PNPM_STORE_VOLUME:/workspace/.pnpm-store")
	else
		DOCKER_RUN_ARGS+=(-v /workspace/.pnpm-store)
	fi
fi

if [[ "$ENGINE" == "claude" && "$DOCKER_SHARE_CLAUDE_AUTH" == "1" ]]; then
	if [[ ! -d "$DOCKER_CLAUDE_DIR" ]]; then
		echo "Missing Claude auth dir for Docker subscription mode: $DOCKER_CLAUDE_DIR" >&2
		exit 1
	fi
	if [[ ! -f "$DOCKER_CLAUDE_STATE_FILE" ]]; then
		echo "Missing Claude auth state file for Docker subscription mode: $DOCKER_CLAUDE_STATE_FILE" >&2
		exit 1
	fi
	DOCKER_RUN_ARGS+=(-v "$DOCKER_CLAUDE_DIR:/tmp/.claude")
	DOCKER_RUN_ARGS+=(-v "$DOCKER_CLAUDE_STATE_FILE:/tmp/.claude.json")
	echo "ralph-docker: mounted Claude subscription auth into container"
fi

if [[ "$ENGINE" == "codex" && "$DOCKER_SHARE_CODEX_AUTH" == "1" ]]; then
	if [[ ! -d "$DOCKER_CODEX_HOME" ]]; then
		echo "Missing Codex auth home for Docker mode: $DOCKER_CODEX_HOME" >&2
		exit 1
	fi
	DOCKER_RUN_ARGS+=(-v "$DOCKER_CODEX_HOME:/tmp/.codex")
	DOCKER_RUN_ARGS+=(-e CODEX_HOME=/tmp/.codex)
	echo "ralph-docker: mounted Codex auth home into container"
fi

CONTAINER_COMMAND="umask 022 && pnpm config set store-dir /workspace/.pnpm-store"
if [[ "$DOCKER_INSTALL_DEPS" == "1" ]]; then
	CONTAINER_COMMAND="$CONTAINER_COMMAND && pnpm install --frozen-lockfile"
fi
if [[ "$DOCKER_SKIP_QUEUE_BUILD" != "1" ]]; then
	CONTAINER_COMMAND="$CONTAINER_COMMAND && node scripts/tickets-to-queue.mjs"
fi
CONTAINER_COMMAND="$CONTAINER_COMMAND && node scripts/ralph-loop.mjs $LOOP_ARGS"

docker run \
	"${DOCKER_RUN_ARGS[@]}" \
	"$IMAGE_NAME" \
	sh -lc "$CONTAINER_COMMAND"

if [[ "$DOCKER_MODE" == "isolated" ]]; then
	# Always sync loop artifacts/queue metadata back to source workspace.
	if [[ -f "$WORKSPACE_PATH/$QUEUE_PATH" ]]; then
		mkdir -p "$PWD/$(dirname "$QUEUE_PATH")"
		cp "$WORKSPACE_PATH/$QUEUE_PATH" "$PWD/$QUEUE_PATH"
	fi
	for rel in artifacts/ralph artifacts/task-briefs artifacts/tester-agent; do
		if [[ -d "$WORKSPACE_PATH/$rel" ]]; then
			mkdir -p "$PWD/$rel"
			rsync -a "$WORKSPACE_PATH/$rel/" "$PWD/$rel/"
		fi
	done

	if [[ "$DOCKER_SYNC_BACK" == "1" ]]; then
		echo "ralph-docker: syncing isolated workspace changes back to repository root"
		rsync -a \
			--exclude '.git' \
			--exclude 'node_modules' \
			--exclude '.next' \
			--exclude '.pnpm-store' \
			--exclude "$DOCKER_SANDBOX_EXCLUDE" \
			"$WORKSPACE_PATH/" "$PWD/"
	fi
fi
