/**
 * Jest-only database: in-memory SQLite via Node's built-in `node:sqlite`, with the SAME
 * generated migrations the app applies, so repository tests exercise the real schema.
 * No native module and no compiler — see src/db/node-sqlite-adapter.ts for why.
 */
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { resolve } from 'node:path';
import { NodeSqliteDatabase } from './node-sqlite-adapter';
import * as schema from './schema';
import type { Db } from './types';

export function createTestDb(): { db: Db; close: () => void } {
  const sqlite = new NodeSqliteDatabase(':memory:');
  sqlite.exec('PRAGMA foreign_keys = ON');
  // The adapter presents better-sqlite3's driver surface, which is what this driver expects.
  const db = drizzle(sqlite as never, { schema });
  migrate(db, { migrationsFolder: resolve(__dirname, 'migrations') });
  return { db: db as unknown as Db, close: () => sqlite.close() };
}
