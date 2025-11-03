#!/bin/sh
set -e

echo "--- PRINTING ENVIRONMENT VARIABLES ---"
printenv
echo "--------------------------------------"

echo "🚀 Starting My Karaoke Party..."

# Wait for PostgreSQL to be ready
echo "⏳ Waiting for PostgreSQL..."
until node -e "const { PrismaClient } = require('@prisma/client'); const prisma = new PrismaClient(); prisma.\$connect().then(() => { console.log('✅ Database connected'); process.exit(0); }).catch(() => { console.log('❌ Database not ready'); process.exit(1); });" 2>/dev/null; do
  echo "⏳ PostgreSQL is not ready yet, waiting..."
  sleep 2
done

# Run migrations
echo "📦 Running migrations..."
npx prisma migrate deploy

# Start application
echo "✅ Starting application..."
exec "$@"
