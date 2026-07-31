# Task 04 — Constrain Groups, Memberships, and Invites

- Story points: 5
- Area: Backend
- Status: Done
- Dependencies: Task 03

## Goal

Move the Phase 01 account, group, membership, and reusable-invitation invariants
into versioned PostgreSQL constraints, including the required SGD backfill for
existing groups.

## Acceptance Criteria

- A read-only data preflight identifies account emails, group names,
  membership display names, membership duplicates, invitation rows, or foreign
  keys that cannot satisfy the new constraints. It reports identifiers and
  stops before schema mutation.
- Stored account emails are non-empty normalized lowercase values with a
  database-enforced case-insensitive uniqueness invariant consistent with the
  Phase 01 API.
- Group names and membership display names are non-null and obey the same
  trimmed length limits as the API.
- Every group has a normalized three-letter `default_currency`. Existing groups
  are backfilled to `SGD` before the column becomes non-null.
- During this staged task only, the database supplies `SGD` when the unchanged
  Phase 01 group-creation path omits a currency. Task 05 removes that temporary
  default when the browser and API cut over together.
- Membership uniqueness and foreign keys are explicit, and delete behavior is
  documented rather than inherited from PostgreSQL defaults.
- Invitation group, creator, token, creation time, and expiration time are
  non-null; time values use timezone-aware storage, token uniqueness remains,
  and the schema does not model a reusable invite as consumed.
- The one-hour interval remains an application rule tested at the API boundary,
  while the database rejects an expiration that is not after creation.
- Direct SQL integration tests prove rejection of non-normalized identity data,
  invalid names or currencies, duplicate memberships, orphan memberships,
  malformed invitations, and invalid invitation chronology.
- Empty-database and representative-legacy migration tests cover `up`, `down`,
  and reapply, including the SGD backfill.
- Existing backend unit tests still pass without weakening Phase 01
  authorization or invite behavior.

## TDD Sequence

1. Extend the legacy fixture with valid rows and add failing direct-SQL tests
   for each required invariant and the SGD backfill.
2. Add the smallest preflight and reversible migrations that satisfy the tests.
3. Align queries with the constrained columns and remove obsolete invitation
   consumption assumptions without changing the browser contract.

## Verification

```powershell
npm.cmd --prefix backend test
```

With an isolated `TEST_DATABASE_URL`:

```powershell
npm.cmd --prefix backend run test:db
```

Inspect migration output to confirm the legacy fixture is backfilled before
`default_currency` becomes non-null.

## Verification Result

- Backend verification passes 125 tests across 19 files.
- Database verification passes 8 integration tests against isolated embedded
  PostgreSQL.
- Migration `0002_group_foundation` reports invalid legacy identifiers before
  mutation, backfills existing groups to SGD, and passes direct constraint,
  rollback, and reapply coverage.
- `db:preflight` exposes the same read-only legacy-data check before
  `db:migrate`; explicit `RESTRICT` foreign keys preserve the documented
  no-delete behavior.
