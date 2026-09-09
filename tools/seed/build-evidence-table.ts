/**
 * Evidence table builder (ADR-0023):
 *
 *   tools/seed/evidence/research/<batch>.json   researcher output (families, mappings, evidence)
 *   tools/seed/evidence/verify/<batch>.json     verifier output (verdicts, citation checks)   [optional]
 *   tools/seed/evidence/corrections.json        curated patches applied on top of the research [optional]
 *         ──►  tools/seed/evidence/table.json    one mapping per exercise, consumed by the import script
 *         ──►  docs/research/exercise-muscle-evidence.md   the human-readable family table with citations
 *
 * Usage:  npx tsx tools/seed/build-evidence-table.ts
 *
 * The builder never invents numbers: every mapping in `table.json` is a researcher's family mapping, a
 * researcher's per-exercise override, or one of those with a curated correction applied (each correction
 * carries its reason and provenance). Rule compliance (§4.2) is enforced here so a bad row fails the build
 * rather than reaching the app. The eleven §4.2 anchor rows are checked byte-for-byte against the brief.
 */
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { GROUP_REGIONS, hasSubRegions, isGroupId, type GroupId, type RegionId } from '../../src/engine/taxonomy';

// ---------- research / verify shapes (mirror the workflow schemas) ----------
export type Dist = Partial<Record<RegionId, number>>;
export interface Credit {
  groupId: GroupId;
  weight: number;
  regionDistribution?: Dist;
  rationale?: string;
}
export interface Evidence {
  claim: string;
  source: string;
  pmid?: string;
  doi?: string;
  tier: 'hypertrophy' | 'emg' | 'anatomical' | 'consensus';
  confidence: 'verified' | 'likely' | 'unverified';
}
export interface Family {
  id: string;
  name: string;
  description: string;
  exerciseIds: string[];
  mapping: Credit[];
  perExerciseOverrides?: Array<{ exerciseId: string; mapping: Credit[]; reason: string }>;
  evidence: Evidence[];
  conflictsWithBrief: string[];
  confidence: 'high' | 'medium' | 'low';
  notes?: string;
}
export interface ResearchBatch {
  batch: string;
  scope?: string;
  families: Family[];
  unassignedExerciseIds: string[];
  openQuestions: string[];
}
export interface VerifyBatch {
  batch: string;
  families: Array<{
    familyId: string;
    verdict: 'accept' | 'revise' | 'reject';
    issues: string[];
    corrections: Array<{ field: string; from: string; to: string; reason: string }>;
    citationChecks: Array<{ source: string; exists: boolean; supportsClaim: boolean; note: string }>;
    misassignedExerciseIds?: string[];
  }>;
  overallNotes: string;
}

/**
 * Curated corrections: written by hand after reading the verifier output (the verifier's own
 * `corrections` are free text, so they are not applied blindly). Each entry patches one thing.
 */
export type Correction =
  | { op: 'set_credit'; batch: string; familyId: string; exerciseId?: string; credit: Credit; reason: string }
  | { op: 'remove_credit'; batch: string; familyId: string; exerciseId?: string; groupId: GroupId; reason: string }
  | { op: 'move_exercise'; batch: string; exerciseId: string; toFamilyId: string; reason: string }
  | { op: 'drop_override'; batch: string; familyId: string; exerciseId: string; reason: string }
  | { op: 'set_confidence'; batch: string; familyId: string; confidence: Family['confidence']; reason: string };

// ---------- output shape ----------
export interface TableEntry {
  familyId: string;
  batch: string;
  mapping: Array<{ groupId: GroupId; weight: number; regionDistribution?: Dist }>;
  /** Set when the exercise uses a per-exercise override instead of the family mapping. */
  overrideReason?: string;
  confidence: Family['confidence'];
  verified: boolean;
}
export interface EvidenceTable {
  batches: string[];
  verifiedBatches: string[];
  families: Array<{
    id: string;
    batch: string;
    name: string;
    description: string;
    confidence: Family['confidence'];
    verdict?: VerifyBatch['families'][number]['verdict'];
    exerciseCount: number;
    mapping: Array<{ groupId: GroupId; weight: number; regionDistribution?: Dist; rationale?: string }>;
    evidence: Array<Evidence & { checked?: { exists: boolean; supportsClaim: boolean; note: string } }>;
    conflictsWithBrief: string[];
    notes?: string;
  }>;
  exercises: Record<string, TableEntry>;
  openQuestions: Array<{ batch: string; question: string }>;
  correctionsApplied: number;
}

