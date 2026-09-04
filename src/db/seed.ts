/**
 * Idempotent seed loader for the bundled exercise catalogue (src/data/*.json).
 * Re-runs only when the data revision changes; never touches custom exercises.
 * Runs in one transaction with chunked inserts (SQLite variable limit).
 */
import { and, eq, inArray, sql } from 'drizzle-orm';
import exercisesJson from '../data/exercises.json';
import mappingsJson from '../data/exercise-muscles.json';
import metaJson from '../data/exercise-db.meta.json';
import type { GroupId, RegionId } from '../engine/taxonomy';
import { appMeta, exerciseMuscles, exercises, type Equipment, type Level, type Mechanic, type Pattern } from './schema';
import type { Db } from './types';

export const SEED_VERSION_KEY = 'seed.exercises.revision';

interface SeedExercise {
  id: string;
  name: string;
  aliases: string[];
  equipment: string;
  mechanic: string;
  pattern: string;
  force: 'push' | 'pull' | 'static' | null;
  level: string;
  category: string;
  instructions: string[];
  mediaRefs: string[];
  source: string;
}
interface SeedMapping {
  exerciseId: string;
  groupId: string;
  weight: number;
  regionDistribution?: Record<string, number>;
  needsReview?: boolean;
}

export const SEED_REVISION = `${metaJson.revision}`;

function chunk<T>(arr: readonly T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export function isSeedCurrent(db: Db): boolean {
  const row = db.select().from(appMeta).where(eq(appMeta.key, SEED_VERSION_KEY)).get();
  return row?.value === SEED_REVISION;
}

/** Returns true when work was done. `now` is injected (epoch ms). */
export function seedExercises(db: Db, now: number, force = false): boolean {
  if (!force && isSeedCurrent(db)) return false;
  const seed = exercisesJson as SeedExercise[];
  const allMappings = mappingsJson as SeedMapping[];
  const allSeededIds = seed.map((e) => e.id);
  // A seeded exercise the user turned custom keeps its row AND its mappings.
  const protectedIds = new Set<string>();
  for (const ids of chunk(allSeededIds, 500)) {
    for (const row of db
      .select({ id: exercises.id })
      .from(exercises)
      .where(and(eq(exercises.isCustom, true), inArray(exercises.id, ids)))
      .all())
      protectedIds.add(row.id);
  }
  const seededIds = allSeededIds.filter((id) => !protectedIds.has(id));
  const mappings = allMappings.filter((m) => !protectedIds.has(m.exerciseId));

  db.transaction((tx) => {
    for (const batch of chunk(seed, 150)) {
      tx.insert(exercises)
        .values(
          batch.map((e) => ({
            id: e.id,
            name: e.name,
            aliases: e.aliases,
            equipment: e.equipment as Equipment,
            mechanic: e.mechanic as Mechanic,
            pattern: e.pattern as Pattern,
            force: e.force,
            level: e.level as Level,
            category: e.category,
            instructions: e.instructions,
            mediaRefs: e.mediaRefs,
            isCustom: false,
            source: e.source,
            createdAt: now,
            updatedAt: now,
            deletedAt: null,
          })),
        )
        .onConflictDoUpdate({
          target: exercises.id,
          set: {
            name: sql`excluded.name`,
            aliases: sql`excluded.aliases`,
            equipment: sql`excluded.equipment`,
            mechanic: sql`excluded.mechanic`,
            pattern: sql`excluded.pattern`,
            force: sql`excluded.force`,
            level: sql`excluded.level`,
            category: sql`excluded.category`,
            instructions: sql`excluded.instructions`,
            mediaRefs: sql`excluded.media_refs`,
            source: sql`excluded.source`,
            updatedAt: now,
          },
          // never overwrite a row the user turned into a custom exercise
          setWhere: eq(exercises.isCustom, false),
        })
        .run();
    }
    for (const ids of chunk(seededIds, 500)) {
      tx.delete(exerciseMuscles)
        .where(and(inArray(exerciseMuscles.exerciseId, ids)))
        .run();
    }
    for (const batch of chunk(mappings, 400)) {
      tx.insert(exerciseMuscles)
        .values(
          batch.map((m) => ({
            exerciseId: m.exerciseId,
            groupId: m.groupId as GroupId,
            weight: m.weight,
            regionDistribution: (m.regionDistribution ?? null) as Partial<Record<RegionId, number>> | null,
            needsReview: m.needsReview ?? false,
          })),
        )
        .run();
    }
    tx.insert(appMeta)
      .values({ key: SEED_VERSION_KEY, value: SEED_REVISION, updatedAt: now })
      .onConflictDoUpdate({ target: appMeta.key, set: { value: SEED_REVISION, updatedAt: now } })
      .run();
  });
  return true;
}
