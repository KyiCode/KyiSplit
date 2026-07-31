# Task 06 — Constrain Expenses and Money Rows

- Story points: 5
- Area: Backend
- Status: Done
- Dependencies: Task 05

## Goal

Make PostgreSQL reject expense graphs that violate the Phase 01 money,
participant, group, or total invariants even when a write bypasses the
controller.

## Acceptance Criteria

- A read-only legacy preflight identifies malformed expense currency, invalid
  name or date data, excessive money precision, non-positive totals, zero or
  negative child amounts, orphan rows, duplicate participants, non-member
  participants, and unbalanced payer or split totals. It separately reports
  null legacy currency rows covered by the explicit group-currency policy.
- A legacy expense with null currency is backfilled to its group's default
  currency before the expense currency becomes non-null; no other invalid
  legacy value is guessed or silently repaired.
- Expense group, name, total, date, creation time, and currency are non-null and
  obey the Phase 01 format, length, positivity, and two-decimal rules.
- Payment and split amounts use an explicit two-decimal database type, are
  strictly positive because zero entries are not stored, and remain unique per
  expense and user.
- Database relationships guarantee that each payment or split user is a member
  of the expense's group; controller checks remain for useful early errors.
- Deleting an expense cannot leave payment or split orphans. Other delete
  behavior is explicit and consistent with the absence of member-removal and
  account-deletion features.
- At transaction commit, the database rejects an expense whose stored payments
  or splits do not each sum exactly to its total. The check supports the
  Phase 01 insert order within one transaction.
- Expense creation still validates and authorizes before connecting, uses one
  checked-out client, commits a complete valid graph, and rolls back every
  failed stage.
- Direct SQL integration tests fail first for every invariant, including a
  deferred total mismatch and a participant who belongs to another group.
- Empty and representative-legacy migration tests cover `up`, `down`, reapply,
  the null-currency policy, and preflight rejection without silently rounding
  or repairing invalid money.
- API success responses serialize expense money according to the shared
  two-decimal string contract.

## TDD Sequence

1. Add failing migration and direct-SQL tests for scalar constraints,
   cross-group participants, exact child totals, and cascade behavior.
2. Add the smallest reversible schema changes and controller/query updates that
   pass while preserving the Phase 01 transaction boundary.
3. Remove redundant database-shape assumptions from query helpers without
   weakening early API validation or error mapping.

## Verification

```powershell
npm.cmd --prefix backend test
```

With an isolated `TEST_DATABASE_URL`:

```powershell
npm.cmd --prefix backend run test:db
```

Confirm direct SQL cannot commit a partial, cross-group, or unbalanced expense
graph.

## Verification Result

- Backend verification passes 133 tests across 19 files.
- Database verification passes 10 integration tests against isolated embedded
  PostgreSQL.
- Migration `0004_expense_foundation` backfills only documented null currency,
  rejects invalid legacy money without rounding, and passes up, down, reapply,
  cascade, membership, scalar, and deferred-total coverage.
- Expense creation carries the group key through one transaction, while list
  responses serialize stored money as exactly two decimal places.
