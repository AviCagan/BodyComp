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
user turned into a custom exercise. (The test driver later moved from `better-sqlite3` to `node:sqlite` — see
ADR-0019; everything else in this ADR still holds.)

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

## ADR-0015 — Adversarial review before hand-off; what it changed

Before hand-off the Phase 0 code went through a six-reviewer adversarial pass (scene, gestures, DB, seed rules,
model tools, app shell) with two independent refuters per blocker/major finding. Confirmed defects and the
fixes now in the tree: capsule triangles were wound inward and the bottom cap ring order was reversed (regenerated;
the validator now rejects inside-out, degenerate, non-indexed or textured geometry and checks the manifest per
region); status colours were written as gamma sRGB into three's linear working space and passed through ACES
tone mapping (now `setRGB(…, SRGBColorSpace)` and `flat`); materials rebuilt on a body swap ignored provisional
opacity; the module-level body cache handed one scene graph to every mount (now a template + per-mount clone);
the two-finger release fell through to an orbit fling and horizontal drag moved against the finger; several
seed-rule regexes matched the wrong exercises (front raises, "Machine" rows, palms-down wrist curls, push-up
incline/decline, squat hamstring/calf credit, abductor distributions, pattern classification, junk aliases);
the tombstone convention was not applied to every user-owned table; alias search LIKE'd raw JSON; `startWorkout`
allowed two open workouts; update helpers returned `undefined` typed as rows; the `app` Jest project could not
import modules that reference `.glb` files and silently skipped `.test.ts` files outside three folders. Lesson
kept as process: run the review workflow at the end of every phase, and make the CI validator strict enough to
catch geometry defects rather than only counting meshes.

## ADR-0016 — Asset naming: GLTFLoader-safe ids, lowercase snake_case file names

three's `GLTFLoader` sanitizes node names (`PropertyBinding.sanitizeNodeName`: whitespace → `_`, strips
`[ ] . : /`, de-duplicates with `_1`). Region ids are therefore restricted to `^[a-z0-9_]+$` and the validator
enforces it, so `mesh.name` at runtime equals the region id. Android release builds address bundled assets by a
derived resource identifier (lowercased, punctuation stripped), so asset file names stay lowercase snake_case
with unique basenames (`body-female.glb` → `models_bodyfemale`). The Phase 1 Blender export must key regions on
node names (Blender writes the shared datablock name to the glTF _mesh_ and the object name to the _node_) and
emit pre-sanitized ids rather than `.l/.r` suffixes.

## ADR-0017 — First-device path: Expo Go first, then a release APK; `buildFromSource` as the expo-gl fallback

Every Phase 0 native module (expo-gl, expo-asset, expo-file-system, expo-sqlite, expo-crypto, RNGH, Reanimated)
ships in Expo Go, and Expo Go for SDK 57 is on Google Play, so the JS stack can be smoke-tested on the Pixel with
`npx expo start` in minutes, before any build. The one failure class that Expo Go cannot reveal is a prebuilt
native binary mismatch: expo-gl is delivered as a precompiled AAR (the mechanism behind the expo-gl 16.0.9
release-only SIGSEGV), so a release/preview APK is the second required check. If that crashes in expo-gl, the
documented escape hatch is `"expo": {"autolinking": {"android": {"buildFromSource": ["expo-gl"]}}}` in
`package.json` and a local `npx expo run:android --variant release`. There is no New-Architecture opt-out on
SDK 55+. The expo-asset config plugin that `expo install` added is a no-op without an `assets` list and is not
required for Metro `require()`d models.

## ADR-0018 — Citation conventions for the engine constants (for Phase 3)

`docs/research/science-citations.md` holds the verified references. Conventions: cite the journal issue year
(Maeo et al. is 2023, not the 2022 e-pub year); cite Pelland et al. Sports Med 2026;56(2):481-505 (the
published form of the 2024 SportRxiv preprint) for weekly volume and the 0.5 fractional weighting of indirect
sets; note that the per-session diminishing-returns rule (`sessionFactor`) traces to Remmert et al. 2025, still
an unpublished preprint — whether a shipped constant may cite a preprint is an open question for the humans
(`PLAN.md`); Lasevicius 2018 is about very light loads, not low reps, and must not be cited for `repFactor`;
Bosquet 2013 measured strength, not size, so the "a red muscle has not shrunk" copy leans on Ogasawara 2011/2013,
Hwang 2017 and Bickel 2011. None of this changes a constant.

## ADR-0019 — Test database is Node's built-in `node:sqlite`, not `better-sqlite3`

`better-sqlite3` was the Jest database (ADR-0009). It is a native module, and although it ships N-API prebuilt
binaries for every platform we target, npm can still decide to rebuild it from source — a fresh Node major with
no matching prebuild, a cold cache, a locked file on Windows. When that happens `npm ci` fails inside
`node-gyp` and needs Visual Studio's "Desktop development with C++" workload plus a Windows SDK. That is what
happened on the product owner's machine (Node 24, no Windows SDK): the install aborted, so `expo` was never
installed either, and a dependency that only the tests use blocked running the app entirely.

