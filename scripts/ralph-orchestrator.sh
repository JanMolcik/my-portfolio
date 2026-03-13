#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_ROOT"

QUEUE_PATH="${RALPH_QUEUE_PATH:-artifacts/ralph/task-queue.json}"
PRIMARY_ENGINE="${RALPH_ORCH_PRIMARY_ENGINE:-claude}"
FALLBACK_ENGINE="${RALPH_ORCH_FALLBACK_ENGINE:-codex}"
RUNTIME="${RALPH_ORCH_RUNTIME:-docker}"
MAX_ATTEMPTS_PER_ITEM="${RALPH_ORCH_MAX_ATTEMPTS_PER_ITEM:-6}"
SLEEP_SECONDS="${RALPH_ORCH_SLEEP_SECONDS:-3}"
CLAUDE_BACKOFF_SECONDS="${RALPH_ORCH_CLAUDE_BACKOFF_SECONDS:-1800}"
LOOP_TIMEOUT_SECONDS="${RALPH_ORCH_LOOP_TIMEOUT_SECONDS:-1800}"
RETRY_FAILED_ON_START="${RALPH_ORCH_RETRY_FAILED_ON_START:-1}"
VERIFY_CMD="${RALPH_VERIFY_CMD:-}"
REQUIRE_ACK="${RALPH_REQUIRE_AGENTS_ACK:-0}"

CLAUDE_ARGS="${RALPH_ORCH_CLAUDE_ARGS:---model opus --permission-mode bypassPermissions --verbose --no-session-persistence}"
CODEX_ARGS_PRIMARY="${RALPH_ORCH_CODEX_ARGS:---model gpt-5.4 --dangerously-bypass-approvals-and-sandbox}"
CODEX_ARGS_FALLBACK="${RALPH_ORCH_CODEX_ARGS_FALLBACK:---model gpt-5.4 --dangerously-bypass-approvals-and-sandbox}"
ORCH_DOCKER_MODE="${RALPH_ORCH_DOCKER_MODE:-inplace}"
ORCH_DOCKER_AUTO_BUILD="${RALPH_ORCH_DOCKER_AUTO_BUILD:-1}"
ORCH_DOCKER_SKIP_BUILD="${RALPH_ORCH_DOCKER_SKIP_BUILD:-1}"
ORCH_DOCKER_INSTALL_DEPS="${RALPH_ORCH_DOCKER_INSTALL_DEPS:-1}"
ORCH_DOCKER_NODE_MODULES_VOLUME="${RALPH_ORCH_DOCKER_NODE_MODULES_VOLUME:-my-portfolio-ralph-node-modules}"
ORCH_DOCKER_PNPM_STORE_VOLUME="${RALPH_ORCH_DOCKER_PNPM_STORE_VOLUME:-my-portfolio-ralph-pnpm-store}"

RUN_STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
ORCH_LOG_DIR="artifacts/ralph/orchestrator"
ORCH_LOG_FILE="$ORCH_LOG_DIR/${RUN_STAMP}.log"
mkdir -p "$ORCH_LOG_DIR"

CURRENT_ENGINE="$PRIMARY_ENGINE"
CODEX_ARGS_ACTIVE="$CODEX_ARGS_PRIMARY"
CLAUDE_BACKOFF_UNTIL=0
FORCE_ENGINE_NEXT=""

if [[ -n "${RALPH_AGENT_CMD_TEMPLATE:-}" ]]; then
	AGENT_TEMPLATE="$RALPH_AGENT_CMD_TEMPLATE"
else
	AGENT_TEMPLATE='bash scripts/ralph-agent-runner.sh "{{TASK_PROMPT_FILE}}"'
fi

log() {
	printf '%s %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$*" | tee -a "$ORCH_LOG_FILE"
}

queue_counts() {
	node -e '
const fs=require("fs");
const p=process.argv[1];
if(!fs.existsSync(p)){console.log("0 0 0");process.exit(0);}
const q=JSON.parse(fs.readFileSync(p,"utf8"));
let pending=0,failed=0,done=0;
for(const i of q.items||[]){const s=(i.status||"pending"); if(s==="pending") pending++; else if(s==="failed") failed++; else if(s==="done") done++;}
console.log(`${pending} ${failed} ${done}`);
' "$QUEUE_PATH"
}

