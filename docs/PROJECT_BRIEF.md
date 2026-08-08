# Project Brief

This file is the durable identity card for the project. It should be filled once the template becomes a real project, then kept current when the project's purpose, stack, commands, or priorities change.

## Identity

- Project name: `BoatBoard`
- Project kind: `local-first visual company directory prototype`
- Main project folder: `project/`
- Primary language/stack: `dependency-free HTML, CSS, JavaScript modules, and Canvas`

## Purpose

BoatBoard will help colleagues discover the company structure and people beyond the small portion of the organization they already know. It visualizes the organization as a shared boat: teams are bubbles and colleagues are profile circles inside those bubbles.

## Audience Or Users

Initially, the owner locally. In the future, Eduzz colleagues through a privately hosted and company-approved internal service.

## Current Scope

The local browser-only, read-only arrangement prototype is implemented. Its stress-test data renders 99 fictional teams with membership counts from 1 through 99 into a high-performance Canvas map. It includes deterministic concentric profile layouts, dynamically sized team bubbles, leadership links, smooth zoom, and unrestricted panning. It contains no real company data and has no profile hover, click, search, editing, or popup behavior.

## Run And Test Commands

```text
Run: python -m http.server 4173 --directory project
Open: http://127.0.0.1:4173/
Validate: node --check project/app.js
Validate data modules: node --check project/data/example-organization.js; node --check project/data/board-config.js
Validate layout module: node --check project/layout/profile-arrangements.js
Whitespace check: git diff --check
```

If commands are not known yet, write `unknown` and ask before assuming.

## Delivery Or Release Process

- Delivery command/policy: `none established; do not package, deploy, or publish`
- Versioning/release authority: `owner approval required`

Keep this brief summary current. Put detailed build, export, package, deployment, or publish instructions in `docs/DELIVERY_PROCESS.md` only after the project has a real process.

## Important Constraints

- The current prototype runs locally in a web browser.
- The future hosted product must be private, secure, and accessible only to authorized colleagues through a company-approved hosting/authentication approach.
- Never commit real colleague records, contact details, profile images, credentials, exports, or other private company material. Keep private local material in ignored paths.
- The prototype intentionally has no framework, package manager, dependencies, build system, or deployment system. Do not introduce one without owner approval.
- The settled visual direction is recorded precisely in `docs/PRODUCT_MODEL.md`; preserve it unless the owner requests a change.
- On load, the UI must dynamically calculate safe non-overlapping positions for team bubbles and for colleague circles within their own team bubble. It remains still after initial layout in v1.
- Keep data access modular: the visual layout reads a stable organization model from a replaceable, read-only source adapter. Do not bind it directly to a specific local file format or a future service.

## Current Priorities

- Decide the owner-only local data authoring format before data is added.
- Next, align with the owner on team-bubble arrangement and connection behavior.
- Later, add the planned search control below the title and profile information interactions when requested.
- Later, agree on private hosting, authentication, authorization, and data integration with the company’s technical team.

## Glossary

- **Colleague:** one person, represented visually by a circular profile image.
- **Team bubble:** a translucent circle that contains the colleague circles of one team.
- **Leadership link:** a subtle stationary line from a colleague to the one team bubble they lead. The leader remains displayed only in their own team bubble.
- **Data-source adapter:** the read-only boundary that provides an organization model to the visual map. It is replaceable so a local source can later become a secured internal integration.

## Known Pitfalls

- Each colleague belongs to exactly one team in the initial model.
- Each team has exactly one leader in the initial model; that leader may belong to another team.
- Profile clicks, popups, hover panels, search, editing, and data import are explicitly deferred. Camera zoom and pan are implemented.
- The current visual demo may use fictional placeholder data only. Do not add real company data until the owner explicitly directs it.
- The map has no ambient animation in v1; “dynamic” means layout calculation when data is loaded or changed between sessions.
- The exact private local authoring format and future company data source are not decided. Do not assume Excel, JSON, an HR system, or an API as the source of truth.
- Do not add labels for team names, team counts, or colleague names to the initial map. A search control beneath the title block is planned for a future iteration only.
- Browser caching can obscure CSS changes. `project/index.html` uses explicit asset query versions; advance them during visual iterations and use the exact URL without a trailing backslash.
