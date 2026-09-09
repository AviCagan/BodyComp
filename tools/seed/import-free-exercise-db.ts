/**
 * Seed import: yuhonas/free-exercise-db  →  src/data/exercises.json + src/data/exercise-muscles.json
 *
 * Usage:  npx tsx tools/seed/import-free-exercise-db.ts <path-to-free-exercise-db-checkout>
 *
 * The upstream dataset is public domain (Unlicense — see LICENSE.md in the checkout;
 * recorded in docs/DECISIONS.md). It gives each exercise coarse `primaryMuscles` /
 * `secondaryMuscles` labels from a 17-label vocabulary. This script translates those
 * labels into the §4.1 taxonomy and assigns §4.2 contribution weights:
 *
 *   primary movers  → 1.0
 *   secondary       → 0.5   (indirect work counts at roughly half credit)
 *
 * plus a region distribution inside each multi-region group, derived from
 * deterministic name/pattern rules (incline → chest_upper, seated calf → soleus, …).
 *
 * Since ADR-0023 the rules are only the fallback: exercises present in the literature-derived
 * table (`tools/seed/evidence/table.json`, built by `build-evidence-table.ts`) take their
 * mapping from it. The §4.2 anchor rows are applied last as explicit overrides either way
 * (the builder guarantees the table agrees with them). Rows that came from a weak rule, or
 * from a low-confidence family, are flagged `needsReview`.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { join, resolve } from 'node:path';
import { GROUP_REGIONS, hasSubRegions, type GroupId, type RegionId } from '../../src/engine/taxonomy';

// ---------- upstream types ----------
type UpstreamMuscle =
  | 'abdominals'
  | 'abductors'
  | 'adductors'
  | 'biceps'
  | 'calves'
  | 'chest'
  | 'forearms'
  | 'glutes'
  | 'hamstrings'
  | 'lats'
  | 'lower back'
  | 'middle back'
  | 'neck'
  | 'quadriceps'
  | 'shoulders'
  | 'traps'
  | 'triceps';

interface UpstreamExercise {
  id: string;
  name: string;
  force: 'push' | 'pull' | 'static' | null;
  level: 'beginner' | 'intermediate' | 'expert';
  mechanic: 'compound' | 'isolation' | null;
  equipment: string | null;
  primaryMuscles: UpstreamMuscle[];
  secondaryMuscles: UpstreamMuscle[];
  instructions: string[];
  category:
    'strength' | 'stretching' | 'plyometrics' | 'strongman' | 'powerlifting' | 'cardio' | 'olympic weightlifting';
  images: string[];
}

// ---------- output types (mirror src/db/schema.ts) ----------
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
export type Pattern =
  'push' | 'pull' | 'hinge' | 'squat' | 'lunge' | 'carry' | 'core' | 'isolation' | 'olympic' | 'other';
export type Mechanic = 'compound' | 'isolation';

export interface SeedExercise {
  id: string;
  name: string;
  aliases: string[];
  equipment: Equipment;
  mechanic: Mechanic;
  pattern: Pattern;
  force: 'push' | 'pull' | 'static' | null;
  level: 'beginner' | 'intermediate' | 'advanced';
  category: UpstreamExercise['category'];
  instructions: string[];
  /** Relative image paths in the upstream repo (`<id>/0.jpg`). Not vendored. */
  mediaRefs: string[];
  source: string;
}

export interface SeedMapping {
  exerciseId: string;
  groupId: GroupId;
  weight: number;
  /** Present for every multi-region group; shares sum to 1. */
  regionDistribution?: Partial<Record<RegionId, number>>;
  needsReview?: boolean;
}

type Dist = Partial<Record<RegionId, number>>;
type Credit = { weight: number; dist?: Dist; review?: boolean };
type Credits = Partial<Record<GroupId, Credit>>;

