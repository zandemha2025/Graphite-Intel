FROM node:20-slim
RUN corepack enable && corepack prepare pnpm@9.15.9 --activate

WORKDIR /app

# Copy everything needed for install
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY .npmrc ./
COPY lib/api-client-react/package.json lib/api-client-react/
COPY lib/api-spec/package.json lib/api-spec/
COPY lib/api-zod/package.json lib/api-zod/
COPY lib/db/package.json lib/db/
COPY lib/integrations-openai-ai-react/package.json lib/integrations-openai-ai-react/
COPY lib/integrations-openai-ai-server/package.json lib/integrations-openai-ai-server/
COPY lib/pipedream-connect/package.json lib/pipedream-connect/
COPY lib/replit-auth-web/package.json lib/replit-auth-web/
COPY artifacts/api-server/package.json artifacts/api-server/
COPY artifacts/mockup-sandbox/package.json artifacts/mockup-sandbox/
COPY artifacts/stratix/package.json artifacts/stratix/

# Enable hoisting so transitive deps (e.g. openai) are accessible across workspace packages
RUN echo "shamefully-hoist=true" >> .npmrc

# Install all workspace dependencies
RUN pnpm install --no-frozen-lockfile

# Copy source code
COPY lib/ lib/
COPY artifacts/api-server/ artifacts/api-server/

# Build the api-server (esbuild bundles workspace deps into single file)
RUN cd artifacts/api-server && pnpm run build

EXPOSE 3000
ENV NODE_ENV=production
CMD ["node", "--enable-source-maps", "artifacts/api-server/dist/index.mjs"]
