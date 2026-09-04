import type { StatusFlag, StatusKind } from '@/db/schema';
import type { GroupId, RegionId } from '@/engine/taxonomy';

/** Everything the map needs to color one group or region. Produced by the engine (Phase 3). */
export interface MuscleStatus {
  /** effectiveSets / target, unclamped (the color clamps at 1) */
  ratio: number;
  status: StatusKind;
  flags?: StatusFlag[];
  /** estimated from a program import; rendered desaturated at ~60% opacity */
  provisional?: boolean;
  /** region only: share below REGION_MIN_SHARE while the group has ≥ min sets; rendered one step dimmer */
  underEmphasized?: boolean;
}

export type BodyModel = 'female' | 'male';
export type MapMode = 'groups' | 'regions';
export type SnapView = 'front' | 'back' | 'left' | 'right';

export interface MuscleMapSelection {
  region: RegionId;
  group: GroupId;
}
