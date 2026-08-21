# AI Handoff

This is the portable continuity snapshot for BoatBoard. The repository, not prior chat memory, is authoritative.

## Current State

- Source: `project/`; stack: dependency-free HTML, CSS, JavaScript modules, Canvas, and a small Python local file server.
- Run `python scripts/boatboard_server.py`, then open `http://127.0.0.1:4173/` or `/editor.html`. Direct `file://` opening cannot use the instance APIs.
- `index.html` is the read-only viewer intended to become the hosted/presentable experience. `editor.html` is the local authoring interface.
- `localrelease` creates the ignored unversioned preview at `exports/BoatBoard-local/`; it contains the app, empty seed, standalone Windows executable, editor launcher, and stop control, but no private instance. The executable bundles Python and `openpyxl`, selects a free localhost port, and opens the browser automatically. `requirements-build.txt` and the export script reproducibly bootstrap the ignored PyInstaller environment. No installer, hosted deployment, versioned product release, or GitHub Release exists yet.
- Never commit real company records or profile images.

## Private Instance

The tracked reusable seed is `project/instance_template/` and contains an empty workbook, empty board state, and empty images directory. On first server start it creates the active ignored instance, fully contained in `project/private_instance/`:

- `boatboard.xlsx`: company/page values, teams, colleagues, membership, image filenames, role, and notes.
- `images/`: actual profile-image files referenced by workbook filename.
- `board.json`: placed state, coordinates, leaders, per-team profile order, and arrangement rotation.

Tracked application defaults and the seed workbook must remain generic and empty (`BoatBoard`, no teams or colleagues). Company-specific titles, records, layouts, and profile images belong only in the ignored active instance.

`scripts/boatboard_server.py` creates missing instance files and exposes local APIs for organization data, board state, images, workbook replacement, and opening the instance folder. Workbook replacement is validated and backed up. Stable IDs preserve compatible layout/order/connections; obsolete state is removed and new teams remain unplaced. The browser retains a localStorage fallback for board state.

## Editor

- `editor.html` presents the same complete viewing experience as `index.html`, with the `Boat Board Editor` subtitle and a pencil button at the top right.
- The pencil button enters authoring mode, closes viewer search/profile/team UI, opens the edit panel, and reveals rotation handles. Closing the panel returns to viewer interaction without refreshing the page.
- The edit panel keeps unplaced teams first, followed by placed teams, with each group alphabetical. Collapsed team names are clean draggable labels; expanded teams expose name editing, colleague rows, add/delete actions, import, instance-folder access, and team creation.
- Drag a listed team to place it; drag a bubble to move it; drag it into the panel or right-click to unplace it.
- Drag a profile to another team to assign leadership. Right-click a leader to clear its assignments.
- Right-click a non-leader profile, hover another same-team profile, and click to swap slots; press a key to cancel.
- A compact curved handle immediately right of each placed bubble rotates its profile arrangement by vertical drag in persisted 10-degree increments; the base arrangement and upright profile content remain unchanged.
- Company/team/colleague edits autosave to XLSX after a short debounce. Organization changes rebuild the live board model in place, preserving compatible layout state and avoiding a page refresh.
- Bulk setup uses the XLSX plus `images/`; each colleague row references an image filename. The editor shows the image or an initials/color fallback.
- The editor and viewer both initially fit all placed bubbles inside the centered content square.

## Rendering And Geometry

- The logical square initially fits the viewport. Cursor-centered zoom ranges from .08x to 30x and unrestricted 1:1 drag pans at every zoom. Double-click has no camera action.
- Cached overview Canvas bitmaps switch to vector detail rendering when enlarged. Preserve this performance design unless profiling supports a change.
- Accepted layouts support 1-99 profiles using 84px profiles, a nominal 38px edge gap, mirror-balanced concentric rings, count-sensitive padding capped at 62px, and nondecreasing bubble radii.
- Special cases include 6 = center+5, 7 = center+6, 9 = inner 3+outer 6, 10 = inner 3+outer 7, 11 = 3+8, 12 = 3+9, 13 = 4+9, 25 = 4+8+13, 26 = 4+9+13, and 27 = 4+9+14. Counts 3-5 are expanded 10%; 23 and 24 use slightly tightened rings.
- Team bubbles use a 42px inward blue-gray edge fade, a faint tinted interior floor, and restrained brighter edges. Three-pixel leadership links remain supporting indicators; profiles are the focal point.

## Viewer Experience

- The read-only viewer initially fits every placed bubble within the centered viewport square and supports smooth free pan/zoom without triggering browser zoom.
- An opaque left search panel lists only colleagues whose own team is currently placed on the board, alphabetically, with profile image, colleague name, and a subtle bottom-right team name. Placement changes update availability without a page refresh; unavailable rows are also removed from keyboard navigation. Filtering matches accent-insensitive colleague or team names, uses compact transitions, and smoothly focuses a selected profile while leaving the panel open until explicitly closed.
- Profiles use a pointer cursor, show a hover-preview after 0.4 seconds, and open a persistent selected popup on click. Clicking the currently previewed profile promotes the existing popup without flicker; search selection also opens it and displays a subtle 4px selection ring.
- Opaque, non-click-through profile and team popups remain anchored to their respective profile/bubble corners while the board moves. Placement prefers space away from the board content, avoids the search panel and the other popup, and pans only when necessary to keep the new popup visible. Indirect selection through a search/member/team row repositions an existing popup when required instead of allowing overlap.
- Popup opening, replacement, and closing use short anchor-origin scale/opacity animations; outgoing and incoming popups can animate simultaneously with the incoming popup above the outgoing clone.
- The profile popup displays the avatar, a one- or two-line name, optional WhatsApp, Discord, and email values, a dynamically sized multiline description, and compact team rows. Description fields start at four lines, grow to six lines with a partial-line scroll hint, then scroll without a visible scrollbar.
- The colleague's own team is first and carries the `Equipe` label. Any additional teams they lead are derived from `board.json`, listed below with a 2px gap, and expand the content-sized popup naturally.
- Clicking a bubble or a profile-popup team row opens the team popup and selects the bubble. It contains a wrapped team title, a two-column alphabetical member directory, the leader isolated on a final left-hand row with an external `Lider` tag, and a dynamically sized description below the list. Member lists show up to six rows plus a 75%-row scroll hint; clicking a member opens that colleague's popup.

## Next Work

The standalone local MVP has been presented to the technical team. Continue fine visual and usability work in the source project, test frequently through the development instance, and regenerate the independent standalone preview periodically. Basic manual team/colleague editing remains sufficient for this phase; image upload and description/contact authoring UI are intentionally deferred.

Before deployment, obtain exact technical-team decisions for company-approved private hosting, authentication/authorization, authoritative organization data, image storage, ingestion/refresh behavior, and ownership of team/leader/layout administration. Preserve the replaceable data adapter and the separation among organization data, board state, rendering, and editing so the eventual integration does not require rewriting the viewer. A versioned reusable GitHub Release remains later work.

## Validation

```powershell
node --check project/app.js
node --check project/data-editor.js
node --check project/profile-popup.js
node --check project/team-popup.js
node --check project/viewer-search.js
node --check project/data/board-state.js
node --check project/data/organization-source.js
node --check project/layout/profile-arrangements.js
python -m py_compile scripts/boatboard_server.py
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\Export-LocalRelease.ps1
git diff --check
```

Advance asset query versions in both HTML files during visual iterations because browser caching can conceal changes.
