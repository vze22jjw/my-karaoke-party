# Dockerfile para My Karaoke Party
FROM public.ecr.aws/docker/library/node:22-alpine AS base

# Instalar pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Instalar dependências necessárias
RUN apk add --no-cache libc6-compat openssl

WORKDIR /app

# ========================================
# Stage 1: Instalar dependências
# ========================================
FROM base AS deps

# Copiar arquivos de dependências
COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma/

# Instalar dependências
RUN pnpm install

# ========================================
# Stage 2: Build da aplicação
# ========================================
FROM base AS builder

WORKDIR /app

# Copiar dependências instaladas
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Gerar Prisma Client
RUN pnpm prisma generate

# Build do Next.js
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm build

# ========================================
# Stage 3: Imagem de produção
# ========================================
FROM base AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Criar usuário não-root
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copiar arquivos necessários
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/prisma ./prisma

# Copiar arquivos do build
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copiar node_modules (para Prisma Client)
COPY --from=builder /app/node_modules/ ./node_modules/

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Script de inicialização
COPY --from=builder --chown=nextjs:nodejs /app/docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "server.js"]
