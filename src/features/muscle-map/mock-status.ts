import type { StatusKind } from '@/db/schema';
import { GROUP_IDS, GROUP_REGIONS, type GroupId, type RegionId } from '@/engine/taxonomy';
import type { MuscleStatus } from './types';

/**
 * Deterministic mock coverage for the Phase 0 spike and the Settings list:
 * spreads ratios across the whole red → green ramp so the placeholder body shows
 * every status at once. Replaced by the engine's muscle_status_cache in Phase 3.
 */
function statusFor(ratio: number): StatusKind {
  if (ratio <= 0) return 'untrained';
  if (ratio < 0.5) return 'low';
  if (ratio < 1) return 'partial';
  return 'covered';
}

export function mockGroupStatuses(): Record<GroupId, MuscleStatus> {
  const out = {} as Record<GroupId, MuscleStatus>;
  GROUP_IDS.forEach((g, i) => {
    const ratio = (Math.round((((i * 7) % 13) / 12) * 100) / 100) * 1.3;
    const r = Math.min(ratio, 1.3);
    out[g] = { ratio: r, status: statusFor(r), flags: r > 1.2 ? ['high_volume'] : [], provisional: i % 5 === 0 };
  });
  return out;
}

export function mockRegionStatuses(): Record<RegionId, MuscleStatus> {
  const groups = mockGroupStatuses();
  const out = {} as Record<RegionId, MuscleStatus>;
  for (const g of GROUP_IDS) {
    GROUP_REGIONS[g].forEach((r, i) => {
      const base = groups[g];
      out[r as RegionId] = { ...base, underEmphasized: i === 1 && base.ratio > 0.4 };
    });
  }
  return out;
}