// ---------- region distribution presets ----------
const DIST = {
  chest_flat: { chest_upper: 0.25, chest_mid: 0.5, chest_lower: 0.25 },
  chest_incline: { chest_upper: 0.6, chest_mid: 0.35, chest_lower: 0.05 },
  chest_decline: { chest_upper: 0.1, chest_mid: 0.4, chest_lower: 0.5 },
  upper_back_default: { traps_mid_lower: 0.5, rhomboids: 0.5 },
  upper_back_traps: { traps_mid_lower: 0.8, rhomboids: 0.2 },
  biceps_default: { biceps: 0.8, brachialis: 0.2 },
  biceps_hammer: { biceps: 0.5, brachialis: 0.5 },
  triceps_default: { triceps_long: 0.4, triceps_lateral_medial: 0.6 },
  triceps_overhead: { triceps_long: 0.7, triceps_lateral_medial: 0.3 },
  triceps_lying: { triceps_long: 0.5, triceps_lateral_medial: 0.5 },
  triceps_pushdown: { triceps_long: 0.3, triceps_lateral_medial: 0.7 },
  forearms_default: { forearm_flexors: 0.5, forearm_extensors_brachioradialis: 0.5 },
  forearms_flex: { forearm_flexors: 0.8, forearm_extensors_brachioradialis: 0.2 },
  forearms_ext: { forearm_flexors: 0.2, forearm_extensors_brachioradialis: 0.8 },
  forearms_grip: { forearm_flexors: 0.7, forearm_extensors_brachioradialis: 0.3 },
  glutes_default: { glute_max: 0.8, glute_med: 0.2 },
  glutes_squat: { glute_max: 0.9, glute_med: 0.1 },
  glutes_lunge: { glute_max: 0.7, glute_med: 0.3 },
  glutes_abduction: { glute_max: 0.3, glute_med: 0.7 },
  glutes_abductors: { glute_max: 0.2, glute_med: 0.8 },
  quads_default: { quads_rf: 0.1, quads_vasti: 0.9 },
  quads_extension: { quads_rf: 0.3, quads_vasti: 0.7 },
  hams_default: { hamstrings_hip_ext: 0.8, hamstrings_bf_short: 0.2 },
  hams_hinge: { hamstrings_hip_ext: 1.0, hamstrings_bf_short: 0.0 },
  hams_curl: { hamstrings_hip_ext: 0.6, hamstrings_bf_short: 0.4 },
  hams_nordic: { hamstrings_hip_ext: 0.5, hamstrings_bf_short: 0.5 },
  calves_standing: { gastrocnemius: 0.7, soleus: 0.3 },
  calves_seated: { gastrocnemius: 0.2, soleus: 0.8 },
  neck_default: { neck_flexors: 0.5, neck_extensors: 0.5 },
  neck_flex: { neck_flexors: 1.0, neck_extensors: 0.0 },
  neck_ext: { neck_flexors: 0.0, neck_extensors: 1.0 },
} as const satisfies Record<string, Dist>;

const DEFAULT_DIST: Partial<Record<GroupId, Dist>> = {
  chest: DIST.chest_flat,
  upper_back: DIST.upper_back_default,
  biceps: DIST.biceps_default,
  triceps: DIST.triceps_default,
  forearms: DIST.forearms_default,
  glutes: DIST.glutes_default,
  quads: DIST.quads_default,
  hamstrings: DIST.hams_default,
  calves: DIST.calves_standing,
  neck: DIST.neck_default,
};

// ---------- name matchers ----------
const re = (s: string) => new RegExp(s, 'i');
const M = {
  incline: re('incline'),
  decline: re('decline|dip\\b|dips\\b'),
  fly: re('\\bfly|flye|pec deck|crossover|cross-over|cable cross'),
  pushup: re('push[- ]?up|pushup'),
  press: re('press|jerk|thruster|handstand|pike|jammer|landmine|halo|get-up|turkish'),
  frontRaise: re('\\bfront\\b.*\\braise\\b'),
  arnold: re('arnold'),
  lateral: re('lateral|side lateral|scaption|deltoid raise|side raise|iron cross|car driver'),
  rear: re(
    'rear|reverse fly|reverse flye|face pull|pull[- ]?apart|bent[- ]over.*(?:raise|lateral|fly)|lying.*(?:rear|lateral)|posterior|reverse pec|back fly|seated bent',
  ),
  externalRot: re('external rotation|cuban|l-lateral|lying face down'),
  internalRot: re('internal rotation'),
  uprightRow: re('upright'),
  highPull: re('high pull'),
  shrug: re('shrug'),
  scapular: re('scapular'),
  row: re('\\brow\\b|rows\\b'),
  bentOver: re('bent[- ]over|t-bar|pendlay|barbell row|long bar'),
  verticalPull: re('\\bchin|pull-?ups?\\b|pulldown|pull down|lat pull'),
  pullover: re('pullover'),
  deadlift: re('deadlift'),
  rdl: re('romanian|stiff|straight[- ]leg'),
  goodMorning: re('good morning'),
  backExt: re('back extension|hyperextension|hyper extension|superman|reverse hyper'),
  squat: re('squat|leg press|hack|wall sit|pistol|sissy|\\bjump|\\bhops?\\b|\\bbound'),
  legPress: re('leg press|hack'),
  lunge: re('lunge|split squat|bulgarian|step[- ]?up|stepup'),
  legExt: re('leg extension|extensions?\\b.*leg|sissy'),
  legCurl: re('leg curl|ham(?:string)? curl|lying curl|seated curl|standing curl|glute ham|nordic|natural'),
  nordic: re('glute ham|nordic|natural glute'),
  hipThrust: re(
    'hip thrust|glute bridge|hip bridge|\\bbridge\\b|glute kickback|cable kickback|pull[- ]?through|hip extension|donkey kick',
  ),
  hinge: re(
    'deadlift|romanian|stiff|straight[- ]leg|good morning|hip thrust|glute bridge|hip bridge|pull[- ]?through|\\bswing|back extension|hyperextension|hyper extension|reverse hyper',
  ),
  abduction: re(
    'abduct|clam|fire hydrant|monster walk|band walk|lateral walk|side[- ]lying|hip circle|lying crossover',
  ),
  seatedCalf: re('seated|bent[- ]knee'),
  tibialis: re('tibialis|toe raise|dorsiflex'),
  overheadTri: re('overhead|behind|french|seated triceps press|incline.*extension'),
  lyingTri: re('lying|skull|nose|decline.*extension'),
  pushdownTri: re('pushdown|push down|kickback|close[- ]grip|dip|jm press|bench|tate|diamond|press'),
  hammer: re('hammer|neutral|zottman|cross body|cross-body|reverse curl|reverse barbell curl|reverse grip'),
  reverseCurl: re('reverse curl|reverse barbell|reverse grip|reverse ez'),
  wristCurl: re('wrist curl|wrist roller|behind the back'),
  reverseWrist: re('reverse wrist|wrist extension|extensor|palms[- ]down|pronated'),
  grip: re('farmer|pinch|grip|hold|carry|walk|hang'),
  oblique: re(
    'oblique|side bend|twist|russian|woodchop|wood chop|windmill|side plank|bicycle|side crunch|side jackknife|saxon|landmine 180|rotation|windshield',
  ),
  hipFlexor: re(
    'leg raise|knee raise|knee tuck|sit-up|sit up|situp|v-up|flutter|scissor|l-sit|toes to bar|hanging|jackknife|hollow|dragon flag|mountain climber|flutter|reverse crunch',
  ),
  neckFlex: re('face up|flexion|front'),
  neckExt: re('face down|extension|harness|back'),
  carry: re('carry|farmer|\\bwalk|yoke|suitcase|sled (?:push|drag|pull)|rickshaw'),
  olympic: re('clean|snatch|jerk'),
  core: re(
    'crunch|sit[- ]?up|situp|plank|leg raise|knee raise|\\bab\\b|abs\\b|oblique|russian|hollow|dead bug|rollout|ab roller|ab wheel|woodchop|knee tuck|toe touch|windshield|bicycle|v-up|flutter|scissor|dragon flag|bird dog|pallof|side bend|jackknife|wheel|l-sit',
  ),
  plyo: re('jump|hop|bound|plyo|box|sprint|throw|slam'),
};

