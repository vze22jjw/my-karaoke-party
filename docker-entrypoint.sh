#!/bin/sh
set -e

# Set default if not present
APP_LOCALE=${NEXT_PUBLIC_DEFAULT_LOCALE:-en}

# Localization strings
if [ "$APP_LOCALE" = "pt" ]; then
  MSG_ENV="--- IMPRIMINDO VARIÁVEIS DE AMBIENTE ---"
  MSG_START="🚀 Iniciando My Karaoke Party..."
  MSG_WAIT_DB="⏳ Aguardando PostgreSQL..."
  MSG_DB_READY="✅ Banco de dados conectado"
  MSG_DB_FAIL="❌ Banco de dados não está pronto"
  MSG_WAIT_MORE="⏳ PostgreSQL ainda não está pronto, aguardando..."
  MSG_MIGRATE="📦 Executando migrações..."
  MSG_READY="✅ Iniciando aplicação..."
else
  MSG_ENV="--- PRINTING ENVIRONMENT VARIABLES ---"
  MSG_START="🚀 Starting My Karaoke Party..."
  MSG_WAIT_DB="⏳ Waiting for PostgreSQL..."
  MSG_DB_READY="✅ Database connected"
  MSG_DB_FAIL="❌ Database not ready"
  MSG_WAIT_MORE="⏳ PostgreSQL is not ready yet, waiting..."
  MSG_MIGRATE="📦 Running migrations..."
  MSG_READY="✅ Starting application..."
fi

echo "$MSG_ENV"
printenv
echo "--------------------------------------"

echo "$MSG_START"

# Wait for PostgreSQL to be ready
echo "$MSG_WAIT_DB"
until node -e "const { PrismaClient } = require('@prisma/client'); const prisma = new PrismaClient(); prisma.\$connect().then(() => { console.log('$MSG_DB_READY'); process.exit(0); }).catch(() => { console.log('$MSG_DB_FAIL'); process.exit(1); });" 2>/dev/null; do
  echo "$MSG_WAIT_MORE"
  sleep 2
done

# Run migrations
echo "$MSG_MIGRATE"
pnpm exec prisma migrate deploy

# Start application
echo "$MSG_READY"
exec "$@"
