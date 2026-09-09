# Exercise → muscle evidence pass (ADR-0023)

Output of the literature workflow run on 2026-09-08 (`workflow.js.txt`, run id `wf_2ed394b5-ad7`): one researcher
per movement area grouped the seed exercises into families and mapped each family with cited evidence, followed by
an independent verifier per batch. Nothing here is consumed by the app yet; `src/data/*.json` still come from the
rule-based import script.

## State

| Batch                  | Research    | Verified | Families | Exercises |
| ---------------------- | ----------- | -------- | -------- | --------- |
| chest                  | done        | no       | 11       | 69        |
| shoulder_press         | done        | no       | 9        | 36        |
| shoulder_isolation     | done        | no       | 12       | 74        |
| back                   | done        | no       | 9        | 59        |
| biceps                 | done        | no       | 7        | 50        |
| triceps                | done        | no       | 10       | 68        |
| quads                  | done        | no       | 15       | 67        |
| hinge_posterior        | done        | no       | 14       | 67        |
| core                   | done        | no       | 9        | 82        |
| small_groups           | done        | no       | 12       | 50        |
| olympic_strongman_plyo | **not run** | no       | –        | 117       |

The researcher for the last batch and all eleven verifiers stopped on the account's usage limit. Resume the same
run (cached agents replay for free) once usage resets; the resume command is in `docs/STATUS.md`.

Mechanical checks on the ten finished batches (re-runnable, see `docs/STATUS.md`): 108 families, 215 per-exercise
overrides, 622/739 exercises placed exactly once, all 11 anchor rows present, 526 evidence items (16 marked
`unverified` by the researcher), zero rule violations (group ids, weight range, one 1.0 per mapping, region keys,
distributions summing to 1). `CONFLICTS.txt` lists the 29 places where a researcher says the literature disagrees
with a fixed anchor row or the half-credit rule; those go to the owner, the anchors are not changed.

## Layout

- `input/` — the batch files given to each researcher (exercise id, name, equipment, mechanic, pattern, and the
  mapping the app uses today) plus `batches.json`.
- `research/<batch>.json` — researcher output: families, mappings, overrides, evidence with PMIDs/DOIs, conflicts,
  open questions.
- `CONFLICTS.txt`, `RULE_ISSUES.txt` — generated summaries.

## Next

1. Resume the workflow: last researcher + 11 verifiers.
2. Apply verifier corrections, then convert the families into a data-driven table the import script reads instead
   of the regex rules; regenerate `src/data`; write `docs/research/exercise-muscle-evidence.md`.
3. Put the anchor-row conflicts to the owner.