Node 22.5+ ships `node:sqlite`, whose `DatabaseSync`/`StatementSync` are synchronous and cover everything
drizzle's sync SQLite driver calls: `prepare`, `run`, `all`, `get`, array rows (`setReturnArrays`, matching
better-sqlite3's sticky `.raw()`), and `exec`. `src/db/node-sqlite-adapter.ts` presents that as the
better-sqlite3 driver surface — including a `transaction()` with the `deferred`/`immediate`/`exclusive`
variants drizzle indexes into — and Jest maps the bare `better-sqlite3` specifier to it, because
`drizzle-orm/better-sqlite3` requires that module at load time even when handed a live client. The
repositories, the schema and the generated migrations are untouched; the same migrations still run in tests.

Result: no native dependency anywhere in the tree, no compiler on any machine or CI runner, and `npm ci`
verified clean. The only cost is an ExperimentalWarning from Node, filtered in `test/setup.node.ts`. If
`node:sqlite` ever proves insufficient, `better-sqlite3` can come back as an _optional_ dependency so a failed
build never blocks the app again.

## ADR-0020 — The app is called "Show up"

Decided by the product owner on 2026-09-08. `APP_NAME = 'Show up'`, slug and scheme `showup`, Android package and
iOS bundle id `com.showup.app`, on-device database `showup.db`, npm package `showup`. The repository keeps its
`BodyComp` name and the differentiating feature keeps its brief name — the component is still `MuscleMapView`
and the tab is still "Map". No EAS build had been published under the old slug; if one was started, `eas init`
simply creates the new project.

## ADR-0021 — Stylized, faceless bodies; the female body is its own model (amends brief §6.2 and §6.3)

The brief asked for a skinless écorché derived from Z-Anatomy, with the female body produced by morphing the male
mesh (Path A). After seeing the direction the owner rejected both: the écorché reads as too anatomical and its
face is off-putting, and a female body made by reshaping the male one "with breasts added" is not acceptable.
New direction: a **simplified, stylized, faceless** body that keeps the per-region granularity (the 32 region
meshes and the asset contract are unchanged), and **two distinct sculpts** for female and male that share the same
region set and framing. Consequences: the Z-Anatomy pipeline is demoted from source to _reference for region
boundaries_, which also removes the CC BY-SA share-alike obligation on shipped model files; the new default source
to evaluate first was a CC0 base body with separate female and male meshes; the owner chose this option on
2026-09-08 and the source is the Blender Studio Human Base Meshes bundle (CC0; complete female and male figures,
stylized and realistic variants, `.blend`, Blender 3.2+; confirmed via the bundle's public announcements, to be
re-checked against the licence file inside the download),
segmented into regions in Blender via vertex groups by the existing pipeline; a purchased matched stylized pair
remains the paid alternative. The engine, the asset contract, `validate.ts` and `MuscleMapView` need no change.
Everything else in §6.2 (interaction, budgets, MatCap look, neutral `body_base`) still applies.

## ADR-0022 — Nutrition logging (accepted 2026-09-08)

Requested on 2026-09-08 and not in the brief, whose §1 scopes the product to training; confirmed by the owner the same day. Scheduled as its own phase
after the first build so it cannot delay the map or the logger: a food log with a quick-add **barcode scanner**,
manual entry and recent/favourite foods; **fiber as a first-class macro** beside protein, carbs and fat; a detail
view with sugars, sodium, saturated fat and the rest; a daily calorie target with an unambiguous over / under
visual; and the bodyweight line chart (already in §6.7) shown once three or more weights exist. Implications the
owner should be aware of before confirming: the scanner needs `expo-camera` (a native module, so it lands in the
next dev build — the brief asks a human before adding one, this is that ask); barcodes resolve through a food
database, and the only option without a key or a bill is Open Food Facts (free, open data, coverage is uneven
for US products) with a local cache so scanning works offline afterwards; the export format and the DB schema
grow three tables (`food_items`, `food_log_entries`, `nutrition_targets`). The same rules apply as elsewhere:
offline-first, no third-party analytics SDKs, deterministic numbers, and copy that never moralizes about food.

## ADR-0023 — The exercise → muscle table is derived from the literature, not from human review

Brief §9 assigned the review of the full mapping table to the humans in Phase 3. On 2026-09-08 the product owner
redirected it: the mappings are to be grounded in PubMed and other primary sources by Claude, and the humans only
spot-check. Method: the 739 exercises are grouped into 11 movement areas and, inside those, into movement
families (incline press, hip hinge, seated leg curl, …); one researcher per area searches PubMed and primary
sources and proposes a per-family mapping with cited evidence graded by tier (longitudinal hypertrophy > EMG /
MRI > anatomical reasoning > practitioner consensus), plus per-exercise overrides where grip, angle, implement or
unilateral loading changes the emphasis; an independent verifier per area checks that every citation exists and
supports its claim, that the §4.2 weight rules hold, and that exercises sit in the right family. The eleven
anchor rows given verbatim in brief §4.2 are never changed; where evidence disagrees with them the conflict is
recorded and raised with the owner (rule 6 of the brief). Output: `docs/research/exercise-muscle-evidence.md`
(the cited evidence per family) and a data-driven family table that replaces most of the name-matching rules in
`tools/seed/import-free-exercise-db.ts`, so a future correction is a data edit with a citation rather than a
regex. `needsReview` then means "no evidence-backed family covers this exercise" instead of "the rule guessed".
