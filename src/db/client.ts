import { drizzle } from 'drizzle-orm/expo-sqlite';
import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import { openDatabaseSync } from 'expo-sqlite';
import migrations from './migrations/migrations';
import * as schema from './schema';
import type { Db } from './types';

export const DB_FILE = 'musclemap.db';

let cached: { sqlite: ReturnType<typeof openDatabaseSync>; db: Db } | null = null;

/** Opens (once) the on-device database with WAL and foreign keys enabled. */
export function getDb(): Db {
  if (!cached) {
    const sqlite = openDatabaseSync(DB_FILE, { enableChangeListener: true });
    sqlite.execSync('PRAGMA journal_mode = WAL;');
    sqlite.execSync('PRAGMA foreign_keys = ON;');
    cached = { sqlite, db: drizzle(sqlite, { schema }) };
  }
  return cached.db;
}

/** Runs pending migrations at boot. Render a gate on `success` / `error`. */
export function useDbMigrations() {
  const db = getDb() as ReturnType<typeof drizzle<typeof schema>>;
  return useMigrations(db, migrations);
}
