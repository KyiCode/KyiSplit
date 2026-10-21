# Task 29 — Clarify Balance Refresh and Safer Delete Focus

- Story points: 2
- Area: Frontend
- Status: Done
- Dependencies: Task 28

## Goal

Make retained balances visibly stale during refresh and make keyboard deletion deliberate.

## Acceptance Criteria

- Announce balance refresh even when previously loaded data remains visible; identify retained values as last loaded when refresh fails.
- Keep refresh-only recovery distinct from recording another repayment and prevent old suggestions from appearing freshly confirmed after a mutation.
- When opening expense and repayment delete confirmations, focus the non-destructive Keep action or a neutral dialog element.
- Retain focus trapping, Escape behavior, focus restoration, and the rule that pending mutations cannot be dismissed.
- Cover refresh success/failure with retained data and Enter/Tab/Escape behavior in both confirmation dialogs.

## TDD Sequence

Write failing stale-balance announcement and destructive-focus regressions, make focused changes, then refactor.

## Verification

```powershell
npm.cmd --prefix frontend test
npm.cmd --prefix frontend run lint
npm.cmd --prefix frontend run build
```

Frontend tests, lint, build; keyboard-only isolated browser checks.

## Completion

- Added polite refresh and last-successful-load status messages while retaining
  prior balance data and suggestions. Refresh recovery remains a balance fetch;
  repayment submission stays separate.
- Focuses Keep in expense and repayment delete confirmations and restores focus
  after keeping or dismissing a confirmation. Pending delete behavior remains
  guarded by the existing modal close rules.
- Added component coverage for retained balances across refresh success/failure,
  single repayment submission, and Enter/Tab/Escape plus focus restoration for
  both confirmation dialogs.
- Added isolated browser coverage for Enter on Keep and verified that neither
  confirmation sends a DELETE request.
- Verification passed: `npm.cmd --prefix frontend test` (87 tests),
  `npm.cmd --prefix frontend run lint`, `npm.cmd --prefix frontend run build`,
  and `npm.cmd --prefix frontend run test:e2e -- keyboard-confirmation.spec.ts`.
