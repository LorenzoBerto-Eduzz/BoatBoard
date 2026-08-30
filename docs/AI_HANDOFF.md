# AI Handoff

This is the portable continuity snapshot for BoatBoard. The repository, not prior chat memory, is authoritative.

## Current State

- Source: `project/`; stack: dependency-free HTML, CSS, JavaScript modules, Canvas, and a small Python local file server.
- Run `python scripts/boatboard_server.py`, then open `http://127.0.0.1:4173/` or `/editor.html`. Direct `file://` opening cannot use the instance APIs. `BOATBOARD_PORT` and `BOATBOARD_HOST` may select a development port and a specific LAN address for owner-authorized phone testing; localhost remains the safe default. When an explicit LAN host is selected, startup and subsequent viewer/editor launches reuse and open that same running LAN URL so it can be copied directly to a phone.
- `index.html` is the read-only viewer intended to become the hosted/presentable experience. `editor.html` is the local authoring interface.
- `localrelease` creates the ignored unversioned preview at `exports/BoatBoard-local/`; it contains the app, empty seed, standalone Windows executable, editor launcher, and stop control, but no private instance. The inactive reserved header control remains available in development source but is removed from exported viewer/editor HTML. The executable bundles Python and `openpyxl`, selects a free localhost port, and opens the browser automatically. `requirements-build.txt` and the export script reproducibly bootstrap the ignored PyInstaller environment. No installer, hosted deployment, versioned product release, or GitHub Release exists yet.
- Never commit real company records or profile images.

## Private Instance

The tracked reusable seed is `project/instance_template/` and contains an empty workbook, empty board state, and empty images directory. On first server start it creates the active ignored instance, fully contained in `project/private_instance/`:

- `boatboard.xlsx`: company/page values, teams, colleagues, membership, image filenames, role, and notes.
- `images/`: actual profile-image files referenced by workbook filename.
- `board.json`: placed state, coordinates, leaders, per-team profile order, and arrangement rotation.

Tracked application defaults and the seed workbook must remain generic and empty (`BoatTitle`, no teams or colleagues). Company-specific titles, records, layouts, and profile images belong only in the ignored active instance.

`scripts/boatboard_server.py` creates missing instance files and exposes local APIs for organization data, board state, images, workbook replacement, and opening the instance folder. Workbook replacement is validated and backed up. Stable IDs preserve compatible layout/order/connections; obsolete state is removed and new teams remain unplaced. The browser retains a localStorage fallback for board state.

## Editor

- `editor.html` presents the same complete viewing experience as `index.html`, with a discreet development-only `dev` tag and a pencil button at the top right.
- The pencil button enters authoring mode, closes viewer search/profile/team UI, opens the edit panel, and reveals rotation handles. Closing the panel returns to viewer interaction without refreshing the page.
- The edit panel keeps unplaced teams first, followed by placed teams, with each group alphabetical. Collapsed team names are clean draggable labels; expanded teams expose name editing, colleague rows, add/delete actions, import, instance-folder access, and team creation.
- Drag a listed team to place it; drag a bubble to move it; drag it into the panel or right-click to unplace it.
- Shift-drag on the board creates a marquee selection; selected bubbles use the standard selection-ring visual and move together. Bubble dragging also starts when the pointer happens to be over one of its profiles.
- Drag a profile to another team to assign leadership. Right-click a leader to clear its assignments.
- Right-click a non-leader profile, hover another same-team profile, and click to swap slots; press a key to cancel.
- A compact curved handle immediately right of each placed bubble rotates its profile arrangement by vertical drag in persisted 10-degree increments; the base arrangement and upright profile content remain unchanged.
- Company/team/colleague edits autosave to XLSX after a short debounce. Organization changes rebuild the live board model in place, preserving compatible layout state and avoiding a page refresh.
- The edit panel exposes the board title as a simple field. The generic empty value is `BoatTitle`.
- Bulk setup uses the XLSX plus `images/`; each colleague row references an image filename. The editor shows the image or an initials/color fallback.
- The editor and viewer both initially fit all placed bubbles inside the centered content square.

## Rendering And Geometry

- The logical square initially fits the viewport. Cursor-centered zoom ranges from .08x to 30x and unrestricted 1:1 drag pans at every zoom. Double-click has no camera action.
- Cached overview Canvas bitmaps switch to vector detail rendering when enlarged. Preserve this performance design unless profiling supports a change.
- Accepted layouts support 1-99 profiles using 84px profiles, a nominal 38px edge gap, mirror-balanced concentric rings, count-sensitive padding capped at 62px, and nondecreasing bubble radii.
- Special cases include 6 = center+5, 7 = center+6, 9 = inner 3+outer 6, 10 = inner 3+outer 7, 11 = 3+8, 12 = 3+9, 13 = 4+9, 25 = 4+8+13, 26 = 4+9+13, and 27 = 4+9+14. Counts 3-5 are expanded 10%; 23 and 24 use slightly tightened rings.
- Team bubbles use a 42px inward blue-gray edge fade, a faint tinted interior floor, and restrained brighter edges. Leadership links scale between 1.05px and 2.45px over the accepted overview-relative zoom range, are additionally reduced on touch layouts, and remain subdued supporting indicators.

## Responsive Presentation

