# Task 02 — Complete Expense Management API

- Story points: 3
- Area: Backend
- Status: Complete
- Dependencies: Task 01

## Goal

Let any current group member delete an expense and its dependent rows through a
non-disclosing, shared-contract endpoint.

## Acceptance Criteria

- The shared inventory defines one authenticated delete-expense endpoint and a
  typed success body.
- A non-member is denied before expense existence or content is queried.
- Deletion is scoped by both group and expense ID; cross-group IDs return the
  shared missing response to an authorized member of the requested group.
- PostgreSQL cascades payments, splits, and FX snapshot deletion atomically.
- Missing, malformed, success, authorization, and infrastructure outcomes use
  stable status/code envelopes with no raw database details.
- There is no in-place expense update endpoint; correction remains delete and
  recreate.
- Controller, route-inventory, and database tests fail first.

## TDD Sequence

1. Add failing controller, route, contract, and cascade tests.
2. Add the smallest scoped delete query and route.
3. Consolidate mapping only if it preserves non-disclosure.

## Verification

```powershell
npm.cmd --prefix backend test
```