// ---------- §4.2 anchors (the brief; must survive untouched) ----------
const ANCHORS: Record<string, Array<[GroupId, number, Dist?]>> = {
  'Barbell_Bench_Press_-_Medium_Grip': [
    ['chest', 1, { chest_upper: 0.25, chest_mid: 0.5, chest_lower: 0.25 }],
    ['delt_front', 0.5],
    ['triceps', 0.5, { triceps_long: 0.3, triceps_lateral_medial: 0.7 }],
  ],
  Incline_Dumbbell_Press: [
    ['chest', 1, { chest_upper: 0.6, chest_mid: 0.35, chest_lower: 0.05 }],
    ['delt_front', 0.5],
    ['triceps', 0.5],
  ],
  Bent_Over_Barbell_Row: [
    ['lats', 0.75],
    ['upper_back', 1],
    ['delt_rear', 0.5],
    ['biceps', 0.5],
    ['erectors', 0.25],
  ],
  'Wide-Grip_Lat_Pulldown': [
    ['lats', 1],
    ['upper_back', 0.5],
    ['biceps', 0.5],
    ['delt_rear', 0.25],
  ],
  Barbell_Squat: [
    ['quads', 1, { quads_rf: 0.1, quads_vasti: 0.9 }],
    ['glutes', 0.75, { glute_max: 0.9, glute_med: 0.1 }],
    ['adductors', 0.5],
    ['erectors', 0.5],
  ],
  Romanian_Deadlift: [
    ['hamstrings', 1, { hamstrings_hip_ext: 1, hamstrings_bf_short: 0 }],
    ['glutes', 0.75],
    ['erectors', 0.5],
  ],
  Seated_Leg_Curl: [['hamstrings', 1, { hamstrings_hip_ext: 0.6, hamstrings_bf_short: 0.4 }]],
  Standing_Dumbbell_Triceps_Extension: [['triceps', 1, { triceps_long: 0.7, triceps_lateral_medial: 0.3 }]],
  Side_Lateral_Raise: [['delt_side', 1]],
  Standing_Calf_Raises: [['calves', 1, { gastrocnemius: 0.7, soleus: 0.3 }]],
  Seated_Calf_Raise: [['calves', 1, { gastrocnemius: 0.2, soleus: 0.8 }]],
};

const ROOT = resolve(__dirname, '..', '..');
const EVIDENCE_DIR = join(ROOT, 'tools', 'seed', 'evidence');
const DOC_PATH = join(ROOT, 'docs', 'research', 'exercise-muscle-evidence.md');

function readJson<T>(p: string): T {
  return JSON.parse(readFileSync(p, 'utf8')) as T;
}
function listJson(dir: string): string[] {
  return existsSync(dir)
    ? readdirSync(dir)
        .filter((f) => f.endsWith('.json'))
        .sort()
    : [];
}
function round(x: number) {
  return Math.round(x * 1000) / 1000;
}
function fail(msg: string): never {
  throw new Error(msg);
}

// ---------- validation (§4.2 rules) ----------
export function validateMapping(where: string, mapping: Credit[]): void {
  if (mapping.length === 0) fail(`${where}: empty mapping`);
  if (!mapping.some((m) => Math.abs(m.weight - 1) < 1e-9)) fail(`${where}: no primary (1.0) group`);
  const seen = new Set<string>();
  for (const m of mapping) {
    if (!isGroupId(m.groupId)) fail(`${where}: unknown group ${m.groupId}`);
    if (seen.has(m.groupId)) fail(`${where}: duplicate group ${m.groupId}`);
    seen.add(m.groupId);
    if (m.weight < 0.25 - 1e-9 || m.weight > 1 + 1e-9) fail(`${where}: weight ${m.weight} for ${m.groupId}`);
    if (hasSubRegions(m.groupId)) {
      const d = m.regionDistribution;
      if (!d) fail(`${where}: ${m.groupId} needs a region distribution`);
      const regions = GROUP_REGIONS[m.groupId] as readonly string[];
      for (const k of Object.keys(d)) if (!regions.includes(k)) fail(`${where}: ${m.groupId} bad region ${k}`);
      const sum = Object.values(d).reduce((a, b) => a + (b ?? 0), 0);
      if (Math.abs(sum - 1) > 1e-3) fail(`${where}: ${m.groupId} distribution sums to ${sum}`);
    } else if (m.regionDistribution) fail(`${where}: ${m.groupId} is single-region, no distribution allowed`);
  }
}

