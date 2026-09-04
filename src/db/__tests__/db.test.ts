import { randomUUID } from 'node:crypto';
import { createTestDb } from '../test-client';
import { seedExercises, isSeedCurrent } from '../seed';
import { eq } from 'drizzle-orm';
import {
  addSet,
  addWorkoutExercise,
  completeSet,
  countExercises,
  createCustomExercise,
  deleteSet,
  ensureProfile,
  finishWorkout,
  getExerciseMuscles,
  getInProgressWorkout,
  listWorkoutSets,
  NotFoundError,
  searchExercises,
  startWorkout,
  updateProfile,
  updateSet,
  WorkoutInProgressError,
} from '../repositories';
import { exercises } from '../schema';

const NOW = Date.UTC(2026, 8, 4, 12, 0, 0);

describe('database', () => {
  let handle: ReturnType<typeof createTestDb>;
  beforeEach(() => {
    handle = createTestDb();
  });
  afterEach(() => handle.close());

  it('applies migrations and seeds the exercise catalogue idempotently', () => {
    const { db } = handle;
    expect(isSeedCurrent(db)).toBe(false);
    expect(seedExercises(db, NOW)).toBe(true);
    expect(isSeedCurrent(db)).toBe(true);
    expect(seedExercises(db, NOW)).toBe(false);
    expect(countExercises(db)).toBeGreaterThan(700);
    const bench = searchExercises(db, { query: 'bench press' });
    expect(bench.some((e) => e.id === 'Barbell_Bench_Press_-_Medium_Grip')).toBe(true);
    const m = getExerciseMuscles(db, 'Barbell_Bench_Press_-_Medium_Grip');
    expect(m.find((x) => x.groupId === 'chest')?.weight).toBe(1);
    expect(m.find((x) => x.groupId === 'chest')?.regionDistribution).toEqual({
      chest_upper: 0.25,
      chest_mid: 0.5,
      chest_lower: 0.25,
    });
  });

  it('finds exercises by alias and by muscle group', () => {
    const { db } = handle;
    seedExercises(db, NOW);
    expect(searchExercises(db, { query: 'OHP' }).map((e) => e.id)).toContain('Barbell_Shoulder_Press');
    const hams = searchExercises(db, { groupId: 'hamstrings', limit: 500 });
    expect(hams.length).toBeGreaterThan(20);
    expect(hams.every((e) => getExerciseMuscles(db, e.id).some((m) => m.groupId === 'hamstrings'))).toBe(true);
  });

  it('re-seeding does not clobber a custom exercise', () => {
    const { db } = handle;
    seedExercises(db, NOW);
    const custom = createCustomExercise(
      db,
      {
        id: 'custom-1',
        name: 'Cable Y-Raise',
        equipment: 'cable',
        mechanic: 'isolation',
        pattern: 'isolation',
        primaryGroups: ['delt_rear'],
        secondaryGroups: ['upper_back'],
      },
      NOW,
    );
    expect(custom.isCustom).toBe(true);
    seedExercises(db, NOW + 1, true);
    expect(searchExercises(db, { query: 'Y-Raise' })).toHaveLength(1);
    expect(getExerciseMuscles(db, 'custom-1').map((m) => [m.groupId, m.weight])).toEqual([
      ['delt_rear', 1],
      ['upper_back', 0.5],
    ]);
  });

  it('creates the local profile once and updates it', () => {
    const { db } = handle;
    const p = ensureProfile(db, NOW);
    expect(p.level).toBe('beginner');
    expect(p.units).toBe('lb');
    expect(ensureProfile(db, NOW + 5).createdAt).toBe(NOW);
    const updated = updateProfile(
      db,
      { level: 'advanced', priorityGroups: ['delt_side', 'chest'], bodyModel: 'female' },
      NOW + 10,
    );
    expect(updated.level).toBe('advanced');
    expect(updated.priorityGroups).toEqual(['delt_side', 'chest']);
    expect(updated.bodyModel).toBe('female');
  });

  it('logs a workout: sets auto-save, the in-progress workout is recoverable, finishing clears it', () => {
    const { db } = handle;
    seedExercises(db, NOW);
    const w = startWorkout(db, { id: randomUUID(), name: 'Push' }, NOW);
    const we = addWorkoutExercise(
      db,
      { id: randomUUID(), workoutId: w.id, exerciseId: 'Barbell_Bench_Press_-_Medium_Grip' },
      NOW,
    );
    const s1 = addSet(db, { id: randomUUID(), workoutExerciseId: we.id, weightKg: 80, reps: 8, rir: 2 }, NOW + 1000);
    addSet(db, { id: randomUUID(), workoutExerciseId: we.id, weightKg: 80, reps: 8, setType: 'warmup' }, NOW + 2000);
    expect(getInProgressWorkout(db)?.id).toBe(w.id);
    completeSet(db, s1.id, NOW + 3000);
    const rows = listWorkoutSets(db, w.id);
    expect(rows).toHaveLength(2);
    expect(rows[0]!.set.isCompleted).toBe(true);
    expect(rows[0]!.set.performedAt).toBe(NOW + 3000);
    expect(rows[1]!.set.sortOrder).toBe(1);
    expect(() => startWorkout(db, { id: randomUUID(), name: 'Second' }, NOW + 3500)).toThrow(WorkoutInProgressError);
    finishWorkout(db, w.id, NOW + 4000);
    expect(getInProgressWorkout(db)).toBeUndefined();
    deleteSet(db, s1.id, NOW + 5000);
    expect(listWorkoutSets(db, w.id)).toHaveLength(1);
    expect(() => updateSet(db, 'missing-id', { reps: 5 }, NOW)).toThrow(NotFoundError);
  });

  it('re-seeding keeps the mappings of a seeded exercise the user turned custom', () => {
    const { db } = handle;
    seedExercises(db, NOW);
    db.update(exercises)
      .set({ isCustom: true, name: 'My Bench' })
      .where(eq(exercises.id, 'Barbell_Bench_Press_-_Medium_Grip'))
      .run();
    db.delete(exercises).where(eq(exercises.id, 'Incline_Dumbbell_Press')).run();
    const before = getExerciseMuscles(db, 'Barbell_Bench_Press_-_Medium_Grip');
    seedExercises(db, NOW + 1, true);
    expect(getExerciseMuscles(db, 'Barbell_Bench_Press_-_Medium_Grip')).toEqual(before);
    expect(searchExercises(db, { query: 'My Bench' })).toHaveLength(1);
    expect(searchExercises(db, { query: 'Incline Dumbbell Press' }).length).toBeGreaterThan(0);
  });

  it('search treats JSON punctuation and LIKE wildcards literally', () => {
    const { db } = handle;
    seedExercises(db, NOW);
    expect(searchExercises(db, { query: '[', limit: 1000 })).toHaveLength(0);
    expect(searchExercises(db, { query: '"', limit: 1000 })).toHaveLength(0);
    expect(searchExercises(db, { query: '%', limit: 1000 })).toHaveLength(0);
    expect(searchExercises(db, { query: '_', limit: 1000 }).every((e) => /_/.test(e.name + e.aliases.join(' ')))).toBe(
      true,
    );
  });
});
