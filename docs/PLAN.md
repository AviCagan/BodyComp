# MuscleMap — Build Plan

> Working title. The name lives in one constant, `APP_NAME` in `src/config.ts`.
> This plan is derived from the build brief (`docs/brief.pdf` was supplied by the humans; §-references below point at it).
> `docs/STATUS.md` says where we actually are; `docs/DECISIONS.md` says why.

## 1. What we are building (one paragraph)

A Strong-parity workout logger for iOS and Android (one Expo codebase) whose differentiator is a
3D écorché **Muscle Map**: every muscle region is colored by how well the user's _logged_ training
covers it, computed by a deterministic, fully tested engine from evidence-based weekly-volume rules,
plus a weekly report that says exactly what to add, move, or cut. Offline-first, fast logging,
science-based copy, never lose a set, data belongs to the user.

## 2. Phases and definitions of done (§8)

The first build is Phases 0–5. Phases 6–7 are the second build. A phase does not start until the
previous phase's DoD passes; `docs/STATUS.md` is rewritten at the end of every phase.

### Phase 0 — Scaffold + 3D spike (hard time-box: two sessions)

Deliverables

- Expo SDK 57 app, `expo-router` tabs (Log · History · Map · Progress · Settings), theme tokens (light/dark), `APP_NAME` constant.
- TypeScript `strict`, ESLint (flat config) + Prettier, Jest (`jest-expo` for components, a plain `node` project for the engine), GitHub Actions (typecheck · lint · format · tests · GLB validation) green.
- DB: `expo-sqlite` + Drizzle, versioned migrations applied at boot, repository layer in `src/db`, repositories unit-tested on Node's built-in `node:sqlite` against the same migrations.
- Seed import: `tools/seed/import-free-exercise-db.ts` → `src/data/exercises.json` + `src/data/exercise-muscles.json` (§4.1 taxonomy, §4.2 weights, region distributions, §4.2 table as explicit overrides), validation test, idempotent loader on first launch.
- 3D spike: `tools/model-pipeline/generate-placeholder.ts` writes a contract-shaped primitives body (≥ 30 named meshes = all 32 region ids + `body_base`) for both `body-female.glb` and `body-male.glb`; `tools/model-pipeline/validate.ts` runs in CI; `MuscleMapView` (fiber v9 native on `expo-gl`) with drag-rotate + inertia, pinch zoom, two-finger pan, double-tap reset, tap-to-select with highlight, `frameloop="demand"`, status→color mapping, GL-failure fallback; rendered in the Map tab.
- `docs/PLAN.md`, `CLAUDE.md`, `docs/DECISIONS.md`, `docs/STATUS.md`.
- Android dev-build instructions (EAS `development` profile and local `expo run:android` on Windows).

DoD (from §8): spike at 60 fps on the Pixel; rendering decision logged in `DECISIONS.md`; `MuscleMapView` props frozen. Only the on-device part needs a human — everything else is verified in CI.

Escape hatch: if pinned fiber v9 native will not run cleanly on SDK 57 on the device, switch to the WebView fallback (bundled three.js page + `OrbitControls`, `postMessage` bridge) behind the _same_ `MuscleMapView` props, and write the ADR.

### Phase 1 — Model pipeline + Map screen

- `tools/model-pipeline/build.py` (bpy wheel / Blender headless, deterministic, CI-runnable): Z-Anatomy → `body-male.glb`; female via Path A morph (`female-morph.json`), then ≤ 1 session on Path B (Sketchfab CC-BY model + label transfer); `region-objects-male.json` (shared by both bodies); `validate.ts` for both; snapshot renders in `docs/models/`; `assets/models/LICENSE-model.md`; attribution in Settings → About.
- Map tab per §6.2: full interaction spec, snap buttons, legend, group/region toggle, female/male switch (asset swap, camera + selection preserved), bottom-sheet shell, "What to train today" chip (mock data), MatCap look, budgets (≤ 150k tris, ≤ 8 MB, cold load < 1.5 s).
- DoD: every region tappable and colorable on both bodies; budgets met; switching bodies keeps camera and selection; screen recordings of rotate → tap → sheet on the Pixel for each body.

