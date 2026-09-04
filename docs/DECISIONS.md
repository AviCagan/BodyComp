# Decisions (ADRs)

One paragraph per non-obvious technical choice. Newest at the bottom. Status is _accepted_ unless noted.
Brief §-references point at `docs/brief.pdf`.

## ADR-0001 — Expo SDK 57 with the template's TypeScript 6, explicit `types`

The scaffold is `create-expo-app --template tabs` at SDK 57 (expo 57.0.19, React Native 0.86.3, React 19.2.3).
We keep the template's `typescript ~6.0.3` rather than TS 7: TS 7 (Go) ships no JS API, so typescript-eslint
(pulled in by `eslint-config-expo`) cannot run on it yet. TS 6 defaults `types` to `[]`, so `tsconfig.json`
lists `"types": ["jest", "node"]` explicitly; `baseUrl` is never added (deprecated in TS 6, removed in 7) — the
`@/*` alias maps to `./src/*` with relative paths. `strict`, `noUncheckedIndexedAccess`, `noImplicitOverride`
and `noFallthroughCasesInSwitch` are on.

## ADR-0002 — Product name is a single constant; slug/scheme `musclemap`

`APP_NAME = 'MuscleMap'` lives in `src/config.ts` (brief: working title, rename in one place). `app.json` uses
`name: MuscleMap`, `slug: musclemap`, `scheme: musclemap`; the GitHub repo keeps its `BodyComp` name. Changing
the slug later means a new EAS project, so the humans should confirm the name before the first EAS build
(`docs/PLAN.md`, open question 1).

## ADR-0003 — Exercise catalogue from free-exercise-db, rule-based mapping, humans review in Phase 3

Source: `yuhonas/free-exercise-db` at revision `a859101d633a01c4a1a920d6a8ce41dabba0705f` (2026-08-30).
License verified from the checkout's `LICENSE.md`: the Unlicense (public domain); the import script refuses to
run if that text is missing. Of 876 upstream exercises we import 739: the 123 `stretching` and 14 `cardio`
entries do not credit hypertrophy volume and are excluded for v1 (open question 2). The upstream 17-label
muscle vocabulary is translated into the §4.1 taxonomy by deterministic name/pattern rules in
`tools/seed/import-free-exercise-db.ts`: primary → 1.0, secondary → 0.5, region distributions from movement
cues (incline → upper chest, seated calf → soleus, hammer → brachialis, …), squat-pattern lifts have
hamstrings/calves capped at 0.25, carries credit upper traps at 0.75, and the §4.2 table is applied verbatim as
overrides keyed by upstream id (the script fails if an id disappears). Olympic/strongman lifts and unclear
shoulder movements are flagged `needsReview` (79 exercises). Output JSON in `src/data/` is generated — never
hand-edited — and validated by a Jest test (weights 0.25–1.0, distributions sum to 1, ≥ 1 primary, taxonomy ids
only, §4.2 rows exact). Images are not vendored (105 MB); `mediaRefs` keep the upstream relative paths.

## ADR-0004 — One copy of `three` via a Metro `resolveRequest` override

Verified by `expo export` with source maps: with the default SDK 57 Metro config, `@react-three/fiber`'s native
build is CommonJS and its `require('three')` selects three's `require` export (`build/three.cjs`), while app code
and `three-stdlib` `import` it and select `build/three.module.js`. Both copies end up in the bundle; fiber then
warns "Multiple instances of Three.js", `Vector3`/`Euler` props break (`target.constructor === value.constructor`
check), and fiber's React Native `FileLoader`/`TextureLoader` polyfills patch the copy `GLTFLoader` does not use.
`metro.config.js` resolves the bare `three` specifier with `isESMImport: false`; the exported bundle now contains
only `three/build/three.cjs`. `three` is pinned exactly to `0.185.1` (satisfies fiber ≥ 0.156 and three-stdlib
≥ 0.128; every named import three-stdlib 2.36.1 makes exists in 0.185.1).

## ADR-0005 — GLB bytes via expo-asset + expo-file-system `File`, then `GLTFLoader.parse`; no Draco

`fetch(file://)` is unreliable on Android/React Native, so `src/features/muscle-map/load-body.ts` does
`Asset.fromModule(require(glb)).downloadAsync()` → `new File(localUri).arrayBuffer()` →
`new GLTFLoader().parse(buffer, '', …)`. This does not depend on fiber's loader polyfills and works the same in
dev (asset served by Metro) and release (embedded `android_res` copied to cache). Draco is not used: three-stdlib's
`DRACOLoader` needs `Worker`/`WebAssembly`, which Hermes does not provide. Both bodies are statically required so
Metro bundles them; only the selected one is parsed; `preloadBodies()` warms both at boot (§6.2 cold-load budget).

## ADR-0006 — Gestures on the UI thread; fiber's own touch system disabled; one bridge per UI frame

