# Task 07 — Add Continuous Release Verification

- Story points: 5
- Area: Operations
- Status: Planned
- Dependencies: Tasks 04 and 06

## Goal

Reject unreproducible or incompatible changes before producing a release
artifact.

## Acceptance Criteria

- CI uses a pinned Node.js version and locked installs for backend and frontend.
- It runs backend tests, frontend tests, lint, production build, and the
  deterministic Chromium smoke suite.
- A schema compatibility command checks the structures and constraints the
  application relies on against an explicitly configured disposable database.
- The pipeline never falls back to an application database and does not expose
  secrets or test invitation links in logs or artifacts.
- A successful run produces one checksummed, versioned artifact from Task 04;
  failed checks cannot publish it.
- Dependency caching does not replace lockfile verification.

## Verification

- Validate the workflow syntax locally where tooling permits.
- Run the workflow on a branch and record a successful clean run.
- Introduce a temporary failing check and confirm artifact publication is
  skipped, then remove the temporary change.