### Phase 2 — Tracker (Strong parity, §6.1, §6.5)

Templates, exercise search (aliases, group/equipment/pattern filters, recent, "hits this muscle"), set rows with previous-performance ghosting, warm-up toggle and set-type menu, rest timer (notification + haptic, per-exercise defaults), supersets, notes, plate calculator, unit toggle, PR detection + toast, finish screen, edit/delete, history calendar heatmap + list, duplicate workout, CSV + JSON export, in-progress workout recovery on relaunch.
DoD: a full PPL week logged from templates end-to-end; Maestro flow "start template → log 3 exercises → finish" passes.

### Phase 3 — Engine + wiring (§4.3)

`src/engine/` pure functions with injected `now`, `constants.ts` with cited comments, `muscle_status_cache` recomputed incrementally on set save (< 50 ms on one year of history, never blocking the UI), map colored from real data, full bottom-sheet content, finish-workout recolor, provisional-data rendering.
DoD: golden cases 1–6 from §8 pass; real data colors the model; tap → detail sheet with real history.

### Phase 4 — Intake + Report (§5, §6.4)

Onboarding ≤ 3 min (level is the only mandatory step), priority picker on the 3D model (selection mode), program import (structured builder + free-text via Anthropic edge function, schema-validated, one retry, manual fallback), provisional stimulus, starter templates verified by an engine test, weekly report from engine JSON with optional ≤ 120-word narration, shareable image.
Needs from humans: Supabase project, Anthropic key (server side only).

### Phase 5 — Videos (§6.6)

Edge function (YouTube Data API v3, allowlist, 30-day cache), `video-channels.json`, `videos.json` overrides, player in the detail sheet, zero client-side API calls.
End of first build: EAS builds for both platforms, TestFlight + Play internal testing, `STATUS.md` current.

### Phase 6 — Accounts + sync

Supabase auth (email + Apple + Google), local-first sync with `updatedAt` last-write-wins per row, tombstones, conflict tests. No photos.

### Phase 7 — Progress photos + polish + store readiness

On-device photo timeline (side-by-side compare, no analysis), privacy policy, screenshots, listings, `eas submit`.

## 3. Proposed file structure (§7)

```
app/                          expo-router routes only (thin; screens live in src/features)
  _layout.tsx                 providers: gesture handler root, DB + migrations gate, theme
  (tabs)/_layout.tsx          Log · History · Map · Progress · Settings
  (tabs)/index.tsx            Log
  (tabs)/history.tsx
  (tabs)/map.tsx
  (tabs)/progress.tsx
  (tabs)/settings.tsx
  +not-found.tsx
src/
  config.ts                   APP_NAME and other single-point constants
  strings.ts                  all user-facing copy (English only, i18n-ready)
  theme/                      tokens (colors incl. status ramp, spacing, type), useTheme
  engine/                     PURE TypeScript: no React, no Date.now(), 100% tested
    taxonomy.ts               GROUP_IDS, GROUP_REGIONS, REGION_IDS, optional groups
    constants.ts              TARGETS, GROUP_MULTIPLIER, REGION_MIN_SHARE … with citations (Phase 3)
    status-color.ts           ratio → OKLCH color (Phase 0 needs this for the spike)
    *.ts / __tests__/         set factors, group scores, report (Phase 3)
  db/
    schema.ts                 Drizzle tables (§4.4)
    client.ts                 expo-sqlite client + useMigrations gate
    test-client.ts            node:sqlite client for Jest (same migrations, no native dep)
    migrations/               drizzle-kit output (generated, committed)
    repositories/             one module per aggregate; DI'd db handle
    seed.ts                   idempotent loader for src/data/*.json
  data/
    exercises.json            generated by tools/seed (do not hand-edit)
    exercise-muscles.json     generated by tools/seed (do not hand-edit)
    exercise-db.meta.json     source revision + license + counts
    video-channels.json       Phase 5
    videos.json               Phase 5
  features/
    muscle-map/               MuscleMapView (public, frozen props), scene, gestures, materials, picking
    log/  history/  progress/  settings/  intake/  report/  (later phases)
  components/                 shared primitives (Text, Button, StatusBadge …)
  services/                   youtube, llm, sync (Phase 4+)
  state/                      Zustand stores (UI/session only; the DB is the source of truth)
assets/
  models/body-female.glb, body-male.glb, model.manifest.json, LICENSE-model.md
  matcaps/                    tiny PNG matcap
tools/
  seed/import-free-exercise-db.ts
  model-pipeline/generate-placeholder.ts   Phase 0 only (primitives body)
  model-pipeline/validate.ts               CI, both bodies
  model-pipeline/build.py, region-objects-male.json, female-morph.json   Phase 1
docs/
  PLAN.md  STATUS.md  DECISIONS.md  brief.pdf  models/ (snapshot renders, Phase 1)
.github/workflows/ci.yml
```

