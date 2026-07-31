# Task 07 — Persist Immutable Expense FX

- Story points: 5
- Area: Backend
- Status: Done
- Dependencies: Task 06

## Goal

Give every expense one immutable, validated source-to-group-currency FX
snapshot and make all later balance reads use that stored input instead of a
live provider.

## Acceptance Criteria

- The versioned schema stores exactly one FX snapshot per expense with source
  currency, target group currency, positive decimal rate, provider, provider
  effective time when available, and UTC capture time.
- The source currency equals the expense currency, the target currency equals
  the expense's group currency, and a same-currency snapshot has a rate of
  exactly one.
- A persisted snapshot's conversion fields cannot be updated. Deleting its
  parent expense may remove it according to the documented cascade policy.
- Expense creation reads the group's currency and obtains and validates any
  required provider rate before opening a transaction. Provider HTTP failure,
  malformed JSON, missing rate, non-finite rate, zero, or negative rate returns
  the shared FX-unavailable error and writes nothing.
- The expense, payments, splits, and FX snapshot are inserted through the same
  checked-out transaction. A failure at the FX insert rolls back the complete
  expense.
- Same-currency expense creation does not call the provider and persists rate
  one.
- A separate idempotent cutover command snapshots legacy cross-currency
  expenses. It does not run network access from SQL migration code, does not
  overwrite an existing snapshot, records one declared cutover time, and can
  resume safely after interruption.
- Legacy expenses whose null currency was backfilled to the group currency in
  Task 06 receive a rate-one snapshot. Ambiguous or unsupported rows stop with
  identifiers and no partial finalization.
- Provider tests use a deterministic fake; database upgrade tests never depend
  on internet access. Tests cover resume, duplicate protection, malformed
  provider data, same-currency behavior, and final non-null/uniqueness
  enforcement.
- Balance query code reads stored snapshots only. A missing snapshot is a
  tested data-integrity failure and never falls back to a live rate.
- The old per-balance Frankfurter conversion path is removed once the cutover
  is complete.

## TDD Sequence

1. Add failing service, transaction, direct-SQL, and legacy-cutover tests,
   including proof that a balance read performs no fetch.
2. Add the smallest reversible schema, provider adapter, expense transaction
   change, and resumable cutover command needed to pass.
3. Consolidate FX parsing and persistence without allowing a caller to mutate
   a stored snapshot or a migration to depend on the provider.

## Verification

```powershell
npm.cmd --prefix backend test
```

With an isolated `TEST_DATABASE_URL` and deterministic provider fixture:

```powershell
npm.cmd --prefix backend run test:db
```

Run the cutover twice against the representative legacy fixture and confirm the
second run changes no snapshot.

## Verification Result

- Backend verification passes 144 tests across 19 files.
- Database verification passes 11 integration tests against isolated embedded
  PostgreSQL.
- Staged migrations `0005` and `0006` support deterministic, resumable cutover
  before enforcing one immutable finalized snapshot per expense.
- Provider failure is mapped to `FX_UNAVAILABLE` before a transaction opens;
  same-currency writes use identity rate one without fetching.
- Balance conversion reads stored snapshots only and reports a safe
  `DATA_INTEGRITY_ERROR` when stored FX is incomplete.