`Canvas` is rendered with `events={null}` and `pointerEvents="none"` so react-native-gesture-handler owns every
touch (fiber's PanResponder overlay would otherwise fight the JS responder). Yaw, pitch, distance and pan live in
Reanimated shared values mutated inside worklets (`.get()`/`.set()`, React-Compiler-lint friendly); inertia is
`withDecay` with deceleration 0.997 (≈ 1.5 s to rest), pitch is clamped to ±25°, snaps are 300 ms `withTiming`
to the nearest equivalent angle. A single `useAnimatedReaction` mirrors the four values to a preallocated JS
object via `scheduleOnRN` and the scene calls `invalidate()` once — so `frameloop="demand"` renders exactly one
frame per rig change and nothing while idle. Tap picking converts RNGH `x,y` (points, relative to the Canvas
box) to NDC and raycasts against the region meshes; `body_base` counts as empty space. Composition:
`Simultaneous(rotate¹, pinch, pan², Exclusive(doubleTap, tap))` with tap limited to 8 pt / 250 ms.

## ADR-0007 — Procedural MatCap `DataTexture` for the spike

The §6.2 MatCap look is produced by a 256² grayscale `DataTexture` computed in JS (wrapped diffuse, small
specular, subtle rim). It avoids the image-decode path through expo-gl for the spike; a painted PNG can replace
it in Phase 1 without touching the scene code (`MeshMatcapMaterial` multiplies the matcap by `material.color`,
which is where status colors go). One material per region (33 draw calls, within the ≈ 35 budget).

## ADR-0008 — Asset contract details fixed by the validator

`tools/model-pipeline/validate.ts` (CI) enforces §6.2: every id in `REGION_IDS` (32 regions) plus `body_base`
exists exactly once as a mesh node with one indexed TRIANGLES primitive and identity transform; no other meshes;
≤ 150 k triangles; ≤ 8 MB; min y ≈ 0 and max y ≈ 1 (stature normalized); midline centered; identical region set
on both bodies; manifest matches. Two interpretations were fixed here: (a) single-region groups (`lats`,
`delt_side`, …) are meshes named by the group id, and the region `biceps` inside group `biceps` is likewise the
mesh `biceps`; (b) the model **faces +Z** (glTF convention; the front camera sits on +Z) — the brief's "face −z"
line for label transfer is read as the camera's view direction. The Phase 0 placeholder is generated by
`generate-placeholder.ts` with `@gltf-transform/core` from procedural capsules/ellipsoids (no Blender needed);
the female variant applies the §6.3 width profile to the same region set. It is the only placeholder the brief
allows and is deleted in Phase 1.

## ADR-0009 — Drizzle + expo-sqlite: committed migrations, driver-agnostic repositories, tests on better-sqlite3

`drizzle-kit generate` (dialect `sqlite`, driver `expo`) writes SQL + `migrations.js` into `src/db/migrations`,
imported as text via `babel-plugin-inline-import` and applied at boot with `useMigrations`; CI regenerates and
fails on a diff. Repositories take a `Db = BaseSQLiteDatabase<'sync', any, typeof schema>` so the same code runs
on expo-sqlite in the app and on better-sqlite3 (in-memory, same migrations) in Jest — better-sqlite3 13 ships
prebuilt binaries for Linux and Windows on Node 22, no toolchain needed. Conventions: ids are client UUIDs from
`expo-crypto` (no global `crypto` on device), timestamps are epoch ms integers, weights are stored in kg, JSON
columns are typed `text` in json mode, user-owned tables carry `updatedAt`/`deletedAt` now so Phase 6 sync needs
no migration. `PRAGMA journal_mode = WAL` and `foreign_keys = ON` are set on open (expo-sqlite does not).
Seeding is idempotent (revision recorded in `app_meta`), chunked, transactional, and never overwrites a row the
user turned into a custom exercise.

## ADR-0010 — Jest as two projects; RNTL 14 renders asynchronously

`node` project (babel-jest + babel-preset-expo, `testEnvironment: node`) for engine, data, db and tools —
fast and free of the RN preset; `app` project on `jest-expo` for components, with Reanimated `setUpTests()`,
the worklets mock, gesture-handler's jestSetup and manual `expo-crypto`/`expo-sqlite` mocks. `jest-expo` 57
needs `@react-native/jest-preset` and RNTL 14 needs `test-renderer` installed explicitly. RNTL 14's `render`
returns a Promise — tests `await render(...)`.

## ADR-0011 — React Compiler lint rules are honored even though the compiler is off

`eslint-config-expo` 57 enables the React Compiler rules (`react-hooks/refs`, `immutability`, `purity`). Rather
than disabling them we comply: no "latest ref" writes during render (callbacks are passed and memoized), no
`Date.now()` in components (`src/lib/clock.ts`), mutations of ref-held three.js state happen in module-level
helpers called from effects/`useFrame`. This keeps the door open to enabling the compiler later.

## ADR-0012 — Theme tokens with light and dark; status colors in OKLCH with chroma clipping

`src/theme` holds palettes, spacing, radii and type; `useTheme()` follows the system scheme. Status color is a
pure engine function (`src/engine/status-color.ts`): red (h 29°) → yellow (h 96°) → green (h 145°) interpolated
in OKLCH on `ratio` clamped to [0, 1], converted to sRGB with chroma reduced until in gamut (hue and lightness
preserved). Provisional data desaturates (chroma × 0.4, opacity 0.6); under-emphasized regions dim one step.
Every status also has an icon and text (`StatusBadge`).

## ADR-0013 — Android dev builds via EAS `development` profile (APK) or local `expo run:android`; New Arch only

`eas.json` defines `development` (dev client, internal, APK), `preview` and `production`. The free EAS plan
(15 Android + 15 iOS builds/month, low-priority queue) is enough for Phase 0–1; `expo-dev-client` is installed.
`eas build --local` does not run on Windows, but `npx expo run:android` does with Android Studio + JDK 17.
The New Architecture cannot be disabled on SDK 55+, so there is no `newArchEnabled: false` fallback if expo-gl
misbehaves — the WebView fallback in the brief is the escape hatch.

## ADR-0014 — ESLint flat config from Expo + Prettier; R3F intrinsics allow-listed

`eslint.config.js` = `eslint-config-expo/flat` + `eslint-config-prettier/flat`; `npx expo lint --max-warnings 0`
in CI; Prettier runs separately (`printWidth` 120, single quotes). `react/no-unknown-property` ignores
`object`, `attach`, `args` for react-three-fiber elements. `no-non-null-assertion` is off (engine/tools assert
after explicit checks).
