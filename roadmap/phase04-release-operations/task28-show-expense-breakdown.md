# Task 28 — Show Payers, Shares, and Saved FX

- Story points: 3
- Area: Frontend
- Status: Done
- Dependencies: Task 27

## Goal

Make an expense understandable and its group-currency balance traceable.

## Acceptance Criteria

- Load the detail contract in the expense dialog and show who paid, how much each member owes, and the saved FX inputs for cross-currency expenses.
- Explain original versus group currency and that the saved rate is fixed for that expense; avoid presenting an independently rounded converted figure as authoritative.
- Provide deliberate loading, missing, denied, malformed/incomplete, offline, and retry states without displaying another expense's stale details.
- Support long member names, many participants, keyboard/screen-reader use, and narrow viewports.
- Preserve the established delete-and-recreate correction policy and explicit delete confirmation.

## TDD Sequence

Write failing dialog/API-client tests for breakdown and recovery states, implement the view, then refactor.

## Verification

```powershell
npm.cmd --prefix frontend test
npm.cmd --prefix frontend run lint
npm.cmd --prefix frontend run build
```

Frontend tests, lint, build; isolated same-currency and cross-currency browser checks.

## Completion

- Expense details now show saved payer shares, individual allocations, and the
  original-currency FX snapshot without implying independently rounded member
  conversions.
- Added loading, retry, denied, missing, malformed, offline, and stale-response
  handling, plus narrow-layout styles and accessible labels.
- Frontend tests passed: 85 tests across 16 files. Frontend lint and build
  passed. Isolated same-currency and cross-currency Chromium checks passed.
- The existing critical-journey browser run still reports its sanitized
  assertion failure; Task 32 retains the full journey review.
