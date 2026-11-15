# Task 23 — Fix Live PostgreSQL Schema Verification

- Story points: 5
- Area: Backend
- Status: Done
- Dependencies: Task 22

## Goal

Make the schema gate accept the reference schema on real PostgreSQL while still rejecting drift.

## Acceptance Criteria

- Reproduce the reference-schema rejection against an explicitly named disposable local database; retain captured catalog shapes as regression fixtures.
- Decode catalog column arrays correctly, including ordered compound keys and references. Avoid relying on TypeScript assertions to change runtime values.
- Handle PostgreSQL-added casts, rewritten BETWEEN expressions, and expression-index formatting without accepting changed operators, boundaries, key order, delete actions, or trigger semantics.
- Avoid deprecated concurrent queries on one pg Client; keep all inspection read-only and all errors free of connection strings and row data.
- The CLI accepts the reference schema and rejects representative constraint/index/trigger drift in a disposable copy. Restore or dispose only that explicitly owned fixture, never the local demo or Supabase database.

## TDD Sequence

Write failing fixtures from actual PostgreSQL catalog output and failing live compatibility cases; implement narrow normalization/decoding fixes, then refactor.

## Verification

```powershell
npm.cmd --prefix backend test
npm.cmd --prefix backend run build
```

Backend tests; schema:check against the explicit disposable reference database plus negative drift cases; initial E2E startup check. Never weaken or skip schema verification to get a green run.

## Completion

- Updated PostgreSQL 17 catalog rows in `backend/test/fixtures/postgres17-flyway-baseline-catalog.json` and retained regressions for catalog arrays, ordered keys, check normalization, expression indexes, trigger semantics, and sequential client queries.
- Backend tests passed: 257 tests across 27 files; backend build passed.
- `schema:check` accepted the reference schema on a named disposable PostgreSQL database and rejected separate disposable copies with constraint, index, and trigger drift.
- The packaged E2E smoke server reached `/health/ready` using an isolated copy of the E2E template; its run database was stopped and removed during shutdown.
- The dedicated Task 23 PostgreSQL cluster is stopped. Its generated ignored data directory remains because the environment blocked its recursive removal.
