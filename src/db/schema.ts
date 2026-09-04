/**
 * Drizzle schema (brief §4.4). The database is the source of truth; Zustand only
 * holds UI/session state. Conventions:
 *  - ids are client-generated UUID strings (expo-crypto in the app, node:crypto in tests)
 *  - timestamps are integer epoch milliseconds (sortable, range-queryable, timezone-free)
 *  - weights are stored in kilograms; `profile.units` only affects display and entry
 *  - JSON columns are `text` in json mode with a TypeScript type
 *  - user-owned rows carry updatedAt/deletedAt now so Phase 6 sync needs no migration
 */
import { sql } from 'drizzle-orm';
import { index, integer, primaryKey, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import type { GroupId, RegionId } from '../engine/taxonomy';

export type Level = 'beginner' | 'intermediate' | 'advanced';
export type Units = 'kg' | 'lb';
export type Goal = 'hypertrophy' | 'strength' | 'general';
export type EquipmentProfile = 'commercial_gym' | 'home_barbell' | 'dumbbells_only' | 'bands_bodyweight';
export type BodyModel = 'female' | 'male';
export type SetType = 'warmup' | 'working' | 'drop' | 'failure' | 'myo';
export type Equipment =
  | 'barbell'
  | 'dumbbell'
  | 'cable'
  | 'machine'
  | 'bodyweight'
  | 'bands'
  | 'kettlebell'
  | 'ez_bar'
  | 'medicine_ball'
  | 'exercise_ball'
  | 'foam_roll'
  | 'other';
export type Mechanic = 'compound' | 'isolation';
export type Pattern =
  'push' | 'pull' | 'hinge' | 'squat' | 'lunge' | 'carry' | 'core' | 'isolation' | 'olympic' | 'other';
export type TargetOverride = { min?: number; target?: number; high?: number };
export type StatusKind = 'untrained' | 'low' | 'partial' | 'covered';
export type StatusFlag = 'high_volume' | 'possibly_excessive' | 'under_emphasized' | 'provisional';

const timestamps = {
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
};
const softDelete = { deletedAt: integer('deleted_at') };

/** Single local row (id = 'local'). */
export const profile = sqliteTable('profile', {
  id: text('id').primaryKey(),
  level: text('level').$type<Level>().notNull().default('beginner'),
  units: text('units').$type<Units>().notNull().default('lb'),
  goal: text('goal').$type<Goal>().notNull().default('hypertrophy'),
  equipmentProfile: text('equipment_profile').$type<EquipmentProfile>().notNull().default('commercial_gym'),
  bodyModel: text('body_model').$type<BodyModel>().notNull().default('male'),
  priorityGroups: text('priority_groups', { mode: 'json' })
    .$type<GroupId[]>()
    .notNull()
    .default(sql`'[]'`),
  targetOverrides: text('target_overrides', { mode: 'json' })
    .$type<Partial<Record<GroupId, TargetOverride>>>()
    .notNull()
    .default(sql`'{}'`),
  enabledOptionalGroups: text('enabled_optional_groups', { mode: 'json' })
    .$type<GroupId[]>()
    .notNull()
    .default(sql`'[]'`),
  restTimerDefaultSec: integer('rest_timer_default_sec').notNull().default(120),
  bodyweightKg: real('bodyweight_kg'),
  heightCm: real('height_cm'),
  onboardingCompletedAt: integer('onboarding_completed_at'),
  ...timestamps,
});

export const exercises = sqliteTable(
  'exercises',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    aliases: text('aliases', { mode: 'json' })
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'`),
    equipment: text('equipment').$type<Equipment>().notNull().default('other'),
    mechanic: text('mechanic').$type<Mechanic>().notNull().default('compound'),
    pattern: text('pattern').$type<Pattern>().notNull().default('other'),
    force: text('force').$type<'push' | 'pull' | 'static'>(),
    level: text('level').$type<Level>(),
    category: text('category'),
    instructions: text('instructions', { mode: 'json' })
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'`),
    mediaRefs: text('media_refs', { mode: 'json' })
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'`),
    isCustom: integer('is_custom', { mode: 'boolean' }).notNull().default(false),
    source: text('source').notNull(),
    ...timestamps,
    ...softDelete,
  },
  (t) => [index('exercises_name_idx').on(t.name)],
);

export const exerciseMuscles = sqliteTable(
  'exercise_muscles',
  {
    exerciseId: text('exercise_id')
      .notNull()
      .references(() => exercises.id, { onDelete: 'cascade' }),
    groupId: text('group_id').$type<GroupId>().notNull(),
    weight: real('weight').notNull(),
    regionDistribution: text('region_distribution', { mode: 'json' }).$type<Partial<Record<RegionId, number>>>(),
    needsReview: integer('needs_review', { mode: 'boolean' }).notNull().default(false),
  },
  (t) => [primaryKey({ columns: [t.exerciseId, t.groupId] }), index('exercise_muscles_group_idx').on(t.groupId)],
);

export const templates = sqliteTable('templates', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  notes: text('notes'),
  sortOrder: integer('sort_order').notNull().default(0),
  source: text('source').notNull().default('user'),
  ...timestamps,
  ...softDelete,
});

export const templateExercises = sqliteTable(
  'template_exercises',
  {
    id: text('id').primaryKey(),
    templateId: text('template_id')
      .notNull()
      .references(() => templates.id, { onDelete: 'cascade' }),
    exerciseId: text('exercise_id')
      .notNull()
      .references(() => exercises.id),
    sortOrder: integer('sort_order').notNull(),
    supersetGroup: integer('superset_group'),
    restTimerSec: integer('rest_timer_sec'),
    notes: text('notes'),
    ...timestamps,
    ...softDelete,
  },
  (t) => [index('template_exercises_template_idx').on(t.templateId)],
);

