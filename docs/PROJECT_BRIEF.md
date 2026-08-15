# Project Brief

## Identity And Purpose

- Name: BoatBoard
- Kind: local-first visual company directory and future reusable application
- Source: `project/`
- Stack: dependency-free HTML, CSS, JavaScript modules, Canvas, and Python local file server

BoatBoard helps colleagues discover the organization by representing teams as bubbles and people as profile circles.

## Current Scope

`index.html` is a read-only viewer with colleague search, smooth focus, hover preview, selection, and anchored colleague/team details. `editor.html` reuses the complete viewer and toggles local authoring for teams, colleagues, placement, arrangement rotation, leadership, and profile ordering. The instance is stored as XLSX organization data, an images folder, and JSON visual state. No real company data is tracked in Git.

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

Use the clean standalone local preview to build and present the MVP board, fixing presentation issues as they are found. After the technical-team review, decide private hosting, authentication, approved image storage, and the production data-ingestion adapter without rewriting the renderer or viewer.

## Delivery

`localrelease` creates an unversioned, ignored Windows preview for local MVP testing. It excludes the active private instance, bundles its Python runtime into `BoatBoard.exe`, selects an available localhost port, opens the browser automatically, and creates a clean instance on first launch. Installers, signing, hosting, versioning, and reusable GitHub Releases remain owner-directed future work.
