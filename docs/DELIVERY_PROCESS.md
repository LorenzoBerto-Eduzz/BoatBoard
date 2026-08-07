# Delivery Process

This template deliberately does not define a build, package, export, deployment, or release command. Those processes depend on the real project stack and must not be guessed.

## Default Rule

Do not create generated delivery artifacts, zip files, installers, deployments, releases, or publish actions unless the owner explicitly asks and the project has a documented process.

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
