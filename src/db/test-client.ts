/**
 * Jest-only database: better-sqlite3 in memory, with the SAME generated migrations
 * the app applies, so repository tests exercise the real schema.
 */
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { resolve } from 'node:path';
import * as schema from './schema';
import type { Db } from './types';

export function createTestDb(): { db: Db; close: () => void } {
  const sqlite = new Database(':memory:');
  sqlite.pragma('foreign_keys = ON');
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: resolve(__dirname, 'migrations') });
  return { db: db as unknown as Db, close: () => sqlite.close() };
}
