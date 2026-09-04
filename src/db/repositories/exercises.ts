import { and, asc, eq, isNull, like, or, sql } from 'drizzle-orm';
import type { GroupId } from '../../engine/taxonomy';
import { exerciseMuscles, exercises, type Exercise, type ExerciseMuscle } from '../schema';
import type { Db } from '../types';

export interface ExerciseFilter {
  query?: string;
  groupId?: GroupId;
  equipment?: Exercise['equipment'];
  pattern?: Exercise['pattern'];
  limit?: number;
}

/**
 * Name + alias search. Aliases are a JSON array column; a LIKE over the JSON text
 * is good enough for ~900 rows and keeps the query index-free and simple.
 */
export function searchExercises(db: Db, filter: ExerciseFilter = {}): Exercise[] {
  const conds = [isNull(exercises.deletedAt)];
  if (filter.query && filter.query.trim()) {
    const q = `%${filter.query.trim().replace(/[%_]/g, '')}%`;
    conds.push(or(like(exercises.name, q), like(sql`${exercises.aliases}`, q))!);
  }
  if (filter.equipment) conds.push(eq(exercises.equipment, filter.equipment));
  if (filter.pattern) conds.push(eq(exercises.pattern, filter.pattern));
  if (filter.groupId) {
    const sub = db
      .select({ id: exerciseMuscles.exerciseId })
      .from(exerciseMuscles)
      .where(eq(exerciseMuscles.groupId, filter.groupId));
    conds.push(sql`${exercises.id} IN ${sub}`);
  }
  return db
    .select()
    .from(exercises)
    .where(and(...conds))
    .orderBy(asc(exercises.name))
    .limit(filter.limit ?? 50)
    .all();
}

export function getExercise(db: Db, id: string): Exercise | undefined {
  return db.select().from(exercises).where(eq(exercises.id, id)).get();
}

export function getExerciseMuscles(db: Db, exerciseId: string): ExerciseMuscle[] {
  return db.select().from(exerciseMuscles).where(eq(exerciseMuscles.exerciseId, exerciseId)).all();
}

export function countExercises(db: Db): number {
  return (
    db
      .select({ n: sql<number>`count(*)` })
      .from(exercises)
      .where(isNull(exercises.deletedAt))
      .get()?.n ?? 0
  );
}

export interface CustomExerciseInput {
  id: string;
  name: string;
  equipment: Exercise['equipment'];
  mechanic: Exercise['mechanic'];
  pattern: Exercise['pattern'];
  primaryGroups: GroupId[];
  secondaryGroups?: GroupId[];
}

/** Custom exercises: weights assigned by role (primary 1.0, secondary 0.5) per §4.2. */
export function createCustomExercise(db: Db, input: CustomExerciseInput, now: number): Exercise {
  if (input.primaryGroups.length === 0) throw new Error('A custom exercise needs at least one primary group.');
  db.transaction((tx) => {
    tx.insert(exercises)
      .values({
        id: input.id,
        name: input.name,
        equipment: input.equipment,
        mechanic: input.mechanic,
        pattern: input.pattern,
        isCustom: true,
        source: 'user',
        createdAt: now,
        updatedAt: now,
      })
      .run();
    const rows = [
      ...input.primaryGroups.map((g) => ({ exerciseId: input.id, groupId: g, weight: 1 })),
      ...(input.secondaryGroups ?? [])
        .filter((g) => !input.primaryGroups.includes(g))
        .map((g) => ({ exerciseId: input.id, groupId: g, weight: 0.5 })),
    ];
    tx.insert(exerciseMuscles).values(rows).run();
  });
  return getExercise(db, input.id)!;
}
