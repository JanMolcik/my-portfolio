#!/usr/bin/env bash
set -euo pipefail

PROMPT_FILE="${1:-}"
ENGINE="${RALPH_ENGINE:-codex}"

if [[ -z "$PROMPT_FILE" ]]; then
	echo "Usage: bash scripts/ralph-agent-runner.sh <task-prompt-file>" >&2
	exit 2
fi

if [[ ! -f "$PROMPT_FILE" ]]; then
	echo "Prompt file not found: $PROMPT_FILE" >&2
	exit 2
fi

ACK_TOKEN="$(sed -n 's/^- Required AGENTS ack token: `\(.*\)`/\1/p' "$PROMPT_FILE" | head -n1)"

run_and_stream() {
	local cmd="$1"
	set +e
	local output
	output="$(bash -lc "$cmd" 2>&1)"
	local status=$?
	set -e

	printf '%s\n' "$output"

	if [[ $status -ne 0 ]]; then
		exit "$status"
	fi

	if [[ "${RALPH_REQUIRE_AGENTS_ACK:-1}" != "0" && -n "$ACK_TOKEN" ]]; then
		if ! grep -Fq "$ACK_TOKEN" <<<"$output"; then
			echo "Missing required AGENTS ack token in agent output: $ACK_TOKEN" >&2
			exit 42
		fi
	fi
}

case "$ENGINE" in
codex)
	if ! command -v codex >/dev/null 2>&1; then
		echo "codex CLI not found in PATH" >&2
		exit 127
	fi
	CODEX_ARGS="${RALPH_CODEX_ARGS:-}"
	run_and_stream "codex exec ${CODEX_ARGS} --prompt-file \"$PROMPT_FILE\""
	;;
claude)
	if ! command -v claude >/dev/null 2>&1; then
		echo "claude CLI not found in PATH" >&2
		exit 127
	fi
	CLAUDE_ARGS="${RALPH_CLAUDE_ARGS:-}"
	run_and_stream "claude ${CLAUDE_ARGS} -p \"\$(cat \"$PROMPT_FILE\")\""
	;;
*)
	echo "Unsupported RALPH_ENGINE: $ENGINE (expected: codex|claude)" >&2
	exit 2
	;;
esac
