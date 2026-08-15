# Project Organization Direction

Keep files near the concept they own. Avoid broad moves without owner confirmation.

```text
BoatBoard/
  project/
    index.html                 read-only viewer shell
    editor.html                local editor shell
    app.js                     Canvas renderer, camera, editor gestures
    data-editor.js             Board Data authoring interface
    styles.css                 shared visual system
    layout/
      profile-arrangements.js  accepted profile geometry
    data/
      board-config.js          presentation configuration
      board-state.js           persisted visual-state boundary
      organization-source.js   organization loading adapter
      example-organization.js  public-safe fallback data
    instance_template/         tracked empty XLSX/JSON/images seed
  scripts/
    boatboard_server.py        local filesystem and API boundary
    Export-LocalRelease.ps1    reproducible standalone Windows preview build
  release/                     tracked launcher, stop control, and preview instructions
  exports/                     ignored generated standalone previews
  requirements.txt             local-server runtime dependency
  requirements-build.txt       pinned standalone packaging dependencies
  local_assets/                ignored development material
  docs/                        durable project and AI memory
```

The server creates and reads ignored `project/private_instance/`; that folder contains the complete active instance and must not be committed. A generated export creates its own independent instance under its copied `project/private_instance/`.

Preserve the separation among instance storage, organization loading, board state, profile geometry, rendering, and authoring UI. A future secured data integration should replace the local source boundary without rewriting layout or rendering.

Add feature/domain folders only when a real subsystem needs them. Do not create speculative abstractions, broad shared folders, or framework structure before the project requires them.
