#!/usr/bin/env bash

set -euo pipefail

MODE="${1:-funnel}"
PORT="${TAILSCALE_PREVIEW_PORT:-3000}"
HOST="${TAILSCALE_PREVIEW_HOST:-127.0.0.1}"
PREVIEW_SLUG_TEMPLATE="${TAILSCALE_PREVIEW_SLUG_TEMPLATE:-{{full_slug}}}"
AUTO_START_NEXT="${TAILSCALE_PREVIEW_AUTO_START_NEXT:-1}"
FALLBACK_ON_FUNNEL_DISABLED="${TAILSCALE_PREVIEW_FALLBACK_ON_FUNNEL_DISABLED:-1}"
TAILSCALE_MAP_TIMEOUT_SECONDS="${TAILSCALE_MAP_TIMEOUT_SECONDS:-10}"

if ! command -v tailscale >/dev/null 2>&1; then
	echo "tailscale CLI not found in PATH."
	exit 1
fi

if ! command -v pnpm >/dev/null 2>&1; then
	echo "pnpm not found in PATH."
	exit 1
fi

if [[ "${MODE}" != "serve" && "${MODE}" != "funnel" ]]; then
	echo "Unsupported mode '${MODE}'. Use 'serve' or 'funnel'."
	exit 1
fi

STATUS_JSON="$(tailscale status --json 2>/dev/null || true)"
if [[ -z "${STATUS_JSON}" ]]; then
	echo "Unable to read Tailscale status. Run 'tailscale up' first."
	exit 1
fi

ONLINE="$(
	node -e "const s=JSON.parse(process.argv[1]);process.stdout.write(String(Boolean(s?.Self?.Online)));" \
		"${STATUS_JSON}"
)"
DNS_NAME="$(
	node -e "const s=JSON.parse(process.argv[1]);process.stdout.write((s?.Self?.DNSName||'').replace(/\.$/,''));" \
		"${STATUS_JSON}"
)"

if [[ "${ONLINE}" != "true" ]]; then
	echo "Tailscale is offline. Run 'tailscale up' and retry."
	exit 1
fi

if [[ -z "${DNS_NAME}" ]]; then
	echo "Unable to determine Tailscale DNS name."
	exit 1
fi

status_json_for_mode() {
	local current_mode="${1}"
	if [[ "${current_mode}" == "serve" ]]; then
		tailscale serve status --json 2>/dev/null || echo '{}'
	else
		tailscale funnel status --json 2>/dev/null || echo '{}'
	fi
}

status_has_mapping() {
	local raw_json="${1}"
	node -e "const j=JSON.parse(process.argv[1]); process.stdout.write(String(Object.keys(j || {}).length > 0));" "${raw_json}"
}

run_tailscale_mapping() {
	local current_mode="${1}"
	local log_file="/tmp/my-portfolio-tailscale-${current_mode}.log"
	: > "${log_file}"

	tailscale "${current_mode}" --bg --yes "${PORT}" >"${log_file}" 2>&1 &
	local map_pid=$!

	for _ in $(seq 1 "${TAILSCALE_MAP_TIMEOUT_SECONDS}"); do
		local status_json
		status_json="$(status_json_for_mode "${current_mode}")"
		if [[ "$(status_has_mapping "${status_json}")" == "true" ]]; then
			if kill -0 "${map_pid}" >/dev/null 2>&1; then
				disown "${map_pid}" 2>/dev/null || true
			fi
			cat "${log_file}"
			return 0
		fi

		if [[ -s "${log_file}" ]] && rg -qi "not enabled on your tailnet" "${log_file}"; then
			kill "${map_pid}" >/dev/null 2>&1 || true
			wait "${map_pid}" >/dev/null 2>&1 || true
			cat "${log_file}"
			return 100
		fi

		if ! kill -0 "${map_pid}" >/dev/null 2>&1; then
			wait "${map_pid}" >/dev/null 2>&1
			local map_rc=$?
			cat "${log_file}"
			if [[ "${map_rc}" -eq 0 ]]; then
				return 0
			fi
			return "${map_rc}"
		fi

		sleep 1
	done

	if kill -0 "${map_pid}" >/dev/null 2>&1; then
		kill "${map_pid}" >/dev/null 2>&1 || true
		wait "${map_pid}" >/dev/null 2>&1 || true
	fi

	if [[ -s "${log_file}" ]]; then
		cat "${log_file}"
	else
		echo "Tailscale ${current_mode} command timed out after ${TAILSCALE_MAP_TIMEOUT_SECONDS}s with no active mapping."
	fi
	return 1
}

echo "Starting Next.js dev server on http://${HOST}:${PORT} ..."
NEXT_PID=""
MANAGED_NEXT="0"