// ---------- equipment / pattern / level ----------
const EQUIPMENT: Record<string, Equipment> = {
  barbell: 'barbell',
  dumbbell: 'dumbbell',
  cable: 'cable',
  machine: 'machine',
  'body only': 'bodyweight',
  bands: 'bands',
  kettlebells: 'kettlebell',
  'e-z curl bar': 'ez_bar',
  'medicine ball': 'medicine_ball',
  'exercise ball': 'exercise_ball',
  'foam roll': 'foam_roll',
  other: 'other',
};

function equipmentOf(e: UpstreamExercise): Equipment {
  const mapped = e.equipment ? EQUIPMENT[e.equipment] : undefined;
  if (mapped) return mapped;
  const n = e.name;
  if (/barbell|smith/i.test(n)) return 'barbell';
  if (/dumbbell/i.test(n)) return 'dumbbell';
  if (/cable|pulley/i.test(n)) return 'cable';
  if (/kettlebell/i.test(n)) return 'kettlebell';
  if (/band/i.test(n)) return 'bands';
  if (/machine|leverage/i.test(n)) return 'machine';
  return e.category === 'plyometrics' || /push-up|pull-up|chin|bodyweight|plank|crunch|sit-up/i.test(n)
    ? 'bodyweight'
    : 'other';
}

function patternOf(e: UpstreamExercise): Pattern {
  const n = e.name;
  if (e.category === 'olympic weightlifting' || M.olympic.test(n)) return 'olympic';
  if (M.lunge.test(n)) return 'lunge';
  if (M.carry.test(n) && !M.row.test(n)) return 'carry';
  if (M.hinge.test(n)) return 'hinge';
  if (M.squat.test(n) && !M.legCurl.test(n)) return 'squat';
  if (M.core.test(n) || e.primaryMuscles.every((m) => m === 'abdominals')) return 'core';
  if (e.mechanic === 'isolation') return 'isolation';
  if (e.force === 'push') return 'push';
  if (e.force === 'pull') return 'pull';
  return 'other';
}

function levelOf(l: UpstreamExercise['level']): SeedExercise['level'] {
  return l === 'expert' ? 'advanced' : l;
}

