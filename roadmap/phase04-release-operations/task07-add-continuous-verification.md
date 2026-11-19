# Task 07 — Add Continuous Release Verification

- Story points: 5
- Area: Operations
- Status: In progress
- Dependencies: Tasks 04, 06, and review follow-up Tasks 12–32

## Goal

Reject unreproducible or incompatible changes before producing a release
artifact.

Complete the 2026-10-14 local review follow-up Tasks 22–32 before resuming this
task. Reuse the Flyway migration set and safely diagnosable browser suite;
local success does not replace the remote workflow verification below.

Task 21 supplies the repository-only workflow and artifact gates. Reuse that
work here and complete the remaining disposable-database, browser, and remote
workflow verification. Task 21 completion alone does not complete this task.

## Acceptance Criteria

- CI uses a pinned Node.js version and locked installs for backend and frontend.
- It runs backend tests, frontend tests, lint, production build, and the
  deterministic Chromium smoke suite.
- CI applies all Flyway migrations to an explicitly configured empty,
  disposable PostgreSQL database, then validates the migration history.
- The pipeline never falls back to an application database and does not expose
  secrets or test invitation links in logs or artifacts.
- A successful run produces one checksummed, versioned artifact from Task 04;
  failed checks cannot publish it.
- Dependency caching does not replace lockfile verification.

## Verification

- Validate the workflow syntax locally where tooling permits and confirm the
  fresh-database migration job applies V1 and Flyway validation passes.
- Run the workflow on a branch and record a successful clean run.
- Introduce a temporary failing check and confirm artifact publication is
  skipped, then remove the temporary change.

## Implementation Record - 2026-11-19

- Extended `.github/workflows/verify.yml` to create a stopped, isolated
  PostgreSQL 16 data-directory template, apply and validate Flyway V1 against
  its dedicated database, install Chromium, and run the safe packaged browser
  journey before building and publishing the release artifact.
- Backend tests passed (287 tests); frontend tests passed (93 tests); frontend
  lint and build passed. Prettier parsed and accepted the workflow after its
  final step-context adjustment.
- A previous remote run succeeded on the prior workflow and another prior
  backend-test failure skipped the artifact steps. The modified workflow has
  not had a remote run, and a deliberate failing-check run has not been done.
  The local checkout has no E2E PostgreSQL template or initdb binaries, so the
  isolated browser suite could not be run locally. Task 07 remains in progress.
