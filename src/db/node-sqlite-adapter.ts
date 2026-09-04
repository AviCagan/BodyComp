/**
 * A better-sqlite3-shaped facade over Node's built-in `node:sqlite`.
 *
 * Why: the test database used to be `better-sqlite3`, a native module. Whenever npm
 * decided to rebuild it instead of using its prebuilt binary (a fresh Node major, a
 * cold cache, a locked file on Windows), `npm ci` failed with a node-gyp error and
 * nobody could even start the app — for a dependency only the tests use. `node:sqlite`
 * ships with Node, so there is nothing to compile on any machine or CI runner.
 *
 * Drizzle's `better-sqlite3` driver needs exactly this surface (see
 * drizzle-orm/better-sqlite3/session.cjs): `prepare()`, `transaction()`, and on a
 * statement `run()`, `all()`, `get()` and `raw()`. `raw()` is sticky in better-sqlite3
 * (it switches the statement to array rows until switched back), so it is sticky here
 * too — matching the semantics drizzle is written against.
 */
import { DatabaseSync, type StatementSync } from 'node:sqlite';

type Params = unknown[];

/** better-sqlite3's `RunResult`. */
export interface RunResult {
  changes: number | bigint;
  lastInsertRowid: number | bigint;
}

class NodeSqliteStatement {
  constructor(private readonly stmt: StatementSync) {}

  run(...params: Params): RunResult {
    return this.stmt.run(...(params as never[])) as RunResult;
  }

  all(...params: Params): unknown[] {
    return this.stmt.all(...(params as never[]));
  }

  get(...params: Params): unknown {
    return this.stmt.get(...(params as never[]));
  }

  /** Switch this statement to array rows (better-sqlite3 `.raw()`), sticky until reset. */
  raw(mode = true): this {
    this.stmt.setReturnArrays(mode);
    return this;
  }
}

/** better-sqlite3's transaction function: callable, with per-behaviour variants. */
type TransactionFn = ((...args: unknown[]) => unknown) & {
  deferred: (...args: unknown[]) => unknown;
  immediate: (...args: unknown[]) => unknown;
  exclusive: (...args: unknown[]) => unknown;
};

export class NodeSqliteDatabase {
  private readonly db: DatabaseSync;

  constructor(location = ':memory:') {
    this.db = new DatabaseSync(location);
  }

  prepare(sql: string): NodeSqliteStatement {
    const stmt = this.db.prepare(sql);
    if (typeof stmt.setReturnArrays !== 'function') {
      throw new Error('This Node version lacks StatementSync#setReturnArrays; upgrade to Node 22.13 or newer.');
    }
    return new NodeSqliteStatement(stmt);
  }

  exec(sql: string): void {
    this.db.exec(sql);
  }

  /** Mirrors better-sqlite3's `db.transaction(fn)`, including the behaviour variants. */
  transaction(fn: (...args: unknown[]) => unknown): TransactionFn {
    const run = (behaviour: 'DEFERRED' | 'IMMEDIATE' | 'EXCLUSIVE', args: unknown[]) => {
      this.db.exec(`BEGIN ${behaviour}`);
      try {
        const result = fn(...args);
        this.db.exec('COMMIT');
        return result;
      } catch (error) {
        this.db.exec('ROLLBACK');
        throw error;
      }
    };
    const tx = ((...args: unknown[]) => run('DEFERRED', args)) as TransactionFn;
    tx.deferred = (...args: unknown[]) => run('DEFERRED', args);
    tx.immediate = (...args: unknown[]) => run('IMMEDIATE', args);
    tx.exclusive = (...args: unknown[]) => run('EXCLUSIVE', args);
    return tx;
  }

  close(): void {
    this.db.close();
  }
}

/**
 * Default export so this module can stand in for `better-sqlite3` itself: drizzle's
 * driver does `require('better-sqlite3')` at module load even when handed a live client.
 * Jest maps the specifier here (see jest.config.js).
 */
export default NodeSqliteDatabase;
