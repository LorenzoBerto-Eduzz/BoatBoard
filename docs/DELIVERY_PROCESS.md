# Delivery Process

BoatBoard defines one owner-authorized preview delivery command: `localrelease`. It creates a clean portable folder for local MVP testing. It is not an installer, hosted deployment, versioned product release, or GitHub Release.

## Local Preview (`localrelease`)

Run from the repository root:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\Export-LocalRelease.ps1
```

- Inputs: current `project/` source excluding `project/private_instance/`, `scripts/boatboard_server.py`, `requirements.txt`, `requirements-build.txt`, and tracked files under `release/`.
- Output: ignored `exports/BoatBoard-local/`; an existing folder at that exact path is replaced.
- Prerequisites: JavaScript syntax checks, Python compilation, `git diff --check`, and a successful isolated empty-instance test.
- Build bootstrap: when missing, the export script creates ignored `build/boatboard-packaging-venv/` and installs the pinned build requirements. A development machine needs Python 3.11+ and network access for this first bootstrap; `-PythonPath` can select a specific interpreter.
- Runtime: PyInstaller bundles Python, the server, and `openpyxl` into `BoatBoard.exe`; the exported preview requires no separate Python installation or terminal.
- Versioning: this preview is intentionally unversioned. Only the owner can authorize a future version or public release.
- Secrets/signing/publishing: none. The command does not upload, sign, zip, deploy, or publish anything.
- Privacy: the export must not contain `project/private_instance/`, credentials, real records, or real profile images.
- Verification: start the exported executable on an unused port, confirm viewer/editor/API HTTP 200 responses, confirm the created instance has zero teams/colleagues, confirm `/private_instance/` is inaccessible, exercise the stop control, and inspect the generated file list.
- Recovery: delete or regenerate only the ignored output folder. The command never modifies the active development instance.

The resulting folder can be copied elsewhere. On first launch, it creates its own `project/private_instance/` from the clean tracked seed. `BoatBoard.exe` opens the viewer, `BoatBoard Editor.cmd` opens the editor, and `Stop BoatBoard.cmd` stops the hidden local server.

## Default Rule

Do not create other generated artifacts, installers, deployments, or public releases unless the owner explicitly asks and the relevant process is documented first.

## When A Project Needs Delivery

Document these facts here before establishing a named command such as `localrelease`, `deploy`, or `publish`:

- the source inputs and generated output location;
- prerequisite commands and the validation/smoke tests to run first;
- versioning rules and who authorizes version changes;
- secrets, signing, publishing, or approval requirements;
- which artifacts are ignored, tracked, or uploaded;
- how to verify the delivered result and, if applicable, recover from failure.

Keep the process small, repeatable, and specific to the project. Add a repository script only when it reliably performs that documented workflow.

## Before Any Delivery

1. Inspect the intended source changes and Git state.
2. Run relevant validation for the project.
3. Confirm the requested target, version, and scope.
4. Confirm no private data, credentials, or unintended generated files will be included.
5. Report exactly what was created, uploaded, or deployed.
