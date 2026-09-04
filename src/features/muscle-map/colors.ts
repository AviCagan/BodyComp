import * as THREE from 'three';
import { desaturate, dimOneStep, NEUTRAL_BODY_COLOR, oklchToSrgb, ratioToOklch } from '@/engine/status-color';
import {
  GROUP_REGIONS,
  groupOfRegion,
  OPTIONAL_GROUP_IDS,
  REGION_IDS,
  type GroupId,
  type RegionId,
} from '@/engine/taxonomy';
import { ANIMATION } from './constants';
import type { MapMode, MuscleStatus } from './types';

export interface RegionPaint {
  color: THREE.Color;
  opacity: number;
}

export interface PaintInputs {
  mode: MapMode;
  groupStatuses: Partial<Record<GroupId, MuscleStatus>>;
  regionStatuses?: Partial<Record<RegionId, MuscleStatus>>;
  enabledOptionalGroups: readonly GroupId[];
  selectedRegion: RegionId | null;
  selectionMode: 'detail' | 'pick';
  pickedGroups: readonly GroupId[];
  accentHex: string;
}

const NEUTRAL = oklchToSrgb(NEUTRAL_BODY_COLOR);
const scratchAccent = new THREE.Color();

/** Allocate once per region; `computePaint` then writes into these objects. */
export function createPaintTable(): Record<RegionId, RegionPaint> {
  const table = {} as Record<RegionId, RegionPaint>;
  for (const r of REGION_IDS) table[r] = { color: new THREE.Color(NEUTRAL.r, NEUTRAL.g, NEUTRAL.b), opacity: 1 };
  return table;
}

/** Fills `out` with the target color/opacity for every region. No allocations after warm-up. */
export function computePaint(out: Record<RegionId, RegionPaint>, inputs: PaintInputs): void {
  const {
    mode,
    groupStatuses,
    regionStatuses,
    enabledOptionalGroups,
    selectedRegion,
    selectionMode,
    pickedGroups,
    accentHex,
  } = inputs;
  const selectedGroup = selectedRegion ? groupOfRegion(selectedRegion) : null;
  const anySelected = selectionMode === 'detail' && selectedRegion !== null;
  scratchAccent.set(accentHex);

  for (const region of REGION_IDS) {
    const group = groupOfRegion(region);
    const paint = out[region];
    const optionalOff = OPTIONAL_GROUP_IDS.includes(group) && !enabledOptionalGroups.includes(group);
    const status = mode === 'regions' ? (regionStatuses?.[region] ?? groupStatuses[group]) : groupStatuses[group];

    if (optionalOff || !status) {
      paint.color.setRGB(NEUTRAL.r, NEUTRAL.g, NEUTRAL.b);
      paint.opacity = 1;
    } else {
      let oklch = ratioToOklch(status.ratio);
      if (status.provisional) oklch = desaturate(oklch);
      if (mode === 'regions' && status.underEmphasized) oklch = dimOneStep(oklch);
      const rgb = oklchToSrgb(oklch);
      paint.color.setRGB(rgb.r, rgb.g, rgb.b);
      paint.opacity = status.provisional ? 0.6 : 1;
    }

    if (selectionMode === 'pick') {
      if (pickedGroups.includes(group)) paint.color.lerp(scratchAccent, 0.55);
    } else if (anySelected) {
      const isSelected = mode === 'regions' ? region === selectedRegion : group === selectedGroup;
      if (isSelected) paint.color.lerp(WHITE, 0.3);
      else paint.color.multiplyScalar(ANIMATION.dimFactor);
    }
  }
}

const WHITE = new THREE.Color(1, 1, 1);

/** Regions that light up together with the given selection in the current mode. */
export function regionsHighlightedBy(region: RegionId, mode: MapMode): readonly RegionId[] {
  return mode === 'regions' ? [region] : GROUP_REGIONS[groupOfRegion(region)];
}