function normalize(mapping: Credit[]): TableEntry['mapping'] {
  return mapping.map((m) => {
    const out: TableEntry['mapping'][number] = { groupId: m.groupId, weight: round(m.weight) };
    if (hasSubRegions(m.groupId)) {
      const d = m.regionDistribution ?? {};
      out.regionDistribution = Object.fromEntries(
        (GROUP_REGIONS[m.groupId] as readonly RegionId[]).map((r) => [r, round(d[r] ?? 0)]),
      ) as Dist;
    }
    return out;
  });
}

function sameMapping(a: TableEntry['mapping'], b: Array<[GroupId, number, Dist?]>): boolean {
  if (a.length !== b.length) return false;
  for (const [g, w, d] of b) {
    const m = a.find((x) => x.groupId === g);
    if (!m || Math.abs(m.weight - w) > 1e-9) return false;
    if (d)
      for (const [r, s] of Object.entries(d))
        if (Math.abs((m.regionDistribution?.[r as RegionId] ?? 0) - s) > 1e-9) return false;
  }
  return true;
}

// ---------- corrections ----------
function applyCorrections(batches: Map<string, ResearchBatch>, corrections: Correction[]): number {
  let applied = 0;
  for (const c of corrections) {
    const b = batches.get(c.batch) ?? fail(`correction targets unknown batch ${c.batch}`);
    const fam = (id: string) =>
      b.families.find((f) => f.id === id) ?? fail(`correction targets unknown family ${c.batch}/${id}`);
    const target = (f: Family, exerciseId?: string): Credit[] => {
      if (!exerciseId) return f.mapping;
      let o = f.perExerciseOverrides?.find((x) => x.exerciseId === exerciseId);
      if (!o) {
        if (!f.exerciseIds.includes(exerciseId)) fail(`${exerciseId} is not in family ${f.id}`);
        o = { exerciseId, mapping: f.mapping.map((m) => ({ ...m })), reason: 'curated correction' };
        f.perExerciseOverrides = [...(f.perExerciseOverrides ?? []), o];
      }
      return o.mapping;
    };
    switch (c.op) {
      case 'set_credit': {
        const list = target(fam(c.familyId), c.exerciseId);
        const i = list.findIndex((m) => m.groupId === c.credit.groupId);
        const credit = { ...c.credit, rationale: `${c.credit.rationale ?? ''} [correction: ${c.reason}]`.trim() };
        if (i >= 0) list[i] = credit;
        else list.push(credit);
        break;
      }
      case 'remove_credit': {
        const list = target(fam(c.familyId), c.exerciseId);
        const i = list.findIndex((m) => m.groupId === c.groupId);
        if (i < 0) fail(`remove_credit: ${c.groupId} not in ${c.familyId}`);
        list.splice(i, 1);
        break;
      }
      case 'move_exercise': {
        const from =
          b.families.find((f) => f.exerciseIds.includes(c.exerciseId)) ??
          fail(`move_exercise: ${c.exerciseId} not found`);
        from.exerciseIds = from.exerciseIds.filter((x) => x !== c.exerciseId);
        from.perExerciseOverrides = from.perExerciseOverrides?.filter((o) => o.exerciseId !== c.exerciseId);
        fam(c.toFamilyId).exerciseIds.push(c.exerciseId);
        break;
      }
      case 'drop_override': {
        const f = fam(c.familyId);
        const before = f.perExerciseOverrides?.length ?? 0;
        f.perExerciseOverrides = f.perExerciseOverrides?.filter((o) => o.exerciseId !== c.exerciseId);
        if ((f.perExerciseOverrides?.length ?? 0) === before) fail(`drop_override: no override for ${c.exerciseId}`);
        break;
      }
      case 'set_confidence':
        fam(c.familyId).confidence = c.confidence;
        break;
    }
    applied++;
  }
  return applied;
}

