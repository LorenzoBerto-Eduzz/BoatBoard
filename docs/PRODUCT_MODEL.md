# BoatBoard Product Model

Read this before changing visual layout, organization rules, or the data boundary.

## Visual Map

- Use a deep graphite/ocean/near-black background with a restrained cool frame. Avoid bright center glows, spotlights, shine, extra rings, and drop shadows.
- Show the configured company name and `Boat Board` subtitle at top left.
- Team bubbles are plain circles with one restrained transparent blue-gray radial edge treatment, a 42px inward fade, and a very faint tinted interior floor.
- Profiles are the focal point. The initial map does not show team names, counts, or colleague names.
- The map remains still after loading; there is no ambient animation.
- The stable logical square initially fits the viewport. Zoom is smooth and cursor-centered; panning is unrestricted and 1:1; double-click has no camera action.
- Layouts support 1-99 profiles with deterministic centered, mirror-balanced concentric rings, 84px profiles, a nominal 38px edge gap, count-sensitive padding capped at 62px, and nondecreasing bubble radii.
- Special layouts include 6 = center+5, 7 = center+6, 9 = inner 3+outer 6, 10 = inner 3+outer 7, 11 = 3+8, 12 = 3+9, 13 = 4+9, 25 = 4+8+13, 26 = 4+9+13, and 27 = 4+9+14. Counts 3-5 are expanded 10%; counts 23-24 use slightly tighter rings.
- Placeholder initials and soft-vivid colors remain provisional until assessed alongside real profile images.

## Organization Rules

- A colleague belongs to exactly one team.
- A team has at most one leader; a colleague may lead multiple teams.
- A leader may belong to another team and stays visible only inside their own team bubble.
- A stationary 3px dark blue-gray line connects the leader profile outline to the led bubble outline along the shortest path. Connected and in-progress lines share the same style and have no dots, halos, or leader outline.

## Data And Privacy

The hosted viewer is read-only. The local editor writes one contained private instance through this boundary:

```text
Private instance (XLSX, images, board.json)
  -> replaceable adapter
  -> stable organization model
  -> layout and rendering
```

The tracked `project/instance_template/` is empty and seeds ignored `project/private_instance/` on first launch. XLSX owns organization records, `images/` owns referenced files, and `board.json` owns visual state. Stable IDs preserve compatible layout during workbook replacement. Never commit private instance content.

## Local Editor

- `editor.html` is the full viewer plus a top-right pencil control. Entering authoring mode closes viewer UI, opens the edit panel, and reveals editing affordances; closing it returns to viewer behavior without refreshing.
- The edit panel lists unplaced teams first, then placed teams, alphabetically within each group. Collapsed team labels are draggable; expanded rows expose name and colleague controls.
- Drag a listed team to place it; drag a bubble to move it; drag into the panel or right-click to unplace it.
- Drag a profile onto another team to assign leadership. Right-click a leader profile to clear its assignments.
- Right-click a non-leader to begin same-team slot swapping; hover previews, click commits, and any key cancels.
- Drag the compact curved handle right of a bubble vertically to rotate its profile arrangement in 10-degree increments. Rotation is stored per team in `board.json`; profile images and initials stay upright.
- Organization edits autosave to XLSX and rebuild the live board without a page refresh. The panel supports adding/removing teams and colleagues, importing a validated workbook, and opening the instance folder.
- Bulk organization setup uses the workbook plus images referenced by filename.

## Read-Only Viewer

- Search lists colleagues alphabetically and matches both colleague and team names. Results show profile, colleague name, and a subtle bottom-right team label.
- Profile hover previews open after 0.4 seconds; clicking a preview promotes it seamlessly to a persistent selection with a 4px ring.
- Anchored profile and team popups block input from reaching the board, avoid each other and the search panel, remain attached while the board moves, and use short anchor-origin transitions. Escape closes the most recently opened UI layer.
- The profile popup shows avatar, name, WhatsApp, Discord, email, a dynamically sized description, the colleague's own team, and any other teams they lead.
- The team popup shows a wrapped team title, two-column alphabetical member directory, isolated leader row/tag, and dynamically sized description. Clicking a member opens that colleague.

## Next And Deferred

Next: build and present a clean local MVP instance, then refine issues found during realistic use.

Deferred: image/description onboarding UI, real directory data, versioned public releases, private hosting, authentication/authorization, forms/HR integrations, and hosted multi-user editing.
