# AI Handoff

This is the portable continuity note for AI coding sessions working on this repository. Keep it a concise current snapshot, not a diary or changelog.

## Current State

- Project name: `BoatBoard`.
- Project kind: `local-first visual company directory prototype`.
- Main project folder: `project/`.
- Primary language/stack: `not chosen; no application exists yet`.
- Run command: `unknown`.
- Test command: `unknown`.
- Delivery status/command: `none established; no deployment or package authorized`.
- Remote: `none configured`.
- The repository is an AI-ready project frame: source in the main project folder, durable project memory in `docs/`, owner scratch notes in `notes/`, Git-safe raw/reference assets in `asset_staging/`, and local-only material in ignored folders.
- `AGENTS.md` is the AI boot file. `docs/AI_MEMORY_PROTOCOL.md` defines memory recovery. `docs/WORKFLOW_AND_STYLE.md` defines collaboration and coding expectations.
- `docs/PROJECT_BRIEF.md` holds the real project identity and constraints. `docs/PROJECT_ORGANIZATION.md` records structure direction. `docs/DELIVERY_PROCESS.md` remains neutral until a real delivery process is agreed.
- `.git-identity` and `.githooks/` can enforce one allowed contributor email after setup. The template ships `.git-identity.example`, not a project identity.

## User Intent

The user wants a project that can continue across machines, AI chats, models, and tools without losing important context. The repository is the source of truth after a `git pull`.

The owner is preparing a local browser prototype of BoatBoard for Eduzz. The long-term goal is a private, secure, company-internal directory; no hosting implementation is in scope now. BoatBoard visualizes teams as dynamic bubbles and colleagues as circular profile images within their one assigned team.

The visual style is a dark charcoal-gray field with a quiet deep blue-gray/ocean tint. Team bubbles are translucent and subtly shiny with a pale inner contour. Colleague circles should arrange and move softly like a molecule, dynamically responding to team size. The page title will read `BoatBoard - Eduzz` in a corner.

Leadership is represented by exactly one subtle, stationary link per team. A leader remains in their own team bubble and connects by line to the different team bubble they lead. No interactions, popup, hover panel, search, editing, importing, fictional sample data, or real company data has been authorized yet.

## Working Procedure For Future AI Sessions

1. Read root `AGENTS.md` first.
2. Read this handoff, the memory protocol, workflow/style rules, and the project brief.
3. Read focused task docs and inspect actual source files before editing.
4. If placeholders remain or setup is changing, read `docs/TEMPLATE_SETUP.md` and `docs/NEW_PROJECT_CHECKLIST.md`.
5. Before Git/copy/identity work, read `docs/COPYING_AND_GIT.md`.
6. Before any package, export, release, publish, or deployment, read `docs/DELIVERY_PROCESS.md`.
7. Check Git status and recent history when Git exists; never overwrite user work.
8. If chat memory conflicts with repo files, trust repo files. If intent is still unclear, ask before editing.

## Suggested Near-Term Next Steps

- Wait for the owner to explicitly authorize first application development.
- Agree the stack, local run command, and validation path before adding dependencies or source files.
- Agree whether the first visual screen is empty or receives data only when the owner supplies an approved anonymized/real source.
- Document a hosting and security approach only when private deployment is actually being planned.

## Durable Decisions

- The repo, not chat memory, is the source of truth.
- `memcheck` updates durable memory docs only.
- `gitcheck` performs `memcheck`, validates the intended work, then commits and pushes only when explicitly requested.
- Keep source, durable docs, owner notes, raw/reference staging, and local private material separate.
- Add a project-specific delivery command only after its process is documented and the owner requests it.