queue_first_pending_id() {
	node -e '
const fs=require("fs");
const p=process.argv[1];
if(!fs.existsSync(p)){process.exit(0);}
const q=JSON.parse(fs.readFileSync(p,"utf8"));
const i=(q.items||[]).find((x)=>(x.status||"pending")==="pending");
if(i) console.log(i.id);
' "$QUEUE_PATH"
}

queue_latest_failed_json() {
	node -e '
const fs=require("fs");
const p=process.argv[1];
if(!fs.existsSync(p)){console.log("{}");process.exit(0);}
const q=JSON.parse(fs.readFileSync(p,"utf8"));
const failed=(q.items||[]).filter((i)=>(i.status||"pending")==="failed");
if(failed.length===0){console.log("{}");process.exit(0);}
failed.sort((a,b)=>{
  const af=Date.parse(a.finishedAt||a.startedAt||0)||0;
  const bf=Date.parse(b.finishedAt||b.startedAt||0)||0;
  return bf-af;
});
const f=failed[0];
console.log(JSON.stringify({
  id:f.id||"",
  attempts:Number(f.attempts||0),
  lastError:String(f.lastError||""),
  agentLogPath:String((f.lastLogs&&f.lastLogs.agentLogPath)||"")
}));
' "$QUEUE_PATH"
}

queue_reset_in_progress() {
	node -e '
const fs=require("fs");
const p=process.argv[1];
if(!fs.existsSync(p)){process.exit(0);}
const q=JSON.parse(fs.readFileSync(p,"utf8"));
let changed=0;
for(const i of q.items||[]){
  if((i.status||"pending")==="in_progress"){
    i.status="pending";
    delete i.startedAt;
    i.lastError="stale-run-reset";
    changed++;
  }
}
if(changed>0){fs.writeFileSync(p,JSON.stringify(q,null,2)+"\n");}
console.log(changed);
' "$QUEUE_PATH"
}

queue_reset_failed_to_pending() {
	local id="$1"
	node -e '
const fs=require("fs");
const p=process.argv[1];
const id=process.argv[2];
if(!fs.existsSync(p)){process.exit(0);}
const q=JSON.parse(fs.readFileSync(p,"utf8"));
const item=(q.items||[]).find((i)=>i.id===id);
if(!item){process.exit(0);}
if((item.status||"pending")==="failed"){
  item.status="pending";
  delete item.startedAt;
  delete item.finishedAt;
  item.lastError="orchestrator-retry";
  fs.writeFileSync(p,JSON.stringify(q,null,2)+"\n");
}
' "$QUEUE_PATH" "$id"
}

queue_mark_failed_skipped() {
	local id="$1"
	node -e '
const fs=require("fs");
const p=process.argv[1];
const id=process.argv[2];
if(!fs.existsSync(p)){process.exit(0);}
const q=JSON.parse(fs.readFileSync(p,"utf8"));
const item=(q.items||[]).find((i)=>i.id===id);
if(!item){process.exit(0);}
item.status="failed";
item.lastError=(item.lastError?item.lastError+" | ":"")+"orchestrator:max-attempts-reached";
fs.writeFileSync(p,JSON.stringify(q,null,2)+"\n");
' "$QUEUE_PATH" "$id"
}

ensure_queue_file() {
	if [[ ! -f "$QUEUE_PATH" ]]; then
		log "queue file missing -> generating via pnpm run tickets:queue"
		pnpm run tickets:queue >/dev/null
	fi
}

ensure_runtime_ready() {
	if [[ "$RUNTIME" != "docker" && "$RUNTIME" != "native" ]]; then
		log "unsupported RALPH_ORCH_RUNTIME=$RUNTIME (expected docker|native)"
		exit 2
	fi

	if [[ "$RUNTIME" == "docker" && "$ORCH_DOCKER_AUTO_BUILD" == "1" ]]; then
		log "docker runtime selected -> building sandbox image"
		pnpm run ralph:docker:build >/dev/null
	fi
}

