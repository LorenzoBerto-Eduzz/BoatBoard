# BoatBoard Product Model

This note records the settled and implemented product behavior. Read it before changing the visual layout, organization model, or data boundary.

## Visual Map

- The page mixes very deep dark graphite gray, deep ocean blue, and near-black, with gray as the most apparent tone and a tiny overall light-blue cast to keep it alive. Its variation is a dim, restrained gradient frame: one thin cool gray-blue border with a moderately short soft inward color fade, visible without reading as a bright frame. Do not use visible corner spotlights, competing side patterns, or a bright center glow.
- The company title is a configurable value; its current value is `Eduzz`, in a larger normal modern UI sans-serif font. A larger, normal-case `Boat Board` subtitle in a similar clean companion font is directly below it and receives a tiny optical right adjustment so the visible glyphs begin on the same left line.
- Each team is a plain circular bubble defined by one dim, transparent blue-gray outline gradient with very little white that fades farther inward. Its fixed 28px fade is independent of bubble radius, and the outermost outline is part of the same gradient rather than a separate border. Keep the complete gradient, including that outer edge, restrained. Do not add an interior shine, highlight, or additional rings. Bubbles and lines are supporting indicators, so profile circles remain the focal point.
- Do not use drop shadows around bubbles or profile circles.
- Each colleague is represented by a circular profile image inside exactly one team bubble. Placeholder avatars may use an initial and color; their outline is thin and dark.
- Do not display team names, member counts, or colleague names in the initial map.
- The initial layout is calculated from the loaded organization data. It must keep team bubbles separated and profile circles evenly spaced within their own team bubble.
- After loading, the v1 map remains still. There is no ambient drifting, pulsing, or ongoing simulation.
- The arrangement test supports 1–99 profiles. Profiles form deterministic centered, mirror-balanced concentric polygon rings, with intentional special cases for visually sensitive counts. The accepted geometry uses 60px profiles, a 30px nominal gap, generous count-sensitive bubble padding, and nondecreasing bubble radii.
- Placeholder initials and soft-vivid colors are provisional. Reassess the palette after profile images are available so image and non-image profiles can be judged together.
- The stable logical square initially fits in the viewport. Users can smoothly zoom around the cursor, drag the content 1:1 at every zoom level (including the fully fitted view), pan without bounds, and double-click to reset the camera.

## Organization Rules

- A colleague has one team.
- A team has one leader.
- A leader can belong to a different team from the team they lead.
- The leader stays visible only in their own team bubble.
- A subtle stationary vector line connects the leader’s profile circle to the bubble of the team they lead. It must render smoothly and use a 2px stroke while remaining very dim, dark blue-gray, and less white than the bubble gradient’s brightest outer edge. It has no endpoint dots, and leader profiles receive no special outline or halo.

## Data And Privacy Boundary

BoatBoard is read-only. It must keep these layers separate:

```text
Private local data source
  → replaceable read-only adapter
  → stable organization model
  → visual layout and rendering
```

The exact local authoring format is intentionally undecided. Private colleague data, images, exports, and credentials must remain ignored by Git. When the product moves to company infrastructure, the local source can be replaced by a company-approved, secured internal integration without changing the organization model or visual layout.

## Explicitly Deferred

- Real directory data. The current visual demo uses authorized fictional placeholder data only.
- Choosing the local data format.
- Hover behavior, click behavior, information popups, search, and editing.
- A search control beneath the title block is planned for a future iteration only; do not implement it yet.
- The page remains a single non-scrolling Canvas whose internal bubble arrangement does not change with browser size or aspect ratio.
- Hosting, authentication, authorization, and the production data integration.
