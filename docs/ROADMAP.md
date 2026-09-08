# Show up — roadmap from today to the first upload

_Written 2026-09-08. Order is binding (a phase starts when the previous one's definition of done passes); the
session counts are rough effort, not dates. Steps marked **You** need Avi; everything else is Claude's._

## Where we are

Phase 0 (scaffold + 3D spike) is built, reviewed and green in CI. Two gates remain open:

1. **Release APK check** — **You**: install the queued `preview` build and confirm the Map tab works. This closes
   Phase 0 by the brief's rule.
2. **Evidence pass on the exercise → muscle table** (ADR-0023) — running now. When it lands: apply the family
   table, regenerate the data, run the checks, and put the handful of conflicts with the brief's anchor rows to
   you for a ruling. Not a Phase 1 blocker, but it lands before Phase 3 needs it.

Decisions already made: name **Show up**; bodies option A from the CC0 Blender Studio Human Base Meshes; nutrition
yes; Jeff Nippard allowlist; Supabase project ShowUp; store accounts deferred to shipping.

## Phase 1 — Bodies + Map screen (about 3 sessions)

1. **You**: send 2–3 reference pictures of the body style you want (any app or game). Decides whether we start from
   the bundle's stylized mesh or simplify the realistic one.
2. Download the Human Base Meshes bundle; verify the CC0 text inside it; record the version in `LICENSE-model.md`.
3. Faceless head: smooth the facial features off both figures; keep the silhouette.
4. Segment each body into the 32 regions + `body_base` with Blender vertex groups, driven by a
   `region-vertex-groups.json`; Z-Anatomy is opened only to place seams (pec/delt, quad/hamstring, long-head/lateral).
   Female and male share the same region list by construction.
5. `tools/model-pipeline/build.py` (bpy 4.5 wheel, deterministic, runs in CI): bake, decimate to the 150 k-triangle
   budget, export `body-female.glb` and `body-male.glb`, write manifests, render front/back/left/right PNGs into
   `docs/models/`. `validate.ts` must pass for both.
6. **You**: approve the renders (one round of tweaks expected).
7. Map screen chrome to the §6.2 spec: legend, group/region toggle, "What to train today" chip (mock data),
   bottom-sheet shell with status bar and placeholders, provisional styling, snap buttons, MatCap texture.
8. **You**: on the Pixel — every region tappable and colourable on both bodies, switching bodies keeps camera and
   selection, 60 fps while rotating, cold load under 1.5 s. Screen recordings of rotate → tap → sheet for each body.

Done when: step 8 passes and the recordings exist.

## Phase 2 — The logger, Strong parity with the Show up layout (about 5 sessions)

1. Log tab home: **My templates** (empty state "Nothing here, add one?" with _Create template_), **Start an empty
   workout**, **Suggest a workout** (disabled with a hint until Phase 4).
2. Template builder: name, exercises (search by name and alias, filters by muscle group / equipment / pattern,
   recently used, "hits this muscle"), target sets × reps × RIR, supersets, rest defaults, optional weekday schedule.
3. Active workout: set rows with weight / reps / RIR quick entry, previous performance ghosted in, tap to complete,
   warm-up toggle, set-type menu (drop / failure / myo), auto rest timer with notification and haptic, per-exercise
   rest defaults, supersets, notes per exercise and per workout, plate calculator, unit toggle, add / remove / reorder
   exercises, PR detection with toast (e1RM, rep, volume).
4. Finish screen: summary plus the compact auto-rotating map recolour (mock colours until Phase 3) and the list
   of groups that moved.
5. Never lose a set: every set auto-saves; the in-progress workout is restored on relaunch.
6. History: calendar heatmap, list, workout detail, edit, delete, duplicate as new, filter by exercise or muscle.
7. Export CSV and JSON.
8. Custom exercises: pick primary and secondary groups (and a region emphasis); weights assigned by role.
9. Settings: units, rest-timer defaults, level.
10. Performance: cold start to a loggable workout under 2 s on the Pixel; every long list virtualized.
11. Maestro flow "start template → log 3 exercises → finish" runs in CI.

Done when: a full push/pull/legs week can be logged end to end from templates on the Pixel, and the Maestro flow
passes. **You**: log a real week and report friction.

## Phase 3 — The engine, real colours, Progress (about 3 sessions)

1. `src/engine/constants.ts` with the verified citations (`docs/research/science-citations.md`).
2. Set factors, effective sets, frequency, status, region emphasis, recently-trained, distribution advice,
   overload status (Epley e1RM, stalled), balance flags, adherence. Pure functions, `now` injected.
3. The six golden cases from the brief as tests, plus the starter-template test (following a beginner template for
   a week turns every default group at least partial).
4. Status cache recomputed after every saved set, off the UI thread, under 50 ms on a year of history.
5. Map coloured from real data; bottom sheet fully populated: status bar (sets this week vs target), sessions,
   last trained, flags, 8-week sparkline, exercises that credited the region with dates and best sets, recommended
   exercises for your equipment, video slot (empty until Phase 5).
6. Finish-workout recolour uses real numbers. Provisional data renders desaturated and is excluded from PRs and
   Progress.
7. Progress tab: e1RM per exercise over time, weekly effective sets per group (stacked bars), bodyweight log with the
   line chart at three or more entries, PR list, streaks. Chart library decided once (victory-native) with an ADR.
8. Settings: per-group target overrides with defaults and rationale, priority and optional groups, "Muscle status
   (list)" from real data.
9. **You**: rule on the mapping conflicts from the evidence pass; spot-check a few mappings against what you feel.

Done when: golden cases pass, the model colours correctly from logged data, tap → sheet shows real history.

## Phase 4 — Intake, Ares, the weekly report (about 4 sessions)

1. ~~**You**: put the rotated Anthropic key into the Supabase project's secrets~~ — done 2026-09-08
   (`ANTHROPIC_API_KEY` in Edge Function secrets).
2. Supabase edge functions: `parse-program` (free text → schema-validated program JSON, one retry, then manual
   fallback) and `narrate` (≤ 120 words, plain, no hype). The client never holds a key. Per-call cost is measured
   and the smallest model that passes the tests is chosen.
3. Onboarding under 3 minutes: body model, units, optional bodyweight and height; experience → level; two
   calibration questions; goal and equipment; **split preference and days per week** (beginners get the
   evidence-based default for their day count); priority muscles tapped on the 3D model; program import for
   intermediate and advanced (structured builder or free text via `parse-program`) saved as templates **and** as
   provisional stimulus; beginner starter templates; notifications opt-in; land on Log with templates ready.
4. Suggest a workout: the engine ranks candidate sessions from today's slot in the split, the map's biggest gaps,
   recency and stalled lifts. **Ares** slides down over the Log tab and presents two or three, each startable as a
   workout. Ares phrases; it never picks exercises or set counts. Offline it shows the same options as plain text.
5. Weekly report from engine JSON: per-group table, top 3 fixes ranked by impact, junk-volume and distribution
   flags, balance flags, stalled lifts with a suggestion, adherence, optional narration, shareable image. Entry
   points: the Map's Report button and the Log header when a new one is ready.

Done when: onboarding runs in under 3 minutes with the priority picker, a free-text program round-trips to editable
templates, provisional colours appear, the report renders with and without the network.

## Phase 5 — Technique videos (about 1 session)

1. ~~**You**: create a Google Cloud project, enable YouTube Data API v3, make an API key, put it in Supabase secrets~~ —
   done 2026-09-08 (public-data key, restricted to that API, set as `YOUTUBE_API_KEY` in Edge Function secrets).
   Free quota is enough at our scale.
2. `video-channels.json` (Jeff Nippard) and `videos.json` for hand-picked overrides.
3. Edge function: search by exercise and by muscle, filter to the allowlist, rank, cache 30 days. Zero client calls.
4. Player in the detail sheet; show nothing rather than an unvetted video.

## Phase 5b — Nutrition (about 4 sessions)

1. Schema and migrations: `food_items` (cached Open Food Facts products and custom foods), `food_log_entries`,
   `nutrition_targets`.
2. Targets: enter manually, or accept a computed suggestion (Mifflin-St Jeor × activity, adjusted for goal) that
   shows its working. Deterministic; the user can always override.
3. Quick add: barcode scanner (`expo-camera`, a new native module → a fresh dev build), Open Food Facts lookup,
   confirm serving, log. Items are cached so a rescan works offline. Manual entry, recents, favourites, "copy
   yesterday".
4. Daily view: calories against target with an unambiguous under / on / over visual, protein, carbs, fat and
   **fiber** as the headline row; detail view with sugars, sodium, saturated fat and the rest.
5. Bodyweight trend on the same screen (the chart from Phase 3), export extended to nutrition.

Done when: scan → log → daily view in three taps, works offline after the first scan of an item.

## Shipping the first build (about 2 sessions plus account lead times)

1. **You**: app icon and splash screen (a designer, or a first pass from me for you to react to). The template
   icons are placeholders.
2. **You**: Google Play developer account ($25, identity verification takes days; new personal accounts must run a
   closed test with 12 testers for 14 days before public release, so collect 12 Gmail addresses early) and Apple
   Developer account ($99/year, one to two days).
3. Privacy policy page (required by both stores; the app stores training data on the device, sends nothing to a
   server except the optional program-parse and narration calls, and nutrition lookups to Open Food Facts).
4. Store-facing config: version and build numbers, iOS permission strings (camera), Android permissions, `production`
   EAS profile, Android App Bundle.
5. Accessibility pass: dynamic type, 44-pt targets, colour + icon + text everywhere.
6. `eas build --profile production` for both platforms; `eas submit` to TestFlight and to Play internal testing.
   **You**: install from TestFlight / Play and smoke-test on real devices. This is "upload".
7. `docs/STATUS.md` rewritten for the second build.

## After the first upload (the second build)

- **Phase 6 — Accounts and sync.** Supabase auth (email, Apple, Google), local-first sync of profile, templates,
  workouts and sets with last-write-wins per row, tombstones for deletes, conflict tests. Photos are never synced.
- **Phase 7 — Progress photos, polish, public release.** On-device photo timeline with side-by-side compare (no
  analysis), the closed test on Play, store listings and screenshots, App Store review, public release.
