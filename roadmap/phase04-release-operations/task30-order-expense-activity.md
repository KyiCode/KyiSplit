# Task 30 — Order Expense Activity Deterministically

- Story points: 1
- Area: Backend
- Status: Done
- Dependencies: Task 29

## Goal

Make Recent expenses consistently show newest activity first.

## Acceptance Criteria

- Define list ordering as expense date descending, creation timestamp descending, then ID as a deterministic tie-breaker.
- Apply explicit SQL ordering and preserve the existing list contract.
- Verify dates out of insertion order and identical date/timestamp ties against synthetic data.
- Do not introduce pagination, query batching, or unrelated query cleanup in this task.

## TDD Sequence

Write a failing list-order regression, add explicit ordering, then refactor only if needed.

## Verification

```powershell
npm.cmd --prefix backend test
npm.cmd --prefix backend run build
```

Backend tests; local ordered-list check; frontend lint/build for contract compatibility.

## Completion

- `getExpenses` now explicitly orders by expense date descending, creation
  timestamp descending, then ID descending. The list response shape is unchanged.
- Added a query regression with synthetic rows covering out-of-order dates and
  equal date/timestamp ties.
- Verification passed: `npm.cmd --prefix backend test` (271 tests),
  `npm.cmd --prefix backend run build`, `npm.cmd --prefix frontend run lint`,
  and `npm.cmd --prefix frontend run build`.
- A temporary loopback-only PostgreSQL cluster returned the expected order for
  synthetic rows with dates and timestamps out of insertion order and an exact
  date/timestamp tie. The cluster was stopped after the check.
