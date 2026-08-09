# BoatBoard

BoatBoard is a local-first visual company directory. Teams appear as bubbles and colleagues as profile circles. The eventual viewer is intended for private company hosting; real company data is not part of this repository.

## Current Application

The dependency-free application uses HTML, CSS, JavaScript modules, Canvas, and a small Python local file server. The read-only viewer supports smooth cursor-centered zoom and unrestricted drag-to-pan. A separate editor manages instance data, team placement, leadership connections, and profile ordering.

Run from the repository root:

```powershell
python scripts/boatboard_server.py
```

Open `http://127.0.0.1:4173/` for the viewer or `http://127.0.0.1:4173/editor.html` for local authoring.

## Data And Privacy

The tracked `project/instance_template/` seeds an ignored `project/private_instance/`. One instance contains `boatboard.xlsx`, an `images/` folder, and `board.json`. Keep private records and images out of Git.

Bulk setup uses the workbook plus images whose filenames match the colleague rows. The Board Data editor autosaves local changes and can validate/activate a replacement workbook.

## Repository Frame

```text
BoatBoard/
  project/        application source and reusable instance template
  asset_staging/  Git-safe raw/reference assets
  local_assets/   ignored machine-local material
  docs/           durable project and AI memory
  notes/          owner scratch space
  scripts/        local server and future repeatable automation
```

## AI Workflow

- `memcheck`: update durable project memory without committing.
- `gitcheck`: perform `memcheck`, review and validate changes, verify Git identity, commit, and push when a remote exists.

No delivery, release, or deployment process is established. Do not package, publish, or deploy without owner approval.