// ---------- build ----------
export function buildTable(opts: { evidenceDir?: string } = {}): EvidenceTable {
  const dir = opts.evidenceDir ?? EVIDENCE_DIR;
  const research = new Map<string, ResearchBatch>();
  for (const f of listJson(join(dir, 'research'))) {
    const r = readJson<ResearchBatch>(join(dir, 'research', f));
    research.set(r.batch, r);
  }
  if (research.size === 0) fail(`no research batches under ${join(dir, 'research')}`);
  const verify = new Map<string, VerifyBatch>();
  for (const f of listJson(join(dir, 'verify'))) {
    const v = readJson<VerifyBatch>(join(dir, 'verify', f));
    verify.set(v.batch, v);
  }
  const correctionsPath = join(dir, 'corrections.json');
  const corrections = existsSync(correctionsPath) ? readJson<Correction[]>(correctionsPath) : [];
  const correctionsApplied = applyCorrections(research, corrections);

  const table: EvidenceTable = {
    batches: [...research.keys()],
    verifiedBatches: [...verify.keys()],
    families: [],
    exercises: {},
    openQuestions: [],
    correctionsApplied,
  };
  const owner = new Map<string, string>();

  for (const [batch, r] of research) {
    const v = verify.get(batch);
    for (const fam of r.families) {
      const where = `${batch}/${fam.id}`;
      const vf = v?.families.find((x) => x.familyId === fam.id);
      if (vf?.verdict === 'reject')
        fail(`${where}: rejected by the verifier; resolve with corrections before building`);
      validateMapping(where, fam.mapping);
      const famMapping = normalize(fam.mapping);
      const overrides = new Map<string, { mapping: TableEntry['mapping']; reason: string }>();
      for (const o of fam.perExerciseOverrides ?? []) {
        if (!fam.exerciseIds.includes(o.exerciseId))
          fail(`${where}: override for ${o.exerciseId} which is not in the family`);
        validateMapping(`${where}/${o.exerciseId}`, o.mapping);
        overrides.set(o.exerciseId, { mapping: normalize(o.mapping), reason: o.reason });
      }
      for (const id of fam.exerciseIds) {
        if (owner.has(id)) fail(`${id} is in two families: ${owner.get(id)} and ${where}`);
        owner.set(id, where);
        const o = overrides.get(id);
        const entry: TableEntry = {
          familyId: fam.id,
          batch,
          mapping: o?.mapping ?? famMapping,
          confidence: fam.confidence,
          verified: Boolean(vf),
        };
        if (o) entry.overrideReason = o.reason;
        table.exercises[id] = entry;
      }
      const checks = vf?.citationChecks ?? [];
      table.families.push({
        id: fam.id,
        batch,
        name: fam.name,
        description: fam.description,
        confidence: fam.confidence,
        ...(vf ? { verdict: vf.verdict } : {}),
        exerciseCount: fam.exerciseIds.length,
        mapping: fam.mapping.map((m) => ({
          ...normalize([m])[0]!,
          ...(m.rationale ? { rationale: m.rationale } : {}),
        })),
        evidence: fam.evidence.map((e) => {
          const chk = checks.find(
            (c) => c.source && (e.source.includes(c.source) || c.source.includes(e.source.slice(0, 40))),
          );
          return chk ? { ...e, checked: { exists: chk.exists, supportsClaim: chk.supportsClaim, note: chk.note } } : e;
        }),
        conflictsWithBrief: fam.conflictsWithBrief,
        ...(fam.notes ? { notes: fam.notes } : {}),
      });
    }
    for (const q of r.openQuestions) table.openQuestions.push({ batch, question: q });
  }

  for (const [id, expected] of Object.entries(ANCHORS)) {
    const e = table.exercises[id];
    if (!e) continue; // the anchor's batch has not been researched yet; the import script still applies it
    if (!sameMapping(e.mapping, expected))
      fail(`anchor row changed by the evidence table: ${id} → ${JSON.stringify(e.mapping)}`);
  }
  return table;
}

// ---------- markdown ----------
function fmtCredit(m: { groupId: string; weight: number; regionDistribution?: Dist }): string {
  const d = m.regionDistribution
    ? ' {' +
      Object.entries(m.regionDistribution)
        .filter(([, s]) => (s ?? 0) > 0)
        .map(([r, s]) => `${r} ${s}`)
        .join(', ') +
      '}'
    : '';
  return `${m.groupId} ${m.weight}${d}`;
}

