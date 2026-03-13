FROM node:22-bookworm-slim

ARG CODEX_CLI_VERSION=0.107.0
ARG CLAUDE_CODE_VERSION=2.1.68

RUN apt-get update && apt-get install -y --no-install-recommends \
	bash \
	ca-certificates \
	git \
	openssh-client \
&& rm -rf /var/lib/apt/lists/*

RUN corepack enable && corepack prepare pnpm@10.19.0 --activate
RUN npm install -g \
	@openai/codex@${CODEX_CLI_VERSION} \
	@anthropic-ai/claude-code@${CLAUDE_CODE_VERSION}

WORKDIR /workspace

CMD ["bash"]