// ---------- alias generation ----------
const ALIASES: Record<string, string[]> = {
  'Barbell_Bench_Press_-_Medium_Grip': ['Bench Press', 'Flat Bench Press', 'Barbell Bench'],
  'Barbell_Incline_Bench_Press_-_Medium_Grip': ['Incline Bench Press', 'Incline Barbell Press'],
  Incline_Dumbbell_Press: ['Incline DB Press', 'Incline Dumbbell Bench Press'],
  Dumbbell_Bench_Press: ['DB Bench Press', 'Flat Dumbbell Press'],
  Barbell_Squat: ['Back Squat', 'Squat', 'Barbell Back Squat'],
  Front_Barbell_Squat: ['Front Squat'],
  Barbell_Deadlift: ['Deadlift', 'Conventional Deadlift'],
  Romanian_Deadlift: ['RDL', 'Romanian Deadlift'],
  Sumo_Deadlift: ['Sumo Deadlift'],
  Bent_Over_Barbell_Row: ['Barbell Row', 'Bent-Over Row', 'BB Row'],
  'Wide-Grip_Lat_Pulldown': ['Lat Pulldown', 'Pulldown'],
  Pullups: ['Pull-Up', 'Pull Up', 'Pullup'],
  'Chin-Up': ['Chin Up', 'Chinup'],
  Seated_Cable_Rows: ['Cable Row', 'Seated Row'],
  Barbell_Shoulder_Press: ['Overhead Press', 'OHP', 'Military Press', 'Standing Press'],
  Dumbbell_Shoulder_Press: ['DB Shoulder Press'],
  Side_Lateral_Raise: ['Lateral Raise', 'Dumbbell Lateral Raise', 'Side Raise'],
  Face_Pull: ['Face Pulls', 'Rope Face Pull'],
  Barbell_Curl: ['Bicep Curl', 'Barbell Bicep Curl', 'BB Curl'],
  Dumbbell_Bicep_Curl: ['DB Curl', 'Dumbbell Curl'],
  Hammer_Curls: ['Hammer Curl'],
  Triceps_Pushdown: ['Tricep Pushdown', 'Cable Pushdown', 'Pushdown'],
  'Triceps_Pushdown_-_Rope_Attachment': ['Rope Pushdown'],
  Lying_Triceps_Press: ['Skullcrusher', 'Skull Crusher', 'Lying Triceps Extension'],
  Standing_Dumbbell_Triceps_Extension: ['Overhead Triceps Extension', 'Overhead Extension'],
  Leg_Press: ['Leg Press'],
  Leg_Extensions: ['Leg Extension', 'Quad Extension'],
  Seated_Leg_Curl: ['Seated Hamstring Curl'],
  Lying_Leg_Curls: ['Lying Leg Curl', 'Lying Hamstring Curl'],
  Barbell_Hip_Thrust: ['Hip Thrust'],
  Barbell_Lunge: ['Lunge', 'Walking Lunge'],
  Standing_Calf_Raises: ['Standing Calf Raise', 'Calf Raise'],
  Seated_Calf_Raise: ['Seated Calf Raises'],
  'Dips_-_Triceps_Version': ['Dips', 'Tricep Dips'],
  'Dips_-_Chest_Version': ['Chest Dips'],
  Pushups: ['Push-Up', 'Push Up', 'Pushup'],
  Plank: ['Front Plank'],
  Hanging_Leg_Raise: ['Hanging Leg Raises'],
  Cable_Crunch: ['Kneeling Cable Crunch'],
  Dumbbell_Flyes: ['Dumbbell Fly', 'DB Fly', 'Chest Fly'],
  Barbell_Shrug: ['Shrug', 'Barbell Shrugs'],
  Dumbbell_Shrug: ['DB Shrug'],
  Good_Morning: ['Good Mornings'],
  Hyperextensions_Back_Extensions: ['Back Extension', '45 Degree Back Extension'],
  'Reverse_Grip_Bent-Over_Rows': ['Reverse Grip Row', 'Underhand Row'],
  'T-Bar_Row_with_Handle': ['T-Bar Row'],
  'One-Arm_Dumbbell_Row': ['Dumbbell Row', 'Single-Arm Row', 'DB Row'],
  Preacher_Curl: ['EZ Bar Preacher Curl'],
  Incline_Dumbbell_Curl: ['Incline Curl'],
  Concentration_Curls: ['Concentration Curl'],
  One_Leg_Barbell_Squat: ['Bulgarian Split Squat', 'Rear Foot Elevated Split Squat', 'RFESS'],
  Goblet_Squat: ['Goblet Squats'],
  'One-Arm_Kettlebell_Swings': ['KB Swing', 'Kettlebell Swing', 'One-Arm Kettlebell Swing'],
  Reverse_Flyes: ['Reverse Fly', 'Bent-Over Reverse Fly'],
  Cable_Rear_Delt_Fly: ['Cable Reverse Fly'],
  'Close-Grip_Barbell_Bench_Press': ['Close Grip Bench', 'CGBP'],
  Decline_Barbell_Bench_Press: ['Decline Bench Press'],
  Ab_Roller: ['Ab Wheel', 'Ab Wheel Rollout'],
  Russian_Twist: ['Russian Twists'],
  Glute_Ham_Raise: ['GHR', 'Nordic Curl'],
  Farmers_Walk: ["Farmer's Carry", 'Farmer Carry', 'Farmers Carry'],
};

function autoAliases(name: string): string[] {
  const out = new Set<string>();
  const stripped = name
    .replace(/\s+-\s+[^-]+$/, '')
    .replace(/\s*\([^)]*\)\s*/g, ' ')
    .trim();
  if (stripped && stripped !== name) out.add(stripped);
  const noHyphen = name.replace(/-/g, ' ').replace(/\s+/g, ' ').trim();
  if (noHyphen !== name) out.add(noHyphen);
  return [...out].filter((a) => a.length >= 4);
}

