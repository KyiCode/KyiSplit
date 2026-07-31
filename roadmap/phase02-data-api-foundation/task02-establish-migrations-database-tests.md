# Task 02 — Establish Migrations and Database Tests

- Story points: 5
- Area: Backend
- Status: Done
- Dependencies: Task 01

## Goal

Create a versioned, transactional migration system that can build an empty
database, safely adopt a matching Phase 01 Supabase schema, roll back
development migrations, and run in isolated PostgreSQL integration tests.

## Acceptance Criteria

- Locked backend scripts provide migration `up`, `down`, and `status`
  operations. Application startup never runs them implicitly.
- Each migration has an ordered immutable version, a recorded checksum, an
  explicit reverse operation, and one transaction boundary unless a documented
  PostgreSQL operation cannot be transactional.
- The runner serializes concurrent attempts and leaves neither a partially
  applied version nor an incorrect history row after failure.
- The executable baseline creates the Phase 01 tables, keys, indexes, defaults,
  and extensions from an empty database without executing
  `roadmap/schema-reference.sql`.
- A read-only legacy preflight compares the real schema with the expected
  Phase 01 shape and reports missing, extra, or incompatible objects before
  adoption.
- Baseline adoption records the baseline as applied only after preflight
  succeeds. It does not use broad `IF NOT EXISTS` behavior that could hide
  drift.
- An adopted legacy baseline is distinguishable from a baseline created by the
  runner. Rollback may reverse Phase 02 migrations to that baseline but refuses
  to drop adopted legacy tables; full baseline `down` is exercised only on a
  disposable database created by the runner.
- Migration history distinguishes an unapplied version, an applied version
  with the expected checksum, and an edited applied version. Checksum drift is
  a hard failure.
- Database tests provision an isolated embedded native PostgreSQL instance
  under the system temporary directory, never read `DATABASE_URL`, and remove
  the instance after the run.
- Integration tests cover empty `up → down → up`, matching legacy adoption,
  mismatched legacy rejection, failed-migration rollback, checksum drift, and
  concurrent-run serialization.
- Backend setup documentation explains local migration, legacy adoption,
  rollback, status, and database-test commands without including a credential.

## TDD Sequence

1. Add failing integration tests for an empty target, a representative Phase 01
   fixture, schema mismatch, rollback, checksum drift, and runner locking.
2. Add the smallest migration runner, executable baseline, history table, and
   scripts needed to pass.
3. Refactor fixture and connection setup so later migration tasks can extend
   both empty and legacy upgrade tests without sharing mutable state.

## Verification

```powershell
npm.cmd --prefix backend test
```

```powershell
npm.cmd --prefix backend run test:db
```

Inspect migration status after the final reapply and confirm only expected
versions and checksums are present.

## Verification Result

- Backend verification passes 122 tests across 17 files.
- The embedded PostgreSQL suite passes six integration tests covering empty
  apply/rollback/reapply, legacy adoption, mismatch rejection, failed migration
  rollback, checksum drift, and concurrent-run serialization.
- Migration scripts, baseline adoption, status, rollback, and local database
  testing are documented in the repository README.
