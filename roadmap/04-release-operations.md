# Phase 04 — Release Operations

## Objective

Package, document, verify, and deploy KyiSplit as a recoverable same-origin
application suitable for a private group of real users.

## Production Artifact

- Add a multi-stage production build:
  - Install and test backend/frontend dependencies in build stages.
  - Build the Vite frontend.
  - Compile or run the backend with production-only runtime dependencies.
  - Copy frontend assets into the final application image.
- Serve `/api` through Express and serve the compiled frontend for all other
  routes, including a browser-router fallback.
- Run behind one HTTPS public origin. Trust the proxy only in production and
  preserve secure cookie behavior.
- Add `GET /api/health` for process health and `GET /api/ready` for a bounded
  database readiness check.
- Handle termination signals by stopping new requests, closing the HTTP server,
  and ending the PostgreSQL pool.
- Run migrations as an explicit pre-deployment step, never concurrently from
  every application replica.

## CI and Verification

- Add CI jobs for:
  - Backend typecheck and unit tests.
  - Frontend lint, component tests, and production build.
  - Applying all migrations to an empty disposable PostgreSQL instance.
  - Backend integration tests.
  - Production-image build.
- Run Playwright or equivalent end-to-end smoke tests against the built
  same-origin application.
- Block release when any required job fails.
- Add a dependency audit step, triage findings, and document accepted risks
  rather than applying unsafe automatic major upgrades.

## Observability and Recovery

- Produce structured server logs with request ID, method, route template, status,
  duration, and safe error code.
- Redact authorization headers, cookies, passwords, JWTs, invite tokens,
  database URLs, and raw request bodies.
- Log upstream currency-provider failures distinctly from database and
  application failures.
- Document Supabase backup availability and perform a restore rehearsal into a
  disposable database before release.
- Document forward-fix and rollback procedures for application releases and
  database migrations.
- Document JWT secret rotation, cookie invalidation implications, and invite
  token exposure response.

## Project Documentation

- Replace the template root README with:
  - Product overview and screenshots or concise workflow description.
  - Architecture and same-origin deployment model.
  - Prerequisites and local startup.
  - Environment-variable reference with no secret values.
  - Migration, test, build, and production-run commands.
  - Supabase backup/restore and release process.
  - Known limitations for the private release.
- Keep this roadmap linked from the root README.

## Release Gate

- Create a production-like environment using a copy or empty disposable
  database, never production data on developer machines.
- Run the complete acceptance checklist.
- Deploy the same immutable artifact that passed CI.
- Verify HTTPS, cookies, database connectivity, invitation URLs, historical
  exchange rates, balances, and repayment recording after deployment.
- Record release version, migration version, deployment time, and rollback
  artifact.

## Exit Criteria

- One documented command or deployment pipeline builds the production artifact.
- The frontend and API work from one HTTPS origin.
- CI and end-to-end smoke tests pass against the production artifact.
- Backup restore and rollback procedures have been rehearsed.
- Every item in `acceptance-checklist.md` is complete.
