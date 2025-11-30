# Dockerfile for My Karaoke Party
FROM node:22-alpine AS base

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Install necessary dependencies
RUN apk add --no-cache libc6-compat openssl

WORKDIR /app

ARG VERSION
# New Build Arguments
ARG BUILD_DATE
ARG GIT_COMMIT_SHA

# ========================================
# Stage 1: Build the application
# ========================================
FROM base AS builder

WORKDIR /app

ARG VERSION
ARG ECR_BUILD=false
ARG NEXT_PUBLIC_APP_URL
# Pass ARGs to Builder Stage
ARG BUILD_DATE
ARG GIT_COMMIT_SHA

ENV NEXT_PUBLIC_MKP_APP_VER=$VERSION
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
# Set ENVs for Next.js build
ENV NEXT_PUBLIC_BUILD_DATE=$BUILD_DATE
ENV NEXT_PUBLIC_GIT_COMMIT_SHA=$GIT_COMMIT_SHA

# Copy files needed for dependency installation first
ENV PRISMA_CLI_BINARY_TARGETS="linux-musl-openssl-3.0.x"
COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma/

# Install ALL dependencies
RUN pnpm install

# Copy the rest of the source code (respecting .dockerignore)
COPY . .

ENV SKIP_ENV_VALIDATION=${ECR_BUILD}

# Build Next.js
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm build

# ========================================
# Stage 2: Production image
# ========================================
FROM base AS runner

WORKDIR /app

ARG BUILD_NODE_ENV=development 
ENV NODE_ENV=$BUILD_NODE_ENV 
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy the minimal standalone app
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./

# Copy static and public assets
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# FIX: Copy messages folder for i18n
COPY --from=builder /app/messages ./messages

# Copy prisma schema for the migration
COPY --from=builder /app/prisma ./prisma

# Copy package.json to resolve prisma version
COPY --from=builder /app/package.json ./package.json

## clean up runner image
RUN pnpm add prisma@5.22.0 --prod && rm -rf /home/nextjs/.{cache,npm} /root/.cache /root/.local/share/pnpm

# Copy initialization script
COPY --chmod=755 --from=builder --chown=nextjs:nodejs /app/docker-entrypoint.sh ./

RUN chown -R nextjs:nodejs /app

USER nextjs

ARG PORT=3000
ENV PORT=$PORT
ENV HOSTNAME="0.0.0.0"
ARG VERSION
ENV NEXT_PUBLIC_MKP_APP_VER=$VERSION

# FIX: Pass the APP_URL to the runner environment so server-side fetches work
ARG NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "server.js"]