// ---------- muscle credit rules ----------
function add(c: Credits, g: GroupId, weight: number, dist?: Dist, review = false) {
  const prev = c[g];
  const w = prev ? Math.max(prev.weight, weight) : weight;
  // The stronger claim decides the region distribution; ties keep the earlier one.
  const d = !prev || weight > prev.weight ? (dist ?? prev?.dist) : (prev.dist ?? dist);
  c[g] = {
    weight: w,
    dist: d ?? (hasSubRegions(g) ? DEFAULT_DIST[g] : undefined),
    review: review || prev?.review || false,
  };
}

function set(c: Credits, g: GroupId, weight: number, dist?: Dist, review = false) {
  c[g] = { weight, dist: dist ?? (hasSubRegions(g) ? DEFAULT_DIST[g] : undefined), review };
}

function shoulderTargets(e: UpstreamExercise, primary: boolean): Array<[GroupId, number, boolean]> {
  const n = e.name;
  const w = primary ? 1.0 : 0.5;
  if (M.rear.test(n) || M.externalRot.test(n)) return [['delt_rear', w, false]];
  if (M.internalRot.test(n)) return [['delt_front', w, true]];
  if (M.uprightRow.test(n) || M.highPull.test(n))
    return [
      ['delt_side', w, false],
      ['traps_upper', w * 0.75, false],
    ];
  if (M.frontRaise.test(n)) return [['delt_front', w, false]];
  if (M.lateral.test(n) && !M.press.test(n)) return [['delt_side', w, false]];
  if (M.arnold.test(n) || M.press.test(n))
    return primary
      ? [
          ['delt_front', 1.0, false],
          ['delt_side', 0.5, false],
        ]
      : [['delt_front', 0.5, false]];
  if (!primary)
    return M.row.test(n) || M.verticalPull.test(n) ? [['delt_rear', 0.5, false]] : [['delt_front', 0.5, false]];
  // Unknown primary shoulder movement: credit side + front, flag for review.
  return [
    ['delt_side', 1.0, true],
    ['delt_front', 0.5, true],
  ];
}

