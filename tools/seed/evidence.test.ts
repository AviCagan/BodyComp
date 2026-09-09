/**
 * Evidence table (ADR-0023): the committed table and document must match a fresh build, every
 * exercise in the table must exist in the seed, and the curated-corrections machinery must patch
 * exactly what it says.
 */
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readFileSync } from 'node:fs';
import {
  buildTable,
  renderMarkdown,
  validateMapping,
  type Correction,
  type ResearchBatch,
} from './build-evidence-table';
import committed from './evidence/table.json';
import exercises from '../../src/data/exercises.json';

const names = new Map((exercises as Array<{ id: string; name: string }>).map((e) => [e.id, e.name]));

describe('evidence table', () => {
  const built = buildTable();

  it('committed table.json matches a fresh build (run `npx tsx tools/seed/build-evidence-table.ts`)', () => {
    expect(JSON.parse(JSON.stringify(built))).toEqual(committed);
  });

  it('committed markdown matches a fresh render', () => {
    const doc = readFileSync(join(__dirname, '..', '..', 'docs', 'research', 'exercise-muscle-evidence.md'), 'utf8');
    expect(doc).toBe(renderMarkdown(built, names) + '\n');
  });

  it('references only exercises that exist in the seed, each exactly once', () => {
    for (const id of Object.keys(built.exercises)) expect(names.has(id)).toBe(true);
    const perFamily = new Map<string, number>();
    for (const e of Object.values(built.exercises))
      perFamily.set(`${e.batch}/${e.familyId}`, (perFamily.get(`${e.batch}/${e.familyId}`) ?? 0) + 1);
    for (const f of built.families) expect(perFamily.get(`${f.batch}/${f.id}`) ?? 0).toBe(f.exerciseCount);
  });

  it('every mapping passes the §4.2 rules', () => {
    for (const [id, e] of Object.entries(built.exercises)) expect(() => validateMapping(id, e.mapping)).not.toThrow();
  });
});

describe('curated corrections', () => {
  const batch: ResearchBatch = {
    batch: 'toy',
    families: [
      {
        id: 'press',
        name: 'Press',
        description: 'd',
        exerciseIds: ['A', 'B', 'C'],
        mapping: [
          { groupId: 'chest', weight: 1, regionDistribution: { chest_upper: 0.25, chest_mid: 0.5, chest_lower: 0.25 } },
          { groupId: 'delt_front', weight: 0.5 },
        ],
        perExerciseOverrides: [{ exerciseId: 'B', mapping: [{ groupId: 'delt_front', weight: 1 }], reason: 'steep' }],
        evidence: [],
        conflictsWithBrief: [],
        confidence: 'high',
      },
      {
        id: 'fly',
        name: 'Fly',
        description: 'd',
        exerciseIds: ['D'],
        mapping: [
          { groupId: 'chest', weight: 1, regionDistribution: { chest_upper: 0.2, chest_mid: 0.5, chest_lower: 0.3 } },
        ],
        evidence: [],
        conflictsWithBrief: [],
        confidence: 'low',
      },
    ],
    unassignedExerciseIds: [],
    openQuestions: [],
  };

  function build(corrections: Correction[]) {
    const dir = mkdtempSync(join(tmpdir(), 'evidence-'));
    mkdirSync(join(dir, 'research'));
    writeFileSync(join(dir, 'research', 'toy.json'), JSON.stringify(batch));
    writeFileSync(join(dir, 'corrections.json'), JSON.stringify(corrections));
    return buildTable({ evidenceDir: dir });
  }

  it('applies nothing by default and expands per-exercise overrides', () => {
    const t = build([]);
    expect(t.correctionsApplied).toBe(0);
    expect(t.exercises.A!.mapping.map((m) => m.groupId)).toEqual(['chest', 'delt_front']);
    expect(t.exercises.B!.mapping).toEqual([{ groupId: 'delt_front', weight: 1 }]);
    expect(t.exercises.B!.overrideReason).toBe('steep');
    expect(t.exercises.D!.confidence).toBe('low');
  });

  it('set_credit on a family changes every member without its own override', () => {
    const t = build([
      {
        op: 'set_credit',
        batch: 'toy',
        familyId: 'press',
        credit: {
          groupId: 'triceps',
          weight: 0.5,
          regionDistribution: { triceps_long: 0.3, triceps_lateral_medial: 0.7 },
        },
        reason: 'r',
      },
    ]);
    expect(t.exercises.A!.mapping.map((m) => m.groupId)).toEqual(['chest', 'delt_front', 'triceps']);
    expect(t.exercises.C!.mapping.map((m) => m.groupId)).toEqual(['chest', 'delt_front', 'triceps']);
    expect(t.exercises.B!.mapping.map((m) => m.groupId)).toEqual(['delt_front']);
    expect(t.correctionsApplied).toBe(1);
  });

  it('set_credit with an exerciseId creates an override for just that exercise', () => {
    const t = build([
      {
        op: 'set_credit',
        batch: 'toy',
        familyId: 'press',
        exerciseId: 'C',
        credit: { groupId: 'delt_front', weight: 0.75 },
        reason: 'r',
      },
    ]);
    expect(t.exercises.C!.mapping.find((m) => m.groupId === 'delt_front')!.weight).toBe(0.75);
    expect(t.exercises.A!.mapping.find((m) => m.groupId === 'delt_front')!.weight).toBe(0.5);
    expect(t.exercises.C!.overrideReason).toBe('curated correction');
  });

  it('move_exercise, drop_override, remove_credit and set_confidence', () => {
    const t = build([
      { op: 'move_exercise', batch: 'toy', exerciseId: 'C', toFamilyId: 'fly', reason: 'r' },
      { op: 'drop_override', batch: 'toy', familyId: 'press', exerciseId: 'B', reason: 'r' },
      { op: 'remove_credit', batch: 'toy', familyId: 'press', groupId: 'delt_front', reason: 'r' },
      { op: 'set_confidence', batch: 'toy', familyId: 'fly', confidence: 'medium', reason: 'r' },
    ]);
    expect(t.exercises.C!.familyId).toBe('fly');
    expect(t.exercises.B!.overrideReason).toBeUndefined();
    expect(t.exercises.B!.mapping.map((m) => m.groupId)).toEqual(['chest']);
    expect(t.exercises.D!.confidence).toBe('medium');
    expect(t.families.find((f) => f.id === 'press')!.exerciseCount).toBe(2);
  });

  it('rejects a mapping that breaks the rules', () => {
    expect(() =>
      build([{ op: 'remove_credit', batch: 'toy', familyId: 'press', groupId: 'chest', reason: 'r' }]),
    ).toThrow(/no primary/);
    expect(() =>
      build([
        {
          op: 'set_credit',
          batch: 'toy',
          familyId: 'fly',
          credit: {
            groupId: 'chest',
            weight: 1,
            regionDistribution: { chest_upper: 0.5, chest_mid: 0.5, chest_lower: 0.5 },
          },
          reason: 'r',
        },
      ]),
    ).toThrow(/sums to/);
    expect(() =>
      build([
        { op: 'set_credit', batch: 'toy', familyId: 'fly', credit: { groupId: 'lats', weight: 0.1 }, reason: 'r' },
      ]),
    ).toThrow(/weight 0.1/);
  });
});
