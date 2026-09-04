# Status

_Last rewritten: end of Phase 0 session 1 (2026-09-04). Branch `claude/musclemap-build-brief-4v15wm`._

## Where we are

**Phase 0 — Scaffold + 3D spike: implemented and green in CI; awaiting the on-device check.**

Everything the DoD requires that can be verified without a phone is done and verified here:

| Check                                | Result                                                                                              |
| ------------------------------------ | --------------------------------------------------------------------------------------------------- |
| `npm run typecheck`                  | 0 errors (TS 6, strict)                                                                             |
| `npm run lint`                       | 0 problems                                                                                          |
| `npm run format:check`               | clean                                                                                               |
| `npm test`                           | 24 tests, 5 suites (engine color, seed validation, DB on real migrations, paint logic, StatusBadge) |
| `npm run models:validate`            | both bodies pass the asset contract (33 meshes, 33 k / 32 k triangles, 0.7 MB each)                 |
| `npx expo export --platform android` | bundles; exactly one `three` copy; GLBs, migrations and routes included                             |

## Done

- Expo SDK 57 app, `expo-router` tabs **Log · History · Map · Progress · Settings**, light/dark theme tokens,
  `APP_NAME` constant, strings file, boot gate (migrations → seed → profile → preload models).
- DB: Drizzle schema for the whole §4.4 model, generated migration `0000`, repositories (profile, exercises
  search/filter/custom, workouts/sets with recovery of the in-progress workout, muscle status cache), idempotent
  seed loader, Jest tests on better-sqlite3 running the same migrations.
- Seed: `tools/seed/import-free-exercise-db.ts` → 739 exercises, 2 518 credit rows, region distributions,
  §4.2 overrides, 79 exercises flagged `needsReview`; license (Unlicense) and revision recorded.
- Engine foundations: taxonomy (21 groups, 32 regions), status → OKLCH color with tests.
- 3D spike: `MuscleMapView` (fiber v9 native on expo-gl) with frozen props; drag-rotate with inertia, pinch
  zoom, two-finger pan, double-tap reset, snap buttons, tap-to-select with pulse + dimming, `frameloop="demand"`,
  400 ms color lerps, provisional/optional-group rendering, GL-failure fallback; mock statuses; body switch that
  keeps camera and selection; procedural MatCap.
- Tools: placeholder body generator (both bodies, contract-compliant), CI validator, GitHub Actions workflow,
  `eas.json`, `.nvmrc`.
- Docs: `PLAN.md`, `DECISIONS.md` (14 ADRs), `CLAUDE.md`, this file.

## Stubbed / placeholder

- Log tab is an exercise-search smoke screen (proves DB + seed on device); History and Progress are placeholders.
- Map colors come from `mock-status.ts` until the engine ships (Phase 3).
- Bodies are the Phase 0 primitives placeholder (the only place the brief allows one). Phase 1 replaces them.
- Settings: body switch, mock "Muscle status (list)", About text. No target overrides yet.

## Known gaps / risks

- **Not yet run on a physical device.** The DoD item "60 fps on the Pixel" and the device behaviour of expo-gl +
  fiber under the mandatory New Architecture are unverified. The WebView fallback is documented but not built.
- `react-native-worklets` `scheduleOnRN` bridge and RNGH tap coordinates were verified from sources, not on a
  device; if taps land offset, check that the GestureDetector view exactly wraps the Canvas.
- No Maestro flows yet (Phase 2).
- The `app` Jest project mocks `expo-sqlite`; screens that touch the DB are not component-tested yet.

## What the humans need to do to close Phase 0

1. Confirm the app name (`APP_NAME`, slug `musclemap`) — see `docs/PLAN.md` open questions.
2. Build and install on the Pixel, either
   - **EAS:** `npm i -g eas-cli && eas login && eas build --profile development --platform android`
     (free plan; expect a queue), install the APK, then `npx expo start --dev-client`; or
   - **Local (Windows):** Android Studio + JDK 17 + SDK Platform 36, `ANDROID_HOME` set, USB debugging on,
     then `npx expo run:android`.
3. On the Map tab: rotate (inertia), pinch, two-finger pan, double-tap, tap regions (sheet opens, others dim),
   switch Female/Male (camera + selection persist), Groups/Regions toggle. Enable the perf monitor (dev menu)
   and note fps while rotating. Also try a **release** APK (`eas build --profile preview`) once — historical
   expo-gl crashes only showed in release builds.
4. Report fps and any crash/log here; if fiber v9 will not run cleanly, the next session switches to the
   WebView fallback behind the same `MuscleMapView` props and writes the ADR.

## Next steps (Phase 1, do not start before the device check passes)

- `tools/model-pipeline/build.py` on the bpy wheel: Z-Anatomy → `body-male.glb`; Path A morph →
  `body-female.glb`; `region-objects-male.json`, `female-morph.json`; snapshot renders in `docs/models/`;
  `LICENSE-model.md`; About attribution.
- Full §6.2 Map chrome: legend, "What to train today" chip, bottom sheet shell, MatCap PNG.
- Screen recordings on the Pixel for each body.
