# Task 03 — Make Core Writes Atomic

- Story points: 5
- Area: Backend
- Status: Done
- Dependencies: Task 02

## Goal

Guarantee that group and expense creation either persist all related rows or
persist none, using one checked-out PostgreSQL client per transaction.

## Acceptance Criteria

- Group creation checks out one pool client and uses that client for `BEGIN`,
  the group insert, the creator-membership insert, and `COMMIT`.
- Expense creation checks out one pool client and uses that client for `BEGIN`,
  the expense insert, all payer inserts, all split inserts, and `COMMIT`.
- Any error after `BEGIN` attempts `ROLLBACK`, returns a stable server error,
  and never reports success.
- The checked-out client is released exactly once after commit or rollback.
- Validation and authorization finish before a transaction is opened.
- Transaction tests assert query ordering and prove that a failure at each
  multi-write stage triggers rollback, omits commit, releases the client, and
  prevents later writes.
- No controller starts a transaction through `Pool.query`.
- Successful group creation returns the new group identifier needed by the
  current frontend without an additional lookup.

## TDD Sequence

1. Replace pool-only mocks with a pool/client boundary and add failing success,
   rollback, query-order, and release tests.
2. Implement minimal transaction helpers or controller-local transaction
   handling on a checked-out client.
3. Refactor shared transaction cleanup only if both creation paths remain clear
   and fully covered.

## Verification

```powershell
npm.cmd --prefix backend test
```

Review the tested query sequence for both commit and rollback paths.