run_one_loop() {
	local engine="$1"
	local next_id="$2"
	log "run start runtime=$RUNTIME engine=$engine task=$next_id"

	local rc=0
	local loop_pid=0
	local started_at now elapsed
	started_at="$(date +%s)"

	if [[ "$RUNTIME" == "docker" ]]; then
		if [[ "$engine" == "claude" ]]; then
			(
				RALPH_ENGINE=claude \
				RALPH_CLAUDE_ARGS="$CLAUDE_ARGS" \
				RALPH_AGENT_CMD_TEMPLATE="$AGENT_TEMPLATE" \
				RALPH_QUEUE_PATH="$QUEUE_PATH" \
				RALPH_LOOP_ARGS="--once" \
				RALPH_REQUIRE_AGENTS_ACK="$REQUIRE_ACK" \
				RALPH_VERIFY_CMD="$VERIFY_CMD" \
				RALPH_DOCKER_MODE="$ORCH_DOCKER_MODE" \
				RALPH_DOCKER_SKIP_BUILD="$ORCH_DOCKER_SKIP_BUILD" \
				RALPH_DOCKER_SKIP_QUEUE_BUILD=1 \
				RALPH_DOCKER_INSTALL_DEPS="$ORCH_DOCKER_INSTALL_DEPS" \
				RALPH_DOCKER_NODE_MODULES_VOLUME="$ORCH_DOCKER_NODE_MODULES_VOLUME" \
				RALPH_DOCKER_PNPM_STORE_VOLUME="$ORCH_DOCKER_PNPM_STORE_VOLUME" \
				bash scripts/ralph-docker-loop.sh
			) &
			loop_pid=$!
		else
			(
				RALPH_ENGINE=codex \
				RALPH_CODEX_ARGS="$CODEX_ARGS_ACTIVE" \
				RALPH_AGENT_CMD_TEMPLATE="$AGENT_TEMPLATE" \
				RALPH_QUEUE_PATH="$QUEUE_PATH" \
				RALPH_LOOP_ARGS="--once" \
				RALPH_REQUIRE_AGENTS_ACK="$REQUIRE_ACK" \
				RALPH_VERIFY_CMD="$VERIFY_CMD" \
				RALPH_DOCKER_MODE="$ORCH_DOCKER_MODE" \
				RALPH_DOCKER_SKIP_BUILD="$ORCH_DOCKER_SKIP_BUILD" \
				RALPH_DOCKER_SKIP_QUEUE_BUILD=1 \
				RALPH_DOCKER_INSTALL_DEPS="$ORCH_DOCKER_INSTALL_DEPS" \
				RALPH_DOCKER_NODE_MODULES_VOLUME="$ORCH_DOCKER_NODE_MODULES_VOLUME" \
				RALPH_DOCKER_PNPM_STORE_VOLUME="$ORCH_DOCKER_PNPM_STORE_VOLUME" \
				bash scripts/ralph-docker-loop.sh
			) &
			loop_pid=$!
		fi
	else
		if [[ "$engine" == "claude" ]]; then
			(
				RALPH_ENGINE=claude \
				RALPH_CLAUDE_ARGS="$CLAUDE_ARGS" \
				RALPH_AGENT_CMD_TEMPLATE="$AGENT_TEMPLATE" \
				RALPH_QUEUE_PATH="$QUEUE_PATH" \
				RALPH_REQUIRE_AGENTS_ACK="$REQUIRE_ACK" \
				RALPH_VERIFY_CMD="$VERIFY_CMD" \
				node scripts/ralph-loop.mjs --once
			) &
			loop_pid=$!
		else
			(
				RALPH_ENGINE=codex \
				RALPH_CODEX_ARGS="$CODEX_ARGS_ACTIVE" \
				RALPH_AGENT_CMD_TEMPLATE="$AGENT_TEMPLATE" \
				RALPH_QUEUE_PATH="$QUEUE_PATH" \
				RALPH_REQUIRE_AGENTS_ACK="$REQUIRE_ACK" \
				RALPH_VERIFY_CMD="$VERIFY_CMD" \
				node scripts/ralph-loop.mjs --once
			) &
			loop_pid=$!
		fi
	fi

	while kill -0 "$loop_pid" 2>/dev/null; do
		now="$(date +%s)"
		elapsed="$((now - started_at))"
		if [[ "$elapsed" -ge "$LOOP_TIMEOUT_SECONDS" ]]; then
			log "run timeout engine=$engine task=$next_id timeout=${LOOP_TIMEOUT_SECONDS}s -> killing pid=$loop_pid"
			kill "$loop_pid" 2>/dev/null || true
			sleep 2
			kill -9 "$loop_pid" 2>/dev/null || true
			rc=124
			break
		fi
		sleep 2
	done

	if [[ "$rc" -ne 124 ]]; then
		wait "$loop_pid" || rc=$?
	fi

	log "run finish runtime=$RUNTIME engine=$engine task=$next_id rc=$rc"
	return "$rc"
}

