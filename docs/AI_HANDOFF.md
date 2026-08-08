# AI Handoff

This is the portable continuity snapshot for AI sessions working on BoatBoard. The repository, not prior chat memory, is authoritative.

## Current State

- Project: `BoatBoard`, a local-first visual company-directory prototype for Eduzz.
- Source: `project/`.
- Stack: dependency-free HTML, CSS, JavaScript modules, and Canvas.
- Run from the repo root with `python -m http.server 4173 --directory project`.
- Open `http://127.0.0.1:4173/`; direct `file://` opening does not load the JavaScript modules correctly.
- No package, dependency, build, deployment, or release process exists.
- No Git remote is currently configured.
- The current arrangement stress test has 99 fictional teams with respective membership counts 1 through 99: 4,950 fictional colleague placeholders and one fictional leadership link per team.
- No real company data, profile images, credentials, or private exports belong in Git.

## Implemented Product

- `project/index.html` provides the page shell, Canvas, title, and cache-versioned assets.
- `project/styles.css` provides the dark graphite/ocean visual system and fixed overlay title.
- `project/app.js` provides Canvas rendering, the stable square logical scene, team grid placement, leadership links, overview bitmap caching, vector detail rendering, and the camera.
- `project/layout/profile-arrangements.js` provides deterministic arrangements and bubble sizing for profile counts 1–99.
- `project/data/board-config.js` holds replaceable presentation configuration, currently the `Eduzz` company name.
- `project/data/example-organization.js` generates fictional stress-test data and provisional avatar colors.

The complete logical square fits the viewport by default. Mouse-wheel and trackpad gestures zoom smoothly around the cursor from 1x to 30x. Dragging pans 1:1 with the pointer, without bounds and at every zoom level—including the default fitted view. Double-click resets the camera. The scene itself has no ambient motion.

For performance, teams use cached low-resolution Canvas bitmaps at overview scale and switch to vector Canvas drawing when enlarged. Keep this approach unless profiling supports a change; the 4,950-profile test previously became jagged when all elements were independently transformed.

## Accepted Profile Geometry

- Profile diameter: 60 logical pixels.
- Nominal gap: 30 logical pixels; center spacing is 90.
- Profiles form centered, mirror-balanced, concentric complete polygon rings with close neighbor spacing and an overall circular/atomic/mandala appearance.
- Counts 1–10 have intentional compact arrangements.
- Visual special cases: 11 uses 3+8, 12 uses 3+9, 13 uses 4+9; 25 uses 4+8+13, 26 uses 4+9+13, and 27 uses 4+9+14.
- Counts 3–5 are expanded 10%; count 23 has a slightly tighter outer ring; count 24 has slightly tighter rings.
- Bubble padding grows for small teams and caps at 88 logical pixels. Computed bubble radii are normalized so a larger team never receives a smaller bubble than the preceding count.
- The owner has accepted the current 1–99 profile arrangements. Preserve them unless a future request targets them.

Placeholder initials are deliberately large. Their soft-vivid palette is provisional; the owner wants to reassess colors later after profile images exist and image/non-image profiles can be judged together.

## Visual And Data Rules

- Team bubbles use one restrained transparent blue-gray radial edge treatment, with a fixed 28px logical inward fade and generous breathing room around profiles. Do not add shine, extra rings, or drop shadows.
- Profiles are the focal point. Do not show team names, counts, or colleague names on the map yet.
- Leadership lines are stationary, dim, dark blue-gray 2px vectors without endpoint dots or leader halos.
- A colleague belongs to one team. A team has one leader, who may belong to another team and stays visible only in their own bubble.
- Data access must remain read-only and replaceable: private source → adapter → stable organization model → layout/rendering.
- The private authoring format and future authoritative company system remain undecided.

## Next Work

The owner will next explain and align the desired team-bubble arrangement and connection behavior. Do not pre-empt that design. Search, profile hover/click/details, editing, import, real data, hosting, authentication, and production integration remain future owner-directed work.

## Validation

```powershell
node --check project/app.js
node --check project/data/example-organization.js
node --check project/data/board-config.js
node --check project/layout/profile-arrangements.js
git diff --check
```

Browser caching can conceal visual changes. Advance the query versions in `project/index.html` when CSS or imported JavaScript changes, then refresh the exact local URL.

## Workflow

- Read `AGENTS.md`, this file, the memory protocol, workflow rules, and project brief when catching up.
- Inspect source and Git status before editing; preserve owner changes.
- `memcheck` updates durable memory only.
- `gitcheck` runs `memcheck`, reviews and validates changes, verifies identity protection, stages intended files, commits with an objective title plus bullet lines, and pushes when a remote exists.
- Do not publish, package, deploy, or add a framework without owner approval.