function creditsFor(e: UpstreamExercise): Credits {
  const c: Credits = {};
  const n = e.name;

  const apply = (m: UpstreamMuscle, primary: boolean) => {
    const w = primary ? 1.0 : 0.5;
    switch (m) {
      case 'abdominals':
        if (M.oblique.test(n)) {
          add(c, 'obliques', w);
          if (primary) add(c, 'abs', 0.5);
        } else add(c, 'abs', w);
        if (primary && M.hipFlexor.test(n)) add(c, 'hip_flexors', 0.5);
        return;
      case 'abductors': {
        // A glutes label on the same exercise decides the distribution; abductors alone means glute_med work.
        const hasGlutes = e.primaryMuscles.includes('glutes') || e.secondaryMuscles.includes('glutes');
        add(c, 'glutes', w, hasGlutes ? undefined : DIST.glutes_abductors);
        return;
      }
      case 'adductors':
        add(c, 'adductors', w);
        return;
      case 'biceps':
        add(c, 'biceps', w, M.hammer.test(n) ? DIST.biceps_hammer : DIST.biceps_default);
        if (primary && M.reverseCurl.test(n)) add(c, 'forearms', 0.5, DIST.forearms_ext);
        return;
      case 'calves':
        if (M.tibialis.test(n)) {
          add(c, 'tibialis', w);
          return;
        }
        add(c, 'calves', w, M.seatedCalf.test(n) ? DIST.calves_seated : DIST.calves_standing);
        return;
      case 'chest': {
        // For push-ups the words mean the opposite of bench: incline (hands raised) loads the lower chest.
        const pushup = M.pushup.test(n);
        const dist = M.incline.test(n)
          ? pushup
            ? DIST.chest_decline
            : DIST.chest_incline
          : M.decline.test(n)
            ? pushup
              ? DIST.chest_incline
              : DIST.chest_decline
            : DIST.chest_flat;
        add(c, 'chest', w, dist);
        if (primary && (M.press.test(n) || M.pushup.test(n))) {
          add(c, 'delt_front', 0.5);
          add(c, 'triceps', 0.5, DIST.triceps_pushdown);
        }
        if (primary && M.fly.test(n)) add(c, 'delt_front', 0.25);
        return;
      }
      case 'forearms': {
        const dist = M.reverseWrist.test(n)
          ? DIST.forearms_ext
          : M.wristCurl.test(n)
            ? DIST.forearms_flex
            : M.reverseCurl.test(n)
              ? DIST.forearms_ext
              : M.grip.test(n)
                ? DIST.forearms_grip
                : DIST.forearms_default;
        add(c, 'forearms', w, dist);
        return;
      }
      case 'glutes': {
        const dist = M.abduction.test(n)
          ? DIST.glutes_abduction
          : M.hipThrust.test(n)
            ? DIST.glutes_squat
            : M.lunge.test(n)
              ? DIST.glutes_lunge
              : DIST.glutes_default;
        add(c, 'glutes', w, dist);
        if (primary && M.hipThrust.test(n)) add(c, 'hamstrings', 0.5, DIST.hams_hinge);
        return;
      }
      case 'hamstrings': {
        const dist = M.nordic.test(n)
          ? DIST.hams_nordic
          : M.legCurl.test(n)
            ? DIST.hams_curl
            : M.rdl.test(n) || M.deadlift.test(n) || M.goodMorning.test(n)
              ? DIST.hams_hinge
              : DIST.hams_default;
        add(c, 'hamstrings', w, dist);
        if (primary && (M.rdl.test(n) || M.goodMorning.test(n))) {
          add(c, 'glutes', 0.75, DIST.glutes_squat);
          add(c, 'erectors', 0.5);
        }
        return;
      }
      case 'lats':
        add(c, 'lats', w);
        if (primary && M.verticalPull.test(n)) {
          add(c, 'upper_back', 0.5);
          add(c, 'biceps', 0.5);
          add(c, 'delt_rear', 0.25);
        }
        if (primary && M.pullover.test(n)) {
          add(c, 'chest', 0.5);
          add(c, 'triceps', 0.25, DIST.triceps_overhead);
        }
        return;
      case 'lower back':
        if (primary && M.deadlift.test(n) && !M.rdl.test(n)) {
          set(c, 'erectors', 1.0);
          add(c, 'glutes', 0.75, DIST.glutes_squat);
          add(c, 'hamstrings', 0.75, DIST.hams_hinge);
          add(c, 'quads', 0.5);
          add(c, 'upper_back', 0.5);
          add(c, 'traps_upper', 0.5);
          add(c, 'lats', 0.25);
          add(c, 'forearms', 0.5, DIST.forearms_grip);
          return;
        }
        if (primary && M.goodMorning.test(n)) {
          add(c, 'hamstrings', 1.0, DIST.hams_hinge);
          add(c, 'erectors', 0.75);
          add(c, 'glutes', 0.75, DIST.glutes_squat);
          return;
        }
        if (primary && M.backExt.test(n)) {
          add(c, 'erectors', 1.0);
          add(c, 'glutes', 0.5, DIST.glutes_squat);
          add(c, 'hamstrings', 0.5, DIST.hams_hinge);
          return;
        }
        add(c, 'erectors', w);
        return;
      case 'middle back':
        if (primary && M.verticalPull.test(n)) {
          add(c, 'lats', 1.0);
          add(c, 'upper_back', 0.5);
          add(c, 'biceps', 0.5);
          add(c, 'delt_rear', 0.25);
          return;
        }
        if (primary && M.shrug.test(n)) {
          add(c, 'upper_back', 1.0, DIST.upper_back_traps);
          return;
        }
        add(c, 'upper_back', w, DIST.upper_back_default);
        if (primary && M.row.test(n)) {
          add(c, 'lats', 0.75);
          add(c, 'delt_rear', 0.5);
          add(c, 'biceps', 0.5);
          if (M.bentOver.test(n)) add(c, 'erectors', 0.25);
        }
        return;
      case 'neck':
        add(
          c,
          'neck',
          w,
          M.neckExt.test(n) && M.neckFlex.test(n)
            ? DIST.neck_default
            : M.neckExt.test(n)
              ? DIST.neck_ext
              : M.neckFlex.test(n)
                ? DIST.neck_flex
                : DIST.neck_default,
        );
        return;
      case 'quadriceps': {
        const dist = M.legExt.test(n) && !M.squat.test(n) ? DIST.quads_extension : DIST.quads_default;
        add(c, 'quads', w, dist);
        if (!primary) return;
        if (M.lunge.test(n)) {
          add(c, 'glutes', 0.75, DIST.glutes_lunge);
          add(c, 'adductors', 0.25);
          add(c, 'hamstrings', 0.25, DIST.hams_hinge);
          return;
        }
        if (M.legPress.test(n)) {
          add(c, 'glutes', 0.5, DIST.glutes_squat);
          add(c, 'adductors', 0.5);
          return;
        }
        if (M.squat.test(n) && !M.plyo.test(n)) {
          add(c, 'glutes', 0.75, DIST.glutes_squat);
          add(c, 'adductors', 0.5);
          if (/barbell|front|back|overhead|zercher|smith/i.test(n)) add(c, 'erectors', 0.5);
          return;
        }
        if (M.plyo.test(n) || e.category === 'plyometrics') {
          add(c, 'glutes', 0.5, DIST.glutes_squat);
          add(c, 'calves', 0.5, DIST.calves_standing);
          return;
        }
        return;
      }
      case 'shoulders':
        for (const [g, w2, review] of shoulderTargets(e, primary)) add(c, g, w2, undefined, review);
        if (primary && M.press.test(n) && !M.lateral.test(n)) add(c, 'triceps', 0.5, DIST.triceps_overhead);
        return;
      case 'traps':
        if (!primary) {
          add(c, 'traps_upper', 0.5);
          return;
        }
        if (M.scapular.test(n)) {
          add(c, 'upper_back', 1.0, DIST.upper_back_traps);
          add(c, 'lats', 0.5);
          return;
        }
        if (M.uprightRow.test(n)) {
          add(c, 'delt_side', 1.0);
          add(c, 'traps_upper', 0.75);
          return;
        }
        if (M.highPull.test(n)) {
          add(c, 'traps_upper', 1.0);
          add(c, 'delt_side', 0.5);
          add(c, 'delt_rear', 0.5);
          return;
        }
        add(c, 'traps_upper', 1.0);
        return;
      case 'triceps': {
        const dist = M.overheadTri.test(n)
          ? DIST.triceps_overhead
          : M.lyingTri.test(n)
            ? DIST.triceps_lying
            : M.pushdownTri.test(n)
              ? DIST.triceps_pushdown
              : DIST.triceps_default;
        add(c, 'triceps', w, dist);
        if (
          primary &&
          /close[- ]grip|\bdips?\b|jm press|floor press|board press|pin press|bench press|push-?up/i.test(n) &&
          !/extension|pushdown|kickback|skull|to chin|lying/i.test(n)
        ) {
          add(c, 'chest', 0.5, M.decline.test(n) ? DIST.chest_decline : DIST.chest_flat);
          add(c, 'delt_front', 0.5);
        }
        return;
      }
    }
  };

  for (const m of e.primaryMuscles) apply(m, true);
  for (const m of e.secondaryMuscles) if (!e.primaryMuscles.includes(m)) apply(m, false);

  // Post-pass corrections that depend on the whole movement, not one label.
  const pattern = patternOf(e);
  if (pattern === 'squat' || pattern === 'lunge') {
    // Knee-dominant work: upstream lists hamstrings/calves as secondaries, but §4.2 credits neither for squats.
    if (c.hamstrings && c.hamstrings.weight <= 0.5) delete c.hamstrings;
    if (c.calves && c.calves.weight <= 0.5) delete c.calves;
  }
  if (pattern === 'carry' && c.traps_upper && c.traps_upper.weight < 0.75)
    c.traps_upper = { ...c.traps_upper, weight: 0.75 };
  if (e.category === 'olympic weightlifting' || e.category === 'strongman') {
    // Whole-body lifts: the upstream label list is long and undifferentiated; humans review these.
    for (const g of Object.keys(c) as GroupId[]) c[g] = { ...c[g]!, review: true };
  }
  return c;
}

