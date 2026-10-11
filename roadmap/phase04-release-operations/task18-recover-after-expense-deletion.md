# Task 18 — Recover After Expense Deletion

- Story points: 3
- Area: Frontend
- Status: Done
- Dependencies: Task 13

## Goal

Show the confirmed result of an expense deletion even when activity refresh fails.

## Scope

Group expense deletion and refresh flow, plus frontend tests.

## Acceptance Criteria

- Once DELETE succeeds, remove the expense from visible activity and close the confirmation dialog.
- Refresh activity and balances independently so an activity fetch failure does not prevent balance refresh.
- Display refresh failure as a synchronization problem with a refresh retry; do not tell the user that confirmed deletion failed.
- A refresh retry never repeats the successful DELETE.
- Keep existing behavior for actual deletion failures, authorization denial, and already-missing expenses.
- Cover successful deletion followed by failed refresh, failed deletion, refresh recovery, and independent balance refresh.

## TDD Sequence

Write failing deletion-success/refresh-failure tests, implement separate mutation and refresh state, then refactor.

## Verification

```powershell
npm.cmd --prefix frontend test
npm.cmd --prefix frontend run lint
npm.cmd --prefix frontend run build
```

## Completion

- A confirmed DELETE immediately removes the expense from visible activity and
  closes its dialog.
- Activity refresh and balance refresh start independently. Activity failures
  show a synchronization message with an activity-only retry.
- Retrying synchronization issues a GET and never repeats the successful
  DELETE; existing deletion failure messages and behavior remain intact.
- Verification passed: frontend tests (65), lint, and production build.