- The viewer/editor are one shared application and interaction model with responsive presentations, not separate mobile/desktop implementations. Shared media-query definitions live in `project/responsive-layout.js`.
- Wide desktop starts above 900px. Compact layout is 900px and below; touch-specific refinements apply at 700px and below with a coarse pointer. Narrow desktop intentionally shares the compact popup focus/reanchoring rules used on mobile.
- Compact presentation places Search in the upper-right half and the team popup as a bottom sheet. Its focus point adapts to the Search-panel bottom and current team-sheet top. Indirect profile/team selection pans the target to that point; direct canvas selection pans only when required to keep newly opened UI visible.
- Compact initial fit is intentionally 7% more zoomed out than wide desktop so the arrangement does not crowd narrow viewport edges. Compact team focus precomputes profile-popup visibility correction into the first camera target, avoiding a second corrective pan or visible zigzag.
- Touch interaction supports two-finger pinch zoom and one-finger pan without browser-page zoom. Mobile viewport height is stabilized so the virtual keyboard does not relayout the board chrome.
- Touch buttons use pointer-down feedback that clears immediately on release/cancel. Mobile colleague rows and team buttons explicitly suppress retained hover/focus contours, leaving only the transient pressed fill. Narrow editor presentation preserves all three header controls and places the edit toggle below Search; opening it keeps the panel independently anchored to the page's right side with matching top/bottom margins.
- CSS uses shared panel, header-button, typography, and spacing tokens; responsive sections override only presentation differences.

## Color Themes

- The header control immediately beside Search toggles the shared color theme in viewer and editor. Dark remains the default for a fresh browser; the explicit choice persists locally under `boatboard:color-theme`.
- Dark mode retains the established deep blue-black presentation. In dark mode the theme control shows a thin sun; in light mode it shows the same shared geometric four-point star across wide desktop, narrow desktop, and mobile.
- `project/theme-controller.js` owns theme persistence, root state, accessible labels, and browser theme color. CSS owns DOM colors, while `canvasPalette()` in `app.js` owns theme-aware bubbles, links, profile borders, selections, marquee, and editor rotation handles. Theme changes rebuild cached team bitmaps and redraw immediately.
- Light mode now has a completed responsive palette pass: a clean near-white floor with a short restrained warm-gold edge fade, a dark ocean-blue title, matching subtly warm-white panel gradients, non-overlapping inset panel highlights, nearly colorless bubble interiors, subdued connections/selections, and gray press feedback. Description fields inherit their popup surface. Mobile uses a slightly whiter page/panel treatment and weaker selection/connection rendering than desktop.
- Mobile dark mode uses a deep neutral ocean blue-gray page with a short rounded-square inset frame, matching darker panel gradients, reduced bubble/connection strength, and touch press feedback. Wide/narrow desktop dark panels retain a slightly more vivid ocean tint while preserving the established dark presentation.

## Viewer Experience

- The read-only viewer initially fits every placed bubble within the centered viewport square and supports smooth free pan/zoom without triggering browser zoom.
- An opaque search panel lists only colleagues whose own team is currently placed on the board, alphabetically, with profile image, colleague name, and a subtle bottom-right team name. Placement changes update availability without a page refresh; unavailable rows are also removed from keyboard navigation. Filtering matches accent-insensitive colleague or team names and updates/collapses rows synchronously so fast typing never leaves a transient empty result area. Selecting a result smoothly focuses its profile while leaving Search open until explicitly closed.
- Profiles use a pointer cursor and open a persistent selected popup on click; automatic hover popups are disabled. Search selection also opens the popup and displays a subtle 4px selection ring.
- Opaque, non-click-through profile and team popups remain anchored to their respective profile/bubble corners while the board moves. Placement prefers space away from the board content, avoids the search panel and the other popup, and pans only when necessary to keep the new popup visible. Indirect selection through a search/member/team row repositions an existing popup when required instead of allowing overlap.
- Popup opening, replacement, and closing use short anchor-origin scale/opacity animations; outgoing and incoming popups can animate simultaneously with the incoming popup above the outgoing clone.
- The profile popup displays the avatar, a one- or two-line name, WhatsApp, Discord, and email values, a dynamically sized multiline description, and compact team rows. Compact/mobile avatars are deliberately enlarged. Contact rows have generous hit areas, copy their value, and show a two-second checkmark measured immediately after the rendered value (clamped over its end when necessary) and aligned to the actual value line. A real avatar opens a centered image viewer. Description fields start at four lines, grow to six lines, then scroll without a visible scrollbar.
- The colleague's own team is first and carries the `Equipe` label. Any additional teams they lead are derived from `board.json`, listed below with a 2px gap, and expand the content-sized popup naturally.
- Clicking a bubble or a profile-popup team row opens the team popup and selects the bubble. It contains a single-line title that ellipsizes before the close control, a two-column alphabetical member directory with the leader always last and tagged `Líder`, and a dynamically sized description below the list. Visible row counts and partial-row scroll hints adapt to the responsive presentation; clicking a member opens that colleague's popup. Narrow Search and popup dimensions are deliberately tuned separately for fine-pointer compact desktop and coarse-pointer mobile.

## Next Work

The standalone local MVP is ready for another technical-team review. Continue fine visual and usability work in the source project; the reserved future header control stays development-only until its real usage is decided. The current ignored local preview has been regenerated from the latest responsive camera, theme, popup, touch-feedback, and header-spacing source, and may be privately populated for owner-authorized presentation without changing the clean export rule. Basic manual team/colleague editing remains sufficient for this phase; image upload and description/contact authoring UI are intentionally deferred.

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
