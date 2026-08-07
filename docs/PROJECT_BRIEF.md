# Project Brief

This file is the durable identity card for the project. It should be filled once the template becomes a real project, then kept current when the project's purpose, stack, commands, or priorities change.

## Identity

- Project name: `BoatBoard`
- Project kind: `local-first visual company directory prototype`
- Main project folder: `project/`
- Primary language/stack: `not chosen; implementation has not started`

## Purpose

BoatBoard will help colleagues discover the company structure and people beyond the small portion of the organization they already know. It visualizes the organization as a shared boat: teams are bubbles and colleagues are profile circles inside those bubbles.

## Audience Or Users

Initially, the owner locally. In the future, Eduzz colleagues through a privately hosted and company-approved internal service.

## Current Scope

Set up the project frame and agree the product model before development. The first implementation will be a local browser-only visual prototype. It must not contain real company data or provide interactions until those are explicitly requested.

## Run And Test Commands

```text
Run: unknown (no application exists yet)
Test: unknown (no application exists yet)
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
- Do not choose a framework, data source, hosting platform, or deployment flow without owner approval.
- Visual direction: dark charcoal gray with a restrained deep ocean blue-gray tint.
- The UI must adapt its layout as teams and team membership change.

## Current Priorities

- Begin application development only when the owner requests it.
- Establish the local run and validation commands when the stack is selected.
- Implement the initial empty visual canvas with the `BoatBoard - Eduzz` corner label.
- Later, agree on data entry/import, interaction details, and private hosting/security architecture.

## Glossary

- **Colleague:** one person, represented visually by a circular profile image.
- **Team bubble:** a translucent circle that contains the colleague circles of one team.
- **Leadership link:** a subtle stationary line from a colleague to the one team bubble they lead. The leader remains displayed only in their own team bubble.

## Known Pitfalls

- Each colleague belongs to exactly one team in the initial model.
- Each team has exactly one leader in the initial model; that leader may belong to another team.
- Clicks, popups, hover panels, search, editing, and data import are explicitly deferred.
- Do not add fictional or real sample data until the owner directs it.
