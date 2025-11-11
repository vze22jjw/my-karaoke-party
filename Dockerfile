# Dockerfile for My Karaoke Party
FROM node:22-alpine AS base

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Install necessary dependencies
RUN apk add --no-cache libc6-compat openssl

WORKDIR /app

ARG VERSION

# ========================================
# Stage 1: Build the application
# ========================================
FROM base AS builder

WORKDIR /app

ARG VERSION
ARG ECR_BUILD=false
ENV NEXT_PUBLIC_MKP_APP_VER=$VERSION

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

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy the minimal standalone app
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./

# Copy static and public assets
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Copy prisma schema for the migration
COPY --from=builder /app/prisma ./prisma

# Copy package.json to resolve prisma version
COPY --from=builder /app/package.json ./package.json

## clean up runner image
RUN pnpm add prisma --prod && rm -rf /home/nextjs/.{cache,npm} /root/.cache /root/.local/share/pnpm

# Copy initialization script
COPY --chmod=755 --from=builder --chown=nextjs:nodejs /app/docker-entrypoint.sh ./

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ARG VERSION
ENV NEXT_PUBLIC_MKP_APP_VER=$VERSION

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "server.js"]
