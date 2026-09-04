/**
 * Mapping validation (§4.2): weights in range, region distributions sum to 1,
 * every exercise has ≥ 1 primary, every referenced id exists, taxonomy ids only.
 */
import exercises from '../exercises.json';
import mappings from '../exercise-muscles.json';
import { GROUP_IDS, GROUP_REGIONS, hasSubRegions, isGroupId, type GroupId } from '../../engine/taxonomy';

type Mapping = {
  exerciseId: string;
  groupId: string;
  weight: number;
  regionDistribution?: Record<string, number>;
  needsReview?: boolean;
};
const rows = mappings as Mapping[];
const ids = new Set((exercises as { id: string }[]).map((e) => e.id));

describe('exercise seed data', () => {
  it('has unique exercise ids and non-empty names', () => {
    expect(ids.size).toBe((exercises as unknown[]).length);
    for (const e of exercises as { id: string; name: string }[]) expect(e.name.trim().length).toBeGreaterThan(0);
  });

  it('every mapping references an existing exercise and a taxonomy group', () => {
    for (const m of rows) {
      expect(ids.has(m.exerciseId)).toBe(true);
      expect(isGroupId(m.groupId)).toBe(true);
    }
  });

  it('weights are within 0.25–1.0', () => {
    for (const m of rows) {
      expect(m.weight).toBeGreaterThanOrEqual(0.25);
      expect(m.weight).toBeLessThanOrEqual(1.0);
    }
  });

  it('every exercise has at least one primary (weight 1.0) group and no duplicate groups', () => {
    const byExercise = new Map<string, Mapping[]>();
    for (const m of rows) byExercise.set(m.exerciseId, [...(byExercise.get(m.exerciseId) ?? []), m]);
    for (const id of ids) {
      const list = byExercise.get(id) ?? [];
      expect(list.some((m) => m.weight === 1)).toBe(true);
      expect(new Set(list.map((m) => m.groupId)).size).toBe(list.length);
    }
  });

  it('region distributions exist for every multi-region group, use only that group’s regions, and sum to 1', () => {
    for (const m of rows) {
      const g = m.groupId as GroupId;
      if (hasSubRegions(g)) {
        expect(m.regionDistribution).toBeDefined();
        const regions = GROUP_REGIONS[g] as readonly string[];
        const entries = Object.entries(m.regionDistribution!);
        for (const [r, share] of entries) {
          expect(regions).toContain(r);
          expect(share).toBeGreaterThanOrEqual(0);
          expect(share).toBeLessThanOrEqual(1);
        }
        const sum = entries.reduce((s, [, v]) => s + v, 0);
        expect(Math.abs(sum - 1)).toBeLessThan(1e-6);
      } else {
        expect(m.regionDistribution).toBeUndefined();
      }
    }
  });

  it('covers every default group with at least one primary exercise', () => {
    const primaries = new Set(rows.filter((m) => m.weight === 1).map((m) => m.groupId));
    const optional = new Set<string>(['tibialis', 'hip_flexors']);
    for (const g of GROUP_IDS) if (!optional.has(g)) expect(primaries.has(g)).toBe(true);
  });

  it('applies the §4.2 example table verbatim', () => {
    const get = (id: string) => Object.fromEntries(rows.filter((m) => m.exerciseId === id).map((m) => [m.groupId, m]));
    const bench = get('Barbell_Bench_Press_-_Medium_Grip');
    expect(bench.chest?.weight).toBe(1);
    expect(bench.chest?.regionDistribution).toEqual({ chest_upper: 0.25, chest_mid: 0.5, chest_lower: 0.25 });
    expect(bench.triceps?.regionDistribution).toEqual({ triceps_long: 0.3, triceps_lateral_medial: 0.7 });
    const incline = get('Incline_Dumbbell_Press');
    expect(incline.chest?.regionDistribution).toEqual({ chest_upper: 0.6, chest_mid: 0.35, chest_lower: 0.05 });
    const row = get('Bent_Over_Barbell_Row');
    expect(row.lats?.weight).toBe(0.75);
    expect(row.upper_back?.weight).toBe(1);
    expect(row.erectors?.weight).toBe(0.25);
    const squat = get('Barbell_Squat');
    expect(squat.quads?.regionDistribution).toEqual({ quads_rf: 0.1, quads_vasti: 0.9 });
    expect(squat.glutes?.regionDistribution).toEqual({ glute_max: 0.9, glute_med: 0.1 });
    expect(squat.hamstrings).toBeUndefined();
    const rdl = get('Romanian_Deadlift');
    expect(rdl.hamstrings?.regionDistribution).toEqual({ hamstrings_hip_ext: 1, hamstrings_bf_short: 0 });
    const curl = get('Seated_Leg_Curl');
    expect(curl.hamstrings?.regionDistribution).toEqual({ hamstrings_hip_ext: 0.6, hamstrings_bf_short: 0.4 });
    const seatedCalf = get('Seated_Calf_Raise');
    expect(seatedCalf.calves?.regionDistribution).toEqual({ gastrocnemius: 0.2, soleus: 0.8 });
    const lateral = get('Side_Lateral_Raise');
    expect(Object.keys(lateral)).toEqual(['delt_side']);
  });
});
