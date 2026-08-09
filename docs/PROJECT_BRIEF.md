# Project Brief

## Identity And Purpose

- Name: BoatBoard
- Kind: local-first visual company directory and future reusable application
- Source: `project/`
- Stack: dependency-free HTML, CSS, JavaScript modules, Canvas, and Python local file server

BoatBoard helps colleagues discover the organization by representing teams as bubbles and people as profile circles.

## Current Scope

`index.html` is a read-only viewer. `editor.html` authors one private local instance, places and moves teams, assigns leaders, and swaps profile slots. The instance is stored as XLSX organization data, an images folder, and JSON visual state. No real company data is tracked in Git.

## Run And Validate

```powershell
python scripts/boatboard_server.py
node --check project/app.js
node --check project/data-editor.js
node --check project/data/board-state.js
node --check project/data/organization-source.js
node --check project/layout/profile-arrangements.js
python -m py_compile scripts/boatboard_server.py
git diff --check
```

Viewer: `http://127.0.0.1:4173/`. Editor: `http://127.0.0.1:4173/editor.html`.

## Constraints

- Keep private colleague records, images, credentials, and exports in ignored local-only paths.
- Preserve the replaceable data boundary between private source, organization model, and rendering.
- Do not introduce a framework, build system, release flow, or deployment without owner approval.
- Future hosting must be private, authenticated, and company-approved.
- Preserve the accepted visual geometry recorded in `docs/PRODUCT_MODEL.md` unless specifically changed.

## Current Priority

Finish the hosted/read-only viewer until it is final and presentable. Colleague search, focusing, selection, hover preview, and the profile information popup are implemented; team selection and the team information popup are next. Additional editor/import expansion follows later unless the owner redirects.

## Delivery

No delivery or release process exists. Versioning, packaging, hosting, and reusable GitHub releases remain owner-directed future work.
