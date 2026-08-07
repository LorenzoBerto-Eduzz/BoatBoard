# BoatBoard

BoatBoard is a local-first visual company directory prototype for Eduzz. It presents teams as gently animated bubbles and colleagues as profile circles within them. The future goal is a privately hosted, secure internal site; real company data is not part of this repository.

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

The project frame and Git identity guard are configured. The application has not begun yet: no UI, data, dependencies, framework, build system, or hosting service has been chosen or added.

The agreed first product slice is a local browser page with an initially empty visual canvas and a corner label, `BoatBoard - Eduzz`. Implementation begins only after the owner requests it.

## AI Workflow

`AGENTS.md` is the required AI-session boot file. It points to the handoff, memory protocol, workflow rules, project brief, Git guidance, and delivery policy.

- `memcheck`: save distilled decisions, functionality, plans, constraints, commands, and pitfalls into durable docs only.
- `gitcheck`: perform `memcheck`, inspect and validate the intended work, verify Git identity, commit, and push unless the owner says not to.

AI should not commit, publish, package, export, release, deploy, or inspect local-only material unless explicitly asked.

## Local And Private Files

Use `asset_staging/` for raw/reference material that may be shared through Git but is not yet source code. Use `local_assets/`, `local_data/`, or `private_data/` for private or machine-local material that must stay ignored. Ask explicitly before having AI inspect local-only files.

## Delivery

No build, release, deployment, or hosting process is established. Any future hosting must be private and secure, and must use a company-approved solution.
