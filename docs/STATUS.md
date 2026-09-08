# Status

_Last rewritten: end of Phase 0 session 1 (2026-09-04). Branch `claude/musclemap-build-brief-4v15wm`._

## Where we are

**Phase 0 — Scaffold + 3D spike: implemented, reviewed, and green in CI; awaiting the on-device check.**

Everything the DoD requires that can be verified without a phone is done and verified here and in GitHub Actions:

| Check                                | Result                                                                                                                                            |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run typecheck`                  | 0 errors (TypeScript 6, strict, `noUncheckedIndexedAccess`)                                                                                       |
| `npm run lint`                       | 0 problems (Expo flat config incl. React Compiler rules)                                                                                          |
| `npm run format:check`               | clean                                                                                                                                             |
| `npm test`                           | 27 tests, 6 suites (engine color · seed validation · DB on the real migrations via `node:sqlite` · paint logic · StatusBadge · asset-stub import) |
| `npm run models:validate`            | both bodies pass the contract incl. winding/degenerate/name checks (33 meshes, 31.8 k / 30.9 k triangles, 0.67 MB each)                           |
| `npx expo export --platform android` | bundles with exactly one `three` copy; GLBs, migrations and routes included                                                                       |
| Adversarial review                   | 37 findings from 6 reviewers, all addressed (`DECISIONS.md` ADR-0015)                                                                             |

## Done

- Expo SDK 57 app, `expo-router` tabs **Log · History · Map · Progress · Settings**, light/dark theme tokens,
  `APP_NAME` constant, all copy in `src/strings.ts`, boot gate (migrations → seed → profile → preload models) with
  an error screen and retry.
- DB: Drizzle schema for the whole §4.4 model with `updatedAt`/`deletedAt` on every user-owned table, generated
  migration `0000`, repositories (profile; exercise search over name + aliases via `json_each`, filters, custom
  exercises; workouts/sets with one-in-progress guard, soft delete, recovery on relaunch; muscle status cache),
  idempotent seed loader that protects seeded exercises the user turned custom, Jest tests running the same
  migrations on Node's built-in `node:sqlite` (no native module, so `npm ci` needs no compiler — ADR-0019).
- Seed: `tools/seed/import-free-exercise-db.ts` → 739 exercises, 2 358 credit rows, region distributions,
  §4.2 overrides, 79 exercises flagged `needsReview`; Unlicense and upstream revision recorded.
- Engine foundations: taxonomy (21 groups, 32 regions), status → OKLCH color with tests.
- 3D spike: `MuscleMapView` (fiber v9 native on expo-gl) with frozen props; drag-rotate with deterministic 1.5 s
  inertia, pinch zoom, two-finger pan, double-tap reset, snap buttons, tap-to-select with pulse + dimming,
  `frameloop="demand"`, 400 ms color lerps, provisional/optional-group rendering, per-mount scene clone, GL-failure
  fallback; mock statuses; body switch that keeps camera and selection; procedural MatCap; sRGB-correct, no tone
  mapping.
- Tools: placeholder body generator (both bodies, contract-compliant, outward-wound), strict CI validator, GitHub
  Actions workflow (green on this branch), `eas.json`, `.nvmrc`.
- Docs: `PLAN.md`, `DECISIONS.md` (18 ADRs), `CLAUDE.md`, `docs/research/` (stack research, verified science
  citations for Phase 3, Z-Anatomy/bpy findings for Phase 1), this file.

## Stubbed / placeholder

- Log tab is an exercise-search smoke screen (proves DB + seed on device); History and Progress are placeholders.
- Map colors come from `mock-status.ts` until the engine ships (Phase 3).
- Bodies are the Phase 0 primitives placeholder (the only place the brief allows one). Phase 1 replaces them.
- Settings: body switch, mock "Muscle status (list)", About text. No target overrides yet.

## Known gaps / risks

- **Not yet run on a physical device.** The DoD item "60 fps on the Pixel" and the device behaviour of expo-gl +
  fiber under the mandatory New Architecture are unverified. Research found no SDK 56/57 reports of failure and
  Expo's own emulator CI exercises expo-gl on RN 0.86, but nobody has published a Pixel data point.
- expo-gl ships as a prebuilt Android binary; the one historical release-only crash came from exactly that.
  A release/preview APK must be tried once (see below).
- The gesture bridge (`scheduleOnRN` → `invalidate()`), RNGH tap coordinates, and the Expo Go ↔ dev-client
  behaviour were verified from library sources, not on a device.
- No Maestro flows yet (Phase 2). The `app` Jest project mocks `expo-sqlite`; screens that touch the DB are not
  component-tested yet.

## What the humans need to do to close Phase 0

0. **Node version.** Node 22 LTS (what CI and EAS Build use) or Node 24 both work; `package.json` requires
   > = 22.11. There are no native dependencies, so no Visual Studio or Xcode toolchain is needed.
1. ~~App name~~ decided: **Show up** (slug `showup`). If you already ran `eas build` under the old slug, run `eas init` once.
2. **Fastest check (minutes):** install **Expo Go** (SDK 57) from Google Play on the Pixel, connect it by USB or
   the same Wi-Fi, run `npm ci && npx expo start`, press `a` (or scan the QR). Every Phase 0 module runs in Expo Go.
3. On the Map tab: rotate (inertia stops in ~1.5 s), pinch, two-finger pan, double-tap, tap regions (sheet opens,
   others dim, the tapped one pulses), switch Female/Male (camera + selection persist), Groups/Regions toggle,
   snap buttons. Open the dev menu → Performance monitor and note the UI/JS fps while rotating.
   Also check the Log tab lists 739 exercises and search finds "OHP" and "RDL".
4. **Release APK (required once):** either `eas build --profile preview --platform android` (free plan; expect a
   queue) or, with Android Studio + JDK 17 + SDK Platform 36 installed, `npx expo run:android --variant release`.
   Install it, open the Map tab, and keep `adb logcat` open. If it crashes inside expo-gl, add
   `"expo": {"autolinking": {"android": {"buildFromSource": ["expo-gl"]}}}` to `package.json` and rebuild locally.
5. Report fps and any crash/log in `docs/STATUS.md` (or the PR). If fiber v9 will not run cleanly, the next session
   switches to the WebView fallback behind the same `MuscleMapView` props and writes the ADR.

## Homework that needs no code (do any of this while waiting)

- ~~Mapping spreadsheet~~ — redirected on 2026-09-08: the table is being derived from the literature
  (ADR-0023); the owner only spot-checks and rules on conflicts with the brief's anchor rows.
- **Release APK** — still outstanding for the Phase 0 DoD; Expo Go cannot reveal a prebuilt-binary crash.
- **Accounts with lead time** — Expo (free), Google Play ($25, identity verification plus a closed-testing
  period for new personal accounts), Apple Developer ($99/yr). Needed by the end of Phase 5, slow to obtain.
- **Video channel allowlist** (Phase 5) and the open questions in `docs/PLAN.md`.

## Direction changes recorded 2026-09-08

Stylized faceless bodies with a distinct female model (ADR-0021), the Log-tab home layout, split preference in
intake, "Suggest a workout" presented by Ares, and a proposed nutrition phase (ADR-0022) — all in `docs/PLAN.md`
§1a. Phase 1 no longer builds an écorché from Z-Anatomy.

## Decisions received 2026-09-08

Bodies: option A (CC0 base bodies, our segmentation). Nutrition: yes (Phase 5b scheduled). Videos: Jeff Nippard.
Supabase project ShowUp exists with the connector enabled; the rotated Anthropic key is in its Edge Function secrets
as `ANTHROPIC_API_KEY`; a YouTube Data API v3 key exists and is saved by the owner for Phase 5. Store accounts
deferred to the end of the first build.
Evidence pass for the exercise → muscle table is running (ADR-0023). Phase 0 still waits on the release-APK result.

## Next steps (Phase 1, do not start before the device check passes)

- Pick the body source (CC0 base bodies vs purchased pair — PLAN open question 5), then
  `tools/model-pipeline/build.py` on the bpy 4.5 wheel: stylized faceless female and male bodies segmented into
  the 32 regions (Z-Anatomy only as a seam reference) → `body-female.glb` / `body-male.glb`; snapshot renders in
  `docs/models/`; `LICENSE-model.md`; About attribution.
- Full §6.2 Map chrome: legend, "What to train today" chip, bottom sheet shell, MatCap PNG.
- Screen recordings on the Pixel for each body.
