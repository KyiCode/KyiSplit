# Task 21 — Add Repository CI Gates

- Story points: 5
- Area: Operations
- Status: Done
- Dependencies: Tasks 12–20 and existing Task 04

## Goal

Continuously verify repository checks and produce a checksummed artifact after they pass.

## Scope

CI workflow, artifact checksum tooling, and local verification documentation. This is the repository-only portion of existing Task 07.

## Acceptance Criteria

- Pin the Node.js 22 version used by CI and install both dependency trees with npm ci.
- Run backend tests, frontend tests, lint, and production build before assembling the release artifact.
- Use the commit identifier as the release version and generate a checksum for the final archive containing production dependencies.
- Publish the artifact only from a successful verification job; avoid exposing credentials or unsafe browser diagnostics.
- Use read-only workflow permissions except the minimum required for artifact upload; do not add deployments, secrets, branch protection changes, or account configuration.
- Cache dependency downloads without bypassing locked installs.
- Provide local verification for workflow syntax where tooling is available, equivalent check commands, archive contents/checksum, and success-only publication dependencies.
- Do not mark existing Task 07 complete: its disposable database, Chromium smoke, and remote workflow success/failure evidence remain outside this follow-up.

## Verification

```powershell
npm.cmd --prefix backend test
npm.cmd --prefix frontend test
npm.cmd --prefix frontend run lint
npm.cmd --prefix frontend run build
```

Build the artifact locally with a nonsecret explicit RELEASE_VERSION and verify its checksum. Record local evidence only; remote workflow execution is not a completion requirement for this task.

## Completion

- Added `.github/workflows/verify.yml` on pinned Node.js 22.23.3 with
  read-only repository permissions, npm download caching, and locked installs
  for both package trees. Backend tests, frontend tests, lint, and production
  artifact building complete before the success-only upload step.
- The workflow versions the release with the commit SHA, creates a gzip archive
  containing production dependencies, computes a SHA-256 sidecar, and uploads
  only the archive and checksum. Playwright output and local E2E configuration
  are explicit upload exclusions.
- Added cross-platform archive and checksum tooling plus local reproduction,
  integrity, contents, and workflow syntax instructions in the root README.
- Local verification passed: both `npm ci` installs (zero audit findings),
  backend tests (221), frontend tests (69), frontend lint and build, artifact
  assembly (101 production packages; zero audit findings), archive contents,
  and SHA-256 verification (`be388fc7373e471704d56ab147cc64f270213f197be2301b874e9efc2ca6ae13`).
- Workflow YAML passed `npx.cmd --yes prettier@3.6.2 --check
  .github/workflows/verify.yml`. No remote workflow run was attempted. Task 07
  remains incomplete pending its separate disposable-database, Chromium, and
  remote workflow evidence.