classify_failure() {
	local failed_json="$1"
	local last_error=""
	local log_path=""
	last_error="$(node -e 'const o=JSON.parse(process.argv[1]||"{}"); process.stdout.write(String(o.lastError||""));' "$failed_json")"
	log_path="$(node -e 'const o=JSON.parse(process.argv[1]||"{}"); process.stdout.write(String(o.agentLogPath||""));' "$failed_json")"

	local blob="$last_error"
	if [[ -n "$log_path" && -f "$log_path" ]]; then
		blob="$blob"$'\n'"$(tail -n 80 "$log_path" || true)"
	fi

	if grep -Eiq 'rate limit|usage limit|too many requests|hit your limit|try again at|purchase more credits' <<<"$blob"; then
		echo "rate_limit"
		return
	fi
	if grep -Eiq 'missing required agents ack token' <<<"$blob"; then
		echo "ack"
		return
	fi
	if grep -Eiq 'unknown model|unsupported model|invalid model' <<<"$blob"; then
		echo "model"
		return
	fi
	if grep -Eiq 'unexpected argument|usage: codex exec|usage: claude' <<<"$blob"; then
		echo "cli_args"
		return
	fi
	if grep -Eiq 'cli not found in path|command not found|exit 127' <<<"$blob"; then
		echo "cli_missing"
		return
	fi
	if grep -Eiq 'verify command failed' <<<"$blob"; then
		echo "verify"
		return
	fi
	echo "generic"
}

ensure_queue_file
ensure_runtime_ready
stale_resets="$(queue_reset_in_progress)"
if [[ "$stale_resets" != "0" ]]; then
	log "reset stale in_progress items count=$stale_resets"
fi

if [[ "$RETRY_FAILED_ON_START" == "1" ]]; then
	node -e '
const fs=require("fs");
const p=process.argv[1];
if(!fs.existsSync(p)){process.exit(0);}
const q=JSON.parse(fs.readFileSync(p,"utf8"));
let changed=0;
for(const i of q.items||[]){
  if((i.status||"pending")==="failed"){
    i.status="pending";
    delete i.startedAt;
    delete i.finishedAt;
    i.lastError="orchestrator-startup-retry";
    changed++;
  }
}
if(changed>0){fs.writeFileSync(p,JSON.stringify(q,null,2)+"\n");}
console.log(changed);
' "$QUEUE_PATH" | {
		read -r changed_count
		if [[ "${changed_count:-0}" != "0" ]]; then
			log "startup retry enabled -> reset failed->pending count=$changed_count"
		fi
	}
fi

log "orchestrator started queue=$QUEUE_PATH runtime=$RUNTIME primary=$PRIMARY_ENGINE fallback=$FALLBACK_ENGINE maxAttempts=$MAX_ATTEMPTS_PER_ITEM"

