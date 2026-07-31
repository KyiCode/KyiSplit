# Task 06 — Complete the Repayment Experience

- Story points: 5
- Area: Frontend
- Status: Complete
- Dependencies: Task 05

## Goal

Let members explicitly record, review, and correct repayments in the group
currency and immediately see their deterministic balances update.

## Acceptance Criteria

- Repayment history shows payer, receiver, amount, repayment date, recorder,
  and stable newest-first order using current member display names.
- The form requires distinct current payer/receiver members, a valid positive
  two-decimal amount, and a valid calendar date.
- Currency is fixed to the group default and cannot be independently changed.
- Create keeps entered values on rejection, prevents duplicate submission, and
  refreshes repayment history and balances on success.
- Delete requires confirmation, is available to any current member, and
  refreshes history and balances without inventing a persisted settlement.
- Empty, validation, unauthorized, missing, offline, retry, and integrity
  states are covered by component tests.

## TDD Sequence

1. Add failing history, form, refresh, and delete-confirmation tests.
2. Add the smallest repayment components using the typed helpers.
3. Extract reusable member selection and money input behavior where it reduces
   actual duplication.

## Verification

```powershell
npm.cmd --prefix frontend test
npm.cmd --prefix frontend run lint
npm.cmd --prefix frontend run build
```
