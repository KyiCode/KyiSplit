# Task 04 — Complete Expense Activity and Management

- Story points: 5
- Area: Frontend
- Status: Complete
- Dependencies: Task 03

## Goal

Turn group activity into an informative expense history with deliberate,
authorized correction by deletion.

## Acceptance Criteria

- Expense rows show description, date, original currency, and two-decimal
  total with stable list keys and useful empty/loading states.
- A detail interaction presents the stored expense summary and makes the
  correction policy clear.
- Delete requires an accessible confirmation dialog, disables duplicate
  submission, and preserves the row after failure.
- Successful deletion refreshes expenses and balance-related data without a
  full-page reload.
- `403`, `404`, offline, and unexpected failures receive distinct safe
  recovery behavior.
- Component tests cover detail, cancel, confirm, pending, success, rejection,
  retry, and keyboard dialog behavior.

## TDD Sequence

1. Add failing activity and confirmation behavior tests.
2. Implement detail and scoped deletion with the smallest state changes.
3. Refactor refresh ownership so later balance and repayment panels can share
   it without request loops.

## Verification

```powershell
npm.cmd --prefix frontend test
npm.cmd --prefix frontend run lint
npm.cmd --prefix frontend run build
```