## 4. Cross-cutting technical approach (details in DECISIONS.md)

- **Rendering:** `@react-three/fiber@9.x` `/native` entry on `expo-gl`, `three` pinned, GLB parsed with `three-stdlib`'s `GLTFLoader.parse()` from bytes read via `expo-file-system` (not `fetch(file://)`), scene graph built once, status updates mutate material colors only. Gestures on the UI thread (RNGH + Reanimated worklets); a tiny JS-side bridge calls `invalidate()` while an animation is live so `frameloop="demand"` still renders inertia and snaps.
- **Engine ↔ UI:** the engine is a library of pure functions; the app calls it after each set save inside a background task and writes `muscle_status_cache`; screens read the cache.
- **DB:** Drizzle schema is the single source of truth; migrations are generated and committed; tests run the real migrations on Node's built-in `node:sqlite`, so a checkout needs no compiler.
- **Weights** are stored in kilograms; `units` only affects display and entry.
- **Copy:** every string in `src/strings.ts`; tone rules from §2 enforced by review, not code.

## 5. Open questions for the humans (answers go in DECISIONS.md)

Working assumptions are in _italics_; work proceeds on them until told otherwise.

1. **App name (owed in Phase 0, §9).** _Assuming `MuscleMap` for `APP_NAME`, slug/scheme `musclemap`; the GitHub repo stays `BodyComp`._
2. **Exercise categories.** free-exercise-db has 123 stretching and 14 cardio entries that do not credit hypertrophy volume. _Excluded from the v1 seed_; users can still create custom exercises. Include them as non-crediting entries instead?
3. **Odd exercises.** 79 exercises (olympic lifts, strongman, rotator-cuff work, "battling ropes"…) got heuristic mappings and are flagged `needsReview` in `exercise-muscles.json`. Review is scheduled for Phase 3 per §9; nothing to do now.
4. **Region id `biceps` inside group `biceps`.** The brief names the region and the group identically. _Assuming the GLB mesh is named `biceps` and the region id equals the group id_ (same for `delt_front`, `lats`, … which are single-region groups).
5. **Default units before intake.** _Assuming `lb`_ (US owners); intake asks.
6. **Dark mode.** _Assuming both light and dark from day one_ via theme tokens.
7. **Pixel dev build route.** Both are documented in STATUS.md: EAS `development` profile (needs a free Expo account; the plan-tier build queue is slow but free) or a local `npx expo run:android` from Windows with Android Studio. _Assuming EAS is acceptable since §3 already decided on it._
8. **TypeScript major.** The SDK 57 template ships TS 6; _staying on the template's TS 6_ unless tooling breaks (then TS 5.9, logged).
9. **Placeholder GLB in git.** _Assuming yes_ — it is the Phase 0 spike asset and is deleted in Phase 1.

## 6. Risks and how Phase 0 retires them

| Risk                                         | Mitigation                                                                    |
| -------------------------------------------- | ----------------------------------------------------------------------------- |
| fiber v9 native on SDK 57 + New Architecture | Spike first; WebView fallback documented; ADR either way                      |
| `frameloop="demand"` + UI-thread gestures    | Explicit invalidate bridge; profiled on device                                |
| GLB loading from bundled assets on Android   | Parse from bytes, not `fetch(file://)`; validated in CI                       |
| Region contract drift between bodies         | `validate.ts` in CI compares both region sets                                 |
| Wrong mappings poison the map                | Data is JSON + validation test; humans review in Phase 3; `needsReview` flags |
