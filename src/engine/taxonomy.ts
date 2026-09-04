/**
 * Muscle taxonomy (brief §4.1).
 *
 * Two levels:
 *  - GROUPS are scored by the engine (volume landmarks apply to them).
 *  - REGIONS are sub-areas inside a group that specific exercises emphasize.
 *    They get an emphasis check and their own color on the 3D map.
 *
 * A group with no listed regions is rendered as a single region whose id equals
 * the group id (e.g. `lats`). Region ids are therefore unique across the whole
 * set and are exactly the mesh names in the GLB asset contract (§6.2).
 *
 * Ids are stable snake_case strings stored in the DB. Display names live in
 * `src/strings.ts`, never here.
 */

export const GROUP_IDS = [
  'chest',
  'delt_front',
  'delt_side',
  'delt_rear',
  'lats',
  'upper_back',
  'traps_upper',
  'erectors',
  'biceps',
  'triceps',
  'forearms',
  'abs',
  'obliques',
  'glutes',
  'quads',
  'hamstrings',
  'adductors',
  'calves',
  'tibialis',
  'neck',
  'hip_flexors',
] as const;

export type GroupId = (typeof GROUP_IDS)[number];

/** Regions per group. Groups not listed have a single region equal to their id. */
export const GROUP_REGIONS = {
  chest: ['chest_upper', 'chest_mid', 'chest_lower'],
  delt_front: ['delt_front'],
  delt_side: ['delt_side'],
  delt_rear: ['delt_rear'],
  lats: ['lats'],
  upper_back: ['traps_mid_lower', 'rhomboids'],
  traps_upper: ['traps_upper'],
  erectors: ['erectors'],
  biceps: ['biceps', 'brachialis'],
  triceps: ['triceps_long', 'triceps_lateral_medial'],
  forearms: ['forearm_flexors', 'forearm_extensors_brachioradialis'],
  abs: ['abs'],
  obliques: ['obliques'],
  glutes: ['glute_max', 'glute_med'],
  quads: ['quads_rf', 'quads_vasti'],
  hamstrings: ['hamstrings_hip_ext', 'hamstrings_bf_short'],
  adductors: ['adductors'],
  calves: ['gastrocnemius', 'soleus'],
  tibialis: ['tibialis'],
  neck: ['neck_flexors', 'neck_extensors'],
  hip_flexors: ['hip_flexors'],
} as const satisfies Record<GroupId, readonly string[]>;

export type RegionId = (typeof GROUP_REGIONS)[GroupId][number];

/** Every region id, in group order. These are the mesh names in the GLB contract. */
export const REGION_IDS: readonly RegionId[] = GROUP_IDS.flatMap((g) => GROUP_REGIONS[g] as readonly RegionId[]);

/** Groups that are off by default and opt-in in Settings (§4.1). */
export const OPTIONAL_GROUP_IDS: readonly GroupId[] = ['tibialis', 'neck', 'hip_flexors'];

export const DEFAULT_GROUP_IDS: readonly GroupId[] = GROUP_IDS.filter((g) => !OPTIONAL_GROUP_IDS.includes(g));

/** Non-tracked mesh in the GLB (deep muscles, skull, hands, feet, skeleton). */
export const BODY_BASE_MESH = 'body_base';

const REGION_TO_GROUP: Record<string, GroupId> = Object.create(null) as Record<string, GroupId>;
for (const g of GROUP_IDS) {
  for (const r of GROUP_REGIONS[g]) REGION_TO_GROUP[r] = g;
}

export function groupOfRegion(region: RegionId): GroupId {
  return REGION_TO_GROUP[region] as GroupId;
}

export function isGroupId(id: string): id is GroupId {
  return (GROUP_IDS as readonly string[]).includes(id);
}

export function isRegionId(id: string): id is RegionId {
  return Object.hasOwn(REGION_TO_GROUP, id);
}

/** True when the group has more than one region (so region distributions matter). */
export function hasSubRegions(group: GroupId): boolean {
  return GROUP_REGIONS[group].length > 1;
}