// ---------- §4.2 explicit overrides (keyed by upstream id; the script fails if an id is missing) ----------
const OVERRIDES: Record<string, Credits> = {
  'Barbell_Bench_Press_-_Medium_Grip': {
    chest: { weight: 1, dist: DIST.chest_flat },
    delt_front: { weight: 0.5 },
    triceps: { weight: 0.5, dist: DIST.triceps_pushdown },
  },
  Incline_Dumbbell_Press: {
    chest: { weight: 1, dist: DIST.chest_incline },
    delt_front: { weight: 0.5 },
    triceps: { weight: 0.5, dist: DIST.triceps_pushdown },
  },
  Bent_Over_Barbell_Row: {
    lats: { weight: 0.75 },
    upper_back: { weight: 1, dist: DIST.upper_back_default },
    delt_rear: { weight: 0.5 },
    biceps: { weight: 0.5, dist: DIST.biceps_default },
    erectors: { weight: 0.25 },
  },
  'Wide-Grip_Lat_Pulldown': {
    lats: { weight: 1 },
    upper_back: { weight: 0.5, dist: DIST.upper_back_default },
    biceps: { weight: 0.5, dist: DIST.biceps_default },
    delt_rear: { weight: 0.25 },
  },
  Barbell_Squat: {
    quads: { weight: 1, dist: DIST.quads_default },
    glutes: { weight: 0.75, dist: DIST.glutes_squat },
    adductors: { weight: 0.5 },
    erectors: { weight: 0.5 },
  },
  Romanian_Deadlift: {
    hamstrings: { weight: 1, dist: DIST.hams_hinge },
    glutes: { weight: 0.75, dist: DIST.glutes_squat },
    erectors: { weight: 0.5 },
  },
  Seated_Leg_Curl: { hamstrings: { weight: 1, dist: DIST.hams_curl } },
  Standing_Dumbbell_Triceps_Extension: { triceps: { weight: 1, dist: DIST.triceps_overhead } },
  Side_Lateral_Raise: { delt_side: { weight: 1 } },
  Standing_Calf_Raises: { calves: { weight: 1, dist: DIST.calves_standing } },
  Seated_Calf_Raise: { calves: { weight: 1, dist: DIST.calves_seated } },
};

// ---------- evidence table (ADR-0023) ----------
type EvidenceEntry = {
  familyId: string;
  batch: string;
  mapping: Array<{ groupId: GroupId; weight: number; regionDistribution?: Dist }>;
  confidence: 'high' | 'medium' | 'low';
  verified: boolean;
};
type EvidenceTable = { batches: string[]; verifiedBatches: string[]; exercises: Record<string, EvidenceEntry> };

function loadEvidenceTable(): EvidenceTable | null {
  const p = resolve(__dirname, 'evidence', 'table.json');
  return existsSync(p) ? (JSON.parse(readFileSync(p, 'utf8')) as EvidenceTable) : null;
}

function creditsFromEvidence(t: EvidenceEntry): Credits {
  const c: Credits = {};
  for (const m of t.mapping)
    c[m.groupId] = { weight: m.weight, dist: m.regionDistribution, review: t.confidence === 'low' };
  return c;
}