while true; do
	read -r pending_count failed_count done_count <<<"$(queue_counts)"
	if [[ "$pending_count" == "0" ]]; then
		log "queue complete pending=0 failed=$failed_count done=$done_count"
		break
	fi

	now_epoch="$(date +%s)"
	if [[ -n "$FORCE_ENGINE_NEXT" ]]; then
		CURRENT_ENGINE="$FORCE_ENGINE_NEXT"
		FORCE_ENGINE_NEXT=""
	elif [[ "$PRIMARY_ENGINE" == "claude" && "$now_epoch" -lt "$CLAUDE_BACKOFF_UNTIL" ]]; then
		CURRENT_ENGINE="$FALLBACK_ENGINE"
	else
		CURRENT_ENGINE="$PRIMARY_ENGINE"
	fi

	next_id="$(queue_first_pending_id)"
	if [[ -z "$next_id" ]]; then
		log "no pending id found even though pending_count=$pending_count -> sleeping"
		sleep "$SLEEP_SECONDS"
		continue
	fi

	loop_rc=0
	if run_one_loop "$CURRENT_ENGINE" "$next_id"; then
		CLAUDE_BACKOFF_UNTIL=0
		sleep "$SLEEP_SECONDS"
		continue
	else
		loop_rc=$?
	fi

	if [[ "$loop_rc" -eq 124 ]]; then
		timeout_resets="$(queue_reset_in_progress)"
		if [[ "$timeout_resets" != "0" ]]; then
			log "timeout recovery -> reset in_progress items count=$timeout_resets"
		fi
		queue_reset_failed_to_pending "$next_id"
		if [[ "$CURRENT_ENGINE" == "$PRIMARY_ENGINE" ]]; then
			FORCE_ENGINE_NEXT="$FALLBACK_ENGINE"
		else
			FORCE_ENGINE_NEXT="$PRIMARY_ENGINE"
		fi
		sleep "$SLEEP_SECONDS"
		continue
	fi

	failed_json="$(queue_latest_failed_json)"
	failed_id="$(node -e 'const o=JSON.parse(process.argv[1]||"{}"); process.stdout.write(String(o.id||""));' "$failed_json")"
	failed_attempts="$(node -e 'const o=JSON.parse(process.argv[1]||"{}"); process.stdout.write(String(o.attempts||0));' "$failed_json")"
	failure_kind="$(classify_failure "$failed_json")"
	log "failure task=$failed_id attempts=$failed_attempts kind=$failure_kind engine=$CURRENT_ENGINE"

	if [[ -z "$failed_id" ]]; then
		sleep "$SLEEP_SECONDS"
		continue
	fi

	if [[ "$failed_attempts" -ge "$MAX_ATTEMPTS_PER_ITEM" ]]; then
		queue_mark_failed_skipped "$failed_id"
		log "max attempts reached for task=$failed_id -> leaving as failed and moving on"
		sleep "$SLEEP_SECONDS"
		continue
	fi

	case "$failure_kind" in
	rate_limit)
		if [[ "$CURRENT_ENGINE" == "claude" ]]; then
			CLAUDE_BACKOFF_UNTIL="$((now_epoch + CLAUDE_BACKOFF_SECONDS))"
			log "claude rate-limit detected -> backoff until epoch=$CLAUDE_BACKOFF_UNTIL and retry on fallback engine"
			FORCE_ENGINE_NEXT="$FALLBACK_ENGINE"
		fi
		queue_reset_failed_to_pending "$failed_id"
		;;
	ack)
		REQUIRE_ACK=0
		queue_reset_failed_to_pending "$failed_id"
		log "ack failure -> forcing RALPH_REQUIRE_AGENTS_ACK=0 and retry"
		;;
	model)
		if [[ "$CURRENT_ENGINE" == "codex" && "$CODEX_ARGS_ACTIVE" != "$CODEX_ARGS_FALLBACK" ]]; then
			CODEX_ARGS_ACTIVE="$CODEX_ARGS_FALLBACK"
			log "codex model fallback activated args='$CODEX_ARGS_ACTIVE'"
		fi
		queue_reset_failed_to_pending "$failed_id"
		;;
	cli_args)
		queue_reset_failed_to_pending "$failed_id"
		if [[ "$CURRENT_ENGINE" == "$PRIMARY_ENGINE" ]]; then
			FORCE_ENGINE_NEXT="$FALLBACK_ENGINE"
			log "cli args failure -> retrying task=$failed_id on fallback engine=$FALLBACK_ENGINE"
		else
			FORCE_ENGINE_NEXT="$PRIMARY_ENGINE"
			log "cli args failure -> retrying task=$failed_id on primary engine=$PRIMARY_ENGINE"
		fi
		;;
	cli_missing)
		queue_reset_failed_to_pending "$failed_id"
		log "cli missing failure -> task reset for retry after environment adjustments"
		;;
	verify|generic)
		queue_reset_failed_to_pending "$failed_id"
		if [[ "$CURRENT_ENGINE" == "$PRIMARY_ENGINE" ]]; then
			FORCE_ENGINE_NEXT="$FALLBACK_ENGINE"
			log "retrying failed task=$failed_id on fallback engine=$FALLBACK_ENGINE"
		else
			FORCE_ENGINE_NEXT="$PRIMARY_ENGINE"
			log "retrying failed task=$failed_id on primary engine=$PRIMARY_ENGINE"
		fi
		;;
	esac

	sleep "$SLEEP_SECONDS"
done

log "orchestrator finished"
