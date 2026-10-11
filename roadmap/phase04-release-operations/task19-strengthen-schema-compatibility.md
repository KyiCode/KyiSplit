# Task 19 — Strengthen Schema Compatibility Checks

- Story points: 3
- Area: Backend
- Status: Done
- Dependencies: Task 17

## Goal

Detect schema drift in the database structures that protect application invariants.

## Scope

Read-only schema compatibility logic, an explicit CLI entry point, and backend tests.

## Acceptance Criteria

- Inspect required columns, data types or domains, nullability, keys, checks, foreign keys and delete behavior, and required trigger/function definitions using PostgreSQL metadata.
- Include money scale and positivity, participant/group references, expense total conservation, mandatory FX snapshots, and FX immutability.
- Require an explicit database target; never fall back to DATABASE_URL or apply schema-reference.sql.
- Return a nonzero result with safe actionable mismatch descriptions without logging connection strings or row data.
- Compare semantic properties rather than relying only on constraint or trigger names.
- Cover matching metadata, missing columns, wrong types, removed constraints, disabled or altered triggers, and changed function bodies using controlled metadata fixtures.
- Use metadata fixtures for completion of this task; live disposable-database verification remains part of existing Task 07.

## TDD Sequence

Write failing schema mismatch tests with controlled query results, implement read-only comparisons and CLI validation, then refactor.

## Verification

```powershell
npm.cmd --prefix backend test
```

## Completion

- Added a read-only `schema:check` CLI that requires an explicit PostgreSQL URL
  and never reads `DATABASE_URL` or applies the schema reference.
- The checker compares PostgreSQL catalog metadata with the reference for
  columns, types, nullability, keys, checks, indexes, foreign-key targets and
  delete behavior, trigger behavior, and trigger-function bodies. Comparisons
  use semantic definitions rather than constraint or trigger names.
- Reused the full check for isolated E2E database preparation and documented
  the explicit command in the root README.
- Added offline metadata fixtures for matching schema, missing columns,
  incorrect types/nullability, removed checks and keys, changed foreign-key
  behavior, disabled or altered triggers, changed function bodies, and CLI
  target validation.
- Verification passed: backend tests (221) and `git diff --check`. The CLI
  correctly exits nonzero without an explicit database target; live database
  verification remains in Task 07.

