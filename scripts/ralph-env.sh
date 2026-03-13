#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_ROOT"

ENV_FILE="${RALPH_ENV_FILE:-.env.ralph}"
ENV_LOCAL_FILE="${RALPH_ENV_LOCAL_FILE:-.env.ralph.local}"

if [[ ! -f "$ENV_FILE" ]]; then
	echo "Missing $ENV_FILE." >&2
	echo "Copy .env.ralph.example -> .env.ralph and retry." >&2
	exit 2
fi

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
if [[ -f "$ENV_LOCAL_FILE" ]]; then
	# shellcheck disable=SC1090
	source "$ENV_LOCAL_FILE"
fi
set +a

# Bridge generic Ralph env to orchestrator-specific knobs.
# This keeps .env.ralph simple while still driving scripts/ralph-orchestrator.sh.
if [[ -n "${RALPH_ENGINE:-}" && -z "${RALPH_ORCH_PRIMARY_ENGINE:-}" ]]; then
	export RALPH_ORCH_PRIMARY_ENGINE="$RALPH_ENGINE"
fi

if [[ -z "${RALPH_ORCH_FALLBACK_ENGINE:-}" ]]; then
	if [[ "${RALPH_ORCH_PRIMARY_ENGINE:-}" == "codex" ]]; then
		export RALPH_ORCH_FALLBACK_ENGINE="claude"
	elif [[ "${RALPH_ORCH_PRIMARY_ENGINE:-}" == "claude" ]]; then
		export RALPH_ORCH_FALLBACK_ENGINE="codex"
	fi
fi

if [[ -n "${RALPH_CODEX_ARGS:-}" && -z "${RALPH_ORCH_CODEX_ARGS:-}" ]]; then
	export RALPH_ORCH_CODEX_ARGS="$RALPH_CODEX_ARGS"
fi

if [[ -n "${RALPH_CLAUDE_ARGS:-}" && -z "${RALPH_ORCH_CLAUDE_ARGS:-}" ]]; then
	export RALPH_ORCH_CLAUDE_ARGS="$RALPH_CLAUDE_ARGS"
fi

if [[ -n "${RALPH_DOCKER_MODE:-}" && -z "${RALPH_ORCH_DOCKER_MODE:-}" ]]; then
	export RALPH_ORCH_DOCKER_MODE="$RALPH_DOCKER_MODE"
fi

if [[ -n "${RALPH_DOCKER_SKIP_BUILD:-}" && -z "${RALPH_ORCH_DOCKER_SKIP_BUILD:-}" ]]; then
	export RALPH_ORCH_DOCKER_SKIP_BUILD="$RALPH_DOCKER_SKIP_BUILD"
fi

if [[ -n "${RALPH_DOCKER_INSTALL_DEPS:-}" && -z "${RALPH_ORCH_DOCKER_INSTALL_DEPS:-}" ]]; then
	export RALPH_ORCH_DOCKER_INSTALL_DEPS="$RALPH_DOCKER_INSTALL_DEPS"
fi

if [[ -n "${RALPH_DOCKER_NODE_MODULES_VOLUME:-}" && -z "${RALPH_ORCH_DOCKER_NODE_MODULES_VOLUME:-}" ]]; then
	export RALPH_ORCH_DOCKER_NODE_MODULES_VOLUME="$RALPH_DOCKER_NODE_MODULES_VOLUME"
fi

if [[ -n "${RALPH_DOCKER_PNPM_STORE_VOLUME:-}" && -z "${RALPH_ORCH_DOCKER_PNPM_STORE_VOLUME:-}" ]]; then
	export RALPH_ORCH_DOCKER_PNPM_STORE_VOLUME="$RALPH_DOCKER_PNPM_STORE_VOLUME"
fi

if [[ $# -eq 0 ]]; then
	exec pnpm run ralph:docker:loop:inplace
fi

exec "$@"
