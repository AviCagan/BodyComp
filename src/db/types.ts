import type { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core';
import type * as schema from './schema';

/**
 * Driver-agnostic database handle. The app passes an expo-sqlite Drizzle instance,
 * Jest passes a better-sqlite3 one; both are synchronous BaseSQLiteDatabase
 * instances over the same schema and the same generated migrations.
 */
export type Db = BaseSQLiteDatabase<'sync', any, typeof schema>;