if curl -sSf "http://${HOST}:${PORT}/" >/dev/null 2>&1; then
	echo "Detected existing server on ${HOST}:${PORT}, reusing it."
else
	if [[ "${AUTO_START_NEXT}" == "1" ]]; then
		pnpm exec next dev -p "${PORT}" >/tmp/my-portfolio-dev-tailscale.log 2>&1 &
		NEXT_PID=$!
		MANAGED_NEXT="1"
	else
		echo "No server detected on ${HOST}:${PORT} and auto-start is disabled."
		echo "Run 'pnpm run dev' first or set TAILSCALE_PREVIEW_AUTO_START_NEXT=1."
		exit 1
	fi
fi

cleanup() {
	if [[ "${MANAGED_NEXT}" == "1" ]] && kill -0 "${NEXT_PID}" >/dev/null 2>&1; then
		kill "${NEXT_PID}" >/dev/null 2>&1 || true
	fi
}
trap cleanup EXIT

READY=0
for _ in $(seq 1 60); do
	if curl -sSf "http://${HOST}:${PORT}/" >/dev/null 2>&1; then
		READY=1
		break
	fi
	if [[ "${MANAGED_NEXT}" == "1" ]] && ! kill -0 "${NEXT_PID}" >/dev/null 2>&1; then
		echo "Next.js dev server exited unexpectedly."
		tail -n 60 /tmp/my-portfolio-dev-tailscale.log || true
		exit 1
	fi
	sleep 1
done

if [[ "${READY}" != "1" ]]; then
	echo "Server did not become ready on ${HOST}:${PORT}."
	if [[ "${MANAGED_NEXT}" == "1" ]]; then
		tail -n 60 /tmp/my-portfolio-dev-tailscale.log || true
	fi
	exit 1
fi

MAP_OUTPUT=""
if [[ "${MODE}" == "serve" ]]; then
	set +e
	MAP_OUTPUT="$(run_tailscale_mapping "serve")"
	MAP_RC=$?
	set -e
	if [[ "${MAP_RC}" -ne 0 ]]; then
		echo "${MAP_OUTPUT}"
		exit "${MAP_RC}"
	fi
else
	set +e
	MAP_OUTPUT="$(run_tailscale_mapping "funnel")"
	FUNNEL_RC=$?
	set -e
	if [[ "${FUNNEL_RC}" -ne 0 ]]; then
		if [[ "${FUNNEL_RC}" -eq 100 ]]; then
			echo "Tailscale Funnel is not enabled on this tailnet."
			echo "${MAP_OUTPUT}"
			if [[ "${FALLBACK_ON_FUNNEL_DISABLED}" == "1" ]]; then
				echo "Falling back to tailscale serve..."
				MODE="serve"
				set +e
				MAP_OUTPUT="$(run_tailscale_mapping "serve")"
				MAP_RC=$?
				set -e
				if [[ "${MAP_RC}" -ne 0 ]]; then
					if [[ "${MAP_RC}" -eq 100 ]]; then
						echo "Tailscale Serve is also not enabled on this tailnet."
					fi
					echo "${MAP_OUTPUT}"
					exit "${MAP_RC}"
				fi
			else
				exit "${FUNNEL_RC}"
			fi
		else
			echo "${MAP_OUTPUT}"
			exit "${FUNNEL_RC}"
		fi
	fi
fi

BASE_URL="https://${DNS_NAME}"
if [[ "${MODE}" == "serve" ]]; then
	STATUS_CMD="tailscale serve status"
else
	STATUS_CMD="tailscale funnel status"
fi

echo
echo "Tailscale mode: ${MODE}"
echo "Base URL: ${BASE_URL}"
if [[ -n "${MAP_OUTPUT}" ]]; then
	echo "Mapping output: ${MAP_OUTPUT}"
fi
if [[ -n "${PREVIEW_SECRET:-}" ]]; then
	echo "Storyblok Preview URL:"
	echo "${BASE_URL}/api/preview?secret=${PREVIEW_SECRET}&slug=${PREVIEW_SLUG_TEMPLATE}"
else
	echo "PREVIEW_SECRET not set. Export it before running for full preview URL output."
	echo "Example URL:"
	echo "${BASE_URL}/api/preview?secret=<PREVIEW_SECRET>&slug=${PREVIEW_SLUG_TEMPLATE}"
fi
echo
echo "Status:"
${STATUS_CMD} || true
echo
if [[ "${MANAGED_NEXT}" == "1" ]]; then
	echo "Dev server log: /tmp/my-portfolio-dev-tailscale.log"
	echo "Press Ctrl+C to stop Next.js. Tailscale ${MODE} mapping stays active until reset."
	wait "${NEXT_PID}"
else
	echo "Using existing dev server process. Helper finished; mapping remains active until reset."
fi