// ---------- main ----------
const EXCLUDED_CATEGORIES = new Set(['stretching', 'cardio']);

function main() {
  const src = resolve(process.argv[2] ?? '../free-exercise-db');
  const file = join(src, 'dist', 'exercises.json');
  if (!existsSync(file)) throw new Error(`Not found: ${file}`);
  const raw = JSON.parse(readFileSync(file, 'utf8')) as UpstreamExercise[];
  let revision = 'unknown';
  let revisionDate = 'unknown';
  try {
    revision = execSync('git rev-parse --short=12 HEAD', { cwd: src, encoding: 'utf8' }).trim();
    revisionDate = execSync('git log -1 --format=%cs HEAD', { cwd: src, encoding: 'utf8' }).trim();
  } catch {
    /* not a git checkout */
  }
  const license = existsSync(join(src, 'LICENSE.md')) ? readFileSync(join(src, 'LICENSE.md'), 'utf8') : '';
  if (!/public domain/i.test(license))
    throw new Error('Expected the Unlicense (public domain) text in LICENSE.md — verify before importing.');

  const source = `free-exercise-db@${revision}`;
  const allNames = new Set(raw.filter((e) => !EXCLUDED_CATEGORIES.has(e.category)).map((e) => e.name.toLowerCase()));
  const exercises: SeedExercise[] = [];
  const mappings: SeedMapping[] = [];
  const evidence = loadEvidenceTable();
  const stats = {
    total: raw.length,
    excluded: 0,
    imported: 0,
    flaggedExercises: 0,
    overrides: 0,
    evidenceMapped: 0,
    ruleMapped: 0,
  };
  for (const id of Object.keys(evidence?.exercises ?? {}))
    if (!raw.find((e) => e.id === id)) throw new Error(`Evidence table references unknown upstream id: ${id}`);

  for (const id of Object.keys(OVERRIDES))
    if (!raw.find((e) => e.id === id)) throw new Error(`Override references unknown upstream id: ${id}`);
  for (const id of Object.keys(ALIASES))
    if (!raw.find((e) => e.id === id)) console.warn(`warning: alias key does not exist upstream: ${id}`);

  for (const e of raw) {
    if (EXCLUDED_CATEGORIES.has(e.category)) {
      stats.excluded++;
      continue;
    }
    const fromEvidence = evidence?.exercises[e.id];
    const credits = OVERRIDES[e.id] ?? (fromEvidence ? creditsFromEvidence(fromEvidence) : creditsFor(e));
    if (OVERRIDES[e.id]) stats.overrides++;
    if (fromEvidence || OVERRIDES[e.id]) stats.evidenceMapped++;
    else stats.ruleMapped++;
    const rows = Object.entries(credits) as Array<[GroupId, Credit]>;
    if (!rows.some(([, c]) => c.weight >= 1))
      throw new Error(`No primary (weight 1.0) group for ${e.id}: ${JSON.stringify(credits)}`);

    exercises.push({
      id: e.id,
      name: e.name,
      aliases: [...new Set([...(ALIASES[e.id] ?? []), ...autoAliases(e.name)])].filter(
        (a) => a !== e.name && !allNames.has(a.toLowerCase()),
      ),
      equipment: equipmentOf(e),
      mechanic: e.mechanic ?? (rows.length > 2 ? 'compound' : 'isolation'),
      pattern: patternOf(e),
      force: e.force,
      level: levelOf(e.level),
      category: e.category,
      instructions: e.instructions,
      mediaRefs: e.images,
      source,
    });
    if (rows.some(([, c]) => c.review)) stats.flaggedExercises++;
    for (const [groupId, c] of rows) {
      const row: SeedMapping = { exerciseId: e.id, groupId, weight: round(c.weight) };
      if (hasSubRegions(groupId)) {
        const d = c.dist ?? DEFAULT_DIST[groupId]!;
        row.regionDistribution = Object.fromEntries(
          (GROUP_REGIONS[groupId] as readonly RegionId[]).map((r) => [r, round(d[r] ?? 0)]),
        ) as Dist;
      }
      if (c.review) row.needsReview = true;
      mappings.push(row);
    }
    stats.imported++;
  }

  const outDir = resolve(process.argv[3] ?? 'src/data');
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, 'exercises.json'), JSON.stringify(exercises, null, 1) + '\n');
  writeFileSync(join(outDir, 'exercise-muscles.json'), JSON.stringify(mappings, null, 1) + '\n');
  writeFileSync(
    join(outDir, 'exercise-db.meta.json'),
    JSON.stringify(
      {
        source: 'https://github.com/yuhonas/free-exercise-db',
        revision,
        license: 'Unlicense (public domain)',
        revisionDate,
        excludedCategories: [...EXCLUDED_CATEGORIES],
        evidenceBatches: evidence?.batches ?? [],
        verifiedBatches: evidence?.verifiedBatches ?? [],
        ...stats,
      },
      null,
      2,
    ) + '\n',
  );
  console.log(JSON.stringify({ source, ...stats, mappings: mappings.length }, null, 2));
}

function round(x: number) {
  return Math.round(x * 1000) / 1000;
}

main();
