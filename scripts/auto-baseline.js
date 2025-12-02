import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Helper for ESM path resolution (__dirname equivalent)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

/**
 * Gets the name of the first migration folder in prisma/migrations
 */
function getFirstMigrationName() {
  const migrationsDir = path.join(__dirname, '..', 'prisma', 'migrations');
  
  if (!fs.existsSync(migrationsDir)) return null;

  // Read directories, filter out the lock file, and sort
  const dirs = fs.readdirSync(migrationsDir)
    .filter(f => fs.statSync(path.join(migrationsDir, f)).isDirectory())
    .filter(f => f !== 'migration_lock.toml')
    .sort(); 

  return dirs[0];
}

async function main() {
  const migrationName = getFirstMigrationName();
  
  if (!migrationName) {
    console.log('[Auto-Baseline] No migrations found in filesystem.');
    return;
  }

  console.log(`[Auto-Baseline] Checking baseline status for: ${migrationName}`);

  try {
    // 1. Check if the database is actually reachable and has the migrations table
    /** @type {any} */
    const migrationCount = await prisma.$queryRaw`
      SELECT count(*)::int as count FROM "_prisma_migrations"
    `.catch(() => null);

    // If table doesn't exist, it's a fresh DB. Let standard "migrate deploy" handle it.
    if (migrationCount === null) {
      console.log('[Auto-Baseline] _prisma_migrations table missing. Assuming fresh DB.');
      return;
    }

    // 2. Check if THIS specific migration is already recorded
    /** @type {any} */
    const isRecorded = await prisma.$queryRaw`
      SELECT count(*)::int as count FROM "_prisma_migrations" 
      WHERE migration_name = ${migrationName}
    `;

    if (isRecorded && isRecorded[0] && isRecorded[0].count > 0) {
      console.log('[Auto-Baseline] Base migration already applied. No action needed.');
      return;
    }

    // 3. Check if the database has data (using 'Party' table as a proxy)
    /** @type {any} */
    const tableCheck = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'Party'
      );
    `;

    const tableExists = tableCheck && tableCheck[0] && tableCheck[0].exists;

    if (tableExists) {
      console.log('⚠️ [Auto-Baseline] Drift Detected: Database has tables but is missing the base migration.');
      console.log('⚠️ [Auto-Baseline] Marking migration as applied to prevent conflicts...');
      
      try {
        execSync(`npx prisma migrate resolve --applied "${migrationName}"`, { stdio: 'inherit' });
        console.log('✅ [Auto-Baseline] Successfully baselined.');
      } catch (e) {
        const errorMessage = e instanceof Error ? e.message : String(e);
        console.error('❌ [Auto-Baseline] Failed to baseline:', errorMessage);
      }
    } else {
      console.log('[Auto-Baseline] Database seems clean (no Party table). Standard deployment will proceed.');
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[Auto-Baseline] Fatal Error during check:', errorMessage);
  } finally {
    await prisma.$disconnect();
  }
}

main();
