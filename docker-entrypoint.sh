#!/bin/sh
set -e

echo "🚀 Iniciando My Karaoke Party..."

# Aguardar o PostgreSQL estar pronto
echo "⏳ Aguardando PostgreSQL..."
until node -e "const { PrismaClient } = require('@prisma/client'); const prisma = new PrismaClient(); prisma.\$connect().then(() => { console.log('✅ Database conectado'); process.exit(0); }).catch(() => { console.log('❌ Database não pronto'); process.exit(1); });" 2>/dev/null; do
  echo "⏳ PostgreSQL ainda não está pronto, aguardando..."
  sleep 2
done

# Executar migrations
echo "📦 Executando migrations..."
npx prisma migrate deploy

# Iniciar aplicação
echo "✅ Iniciando aplicação..."
exec "$@"
