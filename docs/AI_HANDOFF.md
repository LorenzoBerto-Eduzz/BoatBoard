# AI Handoff

This is the portable continuity snapshot for BoatBoard. The repository, not prior chat memory, is authoritative.

## Current State

- Source: `project/`; stack: dependency-free HTML, CSS, JavaScript modules, Canvas, and a small Python local file server.
- Run `python scripts/boatboard_server.py`, then open `http://127.0.0.1:4173/` or `/editor.html`. Direct `file://` opening cannot use the instance APIs.
- `index.html` is the read-only viewer intended to become the hosted/presentable experience. `editor.html` is the local authoring interface.
- No build, package, deployment, release, or hosting process exists. No Git remote is configured at this checkpoint.
- Never commit real company records or profile images.

## Private Instance

The tracked reusable seed is `project/instance_template/`. The active ignored instance is fully contained in `project/private_instance/`:

- `boatboard.xlsx`: company/page values, teams, colleagues, membership, image filenames, role, and notes.
- `images/`: actual profile-image files referenced by workbook filename.
- `board.json`: placed state, coordinates, leaders, and per-team profile order.

`scripts/boatboard_server.py` creates missing instance files and exposes local APIs for organization data, board state, images, workbook replacement, and opening the instance folder. Workbook replacement is validated and backed up. Stable IDs preserve compatible layout/order/connections; obsolete state is removed and new teams remain unplaced. The browser retains a localStorage fallback for board state.

## Editor

- The floating Teams panel lists unplaced teams and collapses into fixed document/menu controls.
- Drag a listed team to place it; drag a bubble to move it; drag it into the panel or right-click to unplace it.
- Drag a profile to another team to assign leadership. Right-click a leader to clear its assignments.
- Right-click a non-leader profile, hover another same-team profile, and click to swap slots; press a key to cancel.
- Board Data autosaves company/team/colleague edits to XLSX after a short debounce. It supports adding teams/colleagues, importing a validated workbook, and opening the complete instance folder.
- Bulk setup uses the XLSX plus `images/`; each colleague row references an image filename. The editor shows the image or an initials/color fallback.

## Rendering And Geometry

- The logical square initially fits the viewport. Cursor-centered zoom ranges from .2x to 30x; unrestricted 1:1 drag pans at every zoom; double-click resets.
- Cached overview Canvas bitmaps switch to vector detail rendering when enlarged. Preserve this performance design unless profiling supports a change.
- Accepted layouts support 1-99 profiles using 84px profiles, a nominal 38px edge gap, mirror-balanced concentric rings, count-sensitive padding capped at 62px, and nondecreasing bubble radii.
- Special cases: 11 = 3+8, 12 = 3+9, 13 = 4+9; 25 = 4+8+13, 26 = 4+9+13, 27 = 4+9+14. Counts 3-5 are expanded 10%; 23 and 24 use slightly tightened rings.
- Team bubbles and 3px leadership links remain restrained dark blue-gray supporting indicators. Profiles are the focal point.

## Viewer Experience

- The read-only viewer initially fits every placed bubble within the centered viewport square and supports smooth free pan/zoom without triggering browser zoom.
- A left search panel lists colleagues alphabetically, filters names with compact transitions, and smoothly focuses a selected profile while leaving the panel open until explicitly closed.
- Profiles use a pointer cursor, show a delayed hover-preview popup, and open a persistent selected popup on click. Search selection also opens the popup and displays a subtle 4px selection ring.
- The fixed-scale profile popup remains anchored to the appropriate profile corner while the board moves. It currently displays the avatar, name, optional WhatsApp and Discord values, and a seven-line multiline description area; workbook/API fields support those values.

## Next Work

Continue the hosted/read-only viewer with team selection and the team information popup, then finish remaining hover/search/presentation behavior until the viewer is final and presentable. Defer additional instance/editor expansion until after that viewer phase unless the owner redirects.

Later work includes a reusable GitHub release, hosting, authentication/authorization, company-approved private deployment, and production data integration. Do not pre-empt those decisions.

## Validation

```powershell
node --check project/app.js
node --check project/data-editor.js
node --check project/data/board-state.js
node --check project/data/organization-source.js
node --check project/layout/profile-arrangements.js
python -m py_compile scripts/boatboard_server.py
git diff --check
```

Advance asset query versions in both HTML files during visual iterations because browser caching can conceal changes.