export const templateSets = sqliteTable(
  'template_sets',
  {
    id: text('id').primaryKey(),
    templateExerciseId: text('template_exercise_id')
      .notNull()
      .references(() => templateExercises.id, { onDelete: 'cascade' }),
    sortOrder: integer('sort_order').notNull(),
    setType: text('set_type').$type<SetType>().notNull().default('working'),
    targetWeightKg: real('target_weight_kg'),
    targetReps: integer('target_reps'),
    targetRir: real('target_rir'),
    ...timestamps,
    ...softDelete,
  },
  (t) => [index('template_sets_te_idx').on(t.templateExerciseId)],
);

export const templateSchedule = sqliteTable('template_schedule', {
  id: text('id').primaryKey(),
  templateId: text('template_id')
    .notNull()
    .references(() => templates.id, { onDelete: 'cascade' }),
  /** 0 = Sunday … 6 = Saturday */
  weekday: integer('weekday').notNull(),
  ...timestamps,
  ...softDelete,
});

export const workouts = sqliteTable(
  'workouts',
  {
    id: text('id').primaryKey(),
    startedAt: integer('started_at').notNull(),
    /** null while in progress; recovered on relaunch */
    endedAt: integer('ended_at'),
    name: text('name'),
    templateId: text('template_id').references(() => templates.id, { onDelete: 'set null' }),
    notes: text('notes'),
    isProvisional: integer('is_provisional', { mode: 'boolean' }).notNull().default(false),
    ...timestamps,
    ...softDelete,
  },
  (t) => [index('workouts_started_idx').on(t.startedAt)],
);

export const workoutExercises = sqliteTable(
  'workout_exercises',
  {
    id: text('id').primaryKey(),
    workoutId: text('workout_id')
      .notNull()
      .references(() => workouts.id, { onDelete: 'cascade' }),
    exerciseId: text('exercise_id')
      .notNull()
      .references(() => exercises.id),
    sortOrder: integer('sort_order').notNull(),
    supersetGroup: integer('superset_group'),
    restTimerSec: integer('rest_timer_sec'),
    notes: text('notes'),
    ...timestamps,
    ...softDelete,
  },
  (t) => [
    index('workout_exercises_workout_idx').on(t.workoutId),
    index('workout_exercises_exercise_idx').on(t.exerciseId),
  ],
);

export const sets = sqliteTable(
  'sets',
  {
    id: text('id').primaryKey(),
    workoutExerciseId: text('workout_exercise_id')
      .notNull()
      .references(() => workoutExercises.id, { onDelete: 'cascade' }),
    sortOrder: integer('sort_order').notNull(),
    weightKg: real('weight_kg'),
    reps: integer('reps'),
    rir: real('rir'),
    rpe: real('rpe'),
    setType: text('set_type').$type<SetType>().notNull().default('working'),
    isCompleted: integer('is_completed', { mode: 'boolean' }).notNull().default(false),
    /** set when completed */
    performedAt: integer('performed_at'),
    ...timestamps,
    ...softDelete,
  },
  (t) => [index('sets_we_idx').on(t.workoutExerciseId), index('sets_performed_idx').on(t.performedAt)],
);

export const personalRecords = sqliteTable(
  'personal_records',
  {
    id: text('id').primaryKey(),
    exerciseId: text('exercise_id')
      .notNull()
      .references(() => exercises.id, { onDelete: 'cascade' }),
    kind: text('kind').$type<'e1rm' | 'weight' | 'reps' | 'volume'>().notNull(),
    value: real('value').notNull(),
    setId: text('set_id').references(() => sets.id, { onDelete: 'set null' }),
    achievedAt: integer('achieved_at').notNull(),
    ...timestamps,
  },
  (t) => [index('pr_exercise_idx').on(t.exerciseId)],
);

/** Recomputed after every set save (§4.4). Keyed by group id or region id. */
export const muscleStatusCache = sqliteTable('muscle_status_cache', {
  id: text('id').primaryKey(),
  kind: text('kind').$type<'group' | 'region'>().notNull(),
  computedAt: integer('computed_at').notNull(),
  effectiveSets: real('effective_sets').notNull(),
  ratio: real('ratio').notNull(),
  status: text('status').$type<StatusKind>().notNull(),
  flags: text('flags', { mode: 'json' })
    .$type<StatusFlag[]>()
    .notNull()
    .default(sql`'[]'`),
});

export const bodyweightLog = sqliteTable(
  'bodyweight_log',
  {
    id: text('id').primaryKey(),
    weightKg: real('weight_kg').notNull(),
    loggedAt: integer('logged_at').notNull(),
    note: text('note'),
    ...timestamps,
    ...softDelete,
  },
  (t) => [index('bodyweight_logged_idx').on(t.loggedAt)],
);

export const videoCache = sqliteTable('video_cache', {
  key: text('key').primaryKey(),
  videoId: text('video_id').notNull(),
  channelId: text('channel_id').notNull(),
  title: text('title').notNull(),
  fetchedAt: integer('fetched_at').notNull(),
});

/** Small key/value store for app bookkeeping (seed version, schema flags). */
export const appMeta = sqliteTable('app_meta', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

export type Profile = typeof profile.$inferSelect;
export type Exercise = typeof exercises.$inferSelect;
export type ExerciseMuscle = typeof exerciseMuscles.$inferSelect;
export type Workout = typeof workouts.$inferSelect;
export type WorkoutExercise = typeof workoutExercises.$inferSelect;
export type WorkoutSet = typeof sets.$inferSelect;
export type Template = typeof templates.$inferSelect;
export type MuscleStatusRow = typeof muscleStatusCache.$inferSelect;