export function renderMarkdown(t: EvidenceTable, exerciseNames: Map<string, string>): string {
  const L: string[] = [];
  L.push('# Exercise → muscle evidence table');
  L.push('');
  L.push(
    '_Generated by `tools/seed/build-evidence-table.ts` from the ADR-0023 literature pass (research run 2026-09-08). ' +
      'Do not edit; change the research, verify or corrections files under `tools/seed/evidence/` and rebuild._',
  );
  L.push('');
  const n = Object.keys(t.exercises).length;
  const verifiedN = Object.values(t.exercises).filter((e) => e.verified).length;
  L.push(
    `${t.families.length} families cover ${n} exercises (${verifiedN} in verifier-checked batches). Batches: ${t.batches.join(', ')}. ` +
      `Verified batches: ${t.verifiedBatches.length ? t.verifiedBatches.join(', ') : 'none yet'}. Curated corrections applied: ${t.correctionsApplied}.`,
  );
  L.push('');
  L.push(
    'Weights follow §4.2: primary mover 1.0, indirect work about half credit (0.25–1.0). Region shares are emphasis ',
  );
  L.push('within a group and sum to 1. Evidence tiers: hypertrophy (longitudinal growth), emg (activation / MRI-T2), ');
  L.push(
    'anatomical (moment arms, muscle actions), consensus. "Checked" marks a citation the independent verifier opened.',
  );
  L.push('');
  const conflicts = t.families.filter((f) => f.conflictsWithBrief.length);
  if (conflicts.length) {
    L.push('## Where the literature disagrees with the brief');
    L.push('');
    L.push('The anchor rows are unchanged; these are for the owner to rule on.');
    L.push('');
    for (const f of conflicts) for (const c of f.conflictsWithBrief) L.push(`- **${f.name}** (${f.batch}): ${c}`);
    L.push('');
  }
  let batch = '';
  for (const f of t.families) {
    if (f.batch !== batch) {
      batch = f.batch;
      L.push(`## ${batch.replace(/_/g, ' ')}`);
      L.push('');
    }
    const verdict = f.verdict ? `, verifier: ${f.verdict}` : ', unverified';
    L.push(`### ${f.name}`);
    L.push('');
    L.push(`\`${f.id}\` · ${f.exerciseCount} exercises · confidence ${f.confidence}${verdict}`);
    L.push('');
    L.push(f.description);
    L.push('');
    L.push('| Group | Credit | Why |');
    L.push('| --- | --- | --- |');
    for (const m of f.mapping)
      L.push(
        `| ${m.groupId} | ${fmtCredit(m).slice(m.groupId.length + 1)} | ${(m.rationale ?? '').replace(/\|/g, '/')} |`,
      );
    L.push('');
    const ex = Object.entries(t.exercises).filter(([, e]) => e.familyId === f.id && e.batch === f.batch);
    const overrides = ex.filter(([, e]) => e.overrideReason);
    L.push(
      `Exercises: ${ex
        .map(([id]) => exerciseNames.get(id) ?? id)
        .sort()
        .join(', ')}.`,
    );
    L.push('');
    if (overrides.length) {
      L.push('Per-exercise differences:');
      L.push('');
      for (const [id, e] of overrides)
        L.push(`- **${exerciseNames.get(id) ?? id}**: ${e.mapping.map(fmtCredit).join('; ')} — ${e.overrideReason}`);
      L.push('');
    }
    if (f.evidence.length) {
      L.push('Evidence:');
      L.push('');
      for (const e of f.evidence) {
        const ref = e.pmid ? ` PMID ${e.pmid}.` : e.doi ? ` doi:${e.doi}.` : '';
        const chk = e.checked
          ? e.checked.exists && e.checked.supportsClaim
            ? ' Checked.'
            : ` Checked: ${e.checked.note}`
          : '';
        L.push(`- [${e.tier}, ${e.confidence}] ${e.claim} — ${e.source}${ref}${chk}`);
      }
      L.push('');
    }
    if (f.notes) {
      L.push(`Notes: ${f.notes}`);
      L.push('');
    }
  }
  if (t.openQuestions.length) {
    L.push('## Open questions from the researchers');
    L.push('');
    for (const q of t.openQuestions) L.push(`- (${q.batch}) ${q.question}`);
    L.push('');
  }
  return L.join('\n');
}

function main() {
  const table = buildTable();
  const names = new Map(
    readJson<Array<{ id: string; name: string }>>(join(ROOT, 'src', 'data', 'exercises.json')).map((e) => [
      e.id,
      e.name,
    ]),
  );
  for (const id of Object.keys(table.exercises)) if (!names.has(id)) fail(`table references unknown exercise ${id}`);
  writeFileSync(join(EVIDENCE_DIR, 'table.json'), JSON.stringify(table, null, 1) + '\n');
  mkdirSync(dirname(DOC_PATH), { recursive: true });
  writeFileSync(DOC_PATH, renderMarkdown(table, names) + '\n');
  const n = Object.keys(table.exercises).length;
  console.log(
    JSON.stringify(
      {
        families: table.families.length,
        exercises: n,
        verified: Object.values(table.exercises).filter((e) => e.verified).length,
        overrides: Object.values(table.exercises).filter((e) => e.overrideReason).length,
        conflicts: table.families.reduce((a, f) => a + f.conflictsWithBrief.length, 0),
        correctionsApplied: table.correctionsApplied,
      },
      null,
      2,
    ),
  );
}

if (require.main === module) main();
