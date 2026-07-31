# Task 08 — Persist Repayments

- Story points: 5
- Area: Backend
- Status: Done
- Dependencies: Task 07

## Goal

Persist validated repayments in the group's default currency and expose the
authorized list, create, and delete contracts needed by the Phase 03 browser.

## Acceptance Criteria

- A versioned `repayments` model stores an ID, group, paying member, receiving
  member, positive two-decimal amount, repayment date, recording member, and
  UTC creation time.
- Repayments are denominated only in the group's default currency; callers do
  not supply an independent FX rate or silently convert them.
- The payer and receiver are distinct current members of the same group, and
  the recording user is a current group member. Database constraints enforce
  the relationships in addition to API authorization.
- Any current group member may list, create, or delete a repayment in that
  group, consistent with the release authorization decision. A non-member is
  denied before repayment existence or contents are disclosed.
- Create rejects missing fields, malformed IDs or dates, same-member transfers,
  non-members, zero, negative, non-finite, or over-precision money before a
  write.
- Create returns the stored repayment using the shared money, currency, date,
  timestamp, and ID contract. List ordering is stable by repayment date,
  creation time, then ID.
- Delete is scoped by both group and repayment ID, returns the shared missing
  or success contract, and cannot delete a repayment from another group.
- There is no update endpoint in this phase; correction is an authorized
  delete followed by a create. Settlement suggestions remain derived and are
  not stored as repayments automatically.
- Controller and route tests fail first for success, validation, authorization,
  cross-group lookup, stable ordering, and deletion.
- Direct SQL integration tests reject invalid amounts, identical participants,
  and non-member relationships. Empty and legacy migration tests cover `up`,
  `down`, and reapply.
- No repayment browser screen is added.

## TDD Sequence

1. Add failing migration, route, controller, authorization, ordering, and
   two-decimal serialization tests.
2. Add the smallest schema, queries, routes, and shared-contract activation
   needed to pass.
3. Refactor common membership and money mapping while preserving non-disclosure
   and exact status/code behavior.

## Verification

```powershell
npm.cmd --prefix backend test
```

With an isolated `TEST_DATABASE_URL`:

```powershell
npm.cmd --prefix backend run test:db
```

Inspect the route inventory and confirm no unauthenticated or cross-group
repayment mutation is mounted.

## Verification Result

- Backend verification passes 161 tests across 20 files.
- Database verification passes 12 integration tests against isolated embedded
  PostgreSQL.
- Migration `0007_repayments` enforces group currency, distinct current
  members, recorder membership, positive two-decimal money, and stable indexes.
- The authenticated list, create, and group-scoped delete routes are active in
  the shared inventory; non-members are denied before repayment lookup.
