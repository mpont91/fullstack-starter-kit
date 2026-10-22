# Build context is the repo root: the API depends on packages/shared.

# Has the full toolchain, Prisma CLI included. Besides building, it is the image
# the `migrate` service runs: migrations only happen on deploy, so the CLI and
# its weight stay out of the image that serves traffic.
FROM node:24-slim AS builder

WORKDIR /app

# The Prisma schema engine (migrate) needs OpenSSL.
RUN apt-get update -y \
    && apt-get install -y openssl \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json .npmrc ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN npm ci -w @app/shared -w @app/api --include-workspace-root

COPY tsconfig.base.json ./
COPY packages/shared packages/shared
COPY apps/api apps/api

RUN npm run build -w @app/shared
RUN cd apps/api && npx prisma generate && npx tsup

WORKDIR /app/apps/api

FROM node:24-slim

WORKDIR /app

COPY package.json package-lock.json .npmrc ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
# --omit=optional too: the Prisma CLI is an optional peer of @prisma/client, so
# npm keeps it under --omit=dev alone.
RUN npm ci --omit=dev --omit=optional -w @app/shared -w @app/api \
    && npm cache clean --force

COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/apps/api/dist ./apps/api/dist

WORKDIR /app/apps/api

ENV NODE_ENV=production

EXPOSE 3000

CMD ["node", "dist/index.js"]
