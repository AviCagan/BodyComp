import { and, asc, desc, eq, isNull } from 'drizzle-orm';
import { sets, workoutExercises, workouts, type Workout, type WorkoutExercise, type WorkoutSet } from '../schema';
import type { Db } from '../types';

export class NotFoundError extends Error {
  constructor(entity: string, id: string) {
    super(`${entity} ${id} does not exist`);
    this.name = 'NotFoundError';
  }
}

export class WorkoutInProgressError extends Error {
  constructor(public readonly workoutId: string) {
    super('A workout is already in progress; finish or discard it first.');
    this.name = 'WorkoutInProgressError';
  }
}

function getWorkout(db: Db, id: string): Workout {
  const row = db.select().from(workouts).where(eq(workouts.id, id)).get();
  if (!row) throw new NotFoundError('workout', id);
  return row;
}

function getSet(db: Db, id: string): WorkoutSet {
  const row = db.select().from(sets).where(eq(sets.id, id)).get();
  if (!row) throw new NotFoundError('set', id);
  return row;
}

/** The one in-progress workout (endedAt null), recovered on relaunch (§2 "never lose a set"). */
export function getInProgressWorkout(db: Db): Workout | undefined {
  return db
    .select()
    .from(workouts)
    .where(and(isNull(workouts.endedAt), isNull(workouts.deletedAt), eq(workouts.isProvisional, false)))
    .orderBy(desc(workouts.startedAt))
    .get();
}

/**
 * Starts a workout. Only one real (non-provisional) workout may be in progress at a time —
 * callers recover it with getInProgressWorkout instead of starting another.
 */
export function startWorkout(
  db: Db,
  input: { id: string; name?: string; templateId?: string | null; isProvisional?: boolean },
  now: number,
): Workout {
  if (!input.isProvisional) {
    const open = getInProgressWorkout(db);
    if (open) throw new WorkoutInProgressError(open.id);
  }
  db.insert(workouts)
    .values({
      id: input.id,
      name: input.name ?? null,
      templateId: input.templateId ?? null,
      isProvisional: input.isProvisional ?? false,
      startedAt: now,
      createdAt: now,
      updatedAt: now,
    })
    .run();
  return getWorkout(db, input.id);
}

export function addWorkoutExercise(
  db: Db,
  input: { id: string; workoutId: string; exerciseId: string; supersetGroup?: number | null },
  now: number,
): WorkoutExercise {
  const last = db
    .select({ sortOrder: workoutExercises.sortOrder })
    .from(workoutExercises)
    .where(eq(workoutExercises.workoutId, input.workoutId))
    .orderBy(desc(workoutExercises.sortOrder))
    .get();
  db.insert(workoutExercises)
    .values({
      id: input.id,
      workoutId: input.workoutId,
      exerciseId: input.exerciseId,
      sortOrder: (last?.sortOrder ?? -1) + 1,
      supersetGroup: input.supersetGroup ?? null,
      createdAt: now,
      updatedAt: now,
    })
    .run();
  const row = db.select().from(workoutExercises).where(eq(workoutExercises.id, input.id)).get();
  if (!row) throw new NotFoundError('workout exercise', input.id);
  return row;
}

export interface SetInput {
  id: string;
  workoutExerciseId: string;
  weightKg?: number | null;
  reps?: number | null;
  rir?: number | null;
  rpe?: number | null;
  setType?: WorkoutSet['setType'];
}

/** Auto-saved immediately; `isCompleted` flips via completeSet. */
export function addSet(db: Db, input: SetInput, now: number): WorkoutSet {
  const last = db
    .select({ sortOrder: sets.sortOrder })
    .from(sets)
    .where(and(eq(sets.workoutExerciseId, input.workoutExerciseId), isNull(sets.deletedAt)))
    .orderBy(desc(sets.sortOrder))
    .get();
  db.insert(sets)
    .values({
      id: input.id,
      workoutExerciseId: input.workoutExerciseId,
      sortOrder: (last?.sortOrder ?? -1) + 1,
      weightKg: input.weightKg ?? null,
      reps: input.reps ?? null,
      rir: input.rir ?? null,
      rpe: input.rpe ?? null,
      setType: input.setType ?? 'working',
      createdAt: now,
      updatedAt: now,
    })
    .run();
  return getSet(db, input.id);
}

export function updateSet(
  db: Db,
  id: string,
  patch: Partial<Pick<WorkoutSet, 'weightKg' | 'reps' | 'rir' | 'rpe' | 'setType'>>,
  now: number,
): WorkoutSet {
  db.update(sets)
    .set({ ...patch, updatedAt: now })
    .where(eq(sets.id, id))
    .run();
  return getSet(db, id);
}

/** Soft delete (tombstone) so Phase 6 sync can propagate the deletion. */
export function deleteSet(db: Db, id: string, now: number): void {
  db.update(sets).set({ deletedAt: now, updatedAt: now }).where(eq(sets.id, id)).run();
}

export function completeSet(db: Db, id: string, now: number, completed = true): WorkoutSet {
  db.update(sets)
    .set({ isCompleted: completed, performedAt: completed ? now : null, updatedAt: now })
    .where(eq(sets.id, id))
    .run();
  return getSet(db, id);
}

export function finishWorkout(db: Db, id: string, now: number): Workout {
  db.update(workouts).set({ endedAt: now, updatedAt: now }).where(eq(workouts.id, id)).run();
  return getWorkout(db, id);
}

export function listWorkoutSets(db: Db, workoutId: string): { exercise: WorkoutExercise; set: WorkoutSet }[] {
  return db
    .select({ exercise: workoutExercises, set: sets })
    .from(sets)
    .innerJoin(workoutExercises, eq(sets.workoutExerciseId, workoutExercises.id))
    .where(and(eq(workoutExercises.workoutId, workoutId), isNull(workoutExercises.deletedAt), isNull(sets.deletedAt)))
    .orderBy(asc(workoutExercises.sortOrder), asc(sets.sortOrder))
    .all();
}

export function listRecentWorkouts(db: Db, limit = 30): Workout[] {
  return db
    .select()
    .from(workouts)
    .where(isNull(workouts.deletedAt))
    .orderBy(desc(workouts.startedAt))
    .limit(limit)
    .all();
}
