# BoatBoard

BoatBoard is a local-first visual company directory prototype for Eduzz. It presents teams as bubbles and colleagues as profile circles within them. The first view calculates its layout on load and then remains still. The future goal is a privately hosted, secure internal site; real company data is not part of this repository.

## Layout

```text
BoatBoard/
  project/               actual code/product source by default
  asset_staging/         Git-safe raw/reference/transfer assets
  local_assets/          local-only ignored files
  docs/                  durable project, workflow, and AI memory
  notes/                 owner scratch and planning notes
  scripts/               optional repeatable repository automation
  .git-identity.example  copy into a project-specific .git-identity
  .githooks/             reusable email identity-guard hooks
  AGENTS.md              AI boot instructions
  README.md              repository overview
```

## Current Status

The local visual prototype is implemented with dependency-free HTML, CSS, JavaScript modules, and Canvas. Its arrangement test contains 99 fictional teams with 1 through 99 colleagues respectively. The stable square map initially fits the viewport, supports smooth cursor-centered zoom and unrestricted drag-to-pan, and includes static leadership links. There are no profile information interactions or real company records.

Run it from the repository root:

```powershell
python -m http.server 4173 --directory project
```

Then open `http://127.0.0.1:4173/` without a trailing backslash. The exact private local data authoring format remains intentionally undecided.

## AI Workflow

`AGENTS.md` is the required AI-session boot file. It points to the handoff, memory protocol, workflow rules, project brief, Git guidance, and delivery policy.

- `memcheck`: save distilled decisions, functionality, plans, constraints, commands, and pitfalls into durable docs only.
- `gitcheck`: perform `memcheck`, inspect and validate the intended work, verify Git identity, commit, and push unless the owner says not to.

AI should not commit, publish, package, export, release, deploy, or inspect local-only material unless explicitly asked.

## Local And Private Files

Use `asset_staging/` for raw/reference material that may be shared through Git but is not yet source code. Use `local_assets/`, `local_data/`, or `private_data/` for private or machine-local material that must stay ignored. Ask explicitly before having AI inspect local-only files.

## Delivery

No build, release, deployment, or hosting process is established. Any future hosting must be private and secure, and must use a company-approved solution.
