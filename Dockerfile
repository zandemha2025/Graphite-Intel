FROM node:20-slim
RUN corepack enable && corepack prepare pnpm@9.15.9 --activate

WORKDIR /app

# Copy entire workspace so all lib/* and artifacts/* packages are available
COPY . .

# Enable hoisting so transitive deps (e.g. openai) are accessible across workspace packages
RUN echo "shamefully-hoist=true" >> .npmrc

# Install all workspace dependencies
RUN pnpm install --no-frozen-lockfile

# Build the api-server (esbuild bundles workspace deps into single file)
RUN cd artifacts/api-server && pnpm run build

EXPOSE 3000
ENV NODE_ENV=production
CMD ["node", "--enable-source-maps", "artifacts/api-server/dist/index.mjs"]
