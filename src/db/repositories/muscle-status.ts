import { muscleStatusCache, type MuscleStatusRow } from '../schema';
import type { Db } from '../types';

export function getMuscleStatuses(db: Db): MuscleStatusRow[] {
  return db.select().from(muscleStatusCache).all();
}

/** Full replace in one transaction; the engine recomputes everything anyway (§4.4). */
export function replaceMuscleStatuses(db: Db, rows: MuscleStatusRow[]): void {
  db.transaction((tx) => {
    tx.delete(muscleStatusCache).run();
    if (rows.length) tx.insert(muscleStatusCache).values(rows).run();
  });
}
