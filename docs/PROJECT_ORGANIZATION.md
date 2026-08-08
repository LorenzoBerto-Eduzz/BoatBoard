# Project Organization Direction

This note captures the broad folder organization direction for when the project grows beyond the first few prototype files. Use it before moving folders, adding new major systems, or deciding where a new set of source files/assets should live.

## Core Rule

Keep files near the concept they belong to.

```text
Feature-specific files live with the feature.
Domain-specific files live with the domain concept.
Interface-specific files live with the interface.
Integration-specific files live with the integration.
Shared foundations live in shared/common folders.
```

The goal is to avoid huge folders full of unrelated files and to make deletion/replacement easy later.

## Project Frame

The root of the repo is the project frame:

```text
BoatBoard/
  project/
  asset_staging/
  local_assets/
  docs/
  notes/
  scripts/
```

The actual product/source project lives in `project/` by default. The rest of the folders are there to help humans and AI collaborate safely.

`asset_staging/` is for raw/reference files that are okay to sync through Git. `local_assets/` is for private or machine-local files that should stay ignored unless the user explicitly asks AI to inspect them.

`scripts/` is for small, repeatable repository automation such as setup, validation, export, or delivery helpers. Add a script only after its inputs, outputs, and owner authorization are clear; document delivery scripts in `docs/DELIVERY_PROCESS.md`.

If `project/` is renamed during setup, update this document and every root-level doc that mentions the main project folder.

## Feature Or Domain Packs

When a project grows, consider grouping files by feature or domain concept instead of by file type only.

Example:

```text
project/
  src/
    features/
      accounts/
        account_model.*
        account_service.*
        account_view.*
        account_tests.*
      billing/
      notifications/
    shared/
      config.*
      logging.*
```

For a game or simulation, the same idea might be entity/system/interface packs. For a website or platform, it might be routes/features/components/services. For a library, it might be modules/packages/adapters.

Use the local stack's conventions when they are strong. This doc is a direction, not permission to fight the framework.

After the real project kind is known, replace this section's examples with conventions that fit that project.

## Interfaces

Interfaces are user-facing or developer-facing ways to see or manipulate the system. This includes UI, CLI commands, debug panels, admin tools, previews, and tuning tools.

Keep temporary/debug interfaces separate from core product logic whenever practical, so they can be removed cleanly.

## Integrations

External services, files, APIs, databases, SDKs, and platform-specific glue should have clear boundaries.

Example:

```text
project/
  src/
    integrations/
      stripe/
      github/
      local_files/
```

This makes it easier to swap or remove an integration later.

## Shared Foundations

Shared files are for foundations genuinely used by many features, domains, or interfaces.

Examples:

```text
project/
  src/
    shared/
      config/
      logging/
      errors/
      test_helpers/
```

Use shared folders only when the file really is shared. Do not put feature-specific files in a broad shared folder just because it is convenient at first.

## Current Project Status

BoatBoard is implemented as a small dependency-free browser prototype in `project/`:

```text
project/
  index.html
  styles.css
  app.js
  layout/
    profile-arrangements.js
  data/
    board-config.js
    example-organization.js
```

`index.html` owns the page shell, `styles.css` owns the visual system, `app.js` owns Canvas rendering and camera interaction, `layout/profile-arrangements.js` owns reusable profile geometry, `board-config.js` owns replaceable presentation configuration, and `example-organization.js` contains fictional stress-test data. Preserve this separation. When private local data is introduced, keep it ignored and route it through a replaceable read-only data-source boundary. A future company-approved API, database, or directory integration must replace only that boundary, not the visual map. Do not add a framework, hosting-specific structure, or production integration until approved.

If a system becomes complex, create a focused doc under `docs/` only when it fits the project. Examples might include `DEPLOYMENT_MODEL.md`, `DATA_MODEL.md`, `RELEASE_MODEL.md`, `PLUGIN_MODEL.md`, `GAME_MECHANICS.md`, or another project-specific name. Do not create theoretical docs just because the template lists examples.

Do not perform broad reorganizations casually. If a folder move will change many imports, paths, generated files, or user understanding, confirm first and do it as one focused structural change.
