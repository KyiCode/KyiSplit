# Task 04 — Validate Expense Money and Participants

- Story points: 5
- Area: Backend
- Status: Done
- Dependencies: Task 03

## Goal

Reject malformed or ambiguous expense input before persistence and make payer
and split equality exact at the release's two-decimal entry precision.

## Acceptance Criteria

- Expense name is trimmed to 1–120 characters; date is a real calendar date in
  `YYYY-MM-DD` form; currency is normalized to three uppercase ASCII letters.
- Expense total, payer amounts, and split amounts accept only finite,
  non-negative values with at most two decimal places; the total must be
  positive.
- `paidBy` and `splits` must be non-empty arrays with the documented object
  shape.
- A user identifier appears at most once in each collection, and every
  participant is a current member of the expense's group.
- Payer and split totals are converted to integer cents and each equals the
  expense total exactly; floating-point equality is not used.
- Zero entries have one explicit, tested policy and do not create inconsistent
  payment or split rows.
- Invalid collection shape, `NaN`, infinity, excessive precision, duplicate
  participants, non-members, and cent mismatches return stable `400` errors
  before a transaction is opened.
- The standalone payer and split mutation endpoints are removed unless they
  can preserve the same atomic full-expense invariants; the decision is
  documented in route tests.
- Tests fail first for every validation boundary above.

## TDD Sequence

1. Add table-driven failing tests for scalar, collection, participant, and
   integer-cent validation.
2. Implement pure parsing/validation at the API boundary and pass only validated
   values into transaction code.
3. Remove duplicated controller checks while preserving specific tested error
   outcomes.

## Verification

```powershell
npm.cmd --prefix backend test
```

Confirm invalid requests never call `connect`, `BEGIN`, or any insert.
