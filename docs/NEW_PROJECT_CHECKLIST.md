# New Project Checklist

Use this checklist when adapting the template into a real project. It is stack-neutral on purpose; add only the project-specific details that are known.

## 1. Identity And Scope

- [ ] Rename the outer project folder.
- [ ] Replace `{{PROJECT_NAME}}`, `{{PROJECT_KIND}}`, and the other template placeholders.
- [ ] Decide whether the source folder remains `project/`.
- [ ] Fill `docs/PROJECT_BRIEF.md` with the purpose, users, current scope, priorities, and non-negotiable constraints.
- [ ] Record meaningful project vocabulary in the brief glossary.

## 2. Source And Tooling

- [ ] Inspect the real source, package manifests, and configuration files before declaring the stack.
- [ ] Record real run, test, lint, format, build, and development commands. Write `unknown` where a command is not yet established.
- [ ] Update `.gitignore`, `.gitattributes`, and `.editorconfig` only for the chosen stack and generated outputs.
- [ ] Keep source, tests, assets, integrations, configuration, and temporary diagnostics organized by responsibility.

## 3. Data, Secrets, And External Services

- [ ] Identify credentials, private data, exports, generated files, and machine-local configuration that must remain out of Git.
- [ ] Add safe examples such as `.env.example` only when they help setup.
- [ ] Document important services, file formats, APIs, and deployment dependencies in focused docs when they become real.

## 4. Continuity And Collaboration

- [ ] Replace the template snapshot in `docs/AI_HANDOFF.md` with real current state.
- [ ] Update `docs/PROJECT_ORGANIZATION.md` to reflect the actual codebase once an organization direction exists.
- [ ] Keep `notes/` owner-controlled; do not convert scratch notes into AI instructions.
- [ ] Use `memcheck` to save settled decisions instead of relying on chat history.

## 5. Git And Remote

- [ ] Do not copy `.git/` from the template.
- [ ] Ask the owner for the desired Git `user.name` and one `user.email` verified/associated with the intended GitHub account; do not guess them.
- [ ] Copy `.git-identity.example` to `.git-identity` and set the one permitted contributor email.
- [ ] Immediately after Git is initialized, set clone-local `git config user.name`, set clone-local `git config user.email` to the allowed email, and run `git config core.hooksPath .githooks`.
- [ ] Verify `git config user.name`, `git config user.email`, `.git-identity`, and `git config core.hooksPath` before the first project work is checkpointed.
- [ ] Initialize Git only in the real copied project.
- [ ] Create/configure the remote only when the owner is ready.
- [ ] Make the first focused commit only when explicitly requested.

## 6. Delivery And Verification

- [ ] Define the smallest useful smoke test before broad implementation.
- [ ] Document the real validation commands in `docs/PROJECT_BRIEF.md`.
- [ ] Decide whether the project has a build, export, package, deploy, or release process.
- [ ] If it does, document it in `docs/DELIVERY_PROCESS.md` before using a named delivery command.
- [ ] Keep generated delivery artifacts out of Git unless the project intentionally tracks them.
