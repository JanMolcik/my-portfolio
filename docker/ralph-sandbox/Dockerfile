FROM node:22-bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
	bash \
	ca-certificates \
	git \
	openssh-client \
&& rm -rf /var/lib/apt/lists/*

RUN corepack enable && corepack prepare pnpm@10.19.0 --activate

WORKDIR /workspace

CMD ["bash"]
