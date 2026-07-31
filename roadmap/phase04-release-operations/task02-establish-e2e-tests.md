# Task 02 — Establish Deterministic End-to-End Tests

- Story points: 3
- Area: Integration
- Status: Planned
- Dependencies: Task 01

## Goal

Create repeatable browser-test infrastructure backed by isolated PostgreSQL
data and production-like frontend/backend builds.

## Acceptance Criteria

- Playwright is configured with a non-interactive `test:e2e` command, bounded
  retries/timeouts, trace-on-failure, and deterministic browser selection.
- E2E setup uses an explicitly configured isolated PostgreSQL instance that the
  developer has prepared to match `roadmap/schema-reference.sql`; it never
  applies schema changes or uses `DATABASE_URL` implicitly.
- Backend and frontend test servers use explicit test-only ports and
  configuration and are stopped after the suite.
- Tests create data through public APIs or scoped fixtures and clean up by
  deleting the isolated database directory, not shared application rows.
- Provider behavior is deterministic; no E2E test depends on live FX or
  currency network services.
- A smoke test proves signup, authenticated navigation, and artifact capture on
  failure.

## TDD Sequence

1. Add a failing Playwright smoke test and explicit isolated environment.
2. Add schema compatibility checks, service lifecycle, and deterministic
   provider fixtures.
3. Prove repeat execution leaves no processes, ports, or data behind.

## Verification

```powershell
npm.cmd --prefix frontend run test:e2e
```

Also run all backend and frontend test, lint, and build commands.
