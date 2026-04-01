FROM node:20-slim AS base
RUN corepack enable && corepack prepare pnpm@9.15.9 --activate

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY lib/api-zod/package.json lib/api-zod/
COPY lib/db/package.json lib/db/
COPY lib/integrations-openai-ai-server/package.json lib/integrations-openai-ai-server/
COPY artifacts/api-server/package.json artifacts/api-server/
RUN pnpm install --no-frozen-lockfile --filter @workspace/api-server...

FROM deps AS build
COPY lib/ lib/
COPY artifacts/api-server/ artifacts/api-server/
RUN cd artifacts/api-server && pnpm run build

FROM base AS runtime
WORKDIR /app
COPY --from=build /app/artifacts/api-server/dist ./artifacts/api-server/dist
COPY --from=build /app/node_modules ./node_modules
EXPOSE 3000
ENV NODE_ENV=production
CMD ["node", "--enable-source-maps", "artifacts/api-server/dist/index.mjs"]
