/**
 * All user-facing copy lives here (English only in v1, i18n-ready).
 *
 * Tone rules (brief §2, §7): plain, direct, second person, no hype, no emoji.
 * Say "weekly hard sets", "stimulus", "coverage". Never "losing gains",
 * "shock the muscle", "muscle confusion", "toning". Colors mean programming
 * coverage, not muscle size — copy must never imply a red muscle has shrunk.
 */
import type { GroupId, RegionId } from './engine/taxonomy';

export const strings = {
  tabs: {
    log: 'Log',
    history: 'History',
    map: 'Map',
    progress: 'Progress',
    settings: 'Settings',
  },
  map: {
    title: 'Muscle Map',
    legend: 'Coverage this week',
    modeGroups: 'Groups',
    modeRegions: 'Regions',
    snapFront: 'Front',
    snapBack: 'Back',
    snapLeft: 'Left',
    snapRight: 'Right',
    resetView: 'Reset view',
    bodyFemale: 'Female',
    bodyMale: 'Male',
    glUnavailableTitle: '3D view unavailable',
    glUnavailableBody:
      'This device could not start the 3D renderer. Your muscle coverage is still available as a list in Settings.',
    spikeBanner: 'Placeholder body for the rendering spike. Real anatomy ships in Phase 1.',
    provisionalBanner: 'Estimated from your program. Log workouts to replace.',
    selected: (name: string) => `${name} selected`,
  },
  status: {
    untrained: 'Not trained this week',
    low: 'Low coverage',
    partial: 'Partial coverage',
    covered: 'Covered',
    highVolume: 'High volume',
    possiblyExcessive: 'Possibly excessive volume',
    underEmphasized: 'Under-emphasized',
    estimated: 'Estimated',
  },
  placeholder: {
    comingSoon: (feature: string) => `${feature} arrives in a later phase.`,
  },
  common: {
    close: 'Close',
    cancel: 'Cancel',
    save: 'Save',
    retry: 'Retry',
  },
} as const;

export const groupNames: Record<GroupId, string> = {
  chest: 'Chest',
  delt_front: 'Front delts',
  delt_side: 'Side delts',
  delt_rear: 'Rear delts',
  lats: 'Lats',
  upper_back: 'Upper back',
  traps_upper: 'Upper traps',
  erectors: 'Spinal erectors',
  biceps: 'Biceps',
  triceps: 'Triceps',
  forearms: 'Forearms',
  abs: 'Abs',
  obliques: 'Obliques',
  glutes: 'Glutes',
  quads: 'Quads',
  hamstrings: 'Hamstrings',
  adductors: 'Adductors',
  calves: 'Calves',
  tibialis: 'Tibialis',
  neck: 'Neck',
  hip_flexors: 'Hip flexors',
};

export const regionNames: Record<RegionId, string> = {
  chest_upper: 'Upper chest',
  chest_mid: 'Mid chest',
  chest_lower: 'Lower chest',
  delt_front: 'Front delt',
  delt_side: 'Side delt',
  delt_rear: 'Rear delt',
  lats: 'Lats',
  traps_mid_lower: 'Mid and lower traps',
  rhomboids: 'Rhomboids',
  traps_upper: 'Upper traps',
  erectors: 'Spinal erectors',
  biceps: 'Biceps',
  brachialis: 'Brachialis',
  triceps_long: 'Triceps long head',
  triceps_lateral_medial: 'Triceps lateral and medial heads',
  forearm_flexors: 'Forearm flexors',
  forearm_extensors_brachioradialis: 'Forearm extensors and brachioradialis',
  abs: 'Abs',
  obliques: 'Obliques',
  glute_max: 'Gluteus maximus',
  glute_med: 'Gluteus medius',
  quads_rf: 'Rectus femoris',
  quads_vasti: 'Vasti',
  hamstrings_hip_ext: 'Hamstrings (hip extension)',
  hamstrings_bf_short: 'Biceps femoris short head',
  adductors: 'Adductors',
  gastrocnemius: 'Gastrocnemius',
  soleus: 'Soleus',
  tibialis: 'Tibialis anterior',
  neck_flexors: 'Neck flexors',
  neck_extensors: 'Neck extensors',
  hip_flexors: 'Hip flexors',
};
